using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.SalesReturns.Queries;

namespace StockFlow.Application.Features.Customers.Commands;

/// <summary>
/// Hủy phiếu chi trả tiền khách độc lập (PC..., không gắn phiếu trả hàng): đánh dấu CANCELLED và trừ lại
/// Nợ cần thu đúng số tiền của phiếu (cửa hàng lại nợ khách như trước khi trả). Tiền trả theo phiếu trả hàng
/// không hủy ở đây (gắn với phiếu trả hàng).
/// </summary>
public record CancelCustomerDebtRefundCommand(int PartnerId, string Code) : IRequest<Result<bool>>;

public class CancelCustomerDebtRefundCommandHandler : IRequestHandler<CancelCustomerDebtRefundCommand, Result<bool>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public CancelCustomerDebtRefundCommandHandler(IStockFlowDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<bool>> Handle(CancelCustomerDebtRefundCommand command, CancellationToken ct)
    {
        if (!_currentUser.UserId.HasValue)
            return Result.Failure<bool>("Không xác định được người dùng đăng nhập.");
        var code = (command.Code ?? "").Trim();

        var partner = await _context.MstBusinessPartners
            .FirstOrDefaultAsync(p => p.PartnerId == command.PartnerId && p.PartnerType == "CUSTOMER", ct);
        if (partner == null) return Result.Failure<bool>("Không tìm thấy khách hàng.");

        var txs = await _context.TrxFinancialTransactions
            .Where(t => t.PartnerId == partner.PartnerId && t.TxCode == code && t.TxType == SalesReturnOps.RefundTxType)
            .ToListAsync(ct);
        if (txs.Count == 0) return Result.Failure<bool>($"Không tìm thấy phiếu chi {code}.");
        if (txs.Any(t => t.ReferenceType != CreateCustomerDebtRefundCommandHandler.ReferenceType))
            return Result.Failure<bool>($"Phiếu {code} gắn với phiếu trả hàng — hủy ở phiếu trả hàng.");
        var active = txs.Where(t => t.Status != "CANCELLED").ToList();
        if (active.Count == 0) return Result.Failure<bool>($"Phiếu {code} đã hủy trước đó.");

        await using var transaction = await _context.BeginTransactionAsync(ct);
        try
        {
            foreach (var t in active) t.Status = "CANCELLED";
            partner.CurrentDebt = (partner.CurrentDebt ?? 0m) - active.Sum(t => t.Amount ?? 0);
            await _context.SaveChangesAsync(ct);
            if (transaction != null) await transaction.CommitAsync(ct);
            return Result.Success(true);
        }
        catch (Exception ex)
        {
            if (transaction != null) await transaction.RollbackAsync(ct);
            return Result.Failure<bool>($"Lỗi khi hủy phiếu chi: {ex.InnerException?.Message ?? ex.Message}");
        }
    }
}
