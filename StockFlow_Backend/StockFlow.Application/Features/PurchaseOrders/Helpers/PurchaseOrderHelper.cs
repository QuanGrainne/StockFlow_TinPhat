using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.PurchaseOrders.DTOs;
using StockFlow.Application.Features.Purchases.Helpers;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.PurchaseOrders.Helpers;

public static class PurchaseOrderHelper
{
    public const string Draft = "DRAFT";
    public const string Ordered = "ORDERED";
    public const string Partial = "PARTIAL";
    public const string Completed = "COMPLETED";
    public const string Cancelled = "CANCELLED";
    private const string Sequence = "stockflow.seq_purchase_order";

    public static async Task<string> NextCodeAsync(IStockFlowDbContext context, CancellationToken ct)
    {
        var seq = await context.GetNextSequenceValueAsync(Sequence, ct);
        return $"PDN{seq:D6}";
    }

    /// <summary>Kiểm tra ngày giao dự kiến không được trước ngày đặt hàng.</summary>
    public static string? ValidateExpectedDate(DateOnly? expectedDate, DateTime? orderDate)
    {
        if (expectedDate.HasValue && orderDate.HasValue)
        {
            var orderDay = DateOnly.FromDateTime(orderDate.Value);
            if (expectedDate.Value < orderDay)
            {
                return "Ngày giao dự kiến không được trước ngày đặt hàng.";
            }
        }
        return null;
    }

    /// <summary>Kiểm tra dòng hàng; trả về thông báo lỗi hoặc null nếu hợp lệ.</summary>
    public static string? ValidateItems(List<PurchaseOrderItemRequest>? items)
    {
        if (items == null || items.Count == 0) return "Phiếu đặt hàng nhập phải có ít nhất 1 mặt hàng.";
        if (items.Any(i => i.Quantity <= 0)) return "Số lượng đặt phải lớn hơn 0.";
        if (items.Any(i => i.UnitPrice < 0)) return "Đơn giá không được âm.";
        if (items.GroupBy(i => i.ProductId).Any(g => g.Count() > 1)) return "Một mặt hàng chỉ được xuất hiện 1 dòng trong phiếu.";
        return null;
    }

    public static decimal LineTotal(decimal qty, decimal unitPrice, decimal discountPercent) =>
        Math.Round(qty * unitPrice * (1 - Math.Clamp(discountPercent, 0, 100) / 100m), 0, MidpointRounding.AwayFromZero);

    /// <summary>
    /// Thành tiền 1 dòng phiếu đặt để hiển thị: đã có phiếu nhập hoàn thành → theo SL đã nhập (SL đạt) × đơn giá đặt
    /// (nhập lệch so với SL đặt được chấp nhận, tiền theo thực nhập); chưa nhập gì → theo SL đặt.
    /// </summary>
    public static decimal ItemAmount(DtlPurchaseOrderItem item, decimal receivedQty, bool hasReceipts) =>
        LineTotal(hasReceipts ? receivedQty : item.OrderedQty, item.UnitPrice, item.DiscountPercent);

    /// <summary>Thành tiền hàng nhập ngoài phiếu đặt = SL đạt × đơn giá trên phiếu nhập (trừ chiết khấu dòng).</summary>
    public static decimal ReceiptLineAmount(DtlGoodsReceiptItem line) =>
        LineTotal(PurchaseStockOps.Quantity(line), line.UnitPrice ?? 0, line.DiscountPercent ?? 0);

