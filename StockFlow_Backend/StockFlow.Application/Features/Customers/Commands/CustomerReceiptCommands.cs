using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Customers.DTOs;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Customers.Commands;

internal static class CustomerReceiptLookup
{
    /// <summary>Các dòng giao dịch RECEIPT của khách mang mã phiếu thu này (1 phiếu có thể gồm nhiều dòng).</summary>
    public static Task<List<TrxFinancialTransaction>> LoadAsync(
        IStockFlowDbContext context, int partnerId, string code, CancellationToken ct)
    {
        var c = (code ?? "").Trim().ToUpper();
        return context.TrxFinancialTransactions
            .Where(t => t.PartnerId == partnerId && t.TxType == "RECEIPT" && t.TxCode != null && t.TxCode.ToUpper() == c)
            .ToListAsync(ct);
    }
}

/// <summary>Sửa phiếu thu: thời gian, phương thức thanh toán, ghi chú. Phiếu đã hủy không sửa được.</summary>
public record UpdateCustomerReceiptCommand(int PartnerId, string Code, UpdateCustomerReceiptRequest Request)
    : IRequest<Result<bool>>;

public class UpdateCustomerReceiptCommandHandler : IRequestHandler<UpdateCustomerReceiptCommand, Result<bool>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public UpdateCustomerReceiptCommandHandler(IStockFlowDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<bool>> Handle(UpdateCustomerReceiptCommand command, CancellationToken cancellationToken)
    {
        if (!_currentUserService.UserId.HasValue)
            return Result.Failure<bool>("Không xác định được người dùng đăng nhập.");

        var lines = await CustomerReceiptLookup.LoadAsync(_context, command.PartnerId, command.Code, cancellationToken);
        if (lines.Count == 0)
            return Result.Failure<bool>($"Không tìm thấy phiếu thu {command.Code}.");
        if (lines.All(t => t.Status == "CANCELLED"))
            return Result.Failure<bool>($"Phiếu thu {command.Code} đã hủy, không thể sửa.");

        var req = command.Request;
        if (req.TransactionDate.HasValue)
        {
            var date = VietnamTime.From(req.TransactionDate);
            if (date > VietnamTime.Now.AddMinutes(1))
                return Result.Failure<bool>("Thời gian phiếu thu không được ở tương lai.");
            foreach (var t in lines) t.TransactionDate = date;
        }

        var method = string.IsNullOrWhiteSpace(req.PaymentMethod) ? null : req.PaymentMethod.Trim().ToUpperInvariant();
        var notes = string.IsNullOrWhiteSpace(req.Notes) ? null : req.Notes.Trim();
        foreach (var t in lines)
        {
            if (method != null) t.PaymentMethod = method;
            t.Description = notes;
        }

        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success(true);
    }
}

/// <summary>
/// Hủy phiếu thu: các dòng chuyển CANCELLED, hoàn lại số đã trả / còn nợ của hóa đơn được phân bổ
/// và cộng lại tổng tiền phiếu vào nợ của khách.
/// </summary>
public record CancelCustomerReceiptCommand(int PartnerId, string Code) : IRequest<Result<bool>>;

public class CancelCustomerReceiptCommandHandler : IRequestHandler<CancelCustomerReceiptCommand, Result<bool>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public CancelCustomerReceiptCommandHandler(IStockFlowDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<bool>> Handle(CancelCustomerReceiptCommand command, CancellationToken cancellationToken)
    {
        if (!_currentUserService.UserId.HasValue)
            return Result.Failure<bool>("Không xác định được người dùng đăng nhập.");
        var userId = _currentUserService.UserId.Value;

        var lines = (await CustomerReceiptLookup.LoadAsync(_context, command.PartnerId, command.Code, cancellationToken))
            .Where(t => t.Status != "CANCELLED")
            .ToList();
        if (lines.Count == 0)
            return Result.Failure<bool>($"Không tìm thấy phiếu thu {command.Code} hoặc phiếu đã hủy.");

        var partner = await _context.MstBusinessPartners
            .FirstOrDefaultAsync(p => p.PartnerId == command.PartnerId, cancellationToken);
        if (partner == null)
            return Result.Failure<bool>("Không tìm thấy khách hàng.");

        var orderIds = lines.Where(t => t.ReferenceType == "SALES_ORDER" && t.ReferenceId.HasValue)
            .Select(t => t.ReferenceId!.Value).Distinct().ToList();
        var orders = await _context.TrxOrders.Where(o => orderIds.Contains(o.OrderId)).ToListAsync(cancellationToken);
        if (orders.Any(o => string.Equals(o.Status, "CANCELLED", StringComparison.OrdinalIgnoreCase)))
            return Result.Failure<bool>("Hóa đơn của phiếu thu này đã hủy.");
        var bookingIdsOfReceipt = orders.Where(o => o.OrderType == "BOOKING").Select(o => o.OrderId).ToList();
        if (bookingIdsOfReceipt.Count > 0 && await _context.TrxOrders.AnyAsync(o => o.BookingOrderId.HasValue && bookingIdsOfReceipt.Contains(o.BookingOrderId.Value) && o.Status == "COMPLETED", cancellationToken))
            return Result.Failure<bool>("Tiền trả trước của đơn đặt hàng đã được trừ vào hóa đơn giao hàng, không hủy phiếu thu được.");

        var dbContext = _context as DbContext;
        using var transaction = dbContext != null ? await dbContext.Database.BeginTransactionAsync(cancellationToken) : null;
        try
        {
            decimal total = 0;
            foreach (var t in lines)
            {
                var amount = t.Amount ?? 0;
                total += amount;
                t.Status = "CANCELLED";

                var order = t.ReferenceType == "SALES_ORDER" ? orders.FirstOrDefault(o => o.OrderId == t.ReferenceId) : null;
                if (order == null) continue;
                order.PaidAmount = Math.Max(0, (order.PaidAmount ?? 0) - amount);
                // Đơn đặt hàng: tiền trả trước không phải công nợ của đơn
                if (order.OrderType != "BOOKING")
                    order.OutstandingAmount = (order.OutstandingAmount ?? 0) + amount;
                order.PaymentStatus = (order.PaidAmount ?? 0) > 0 ? "PARTIAL" : "DEBT";
                order.UpdatedAt = VietnamTime.Now;
                order.UpdatedBy = userId;
            }

            partner.CurrentDebt = (partner.CurrentDebt ?? 0) + total;

            await _context.SaveChangesAsync(cancellationToken);
            if (transaction != null) await transaction.CommitAsync(cancellationToken);
            return Result.Success(true);
        }
        catch (Exception ex)
        {
            if (transaction != null) await transaction.RollbackAsync(cancellationToken);
            return Result.Failure<bool>($"Lỗi khi hủy phiếu thu: {ex.Message}");
        }
    }
}
