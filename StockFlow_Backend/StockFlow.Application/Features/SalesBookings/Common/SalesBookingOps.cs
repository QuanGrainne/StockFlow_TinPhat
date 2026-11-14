using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.SalesBookings.Common;

/// <summary>
/// Đơn đặt hàng của khách (UC-14, BR-07/08): lưu chung bảng trx_orders với order_type = BOOKING.
/// Tạo / sửa đơn KHÔNG trừ tồn kho; tồn chỉ bị trừ khi tạo hóa đơn từ đơn.
/// Mỗi đơn đặt ra đúng 1 hóa đơn: Phiếu tạm → (tạo hóa đơn) Hoàn thành; SL trên đơn chốt bằng SL hóa đơn.
/// Sau đó hóa đơn là chứng từ độc lập: hủy hóa đơn không mở lại / đổi trạng thái đơn đặt.
/// Khách lấy thiếu: phần còn lại có thể tách thành 1 đơn đặt mới (Phiếu tạm) — xem SettleWithInvoiceAsync.
/// Tiền khách trả trước = phiếu thu tham chiếu tới đơn (giảm công nợ ngay), khi tạo hóa đơn được trừ vào hóa đơn.
/// </summary>
public static class SalesBookingOps
{
    public const string OrderType = "BOOKING";
    public const string InvoiceType = "INVOICE";

    /// <summary>Phiếu tạm: chưa tạo hóa đơn, đang giữ hàng cho khách</summary>
    public const string Draft = "DRAFT";
    /// <summary>Hoàn thành: đã tạo hóa đơn giao hàng</summary>
    public const string Finished = "FINISHED";
    public const string Cancelled = "CANCELLED";

    public static readonly string[] AllStatuses = { Draft, Finished, Cancelled };

    /// <summary>Trạng thái còn xử lý được (tạo hóa đơn, giữ hàng)</summary>
    public static readonly string[] OpenStatuses = { Draft };

    public static bool IsOpen(string? status) => OpenStatuses.Contains(status ?? "", StringComparer.OrdinalIgnoreCase);

    /// <summary>Số lượng đã giao (theo hóa đơn hoàn thành) của từng đơn đặt: bookingId → (productId → SL)</summary>
    public static async Task<Dictionary<int, Dictionary<int, decimal>>> LoadDeliveredAsync(
        IStockFlowDbContext context, IReadOnlyCollection<int> bookingIds, CancellationToken ct)
    {
        if (bookingIds.Count == 0) return new();
        var rows = await context.DtlOrderItems.AsNoTracking()
            .Where(i => i.Order.BookingOrderId.HasValue && bookingIds.Contains(i.Order.BookingOrderId.Value)
                        && i.Order.Status == "COMPLETED")
            .GroupBy(i => new { BookingId = i.Order.BookingOrderId!.Value, i.ProductId })
            .Select(g => new { g.Key.BookingId, g.Key.ProductId, Qty = g.Sum(x => x.Quantity ?? 0) })
            .ToListAsync(ct);
        return rows.GroupBy(r => r.BookingId)
            .ToDictionary(g => g.Key, g => g.ToDictionary(r => r.ProductId, r => r.Qty));
    }

    /// <summary>Tiền trả trước còn lại của đơn đặt (chưa trừ vào hóa đơn nào)</summary>
    public static async Task<decimal> RemainingDepositAsync(IStockFlowDbContext context, TrxOrder booking, CancellationToken ct)
    {
        var used = await context.TrxOrders.AsNoTracking()
            .Where(o => o.BookingOrderId == booking.OrderId && o.Status == "COMPLETED")
            .SumAsync(o => (decimal?)o.DepositAmount, ct) ?? 0;
        return Math.Max(0, (booking.PaidAmount ?? 0) - used);
    }

    /// <summary>1 dòng hàng của hóa đơn giao từ đơn đặt (đầu vào của SettleWithInvoice)</summary>
    public sealed record InvoiceLine(int ProductId, int UnitId, decimal Quantity, decimal OriginalPrice,
        string DiscountType, decimal DiscountValue, decimal UnitPrice);

