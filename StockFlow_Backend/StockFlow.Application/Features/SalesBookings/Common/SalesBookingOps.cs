using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.SalesBookings.Common;

/// <summary>
/// Đơn đặt hàng của khách (UC-14, BR-07/08): lưu chung bảng trx_orders với order_type = BOOKING.
/// Tạo / sửa đơn KHÔNG trừ tồn kho; tồn chỉ bị trừ khi tạo hóa đơn từ đơn (giao 1 phần hoặc toàn bộ — BR-16/17).
/// Tiền khách trả trước = phiếu thu tham chiếu tới đơn (giảm công nợ ngay), khi tạo hóa đơn được trừ vào hóa đơn.
/// </summary>
public static class SalesBookingOps
{
    public const string OrderType = "BOOKING";
    public const string InvoiceType = "INVOICE";

    /// <summary>Phiếu tạm</summary>
    public const string Draft = "DRAFT";
    /// <summary>Đã xác nhận</summary>
    public const string Confirmed = "CONFIRMED";
    /// <summary>Đang giao hàng: đã tạo hóa đơn cho 1 phần hàng</summary>
    public const string Delivering = "DELIVERING";
    /// <summary>Hoàn thành: đã giao đủ hoặc người dùng kết thúc đơn</summary>
    public const string Finished = "FINISHED";
    public const string Cancelled = "CANCELLED";

    public static readonly string[] AllStatuses = { Draft, Confirmed, Delivering, Finished, Cancelled };

    /// <summary>Trạng thái còn giao tiếp được (tạo hóa đơn, giữ hàng)</summary>
    public static readonly string[] OpenStatuses = { Draft, Confirmed, Delivering };

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

    /// <summary>
    /// Cập nhật trạng thái đơn đặt theo số lượng đã giao: chưa giao → giữ Phiếu tạm / Đã xác nhận,
    /// giao 1 phần → Đang giao hàng, giao đủ mọi mặt hàng → Hoàn thành. Đơn đã hủy / đã kết thúc tay không đổi.
    /// </summary>
    public static async Task RecomputeStatusAsync(IStockFlowDbContext context, int bookingId, int userId, CancellationToken ct)
    {
        var booking = await context.TrxOrders.Include(o => o.DtlOrderItems)
            .FirstOrDefaultAsync(o => o.OrderId == bookingId && o.OrderType == OrderType, ct);
        if (booking == null || string.Equals(booking.Status, Cancelled, StringComparison.OrdinalIgnoreCase)) return;

        var delivered = (await LoadDeliveredAsync(context, new[] { bookingId }, ct)).GetValueOrDefault(bookingId) ?? new();
        var ordered = booking.DtlOrderItems.GroupBy(i => i.ProductId).ToDictionary(g => g.Key, g => g.Sum(x => x.Quantity ?? 0));
        var anyDelivered = delivered.Values.Any(q => q > 0);
        var allDelivered = ordered.Count > 0 && ordered.All(o => delivered.GetValueOrDefault(o.Key) >= o.Value);

        // Gọi sau khi tạo / hủy hóa đơn của đơn: tính lại từ số liệu (hủy hóa đơn của đơn đã kết thúc → mở lại đơn)
        var next = allDelivered ? Finished
            : anyDelivered ? Delivering
            : string.Equals(booking.Status, Draft, StringComparison.OrdinalIgnoreCase) ? Draft : Confirmed;

        if (!string.Equals(booking.Status, next, StringComparison.OrdinalIgnoreCase))
        {
            booking.Status = next;
            booking.UpdatedAt = StockFlow.Application.Common.VietnamTime.Now;
            booking.UpdatedBy = userId;
        }
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
