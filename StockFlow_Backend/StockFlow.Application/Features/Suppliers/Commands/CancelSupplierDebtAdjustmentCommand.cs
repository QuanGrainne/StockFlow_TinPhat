using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;

namespace StockFlow.Application.Features.Suppliers.Commands;

/// <summary>
/// Xóa (hủy) phiếu điều chỉnh công nợ NCC DC...: phiếu chuyển CANCELLED, bỏ khỏi sổ công nợ,
/// nợ cần trả hiện tại trừ lại đúng chênh lệch của phiếu.
/// </summary>
public record CancelSupplierDebtAdjustmentCommand(int PartnerId, string Code) : IRequest<Result<bool>>;

public class CancelSupplierDebtAdjustmentCommandHandler : IRequestHandler<CancelSupplierDebtAdjustmentCommand, Result<bool>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public CancelSupplierDebtAdjustmentCommandHandler(IStockFlowDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<bool>> Handle(CancelSupplierDebtAdjustmentCommand command, CancellationToken ct)
    {
        if (!_currentUser.UserId.HasValue) return Result.Failure<bool>("Không xác định được người dùng đăng nhập.");
        var code = (command.Code ?? "").Trim().ToUpper();

        var tx = await _context.TrxFinancialTransactions
            .FirstOrDefaultAsync(t => t.PartnerId == command.PartnerId && t.TxType == AdjustSupplierDebtCommandHandler.TxType
                                      && t.TxCode != null && t.TxCode.ToUpper() == code && t.Status != "CANCELLED", ct);
        if (tx == null) return Result.Failure<bool>("Không tìm thấy phiếu điều chỉnh.");
        var partner = await _context.MstBusinessPartners.FirstOrDefaultAsync(p => p.PartnerId == command.PartnerId, ct);
        if (partner == null) return Result.Failure<bool>("Không tìm thấy nhà cung cấp.");

        tx.Status = "CANCELLED";
        partner.CurrentPayable = (partner.CurrentPayable ?? 0) - (tx.Amount ?? 0);
        await _context.SaveChangesAsync(ct);
        return Result.Success(true);
    }
}