    /// <summary>Tiền của hóa đơn giao hàng (đầu vào của SettleWithInvoice)</summary>
    public sealed record InvoiceMoney(decimal SubTotal, string DiscountType, decimal DiscountValue, decimal DiscountAmount, decimal Total);

    /// <summary>
    /// Chốt đơn đặt khi tạo hóa đơn giao hàng (gọi trong transaction tạo hóa đơn; booking đã Include DtlOrderItems):
    /// - SL trên đơn sửa bằng đúng SL hóa đơn ("đặt bao nhiêu thì hóa đơn bấy nhiêu"), tiền đơn = tiền hóa đơn, đơn → Hoàn thành.
    /// - Trả về phần khách chưa lấy (SL đặt − SL hóa đơn, giữ đơn giá của đơn) để tạo đơn chờ nếu người dùng chọn.
    /// </summary>
    public static List<DtlOrderItem> SettleWithInvoice(
        IStockFlowDbContext context, TrxOrder booking, IReadOnlyList<InvoiceLine> invoiceLines, InvoiceMoney money, int userId)
    {
        // Ghép từng dòng đơn đặt với các dòng hóa đơn cùng hàng: ưu tiên dòng cùng giá, sau đó dòng khác giá
        var invLeft = invoiceLines.Select(l => l.Quantity).ToArray();
        var bookingLines = booking.DtlOrderItems.OrderBy(i => i.OrderItemId).ToList();
        var taken = bookingLines.ToDictionary(l => l, _ => 0m);
        foreach (var samePriceOnly in new[] { true, false })
        {
            foreach (var line in bookingLines)
            {
                for (var k = 0; k < invoiceLines.Count; k++)
                {
                    var inv = invoiceLines[k];
                    if (invLeft[k] <= 0 || inv.ProductId != line.ProductId) continue;
                    if (samePriceOnly && !SamePrice(line, inv)) continue;
                    var take = Math.Min((line.Quantity ?? 0) - taken[line], invLeft[k]);
                    if (take <= 0) continue;
                    taken[line] += take;
                    invLeft[k] -= take;
                }
            }
        }

        var remainder = new List<DtlOrderItem>();
        foreach (var line in bookingLines)
        {
            var ordered = line.Quantity ?? 0;
            var take = taken[line];
            if (ordered - take > 0) remainder.Add(CopyLine(line, ordered - take));
            if (take > 0) SetQuantity(line, take);
            else
            {
                booking.DtlOrderItems.Remove(line);
                context.DtlOrderItems.Remove(line);
            }
        }

        // Hóa đơn có thêm hàng (không có trên đơn / lấy nhiều hơn đặt) → ghi thêm vào đơn cho khớp hóa đơn:
        // cùng hàng, cùng đơn giá và giá bán với 1 dòng đang có → cộng vào dòng đó (VD đặt 6 lấy 7 → dòng 7);
        // khác giá → dòng riêng để tiền đơn vẫn khớp hóa đơn
        for (var k = 0; k < invoiceLines.Count; k++)
        {
            var inv = invoiceLines[k];
            var extra = invLeft[k];
            if (extra <= 0) continue;
            var same = booking.DtlOrderItems.FirstOrDefault(l => l.ProductId == inv.ProductId && SamePrice(l, inv));
            if (same != null)
            {
                SetQuantity(same, (same.Quantity ?? 0) + extra);
                continue;
            }
            var added = new DtlOrderItem
            {
                ProductId = inv.ProductId,
                UnitId = inv.UnitId,
                OriginalPrice = inv.OriginalPrice,
                DiscountType = inv.DiscountType,
                DiscountValue = inv.DiscountValue,
                UnitPrice = inv.UnitPrice,
            };
            SetQuantity(added, extra);
            booking.DtlOrderItems.Add(added);
        }

        booking.SubTotal = money.SubTotal;
        booking.DiscountType = money.DiscountType;
        booking.DiscountValue = money.DiscountValue;
        booking.DiscountAmount = money.DiscountAmount;
        booking.TotalAmount = money.Total;
        booking.Status = Finished;
        booking.UpdatedAt = StockFlow.Application.Common.VietnamTime.Now;
        booking.UpdatedBy = userId;
        return remainder;
    }

