using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.PurchaseOrders.Helpers;
using StockFlow.Application.Features.Purchases.Helpers;
using StockFlow.Domain.Services;

namespace StockFlow.Application.Features.Production.Helpers;

public sealed record MrpSupplyReadResult(
    List<MrpScheduledReceipt> ScheduledReceipts,
    List<MrpMaterialInput> MaterialInputs,
    Dictionary<int, decimal> OnOrderWithoutDate);

/// <summary>
/// Đọc nguồn NVL cho MRP, chỉ cho các NVL có nhu cầu (không kéo hàng bán, thành phẩm vào phép tính):
/// - Tồn dùng được (BR-MRP-10): tổng tồn của các kho đã chọn, trừ lô hết hạn trước hôm nay.
/// - Hàng về theo lịch (BR-MRP-11a): đơn đặt Đã đặt / Nhập một phần CÓ ngày giao dự kiến, số còn chờ = đặt − đã nhận
///   (phiếu nhập Hoàn thành, cùng công thức PurchaseOrderHelper) — phần đã nhận đã nằm trong tồn nên không tính hai lần.
/// - Đơn không có ngày giao (BR-MRP-12): chỉ trả về để hiển thị, không cộng vào nguồn.
/// - Tồn an toàn = 0 (Q5 chốt 17/11/2026: giai đoạn đầu không dùng min_safe_stock).
/// </summary>
public static class MrpSupplyReader
{
    public static async Task<MrpSupplyReadResult> ReadAsync(
        IStockFlowDbContext context, IReadOnlyCollection<int> warehouseIds, IEnumerable<int> materialIds,
        DateOnly today, DateOnly periodEnd, CancellationToken ct)
    {
        var ids = materialIds.Distinct().ToList();
        var whIds = warehouseIds.Distinct().ToList();
        if (ids.Count == 0 || whIds.Count == 0)
            return new MrpSupplyReadResult(new(), new(), new());

        var opening = await context.TrxInventoryBalances.AsNoTracking()
            .Where(b => whIds.Contains(b.WarehouseId) && ids.Contains(b.ProductId)
                        && (b.Lot == null || b.Lot.ExpiryDate == null || b.Lot.ExpiryDate >= today))
            .GroupBy(b => b.ProductId)
            .Select(g => new { ProductId = g.Key, Qty = g.Sum(b => b.Quantity ?? 0) })
            .ToDictionaryAsync(x => x.ProductId, x => x.Qty, ct);

        var poLines = await context.DtlPurchaseOrderItems.AsNoTracking()
            .Where(i => ids.Contains(i.ProductId) && whIds.Contains(i.Po.WarehouseId)
                        && (i.Po.Status == PurchaseOrderHelper.Ordered || i.Po.Status == PurchaseOrderHelper.Partial))
            .Select(i => new { i.PoId, i.ProductId, i.OrderedQty, i.Po.ExpectedDate })
            .ToListAsync(ct);

        var poIds = poLines.Select(l => l.PoId).Distinct().ToList();
        var receivedLines = await context.DtlGoodsReceiptItems.AsNoTracking()
            .Include(r => r.Gr)
            .Where(r => r.Gr.PurchaseOrderId != null && poIds.Contains(r.Gr.PurchaseOrderId.Value)
                        && r.Gr.Status == "COMPLETED" && ids.Contains(r.ProductId))
            .ToListAsync(ct);
        var received = receivedLines
            .GroupBy(r => (PoId: r.Gr.PurchaseOrderId!.Value, r.ProductId))
            .ToDictionary(g => g.Key, g => g.Sum(PurchaseStockOps.Quantity));

        var receipts = new List<MrpScheduledReceipt>();
        var withoutDate = new Dictionary<int, decimal>();
        foreach (var line in poLines)
        {
            var pending = line.OrderedQty - received.GetValueOrDefault((line.PoId, line.ProductId));
            if (pending <= 0) continue;
            if (line.ExpectedDate is not DateOnly expected)
                withoutDate[line.ProductId] = withoutDate.GetValueOrDefault(line.ProductId) + pending;
            else if (expected <= periodEnd)
                receipts.Add(new MrpScheduledReceipt(line.ProductId, expected, pending));
        }

        var leadTimes = await context.MstProducts.AsNoTracking()
            .Where(p => ids.Contains(p.ProductId))
            .ToDictionaryAsync(p => p.ProductId, p => p.LeadTimeDays, ct);

        var inputs = ids
            .Select(id => new MrpMaterialInput(id, opening.GetValueOrDefault(id), 0, leadTimes.GetValueOrDefault(id)))
            .ToList();

        return new MrpSupplyReadResult(receipts, inputs, withoutDate);
    }
}
