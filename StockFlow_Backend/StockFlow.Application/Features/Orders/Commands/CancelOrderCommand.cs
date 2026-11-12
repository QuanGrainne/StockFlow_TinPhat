using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.SalesBookings.Common;
using StockFlow.Application.Features.Transfers.Helpers;

namespace StockFlow.Application.Features.Orders.Commands;

/// <summary>
/// Hủy hóa đơn bán hàng:
/// - Hoàn lại tồn kho theo các phiếu xuất của hóa đơn (ghi thẻ kho "Hủy hóa đơn", giữ giá vốn hiện tại),
///   phiếu xuất chuyển sang CANCELLED.
/// - Giảm công nợ khách đúng phần còn nợ của hóa đơn; phiếu thu tiền của hóa đơn chuyển sang CANCELLED
///   (tiền khách đã trả coi như trả lại khách).
/// - Hóa đơn chuyển sang CANCELLED. Hóa đơn đã hủy không hủy lại được.
/// </summary>
public record CancelOrderCommand(int OrderId) : IRequest<Result<bool>>, IRetryOnConcurrencyConflict;

public class CancelOrderCommandHandler : IRequestHandler<CancelOrderCommand, Result<bool>>
{
    public const string CancelTransactionType = "ISSUE_SALE_CANCEL";

    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public CancelOrderCommandHandler(IStockFlowDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<bool>> Handle(CancelOrderCommand request, CancellationToken ct)
    {
        if (!_currentUser.UserId.HasValue)
            return Result.Failure<bool>("Không xác định được người dùng đăng nhập.");
        var userId = _currentUser.UserId.Value;

        var order = await _context.TrxOrders
            .Include(o => o.Partner)
            .Include(o => o.DtlOrderItems)
            .Include(o => o.TrxStockIssues).ThenInclude(si => si.DtlStockIssueItems)
            .FirstOrDefaultAsync(o => o.OrderId == request.OrderId, ct);
        if (order == null)
            return Result.Failure<bool>("Không tìm thấy hóa đơn.");
        if (order.OrderType == SalesBookingOps.OrderType)
            return Result.Failure<bool>("Đây là đơn đặt hàng — hủy ở màn Đặt hàng.");
        if (string.Equals(order.Status, "CANCELLED", StringComparison.OrdinalIgnoreCase))
            return Result.Failure<bool>($"Hóa đơn {order.OrderCode} đã hủy trước đó.");
        var activeReturn = await _context.TrxReturnRequests.AsNoTracking()
            .Where(r => r.SalesOrderId == order.OrderId && r.Status != "CANCELLED")
            .Select(r => r.ReturnCode).FirstOrDefaultAsync(ct);
        if (activeReturn != null)
            return Result.Failure<bool>($"Hóa đơn {order.OrderCode} đã có phiếu trả hàng {activeReturn} — hủy phiếu trả hàng trước.");

        foreach (var issue in order.TrxStockIssues)
        {
            if (!await _currentUser.HasWarehouseAccessAsync(issue.WarehouseId, ct))
                return Result.Failure<bool>("Bạn không có quyền hủy hóa đơn của chi nhánh này.");
        }

        var productIds = order.DtlOrderItems.Select(i => i.ProductId).Distinct().ToList();
        var products = await _context.MstProducts.Where(p => productIds.Contains(p.ProductId)).ToDictionaryAsync(p => p.ProductId, ct);
        var itemProduct = order.DtlOrderItems.ToDictionary(i => i.OrderItemId, i => i.ProductId);

        // 1. Hoàn tồn kho theo phiếu xuất đã hoàn thành
        foreach (var issue in order.TrxStockIssues.Where(si => !string.Equals(si.Status, "CANCELLED", StringComparison.OrdinalIgnoreCase)))
        {
            foreach (var line in issue.DtlStockIssueItems)
            {
                var qty = line.ActualIssuedQty ?? 0;
                if (qty <= 0 || !line.OrderItemId.HasValue || !itemProduct.TryGetValue(line.OrderItemId.Value, out var productId)) continue;
                var product = products[productId];
                var (_, cost) = await TransferStockOps.WarehouseStockAsync(_context, issue.WarehouseId, product, ct);
                await TransferStockOps.InboundAsync(_context, issue.WarehouseId, product, qty, cost,
                    CancelTransactionType, issue.StockIssueId, userId, ct, "STOCK_ISSUE");
            }
            issue.Status = "CANCELLED";
        }

        // 2. Công nợ khách: bỏ phần còn nợ của hóa đơn; hủy phiếu thu của hóa đơn
        if (string.Equals(order.Status, "COMPLETED", StringComparison.OrdinalIgnoreCase) && order.Partner != null)
        {
            // Tiền trả trước của đơn đặt đã trừ vào hóa đơn trả lại cho đơn đặt (khách vẫn đang trả trước)
            order.Partner.CurrentDebt = (order.Partner.CurrentDebt ?? 0) - (order.OutstandingAmount ?? 0) - order.DepositAmount;
        }
        var receipts = await _context.TrxFinancialTransactions
            .Where(t => t.ReferenceType == "SALES_ORDER" && t.ReferenceId == order.OrderId && t.Status != "CANCELLED")
            .ToListAsync(ct);
        foreach (var r in receipts) r.Status = "CANCELLED";

        // 3. Hóa đơn
        order.Status = "CANCELLED";
        order.UpdatedAt = VietnamTime.Now;
        order.UpdatedBy = userId;

        await _context.SaveChangesAsync(ct);

        // Hóa đơn giao của đơn đặt hàng: SL đã giao giảm → mở lại đơn (Đang giao / Đã xác nhận)
        if (order.BookingOrderId.HasValue)
        {
            await SalesBookingOps.RecomputeStatusAsync(_context, order.BookingOrderId.Value, userId, ct);
            await _context.SaveChangesAsync(ct);
        }
        return Result.Success(true);
    }
}