    /// <summary>
    /// Đơn chờ cho phần khách chưa lấy: Phiếu tạm, cùng khách / chi nhánh / ngày giao / bảng giá với đơn gốc.
    /// Giảm giá đơn: theo % thì giữ %, theo tiền thì phần giảm giá chưa dùng ở hóa đơn.
    /// Tiền trả trước còn dư (chưa trừ vào hóa đơn) chuyển sang đơn mới; công nợ khách giữ nguyên
    /// (đã giảm khi thu cọc, tức mình vẫn đang nợ khách khoản này).
    /// </summary>
    public static TrxOrder BuildRemainderBooking(
        TrxOrder source, List<DtlOrderItem> remainder, decimal sourceDiscountAmountBefore, decimal invoiceDiscountAmount,
        decimal leftoverDeposit, string code, int userId)
    {
        var subTotal = remainder.Sum(l => l.LineTotal);
        var isPercent = string.Equals(source.DiscountType, "PERCENT", StringComparison.OrdinalIgnoreCase);
        var discount = isPercent
            ? Math.Min(subTotal, Math.Round(subTotal * Math.Min(source.DiscountValue, 100) / 100m, 0))
            : Math.Min(subTotal, Math.Max(0, sourceDiscountAmountBefore - invoiceDiscountAmount));
        var total = subTotal - discount;

        var priceBookTag = System.Text.RegularExpressions.Regex.Match(source.Notes ?? "", @"\[Bảng giá:[^\]]*\]").Value;
        var notes = $"Tách từ đơn {source.OrderCode} (phần khách chưa lấy)";
        if (leftoverDeposit > 0) notes += $". Tiền trả trước chuyển từ {source.OrderCode}: {leftoverDeposit:N0} đ";
        if (!string.IsNullOrEmpty(priceBookTag)) notes = $"{priceBookTag} {notes}";

        var next = new TrxOrder
        {
            OrderCode = code,
            OrderType = OrderType,
            Status = Draft,
            PartnerId = source.PartnerId,
            WarehouseId = source.WarehouseId,
            OrderDate = StockFlow.Application.Common.VietnamTime.Now,
            DeliveryDate = source.DeliveryDate,
            SubTotal = subTotal,
            DiscountType = isPercent ? "PERCENT" : "AMOUNT",
            DiscountValue = isPercent ? Math.Min(source.DiscountValue, 100) : discount,
            DiscountAmount = discount,
            TotalAmount = total,
            PaidAmount = leftoverDeposit,
            OutstandingAmount = 0,
            PaymentStatus = leftoverDeposit <= 0 ? "UNPAID" : (leftoverDeposit >= total ? "PAID" : "PARTIAL"),
            Notes = notes,
            CreatedBy = userId,
        };
        foreach (var l in remainder) next.DtlOrderItems.Add(l);
        return next;
    }

    /// <summary>Dòng đơn đặt và dòng hóa đơn cùng đơn vị, cùng đơn giá và giá bán</summary>
    private static bool SamePrice(DtlOrderItem line, InvoiceLine inv) =>
        line.UnitId == inv.UnitId && line.OriginalPrice == inv.OriginalPrice && (line.UnitPrice ?? line.OriginalPrice) == inv.UnitPrice;

    private static DtlOrderItem CopyLine(DtlOrderItem src, decimal qty)
    {
        var copy = new DtlOrderItem
        {
            ProductId = src.ProductId,
            UnitId = src.UnitId,
            OriginalPrice = src.OriginalPrice,
            DiscountType = src.DiscountType,
            DiscountValue = src.DiscountValue,
            UnitPrice = src.UnitPrice,
        };
        SetQuantity(copy, qty);
        return copy;
    }

