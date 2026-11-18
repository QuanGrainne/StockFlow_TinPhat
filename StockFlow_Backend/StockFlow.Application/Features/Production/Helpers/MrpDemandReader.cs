using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Production.DTOs;
using StockFlow.Domain.Entities;
using StockFlow.Domain.Services;

namespace StockFlow.Application.Features.Production.Helpers;

/// <summary>Nguồn của một nhu cầu (để ghi bảng truy vết dtl_mrp_run_demands).</summary>
public sealed record MrpDemandMeta(MrpDemand Demand, int? ProductionPlanId, int? ProductionOrderId);

public sealed record MrpDemandReadResult(
    List<MrpDemand> Demands,
    List<MrpDemandMeta> Metas,
    List<MrpProductLookupDto> ProductsWithoutBom);

/// <summary>
/// Đọc nhu cầu NVL cho MRP (BR-MRP-01..05, 07):
/// - Kế hoạch Đã duyệt (và Chờ duyệt nếu chọn, Q2): phần CHƯA lập lệnh của từng dòng × BOM đang áp dụng; ngày cần = ngày bắt đầu dòng.
/// - Lệnh Chưa bắt đầu / Đang sản xuất: phần NVL còn phải xuất (shortage_qty) đã chụp trên lệnh.
///   Phần đã lập lệnh của kế hoạch nằm ở đây nên không bị tính hai lần (BR-MRP-02).
/// Ngày cần ở quá khứ được MrpPolicy đưa về hôm nay (BR-MRP-03).
/// </summary>
public static class MrpDemandReader
{
    public static async Task<MrpDemandReadResult> ReadAsync(
        IStockFlowDbContext context, DateOnly periodEnd, bool includePendingPlans, CancellationToken ct)
    {
        var demands = new List<MrpDemand>();
        var metas = new List<MrpDemandMeta>();
        var withoutBom = new Dictionary<int, MrpProductLookupDto>();

        void Add(MrpDemand demand, int? planId, int? orderId)
        {
            demands.Add(demand);
            metas.Add(new MrpDemandMeta(demand, planId, orderId));
        }

        // ─── 1. Kế hoạch sản xuất ────────────────────────────────────────────────
        var statuses = includePendingPlans
            ? new[] { ProductionPlanStatus.Approved, ProductionPlanStatus.PendingApproval }
            : new[] { ProductionPlanStatus.Approved };

        var planLines = await context.DtlProductionPlanItems.AsNoTracking()
            .Where(i => statuses.Contains(i.ProductionPlan.Status) && i.PlannedStartDate <= periodEnd)
            .Select(i => new
            {
                i.ProductionPlanId,
                i.ProductId,
                ProductCode = i.Product.ProductCode ?? "",
                ProductName = i.Product.ProductName ?? "",
                i.PlannedQuantity,
                i.PlannedStartDate,
            })
            .ToListAsync(ct);

        // Số đã lập lệnh theo (kế hoạch, thành phẩm), không tính lệnh đã hủy (BR-PP-10) — một truy vấn cho mọi kế hoạch
        var planIds = planLines.Select(l => l.ProductionPlanId).Distinct().ToList();
        var ordered = await context.DtlProductionOrderItems.AsNoTracking()
            .Where(i => i.ProductionOrder.ProductionPlanId != null && planIds.Contains(i.ProductionOrder.ProductionPlanId.Value)
                        && i.ProductionOrder.Status != ProductionOrderStatus.Cancelled)
            .GroupBy(i => new { PlanId = i.ProductionOrder.ProductionPlanId!.Value, i.ProductId })
            .Select(g => new { g.Key.PlanId, g.Key.ProductId, Qty = g.Sum(i => i.PlannedQuantity) })
            .ToListAsync(ct);
        var orderedMap = ordered.ToDictionary(o => (o.PlanId, o.ProductId), o => o.Qty);

        var planProductIds = planLines.Select(l => l.ProductId).Distinct().ToList();
        var bomItems = await context.DtlBomItems.AsNoTracking()
            .Where(b => b.Bom.IsActive == true && planProductIds.Contains(b.Bom.ProductId))
            .Select(b => new { b.Bom.ProductId, b.MaterialId, Norm = b.Quantity ?? 0, Rate = b.WastageRate ?? 0 })
            .ToListAsync(ct);
        var bomByProduct = bomItems.GroupBy(b => b.ProductId).ToDictionary(g => g.Key, g => g.ToList());

        foreach (var line in planLines.OrderBy(l => l.ProductionPlanId).ThenBy(l => l.ProductId))
        {
            var remaining = line.PlannedQuantity - orderedMap.GetValueOrDefault((line.ProductionPlanId, line.ProductId));
            if (remaining <= 0) continue;

            if (!bomByProduct.TryGetValue(line.ProductId, out var bom))
            {
                withoutBom.TryAdd(line.ProductId, new MrpProductLookupDto(line.ProductId, line.ProductCode, line.ProductName));
                continue; // BR-MRP-05: bỏ khỏi phép tính, liệt kê riêng
            }
            foreach (var b in bom)
            {
                var qty = ProductionPolicy.CalculateRequirement(remaining, b.Norm, b.Rate); // BR-31
                if (qty <= 0) continue;
                Add(new MrpDemand(b.MaterialId, line.PlannedStartDate, qty, MrpDemandKind.Plan,
                    line.ProductionPlanId, line.ProductId, line.ProductionPlanId), line.ProductionPlanId, null);
            }
        }

        // ─── 2. Lệnh sản xuất đang mở ────────────────────────────────────────────
        var periodEndExclusive = periodEnd.AddDays(1).ToDateTime(TimeOnly.MinValue);
        var requirements = await context.TrxProductionMaterialRequirements.AsNoTracking()
            .Where(r => (r.ProductionOrder.Status == ProductionOrderStatus.NotStarted
                         || r.ProductionOrder.Status == ProductionOrderStatus.InProgress)
                        && (r.ProductionOrder.StartDate == null || r.ProductionOrder.StartDate < periodEndExclusive))
            .Select(r => new
            {
                r.ProductionOrderId,
                r.ProductionOrder.ProductionPlanId,
                OrderStatus = r.ProductionOrder.Status,
                r.ProductionOrder.StartDate,
                ProductId = r.ProductionOrderItem != null ? r.ProductionOrderItem.ProductId : r.ProductionOrder.ProductId,
                r.MaterialId,
                r.RequiredQty,
                r.IssuedQty,
                r.ShortageQty,
            })
            .ToListAsync(ct);

        // BR-MRP-03: lệnh chưa bắt đầu thuộc kế hoạch cần NVL vào ngày bắt đầu của dòng kế hoạch tương ứng
        var orderPlanIds = requirements.Where(r => r.ProductionPlanId != null).Select(r => r.ProductionPlanId!.Value).Distinct().ToList();
        var orderPlanStarts = await context.DtlProductionPlanItems.AsNoTracking()
            .Where(i => orderPlanIds.Contains(i.ProductionPlanId))
            .Select(i => new { i.ProductionPlanId, i.ProductId, i.PlannedStartDate })
            .ToListAsync(ct);
        var planStartMap = orderPlanStarts.ToDictionary(i => (i.ProductionPlanId, i.ProductId), i => i.PlannedStartDate);

        foreach (var r in requirements.OrderBy(r => r.ProductionOrderId).ThenBy(r => r.MaterialId))
        {
            // Còn phải xuất = nhu cầu − đã xuất (BR-32); dữ liệu cũ thiếu shortage_qty thì tự tính
            var qty = r.ShortageQty ?? Math.Max(0, (r.RequiredQty ?? 0) - (r.IssuedQty ?? 0));
            if (qty <= 0) continue;

            DateOnly needDate;
            if (r.OrderStatus == ProductionOrderStatus.NotStarted && r.ProductionPlanId is int planId
                && planStartMap.TryGetValue((planId, r.ProductId), out var planStart))
                needDate = planStart;
            else
                needDate = r.StartDate.HasValue ? DateOnly.FromDateTime(r.StartDate.Value) : DateOnly.MinValue; // quá khứ → hôm nay

            Add(new MrpDemand(r.MaterialId, needDate, qty, MrpDemandKind.Order, r.ProductionOrderId, r.ProductId,
                r.ProductionOrderId), r.ProductionPlanId, r.ProductionOrderId);
        }

        return new MrpDemandReadResult(demands, metas, withoutBom.Values.OrderBy(p => p.ProductCode).ToList());
    }
}
