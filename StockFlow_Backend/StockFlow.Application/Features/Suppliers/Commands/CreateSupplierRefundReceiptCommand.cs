using System.Globalization;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.PurchaseReturns.Helpers;
using StockFlow.Application.Features.Suppliers.DTOs;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Suppliers.Commands;

/// <summary>
/// Phiếu thu tiền từ nhà cung cấp (PT000001...) khi NCC đang nợ cửa hàng (Nợ cần trả NCC &lt; 0), không gắn phiếu trả hàng
/// — VD NCC hoàn tiền trả thừa / tiền đặt cọc / khoản đã điều chỉnh âm. Đối xứng với phiếu chi trả nợ NCC (PC...).
/// - Số tiền &gt; 0 và ≤ số NCC đang nợ (−Nợ cần trả).
/// - Mã PT lấy chung dãy số với phiếu thu khách (seq_customer_receipt) để mọi phiếu thu PT... không trùng mã.
/// - Ghi 1 giao dịch SUPPLIER_REFUND (cùng loại với "NCC trả tiền" của phiếu trả hàng nhập) nên sổ
///   "Nợ cần trả nhà cung cấp" có dòng "Nhà cung cấp trả tiền"; Nợ cần trả tăng đúng số tiền (về phía 0).
/// </summary>
public record CreateSupplierRefundReceiptCommand(int PartnerId, CreateSupplierRefundReceiptRequest Request)
    : IRequest<Result<SupplierRefundReceiptResultDto>>;

public class CreateSupplierRefundReceiptCommandHandler
    : IRequestHandler<CreateSupplierRefundReceiptCommand, Result<SupplierRefundReceiptResultDto>>
{
    /// <summary>Giao dịch không gắn chứng từ: tham chiếu đến chính nhà cung cấp (không có ReferenceId)</summary>
    public const string ReferenceType = "SUPPLIER";
    private const string VoucherPrefix = "PT";
    /// <summary>Mọi phiếu thu PT... (thu khách, NCC trả tiền) dùng chung 1 dãy số để không trùng mã</summary>
    public const string VoucherSequence = "stockflow.seq_customer_receipt";

    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public CreateSupplierRefundReceiptCommandHandler(IStockFlowDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    private static string Money(decimal v) => v.ToString("#,##0", CultureInfo.GetCultureInfo("vi-VN"));

    public async Task<Result<SupplierRefundReceiptResultDto>> Handle(CreateSupplierRefundReceiptCommand command, CancellationToken ct)
    {
        if (!_currentUser.UserId.HasValue)
            return Result.Failure<SupplierRefundReceiptResultDto>("Không xác định được người dùng đăng nhập.");
        var req = command.Request;

        var partner = await _context.MstBusinessPartners.FirstOrDefaultAsync(p => p.PartnerId == command.PartnerId, ct);
        if (partner == null ||
            partner.PartnerType == null ||
            !(partner.PartnerType.Equals("SUPPLIER", StringComparison.OrdinalIgnoreCase) ||
              partner.PartnerType.Equals("BOTH", StringComparison.OrdinalIgnoreCase)))
        {
            return Result.Failure<SupplierRefundReceiptResultDto>("Không tìm thấy nhà cung cấp.");
        }

        // NCC nợ cửa hàng = phần âm của Nợ cần trả
        var supplierOwes = -(partner.CurrentPayable ?? 0m);
        if (supplierOwes <= 0)
            return Result.Failure<SupplierRefundReceiptResultDto>(
                "Nhà cung cấp không nợ cửa hàng nên không thể lập phiếu thu. Cửa hàng đang nợ NCC thì dùng Thanh toán.");

        var amount = Math.Round(req.Amount, 0, MidpointRounding.AwayFromZero);
        if (amount <= 0)
            return Result.Failure<SupplierRefundReceiptResultDto>("Số tiền thu phải lớn hơn 0.");
        if (amount > supplierOwes)
            return Result.Failure<SupplierRefundReceiptResultDto>(
                $"Số tiền thu ({Money(amount)}) vượt quá số nhà cung cấp đang nợ cửa hàng ({Money(supplierOwes)}).");

        var now = VietnamTime.Now;
        var date = req.ReceiptDate.HasValue ? VietnamTime.From(req.ReceiptDate) : now;
        if (date > now.AddMinutes(1))
            return Result.Failure<SupplierRefundReceiptResultDto>("Thời gian thu tiền không được ở tương lai.");

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
                TxType = PurchaseReturnLogic.RefundTxType,
                Amount = amount,
                PaymentMethod = method,
                ReferenceType = ReferenceType,
                TransactionDate = date,
                CreatedBy = _currentUser.UserId.Value,
                Status = "COMPLETED",
                Description = string.IsNullOrEmpty(note) ? $"Thu tiền nhà cung cấp {partner.PartnerName}" : note,
            });
            partner.CurrentPayable = (partner.CurrentPayable ?? 0m) + amount;

            await _context.SaveChangesAsync(ct);
            if (transaction != null) await transaction.CommitAsync(ct);

            return Result.Success(new SupplierRefundReceiptResultDto(code, amount, partner.CurrentPayable ?? 0m));
        }
        catch (Exception ex)
        {
            if (transaction != null) await transaction.RollbackAsync(ct);
            return Result.Failure<SupplierRefundReceiptResultDto>($"Lỗi khi tạo phiếu thu: {ex.InnerException?.Message ?? ex.Message}");
        }
    }
}
