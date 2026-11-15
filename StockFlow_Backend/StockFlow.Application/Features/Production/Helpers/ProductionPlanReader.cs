using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Production.DTOs;
using StockFlow.Domain.Entities;
using StockFlow.Domain.Services;

namespace StockFlow.Application.Features.Production.Helpers;

/// <summary>Đọc kế hoạch sản xuất thành DTO (UC-PP-01, UC-PP-03); dùng cho Query và để trả kết quả sau Command.</summary>
public static class ProductionPlanReader
{
    private sealed record PlanRow(
        int ProductionPlanId, string PlanCode, string PlanName, DateTime PlanDate, DateOnly PeriodStart, DateOnly PeriodEnd,
        string Status, int CreatedBy, string? CreatorFullName, string? CreatorUsername, int? ApprovedBy,
        string? ApproverFullName, string? ApproverUsername, DateTime? ApprovalDate, string? Notes,
        int ItemCount, decimal TotalPlanned, decimal TotalOrdered, int OrderCount,
        DateTime? UpdatedAt, string? UpdaterFullName, string? UpdaterUsername);

    private static IQueryable<PlanRow> PlanRows(IQueryable<TrxProductionPlan> plans) =>
        plans.AsNoTracking().Select(p => new PlanRow(
            p.ProductionPlanId,
            p.PlanCode,
            p.PlanName,
            p.PlanDate,
            p.PeriodStart,
            p.PeriodEnd,
            p.Status,
            p.CreatedBy,
            p.CreatedByNavigation.FullName,
            p.CreatedByNavigation.Username,
            p.ApprovedBy,
            p.ApprovedByNavigation != null ? p.ApprovedByNavigation.FullName : null,
            p.ApprovedByNavigation != null ? p.ApprovedByNavigation.Username : null,
            p.ApprovalDate,
            p.Notes,
            p.DtlProductionPlanItems.Count(),
            p.DtlProductionPlanItems.Sum(i => (decimal?)i.PlannedQuantity) ?? 0,
            p.TrxProductionOrders
                .Where(o => o.Status != ProductionOrderStatus.Cancelled)
                .SelectMany(o => o.DtlProductionOrderItems)
                .Sum(i => (decimal?)i.PlannedQuantity) ?? 0,
            p.TrxProductionOrders.Count(o => o.Status != ProductionOrderStatus.Cancelled),
            p.UpdatedAt,
            p.UpdatedByNavigation != null ? p.UpdatedByNavigation.FullName : null,
            p.UpdatedByNavigation != null ? p.UpdatedByNavigation.Username : null));

    private static string DisplayName(string? fullName, string? username) =>
        !string.IsNullOrWhiteSpace(fullName) ? fullName! : username ?? "";

    private static ProductionPlanSummaryDto ToSummary(PlanRow p) => new(
        p.ProductionPlanId,
        p.PlanCode,
        p.PlanName,
        p.PlanDate,
        p.PeriodStart,
        p.PeriodEnd,
        p.Status,
        p.CreatedBy,
        DisplayName(p.CreatorFullName, p.CreatorUsername),
        p.ApprovedBy,
        p.ApprovedBy.HasValue ? DisplayName(p.ApproverFullName, p.ApproverUsername) : null,
        p.ApprovalDate,
        p.ItemCount,
        p.TotalPlanned,
        p.TotalOrdered,
        p.TotalPlanned > 0 ? Math.Min(100, Math.Round(p.TotalOrdered * 100 / p.TotalPlanned, 1)) : 0,
        p.OrderCount,
        p.UpdatedAt,
        p.UpdatedAt.HasValue ? DisplayName(p.UpdaterFullName, p.UpdaterUsername) : null);

    public static async Task<List<ProductionPlanSummaryDto>> SummariesAsync(
        IQueryable<TrxProductionPlan> plans, CancellationToken ct)
    {
        var rows = await PlanRows(plans).ToListAsync(ct);
        return rows.Select(ToSummary).ToList();
    }

