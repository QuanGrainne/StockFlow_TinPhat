using System.Globalization;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Customers.Commands;

/// <summary>Đầu vào phiếu điều chỉnh công nợ khách hàng</summary>
public class AdjustCustomerDebtRequest
{
    /// <summary>
    /// Giá trị nợ điều chỉnh = Nợ cần thu SAU điều chỉnh (như KiotViet):
    /// dương = khách nợ cửa hàng; âm = cửa hàng nợ khách; 0 = hết nợ. Sổ công nợ ghi chênh lệch (sau − trước).
    /// </summary>
    public decimal NewDebt { get; set; }
    /// <summary>Thời gian điều chỉnh (ISO từ trình duyệt); bỏ trống = bây giờ. Không được ở tương lai.</summary>
    public DateTime? AdjustDate { get; set; }
    public string? Description { get; set; }
}

public record AdjustCustomerDebtResultDto(string Code, decimal OldDebt, decimal NewDebt, decimal Difference);

/// <summary>
/// Điều chỉnh công nợ khách hàng (mẫu KiotViet "Điều chỉnh"): đặt Nợ cần thu bằng "Giá trị nợ điều chỉnh".
/// Dương = khách nợ cửa hàng; âm = cửa hàng nợ khách (khách trả thừa, đặt cọc, hoàn tiền đổi trả...); 0 = hết nợ.
/// Ghi 1 phiếu mã DC000001... (trx_financial_transactions, tx_type = DEBT_ADJUST, amount = nợ sau − nợ trước)
/// để sổ công nợ có dòng "Điều chỉnh" (cột Giá trị = chênh lệch, Dư nợ = giá trị nhập).
/// Dùng cho nợ đầu kỳ, sai lệch so với thực tế, khoản phát sinh ngoài hóa đơn (VD đã trả tiền khách ngoài hệ thống → về 0).
/// </summary>
public record AdjustCustomerDebtCommand(int PartnerId, AdjustCustomerDebtRequest Request) : IRequest<Result<AdjustCustomerDebtResultDto>>;

public class AdjustCustomerDebtCommandValidator : AbstractValidator<AdjustCustomerDebtCommand>
{
    public AdjustCustomerDebtCommandValidator()
    {
        RuleFor(x => x.Request.NewDebt)
            .InclusiveBetween(-1_000_000_000_000m, 1_000_000_000_000m).WithMessage("Giá trị nợ điều chỉnh không hợp lệ.");
        RuleFor(x => x.Request.Description)
            .MaximumLength(500).WithMessage("Mô tả tối đa 500 ký tự.");
    }
}

public class AdjustCustomerDebtCommandHandler : IRequestHandler<AdjustCustomerDebtCommand, Result<AdjustCustomerDebtResultDto>>
{
    public const string TxType = "DEBT_ADJUST";
    private const string WalkInCustomerCode = "KH00000";
    private static readonly CultureInfo Vi = CultureInfo.GetCultureInfo("vi-VN");

    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public AdjustCustomerDebtCommandHandler(IStockFlowDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<AdjustCustomerDebtResultDto>> Handle(AdjustCustomerDebtCommand command, CancellationToken ct)
    {
        if (!_currentUser.UserId.HasValue)
            return Result.Failure<AdjustCustomerDebtResultDto>("Không xác định được người dùng đăng nhập.");
        var req = command.Request;

        var partner = await _context.MstBusinessPartners
            .FirstOrDefaultAsync(p => p.PartnerId == command.PartnerId && p.PartnerType == "CUSTOMER", ct);
        if (partner == null) return Result.Failure<AdjustCustomerDebtResultDto>("Không tìm thấy khách hàng.");
        if (partner.PartnerCode == WalkInCustomerCode)
            return Result.Failure<AdjustCustomerDebtResultDto>("Khách lẻ không có công nợ để điều chỉnh.");

        var oldDebt = partner.CurrentDebt ?? 0m;
        var newDebt = Math.Round(req.NewDebt, 0, MidpointRounding.AwayFromZero);
        var diff = newDebt - oldDebt;
        if (diff == 0)
            return Result.Failure<AdjustCustomerDebtResultDto>("Giá trị nợ điều chỉnh bằng nợ cần thu hiện tại — không có gì thay đổi.");

        var now = VietnamTime.Now;
        var date = req.AdjustDate.HasValue ? VietnamTime.From(req.AdjustDate) : now;
        if (date > now.AddMinutes(1))
            return Result.Failure<AdjustCustomerDebtResultDto>("Không được điều chỉnh công nợ với thời gian trong tương lai.");

        using var tx = await _context.BeginTransactionAsync(ct);
        try
        {
            var seq = await _context.GetNextSequenceValueAsync(DebtAdjustCodes.Sequence, ct);
            var code = $"{DebtAdjustCodes.Prefix}{seq:D6}";
            var note = string.IsNullOrWhiteSpace(req.Description)
                ? $"Điều chỉnh nợ từ {oldDebt.ToString("N0", Vi)} thành {newDebt.ToString("N0", Vi)}"
                : req.Description.Trim();

            _context.TrxFinancialTransactions.Add(new TrxFinancialTransaction
            {
                PartnerId = partner.PartnerId,
                TxType = TxType,
                TxCode = code,
                Amount = diff,
                TransactionDate = date,
                CreatedBy = _currentUser.UserId.Value,
                Status = "COMPLETED",
                Description = note,
            });
            partner.CurrentDebt = newDebt;

            await _context.SaveChangesAsync(ct);
            if (tx != null) await tx.CommitAsync(ct);
            return Result.Success(new AdjustCustomerDebtResultDto(code, oldDebt, newDebt, diff));
        }
        catch
        {
            if (tx != null) await tx.RollbackAsync(ct);
            throw;
        }
    }
}
