using System.Globalization;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Customers.DTOs;
using StockFlow.Application.Features.Customers.Helpers;
using StockFlow.Application.Features.SalesReturns.Queries;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Customers.Commands;

/// <summary>
/// Phiếu chi trả tiền cho khách (PC000001...) khi cửa hàng đang nợ khách (Nợ cần thu &lt; 0), không gắn phiếu trả hàng
/// — VD trả lại tiền khách trả thừa / tiền đặt cọc / khoản đã điều chỉnh âm. Đối xứng với phiếu thu nợ khách (PT...).
/// - Số tiền &gt; 0 và ≤ số cửa hàng đang nợ khách (−Nợ cần thu). Khách lẻ không có công nợ.
/// - Ghi 1 giao dịch CUSTOMER_REFUND (cùng loại với "Trả tiền khách" của phiếu trả hàng) nên sổ công nợ khách có dòng
///   "Trả tiền khách"; Nợ cần thu tăng đúng số tiền (về phía 0).
/// - Mã PC dùng chung dãy số với phiếu chi trả nợ NCC (seq_supplier_payment) để mọi phiếu chi PC... không trùng mã.
/// </summary>
public record CreateCustomerDebtRefundCommand(int PartnerId, CreateCustomerDebtRefundRequest Request)
    : IRequest<Result<CustomerDebtRefundResultDto>>;

public class CreateCustomerDebtRefundCommandHandler
    : IRequestHandler<CreateCustomerDebtRefundCommand, Result<CustomerDebtRefundResultDto>>
{
    /// <summary>Giao dịch không gắn chứng từ: tham chiếu đến chính khách hàng (không có ReferenceId)</summary>
    public const string ReferenceType = "CUSTOMER";
    private const string VoucherPrefix = "PC";
    private const string VoucherSequence = "stockflow.seq_supplier_payment";

    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public CreateCustomerDebtRefundCommandHandler(IStockFlowDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    private static string Money(decimal v) => v.ToString("#,##0", CultureInfo.GetCultureInfo("vi-VN"));

    public async Task<Result<CustomerDebtRefundResultDto>> Handle(CreateCustomerDebtRefundCommand command, CancellationToken ct)
    {
        if (!_currentUser.UserId.HasValue)
            return Result.Failure<CustomerDebtRefundResultDto>("Không xác định được người dùng đăng nhập.");
        var req = command.Request;

        var partner = await _context.MstBusinessPartners
            .FirstOrDefaultAsync(p => p.PartnerId == command.PartnerId && p.PartnerType == "CUSTOMER", ct);
        if (partner == null) return Result.Failure<CustomerDebtRefundResultDto>("Không tìm thấy khách hàng.");
        if (partner.PartnerCode == CustomerCreditPolicy.WalkInCustomerCode)
            return Result.Failure<CustomerDebtRefundResultDto>("Khách lẻ không có công nợ.");

        // Cửa hàng nợ khách = phần âm của Nợ cần thu
        var storeOwes = -(partner.CurrentDebt ?? 0m);
        if (storeOwes <= 0)
            return Result.Failure<CustomerDebtRefundResultDto>(
                "Cửa hàng không nợ khách nên không thể lập phiếu chi. Khách đang nợ cửa hàng thì dùng Thanh toán.");

        var amount = Math.Round(req.Amount, 0, MidpointRounding.AwayFromZero);
        if (amount <= 0)
            return Result.Failure<CustomerDebtRefundResultDto>("Số tiền trả khách phải lớn hơn 0.");
        if (amount > storeOwes)
            return Result.Failure<CustomerDebtRefundResultDto>(
                $"Số tiền trả khách ({Money(amount)}) vượt quá số cửa hàng đang nợ khách ({Money(storeOwes)}).");

        var now = VietnamTime.Now;
        var date = req.RefundDate.HasValue ? VietnamTime.From(req.RefundDate) : now;
        if (date > now.AddMinutes(1))
            return Result.Failure<CustomerDebtRefundResultDto>("Thời gian trả tiền không được ở tương lai.");

        await using var transaction = await _context.BeginTransactionAsync(ct);
        try
        {
            var code = $"{VoucherPrefix}{await _context.GetNextSequenceValueAsync(VoucherSequence, ct):D6}";
            var method = string.IsNullOrWhiteSpace(req.PaymentMethod) ? "CASH" : req.PaymentMethod.Trim().ToUpperInvariant();
            var note = req.Notes?.Trim();

            _context.TrxFinancialTransactions.Add(new TrxFinancialTransaction
            {
                TxCode = code,
                PartnerId = partner.PartnerId,
                TxType = SalesReturnOps.RefundTxType,
                Amount = amount,
                PaymentMethod = method,
                ReferenceType = ReferenceType,
                TransactionDate = date,
                CreatedBy = _currentUser.UserId.Value,
                Status = "COMPLETED",
                Description = string.IsNullOrEmpty(note) ? $"Trả tiền khách {partner.PartnerName}" : note,
            });
            partner.CurrentDebt = (partner.CurrentDebt ?? 0m) + amount;

            await _context.SaveChangesAsync(ct);
            if (transaction != null) await transaction.CommitAsync(ct);

            return Result.Success(new CustomerDebtRefundResultDto(code, amount, partner.CurrentDebt ?? 0m));
        }
        catch (Exception ex)
        {
            if (transaction != null) await transaction.RollbackAsync(ct);
            return Result.Failure<CustomerDebtRefundResultDto>($"Lỗi khi tạo phiếu chi: {ex.InnerException?.Message ?? ex.Message}");
        }
    }
}