    /// <summary>Chi tiết kế hoạch: dòng kèm tiến độ, lệnh thuộc kế hoạch, thao tác được phép của người dùng.</summary>
    public static async Task<ProductionPlanDetailDto?> DetailAsync(
        IStockFlowDbContext context, IUserPermissionService permissions, int userId, int productionPlanId,
        CancellationToken ct)
    {
        var row = await PlanRows(context.TrxProductionPlans.Where(p => p.ProductionPlanId == productionPlanId))
            .FirstOrDefaultAsync(ct);
        if (row == null) return null;

        var lines = await context.DtlProductionPlanItems.AsNoTracking()
            .Where(i => i.ProductionPlanId == productionPlanId)
            .OrderBy(i => i.ProductionPlanItemId)
            .Select(i => new
            {
                i.ProductionPlanItemId,
                i.ProductId,
                Code = i.Product.ProductCode ?? "",
                Name = i.Product.ProductName ?? "",
                Unit = i.Product.BaseUnit.UnitName ?? "",
                i.PlannedQuantity,
                i.PlannedStartDate,
                i.PlannedEndDate,
                i.WarehouseId,
                WarehouseName = i.Warehouse != null ? i.Warehouse.WarehouseName : null,
                i.Notes,
            })
            .ToListAsync(ct);

        var ordered = await ProductionPlanRules.OrderedQuantitiesAsync(context, productionPlanId, null, ct);
        var withoutBom = await ProductionPlanRules.ProductsWithoutActiveBomAsync(context, lines.Select(l => l.ProductId), ct);

        var orders = await context.TrxProductionOrders.AsNoTracking()
            .Where(o => o.ProductionPlanId == productionPlanId)
            .OrderByDescending(o => o.StartDate)
            .ThenByDescending(o => o.ProductionOrderId)
            .Select(o => new
            {
                o.ProductionOrderId,
                Code = o.ProductionOrderCode ?? "",
                Status = o.Status ?? ProductionOrderStatus.NotStarted,
                o.StartDate,
                o.EndDate,
                o.Workshop,
                FullName = o.CreatedByNavigation.FullName,
                Username = o.CreatedByNavigation.Username,
                Items = o.DtlProductionOrderItems
                    .OrderBy(i => i.ProductionOrderItemId)
                    .Select(i => new ProductionPlanOrderItemDto(
                        i.ProductId, i.Product.ProductCode ?? "", i.Product.ProductName ?? "", i.PlannedQuantity, i.ActualQuantity))
                    .ToList(),
            })
            .ToListAsync(ct);

        // Thành phẩm đã nhập kho theo các lệnh chưa hủy (lệnh hủy được chỉ khi chưa xuất NVL nên chưa có nhập kho)
        var received = orders
            .Where(o => !string.Equals(o.Status, ProductionOrderStatus.Cancelled, StringComparison.OrdinalIgnoreCase))
            .SelectMany(o => o.Items)
            .GroupBy(i => i.ProductId)
            .ToDictionary(g => g.Key, g => g.Sum(i => i.ActualQuantity));

        var items = lines.Select(l =>
        {
            var orderedQty = ordered.GetValueOrDefault(l.ProductId);
            return new ProductionPlanItemDto(
                l.ProductionPlanItemId, l.ProductId, l.Code, l.Name, l.Unit, !withoutBom.Contains(l.ProductId),
                l.PlannedQuantity, l.PlannedStartDate, l.PlannedEndDate, l.WarehouseId, l.WarehouseName, l.Notes,
                orderedQty, Math.Max(0, l.PlannedQuantity - orderedQty), received.GetValueOrDefault(l.ProductId));
        }).ToList();

        var orderDtos = orders.Select(o => new ProductionPlanOrderDto(
            o.ProductionOrderId, o.Code, o.Status, o.StartDate, o.EndDate, o.Workshop,
            o.Items.Sum(i => i.PlannedQuantity), o.Items.Sum(i => i.ActualQuantity),
            DisplayName(o.FullName, o.Username), o.Items)).ToList();

        // Thao tác được phép: cùng luật với Command (ProductionPlanPermissions)
        var plan = new TrxProductionPlan { Status = row.Status, CreatedBy = row.CreatedBy };
        var user = await ProductionPlanPermissions.LoadAsync(permissions, userId, ct);
        var hasActiveOrders = row.OrderCount > 0;
        var anyRemaining = items.Any(i => i.RemainingQuantity > 0);
        var actions = new ProductionPlanActionsDto(
            ProductionPlanPermissions.CheckEdit(plan, user) == null,
            plan.IsApproved(),
            ProductionPlanPermissions.CheckSubmit(plan, user) == null,
            ProductionPlanPermissions.CheckApproveOrReject(plan, user) == null,
            ProductionPlanPermissions.CheckApproveOrReject(plan, user) == null,
            ProductionPlanPermissions.CheckCancel(plan, user, hasActiveOrders) == null,
            ProductionPlanPermissions.CheckClose(plan, user) == null,
            ProductionPlanPermissions.CheckCreateOrder(plan, user) == null && anyRemaining);

        return new ProductionPlanDetailDto(ToSummary(row), row.Notes, items, orderDtos, actions);
    }