    /// <summary>
    /// Tiền hàng / giảm giá / tổng cộng của phiếu đặt theo SL đã nhập (các dòng của phiếu nhập đã hoàn thành).
    /// Chưa có phiếu nhập hoàn thành → bằng giá trị đặt như lúc lập phiếu. Giá trị lưu trong DB (total_amount) không đổi.
    /// </summary>
    public static (decimal Goods, decimal Discount, decimal Total) AmountsByReceived(
        TrxPurchaseOrder po, IReadOnlyCollection<DtlGoodsReceiptItem> completedLines)
    {
        var hasReceipts = completedLines.Count > 0;
        var received = completedLines.GroupBy(l => l.ProductId)
            .ToDictionary(g => g.Key, g => g.Sum(PurchaseStockOps.Quantity));
        var orderedIds = po.DtlPurchaseOrderItems.Select(i => i.ProductId).ToHashSet();
        var goods = po.DtlPurchaseOrderItems.Sum(i => ItemAmount(i, received.GetValueOrDefault(i.ProductId), hasReceipts))
            + completedLines.Where(l => !orderedIds.Contains(l.ProductId)).Sum(ReceiptLineAmount);
        var discount = Math.Clamp(po.DiscountAmount, 0, goods);
        return (goods, discount, goods - discount);
    }

    /// <summary>Tổng phải trả NCC theo phiếu đặt = Σ thành tiền − giảm giá phiếu.</summary>
    public static (decimal Discount, decimal Total) ComputeTotal(List<PurchaseOrderItemRequest> items, decimal discount)
    {
        var goods = items.Sum(i => LineTotal(i.Quantity, i.UnitPrice, i.DiscountPercent));
        var applied = Math.Clamp(discount, 0, goods);
        return (applied, goods - applied);
    }

    /// <summary>
    /// Tính lại trạng thái phiếu đặt sau khi phiếu nhập liên kết thay đổi (gọi sau SaveChanges của phiếu nhập).
    /// Chưa nhập → Đã đặt hàng; nhập chưa đủ → Nhập một phần; đủ mọi dòng → Hoàn thành.
    /// </summary>
    public static async Task RecalculateStatusAsync(IStockFlowDbContext context, int? poId, CancellationToken ct)
    {
        if (!poId.HasValue) return;
        var po = await context.TrxPurchaseOrders
            .Include(p => p.DtlPurchaseOrderItems)
            .FirstOrDefaultAsync(p => p.PoId == poId.Value, ct);
        if (po == null || po.Status == Cancelled || po.Status == Draft) return;

        var lines = await context.DtlGoodsReceiptItems.AsNoTracking()
            .Where(i => i.Gr.PurchaseOrderId == po.PoId && i.Gr.Status == "COMPLETED")
            .ToListAsync(ct);
        var received = lines.GroupBy(i => i.ProductId).ToDictionary(g => g.Key, g => g.Sum(PurchaseStockOps.Quantity));

        var anyReceived = received.Values.Any(q => q > 0);
        var allReceived = po.DtlPurchaseOrderItems.All(i => received.GetValueOrDefault(i.ProductId) >= i.OrderedQty);

        po.Status = !anyReceived ? Ordered : allReceived ? Completed : Partial;
        await context.SaveChangesAsync(ct);
    }

    /// <summary>SL đặt theo từng mặt hàng của phiếu đặt (ghi vào ordered_qty của dòng phiếu nhập theo phiếu đặt).</summary>
    public static async Task<Dictionary<int, decimal>> OrderedQtyByProductAsync(
        IStockFlowDbContext context, int? poId, CancellationToken ct)
    {
        if (!poId.HasValue) return new Dictionary<int, decimal>();
        return await context.DtlPurchaseOrderItems.AsNoTracking()
            .Where(i => i.PoId == poId.Value)
            .GroupBy(i => i.ProductId)
            .Select(g => new { g.Key, Qty = g.Sum(i => i.OrderedQty) })
            .ToDictionaryAsync(x => x.Key, x => x.Qty, ct);
    }

    public static void ReplaceItems(IStockFlowDbContext context, TrxPurchaseOrder po, List<PurchaseOrderItemRequest> items)
    {
        context.DtlPurchaseOrderItems.RemoveRange(po.DtlPurchaseOrderItems);
        po.DtlPurchaseOrderItems = items.Select(i => new DtlPurchaseOrderItem
        {
            ProductId = i.ProductId,
            OrderedQty = i.Quantity,
            UnitPrice = i.UnitPrice,
            DiscountPercent = Math.Clamp(i.DiscountPercent, 0, 100),
        }).ToList();
    }
}
