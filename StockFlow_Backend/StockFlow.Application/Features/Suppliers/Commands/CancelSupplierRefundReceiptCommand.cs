using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.PurchaseReturns.Helpers;

namespace StockFlow.Application.Features.Suppliers.Commands;

/// <summary>
/// Hủy phiếu thu tiền NCC độc lập (PT..., không gắn phiếu trả hàng nhập): đánh dấu CANCELLED và trừ lại
/// Nợ cần trả NCC đúng số tiền của phiếu (NCC lại nợ cửa hàng như trước khi thu). Phiếu thu theo phiếu trả hàng
/// nhập không hủy ở đây (gắn với phiếu trả).
/// </summary>
public record CancelSupplierRefundReceiptCommand(int PartnerId, string Code) : IRequest<Result<bool>>;

public class CancelSupplierRefundReceiptCommandHandler : IRequestHandler<CancelSupplierRefundReceiptCommand, Result<bool>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public CancelSupplierRefundReceiptCommandHandler(IStockFlowDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<bool>> Handle(CancelSupplierRefundReceiptCommand command, CancellationToken ct)
    {
        if (!_currentUser.UserId.HasValue)
            return Result.Failure<bool>("Không xác định được người dùng đăng nhập.");
        var code = (command.Code ?? "").Trim();

        var partner = await _context.MstBusinessPartners.FirstOrDefaultAsync(p => p.PartnerId == command.PartnerId, ct);
        if (partner == null) return Result.Failure<bool>("Không tìm thấy nhà cung cấp.");

        var txs = await _context.TrxFinancialTransactions
            .Where(t => t.PartnerId == partner.PartnerId && t.TxCode == code && t.TxType == PurchaseReturnLogic.RefundTxType)
            .ToListAsync(ct);
        if (txs.Count == 0) return Result.Failure<bool>($"Không tìm thấy phiếu thu {code}.");
        if (txs.Any(t => t.ReferenceType != CreateSupplierRefundReceiptCommandHandler.ReferenceType))
            return Result.Failure<bool>($"Phiếu {code} gắn với phiếu trả hàng nhập — hủy ở phiếu trả hàng nhập.");
        var active = txs.Where(t => t.Status != "CANCELLED").ToList();
        if (active.Count == 0) return Result.Failure<bool>($"Phiếu {code} đã hủy trước đó.");

        await using var transaction = await _context.BeginTransactionAsync(ct);
        try
        {
            foreach (var t in active) t.Status = "CANCELLED";
            partner.CurrentPayable = (partner.CurrentPayable ?? 0m) - active.Sum(t => t.Amount ?? 0);
            await _context.SaveChangesAsync(ct);
            if (transaction != null) await transaction.CommitAsync(ct);
            return Result.Success(true);
        }
        catch (Exception ex)
        {
            if (transaction != null) await transaction.RollbackAsync(ct);
            return Result.Failure<bool>($"Lỗi khi hủy phiếu thu: {ex.InnerException?.Message ?? ex.Message}");
        }
    }
}