    /// <summary>
    /// Nhu cầu NVL dự kiến theo BOM đang áp dụng (UC-PP-03, BR-PP-14): tính từng dòng theo BR-31 rồi cộng dồn theo NVL.
    /// Tồn lấy tại <paramref name="warehouseId"/> (handler đã kiểm quyền kho), chưa trừ phần các lệnh đang mở (Q8).
    /// </summary>
    public static async Task<PlanMaterialRequirementsDto> MaterialRequirementsAsync(
        IStockFlowDbContext context, IReadOnlyList<(int ProductId, decimal Total, decimal Remaining)> lines,
        int? warehouseId, CancellationToken ct)
    {
        var productIds = lines.Select(l => l.ProductId).Distinct().ToList();

        var bomItems = await context.DtlBomItems.AsNoTracking()
            .Where(i => i.Bom.IsActive == true && productIds.Contains(i.Bom.ProductId))
            .OrderBy(i => i.BomItemId)
            .Select(i => new
            {
                i.Bom.ProductId,
                i.MaterialId,
                Code = i.Material.ProductCode ?? "",
                Name = i.Material.ProductName ?? "",
                i.UnitId,
                Unit = i.Unit.UnitName ?? "",
                Norm = i.Quantity ?? 0,
                Rate = i.WastageRate ?? 0,
            })
            .ToListAsync(ct);
        var bomByProduct = bomItems.GroupBy(i => i.ProductId).ToDictionary(g => g.Key, g => g.ToList());

        var missingIds = productIds.Where(id => !bomByProduct.ContainsKey(id)).ToList();
        var missing = await context.MstProducts.AsNoTracking()
            .Where(p => missingIds.Contains(p.ProductId))
            .OrderBy(p => p.ProductCode)
            .Select(p => new PlanProductWithoutBomDto(p.ProductId, p.ProductCode ?? "", p.ProductName ?? ""))
            .ToListAsync(ct);

        var totals = new Dictionary<(int MaterialId, int UnitId), (string Code, string Name, string Unit, decimal Total, decimal Remaining)>();
        foreach (var line in lines)
        {
            if (!bomByProduct.TryGetValue(line.ProductId, out var bom)) continue;
            foreach (var b in bom)
            {
                var key = (b.MaterialId, b.UnitId);
                var total = ProductionPolicy.CalculateRequirement(line.Total, b.Norm, b.Rate);
                var remaining = ProductionPolicy.CalculateRequirement(Math.Max(0, line.Remaining), b.Norm, b.Rate);
                totals[key] = totals.TryGetValue(key, out var cur)
                    ? (cur.Code, cur.Name, cur.Unit, cur.Total + total, cur.Remaining + remaining)
                    : (b.Code, b.Name, b.Unit, total, remaining);
            }
        }

        var available = warehouseId.HasValue
            ? await ProductionStockOps.AvailableAsync(context, warehouseId.Value, totals.Keys.Select(k => k.MaterialId), ct)
            : null;

        static decimal Shortage(decimal required, decimal available) => Math.Max(0, required - Math.Max(0, available));

        var materials = totals
            .OrderBy(t => t.Value.Code)
            .Select(t =>
            {
                decimal? avail = available?.GetValueOrDefault(t.Key.MaterialId);
                return new PlanMaterialRequirementLineDto(
                    t.Key.MaterialId, t.Value.Code, t.Value.Name, t.Value.Unit, t.Value.Total, t.Value.Remaining, avail,
                    avail.HasValue ? Shortage(t.Value.Total, avail.Value) : null,
                    avail.HasValue ? Shortage(t.Value.Remaining, avail.Value) : null);
            })
            .ToList();

        return new PlanMaterialRequirementsDto(
            warehouseId,
            materials,
            missing,
            materials.Count(m => m.ShortageQty > 0),
            materials.Count(m => m.RemainingShortageQty > 0));
    }
}