    /// <summary>Đổi SL 1 dòng, tính lại giảm giá dòng và thành tiền theo đơn giá đang có</summary>
    private static void SetQuantity(DtlOrderItem line, decimal qty)
    {
        var unitPrice = line.UnitPrice ?? line.OriginalPrice;
        line.Quantity = qty;
        line.DiscountAmount = Math.Max(0, line.OriginalPrice - unitPrice) * qty;
        line.LineTotal = Math.Round(unitPrice * qty, 2);
    }

    /// <summary>Hàng khách đặt theo (kho, hàng) — cột "Khách đặt" ở màn Hàng hóa</summary>
    public static async Task<Dictionary<(int WarehouseId, int ProductId), decimal>> ReservedByWarehouseAsync(
        IStockFlowDbContext context, IReadOnlyCollection<int> productIds, CancellationToken ct)
    {
        var lines = await context.DtlOrderItems.AsNoTracking()
            .Where(i => i.Order.OrderType == OrderType && i.Order.Status != null && OpenStatuses.Contains(i.Order.Status)
                        && i.Order.WarehouseId.HasValue && productIds.Contains(i.ProductId))
            .Select(i => new { i.OrderId, WarehouseId = i.Order.WarehouseId!.Value, i.ProductId, Qty = i.Quantity ?? 0 })
            .ToListAsync(ct);
        if (lines.Count == 0) return new();

        var delivered = await LoadDeliveredAsync(context, lines.Select(l => l.OrderId).Distinct().ToList(), ct);
        return lines.GroupBy(l => new { l.OrderId, l.WarehouseId, l.ProductId })
            .Select(g => new
            {
                g.Key.WarehouseId,
                g.Key.ProductId,
                Remaining = Math.Max(0, g.Sum(x => x.Qty) - (delivered.GetValueOrDefault(g.Key.OrderId)?.GetValueOrDefault(g.Key.ProductId) ?? 0)),
            })
            .GroupBy(x => (x.WarehouseId, x.ProductId))
            .ToDictionary(g => g.Key, g => g.Sum(x => x.Remaining));
    }

    /// <summary>
    /// Hàng khách đặt (đang giữ) tại kho: SL đặt − SL đã giao của các đơn đặt còn mở. productIds rỗng = mọi hàng.
    /// </summary>
    public static async Task<Dictionary<int, decimal>> ReservedQtyAsync(
        IStockFlowDbContext context, int? warehouseId, IReadOnlyCollection<int>? productIds, int? excludeBookingId, CancellationToken ct)
    {
        var bookings = context.TrxOrders.AsNoTracking()
            .Where(o => o.OrderType == OrderType && o.Status != null && OpenStatuses.Contains(o.Status));
        if (warehouseId.HasValue) bookings = bookings.Where(o => o.WarehouseId == warehouseId.Value);
        if (excludeBookingId.HasValue) bookings = bookings.Where(o => o.OrderId != excludeBookingId.Value);

        var lines = await context.DtlOrderItems.AsNoTracking()
            .Where(i => bookings.Any(b => b.OrderId == i.OrderId) && (productIds == null || productIds.Count == 0 || productIds.Contains(i.ProductId)))
            .Select(i => new { i.OrderId, i.ProductId, Qty = i.Quantity ?? 0 })
            .ToListAsync(ct);
        if (lines.Count == 0) return new();

        var delivered = await LoadDeliveredAsync(context, lines.Select(l => l.OrderId).Distinct().ToList(), ct);
        return lines.GroupBy(l => new { l.OrderId, l.ProductId })
            .Select(g =>
            {
                var done = delivered.GetValueOrDefault(g.Key.OrderId)?.GetValueOrDefault(g.Key.ProductId) ?? 0;
                return new { g.Key.ProductId, Remaining = Math.Max(0, g.Sum(x => x.Qty) - done) };
            })
            .GroupBy(x => x.ProductId)
            .ToDictionary(g => g.Key, g => g.Sum(x => x.Remaining));
    }
}
