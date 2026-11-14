using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Suppliers.Queries;

namespace StockFlow.Application.Features.Suppliers.Commands;

/// <summary>
/// Sửa phiếu điều chỉnh công nợ NCC DC...: đổi "Giá trị nợ điều chỉnh" (nợ cần trả ngay sau phiếu), ngày, mô tả.
/// Chênh lệch của phiếu = chênh lệch cũ + (giá trị mới − giá trị cũ); nợ cần trả hiện tại đổi đúng phần đó.
/// </summary>
public record UpdateSupplierDebtAdjustmentCommand(int PartnerId, string Code, AdjustSupplierDebtRequest Request) : IRequest<Result<bool>>;

public class UpdateSupplierDebtAdjustmentCommandHandler : IRequestHandler<UpdateSupplierDebtAdjustmentCommand, Result<bool>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly ISender _sender;

    public UpdateSupplierDebtAdjustmentCommandHandler(IStockFlowDbContext context, ICurrentUserService currentUser, ISender sender)
    {
        _context = context;
        _currentUser = currentUser;
        _sender = sender;
    }

    public async Task<Result<bool>> Handle(UpdateSupplierDebtAdjustmentCommand command, CancellationToken ct)
    {
        if (!_currentUser.UserId.HasValue) return Result.Failure<bool>("Không xác định được người dùng đăng nhập.");
        var req = command.Request;
        var code = (command.Code ?? "").Trim().ToUpper();

        var tx = await _context.TrxFinancialTransactions
            .FirstOrDefaultAsync(t => t.PartnerId == command.PartnerId && t.TxType == AdjustSupplierDebtCommandHandler.TxType
                                      && t.TxCode != null && t.TxCode.ToUpper() == code && t.Status != "CANCELLED", ct);
        if (tx == null) return Result.Failure<bool>("Không tìm thấy phiếu điều chỉnh.");
        var partner = await _context.MstBusinessPartners.FirstOrDefaultAsync(p => p.PartnerId == command.PartnerId, ct);
        if (partner == null) return Result.Failure<bool>("Không tìm thấy nhà cung cấp.");

        var now = VietnamTime.Now;
        var date = req.AdjustDate.HasValue ? VietnamTime.From(req.AdjustDate) : tx.TransactionDate ?? now;
        if (date > now.AddMinutes(1)) return Result.Failure<bool>("Không được điều chỉnh công nợ với thời gian trong tương lai.");

        // Giá trị cũ (nợ ngay sau phiếu) lấy từ sổ công nợ trên server, không tin số từ trình duyệt
        var oldAfter = await SupplierDebtAdjustmentLedger.DebtAfterAsync(_sender, command.PartnerId, tx.TxCode!, ct);
        if (oldAfter == null) return Result.Failure<bool>("Không đọc được sổ công nợ của nhà cung cấp.");
        var newAfter = Math.Round(req.NewDebt, 0, MidpointRounding.AwayFromZero);
        var delta = newAfter - oldAfter.Value;
        var newAmount = (tx.Amount ?? 0) + delta;
        if (newAmount == 0)
            return Result.Failure<bool>("Giá trị mới bằng nợ trước phiếu — phiếu không còn chênh lệch, dùng Xóa để bỏ phiếu điều chỉnh.");

        tx.Amount = newAmount;
        tx.TransactionDate = date;
        tx.Description = string.IsNullOrWhiteSpace(req.Description) ? null : req.Description.Trim();
        partner.CurrentPayable = (partner.CurrentPayable ?? 0) + delta;
        await _context.SaveChangesAsync(ct);
        return Result.Success(true);
    }
}
