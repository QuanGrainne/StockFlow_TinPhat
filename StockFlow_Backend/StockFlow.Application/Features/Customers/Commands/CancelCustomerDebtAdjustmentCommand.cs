using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;

namespace StockFlow.Application.Features.Customers.Commands;

/// <summary>
/// Xóa (hủy) phiếu điều chỉnh công nợ DC...: phiếu chuyển CANCELLED, bỏ khỏi sổ công nợ,
/// công nợ hiện tại của khách trừ lại đúng chênh lệch của phiếu.
/// </summary>
public record CancelCustomerDebtAdjustmentCommand(int PartnerId, string Code) : IRequest<Result<bool>>;

public class CancelCustomerDebtAdjustmentCommandHandler : IRequestHandler<CancelCustomerDebtAdjustmentCommand, Result<bool>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public CancelCustomerDebtAdjustmentCommandHandler(IStockFlowDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<bool>> Handle(CancelCustomerDebtAdjustmentCommand command, CancellationToken ct)
    {
        if (!_currentUser.UserId.HasValue) return Result.Failure<bool>("Không xác định được người dùng đăng nhập.");
        var code = (command.Code ?? "").Trim().ToUpper();

        var tx = await _context.TrxFinancialTransactions
            .FirstOrDefaultAsync(t => t.PartnerId == command.PartnerId && t.TxType == AdjustCustomerDebtCommandHandler.TxType
                                      && t.TxCode != null && t.TxCode.ToUpper() == code && t.Status != "CANCELLED", ct);
        if (tx == null) return Result.Failure<bool>("Không tìm thấy phiếu điều chỉnh.");
        var partner = await _context.MstBusinessPartners.FirstOrDefaultAsync(p => p.PartnerId == command.PartnerId, ct);
        if (partner == null) return Result.Failure<bool>("Không tìm thấy khách hàng.");

        tx.Status = "CANCELLED";
        partner.CurrentDebt = (partner.CurrentDebt ?? 0) - (tx.Amount ?? 0);
        await _context.SaveChangesAsync(ct);
        return Result.Success(true);
    }
}
