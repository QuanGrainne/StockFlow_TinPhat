using System.Globalization;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Suppliers.DTOs;
using StockFlow.Application.Features.Suppliers.Helpers;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Suppliers.Commands;

/// <summary>
/// Tạo phiếu chi thanh toán nợ cho nhà cung cấp (mã PC000001...).
/// Số tiền được phân bổ vào các phiếu nhập còn nợ (mỗi phần phân bổ là 1 dòng giao dịch cùng mã phiếu chi);
/// phần chưa phân bổ vẫn ghi nhận vào phiếu chi và trừ vào tổng nợ NCC.
/// </summary>
public record CreateSupplierPaymentCommand(int PartnerId, CreateSupplierPaymentRequest Request)
    : IRequest<Result<SupplierPaymentResultDto>>;

public class CreateSupplierPaymentCommandValidator : AbstractValidator<CreateSupplierPaymentCommand>
{
    public CreateSupplierPaymentCommandValidator()
    {
        RuleFor(x => x.Request.Amount)
            .GreaterThan(0).WithMessage("Số tiền thanh toán phải lớn hơn 0.");

        RuleForEach(x => x.Request.Allocations)
            .Must(a => a.Amount >= 0).WithMessage("Số tiền phân bổ không được âm.");
    }
}

public class CreateSupplierPaymentCommandHandler
    : IRequestHandler<CreateSupplierPaymentCommand, Result<SupplierPaymentResultDto>>
{
    private const string VoucherSequence = "stockflow.seq_supplier_payment";
    private const string VoucherPrefix = "PC";
    private static readonly CultureInfo Vi = CultureInfo.GetCultureInfo("vi-VN");
    private static string Money(decimal v) => v.ToString("N0", Vi);

    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public CreateSupplierPaymentCommandHandler(IStockFlowDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<SupplierPaymentResultDto>> Handle(
        CreateSupplierPaymentCommand command,
        CancellationToken cancellationToken)
    {
        var req = command.Request;

        if (!_currentUserService.UserId.HasValue)
        {
            return Result.Failure<SupplierPaymentResultDto>("Không xác định được người dùng đăng nhập.");
        }

        var partner = await _context.MstBusinessPartners
            .FirstOrDefaultAsync(p => p.PartnerId == command.PartnerId, cancellationToken);
        if (partner == null ||
            partner.PartnerType == null ||
            !(partner.PartnerType.Equals("SUPPLIER", StringComparison.OrdinalIgnoreCase) ||
              partner.PartnerType.Equals("BOTH", StringComparison.OrdinalIgnoreCase)))
        {
            return Result.Failure<SupplierPaymentResultDto>("Không tìm thấy nhà cung cấp.");
        }

        var amount = Math.Round(req.Amount, 0, MidpointRounding.AwayFromZero);
        var currentPayable = partner.CurrentPayable ?? 0m;
        if (amount > currentPayable)
        {
            return Result.Failure<SupplierPaymentResultDto>(
                $"Số tiền thanh toán ({Money(amount)}) vượt quá nợ hiện tại của nhà cung cấp ({Money(currentPayable)}).");
        }

        // ── Kiểm tra phân bổ: chỉ vào phiếu nhập COMPLETED của chính NCC, không vượt số còn nợ của phiếu ──
        var allocations = (req.Allocations ?? new List<SupplierPaymentAllocationRequest>())
            .Where(a => a.Amount > 0)
            .GroupBy(a => a.ReceiptId)
            .Select(g => new { ReceiptId = g.Key, Amount = Math.Round(g.Sum(x => x.Amount), 0, MidpointRounding.AwayFromZero) })
            .ToList();

        var allocatedTotal = allocations.Sum(a => a.Amount);
        if (allocatedTotal > amount)
        {
            return Result.Failure<SupplierPaymentResultDto>("Tổng tiền phân bổ vượt quá số tiền thanh toán.");
        }

        if (allocations.Count > 0)
        {
            var receiptIds = allocations.Select(a => a.ReceiptId).ToList();
            var receipts = await _context.TrxGoodsReceipts
                .Include(r => r.DtlGoodsReceiptItems)
                .Where(r => receiptIds.Contains(r.GrId))
                .AsNoTracking()
                .ToListAsync(cancellationToken);

            var payments = await _context.TrxFinancialTransactions
                .Where(t => t.TxType == SupplierDebtCalculator.PaymentTxType
                            && t.ReferenceType == SupplierDebtCalculator.GoodsReceiptRef
                            && t.ReferenceId != null && receiptIds.Contains(t.ReferenceId.Value))
                .AsNoTracking()
                .ToListAsync(cancellationToken);
            var paidByReceipt = SupplierDebtCalculator.PaidByReceipt(payments);
            // Trả hàng nhập đã trừ vào công nợ của phiếu nhập → phiếu chỉ còn nợ phần chưa bù trừ
            var returnOffsets = await StockFlow.Application.Features.PurchaseReturns.Helpers.ReturnOffsetCalculator
                .ComputeForReceiptsAsync(_context, receiptIds, cancellationToken);

            foreach (var alloc in allocations)
            {
                var receipt = receipts.FirstOrDefault(r => r.GrId == alloc.ReceiptId);
                if (receipt == null || receipt.PartnerId != partner.PartnerId || !SupplierDebtCalculator.IsCompleted(receipt))
                {
                    return Result.Failure<SupplierPaymentResultDto>(
                        $"Phiếu nhập #{alloc.ReceiptId} không thuộc nhà cung cấp này hoặc chưa hoàn thành.");
                }

                var remaining = Math.Max(0,
                    SupplierDebtCalculator.ReceiptDebt(receipt, paidByReceipt)
                    - returnOffsets.OffsetByReceipt.GetValueOrDefault(receipt.GrId));
                if (alloc.Amount > remaining)
                {
                    return Result.Failure<SupplierPaymentResultDto>(
                        $"Tiền trả cho phiếu {receipt.GrCode} ({Money(alloc.Amount)}) vượt quá số còn cần trả ({Money(remaining)}).");
                }
            }
        }

        var dbContext = _context as DbContext;
        using var transaction = dbContext != null ? await dbContext.Database.BeginTransactionAsync(cancellationToken) : null;
        try
        {
            var seq = await _context.GetNextSequenceValueAsync(VoucherSequence, cancellationToken);
            var voucherCode = $"{VoucherPrefix}{seq:D6}";
            var paymentDate = VietnamTime.From(req.PaymentDate);
            var method = string.IsNullOrWhiteSpace(req.PaymentMethod) ? "CASH" : req.PaymentMethod.Trim().ToUpperInvariant();
            var description = string.IsNullOrWhiteSpace(req.Notes)
                ? $"Phiếu chi {voucherCode} thanh toán nợ nhà cung cấp {partner.PartnerName}"
                : req.Notes.Trim();
            var userId = _currentUserService.UserId.Value;

            TrxFinancialTransaction NewTx(decimal txAmount, string? refType, int? refId) => new()
            {
                PartnerId = partner.PartnerId,
                TxType = SupplierDebtCalculator.PaymentTxType,
                TxCode = voucherCode,
                Amount = txAmount,
                PaymentMethod = method,
                ReferenceType = refType,
                ReferenceId = refId,
                TransactionDate = paymentDate,
                CreatedBy = userId,
                Status = "COMPLETED",
                Description = description,
            };

            foreach (var alloc in allocations)
            {
                _context.TrxFinancialTransactions.Add(NewTx(alloc.Amount, SupplierDebtCalculator.GoodsReceiptRef, alloc.ReceiptId));
            }

            var unallocated = amount - allocatedTotal;
            if (unallocated > 0)
            {
                _context.TrxFinancialTransactions.Add(NewTx(unallocated, null, null));
            }

            partner.CurrentPayable = currentPayable - amount;

            await _context.SaveChangesAsync(cancellationToken);
            if (transaction != null) await transaction.CommitAsync(cancellationToken);

            return Result.Success(new SupplierPaymentResultDto(
                VoucherCode: voucherCode,
                Amount: amount,
                AllocatedAmount: allocatedTotal,
                RemainingPayable: partner.CurrentPayable ?? 0m));
        }
        catch (Exception ex)
        {
            if (transaction != null) await transaction.RollbackAsync(cancellationToken);
            return Result.Failure<SupplierPaymentResultDto>($"Lỗi khi tạo phiếu chi: {ex.Message}");
        }
    }
}
