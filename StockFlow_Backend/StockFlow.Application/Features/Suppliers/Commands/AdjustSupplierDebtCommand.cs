using System.Globalization;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Suppliers.Commands;

/// <summary>Đầu vào phiếu điều chỉnh công nợ nhà cung cấp</summary>
public class AdjustSupplierDebtRequest
{
    /// <summary>
    /// Giá trị nợ điều chỉnh = Nợ cần trả NCC SAU điều chỉnh:
    /// dương = cửa hàng nợ NCC; âm = NCC nợ cửa hàng (trả thừa, NCC hoàn tiền...); 0 = hết nợ.
    /// </summary>
    public decimal NewDebt { get; set; }
    /// <summary>Thời gian điều chỉnh (ISO từ trình duyệt); bỏ trống = bây giờ. Không được ở tương lai.</summary>
    public DateTime? AdjustDate { get; set; }
    public string? Description { get; set; }
}

public record AdjustSupplierDebtResultDto(string Code, decimal OldDebt, decimal NewDebt, decimal Difference);

/// <summary>
/// Điều chỉnh công nợ nhà cung cấp (thao tác "Điều chỉnh"), đối xứng với điều chỉnh công nợ khách hàng:
/// đặt Nợ cần trả NCC bằng "Giá trị nợ điều chỉnh". Ghi 1 phiếu mã DC000001...
/// (trx_financial_transactions, tx_type = SUPPLIER_DEBT_ADJUST, amount = nợ sau − nợ trước)
/// để sổ "Nợ cần trả nhà cung cấp" có dòng "Điều chỉnh" (Giá trị = chênh lệch, Dư nợ = giá trị nhập).
/// </summary>
public record AdjustSupplierDebtCommand(int PartnerId, AdjustSupplierDebtRequest Request) : IRequest<Result<AdjustSupplierDebtResultDto>>;

public class AdjustSupplierDebtCommandValidator : AbstractValidator<AdjustSupplierDebtCommand>
{
    public AdjustSupplierDebtCommandValidator()
    {
        RuleFor(x => x.Request.NewDebt)
            .InclusiveBetween(-1_000_000_000_000m, 1_000_000_000_000m).WithMessage("Giá trị nợ điều chỉnh không hợp lệ.");
        RuleFor(x => x.Request.Description)
            .MaximumLength(500).WithMessage("Mô tả tối đa 500 ký tự.");
    }
}

public class AdjustSupplierDebtCommandHandler : IRequestHandler<AdjustSupplierDebtCommand, Result<AdjustSupplierDebtResultDto>>
{
    public const string TxType = "SUPPLIER_DEBT_ADJUST";
    private static readonly CultureInfo Vi = CultureInfo.GetCultureInfo("vi-VN");

    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public AdjustSupplierDebtCommandHandler(IStockFlowDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<AdjustSupplierDebtResultDto>> Handle(AdjustSupplierDebtCommand command, CancellationToken ct)
    {
        if (!_currentUser.UserId.HasValue)
            return Result.Failure<AdjustSupplierDebtResultDto>("Không xác định được người dùng đăng nhập.");
        var req = command.Request;

        var partner = await _context.MstBusinessPartners
            .FirstOrDefaultAsync(p => p.PartnerId == command.PartnerId && (p.PartnerType == "SUPPLIER" || p.PartnerType == "BOTH"), ct);
        if (partner == null) return Result.Failure<AdjustSupplierDebtResultDto>("Không tìm thấy nhà cung cấp.");

        var oldDebt = partner.CurrentPayable ?? 0m;
        var newDebt = Math.Round(req.NewDebt, 0, MidpointRounding.AwayFromZero);
        var diff = newDebt - oldDebt;
        if (diff == 0)
            return Result.Failure<AdjustSupplierDebtResultDto>("Giá trị nợ điều chỉnh bằng nợ cần trả hiện tại — không có gì thay đổi.");

        var now = VietnamTime.Now;
        var date = req.AdjustDate.HasValue ? VietnamTime.From(req.AdjustDate) : now;
        if (date > now.AddMinutes(1))
            return Result.Failure<AdjustSupplierDebtResultDto>("Không được điều chỉnh công nợ với thời gian trong tương lai.");

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
            partner.CurrentPayable = newDebt;

            await _context.SaveChangesAsync(ct);
            if (tx != null) await tx.CommitAsync(ct);
            return Result.Success(new AdjustSupplierDebtResultDto(code, oldDebt, newDebt, diff));
        }
        catch
        {
            if (tx != null) await tx.RollbackAsync(ct);
            throw;
        }
    }
}
