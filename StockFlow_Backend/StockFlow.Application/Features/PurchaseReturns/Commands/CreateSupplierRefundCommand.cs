using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.PurchaseReturns.DTOs;
using StockFlow.Application.Features.PurchaseReturns.Helpers;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.PurchaseReturns.Commands;

/// <summary>
/// Nhà cung cấp trả tiền cho phiếu trả hàng nhập đã hoàn thành (lập phiếu thu PT000001...).
/// Số tiền ≤ NCC cần trả − đã trả. Công nợ phải trả NCC tăng lại đúng số tiền NCC đã trả
/// (trước đó phiếu trả đã ghi giảm nợ toàn bộ phần NCC còn nợ mình).
/// </summary>
public record CreateSupplierRefundCommand(int PurchaseReturnId, CreateSupplierRefundRequest Request)
    : IRequest<Result<PurchaseReturnDetailDto>>;

public class CreateSupplierRefundHandler : IRequestHandler<CreateSupplierRefundCommand, Result<PurchaseReturnDetailDto>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public CreateSupplierRefundHandler(IStockFlowDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<PurchaseReturnDetailDto>> Handle(CreateSupplierRefundCommand command, CancellationToken ct)
    {
        if (!_currentUser.UserId.HasValue)
            return Result.Failure<PurchaseReturnDetailDto>("Không xác định được người dùng đăng nhập.");

        var ret = await _context.TrxPurchaseReturns
            .FirstOrDefaultAsync(r => r.PurchaseReturnId == command.PurchaseReturnId, ct);
        if (ret == null)
            return Result.Failure<PurchaseReturnDetailDto>($"Không tìm thấy phiếu trả hàng nhập #{command.PurchaseReturnId}.");
        if (!await _currentUser.HasWarehouseAccessAsync(ret.WarehouseId, ct))
            return Result.Failure<PurchaseReturnDetailDto>("Bạn không có quyền truy cập phiếu trả hàng của kho này.");
        if (!PurchaseReturnLogic.Is(ret.Status, PurchaseReturnLogic.Completed))
            return Result.Failure<PurchaseReturnDetailDto>("Chỉ thu tiền được cho phiếu trả hàng nhập đã hoàn thành.");

        var amount = Math.Round(command.Request.Amount, 0, MidpointRounding.AwayFromZero);
        // Phần đã trừ vào công nợ phiếu nhập gốc thì NCC không còn phải trả tiền mặt cho mình nữa
        var remaining = await PurchaseReturnLogic.RemainingAsync(_context, ret, ct);
        if (amount <= 0)
            return Result.Failure<PurchaseReturnDetailDto>("Số tiền nhà cung cấp trả phải lớn hơn 0.");
        if (amount > remaining)
            return Result.Failure<PurchaseReturnDetailDto>(
                $"Số tiền vượt quá số nhà cung cấp còn phải trả ({remaining.ToString("#,##0", System.Globalization.CultureInfo.GetCultureInfo("vi-VN"))}).");

        var partner = await _context.MstBusinessPartners.FirstOrDefaultAsync(p => p.PartnerId == ret.PartnerId, ct);
        if (partner == null)
            return Result.Failure<PurchaseReturnDetailDto>("Không tìm thấy nhà cung cấp của phiếu trả.");

        await using var transaction = await _context.BeginTransactionAsync(ct);
        try
        {
            var code = $"PT{await _context.GetNextSequenceValueAsync("stockflow.seq_supplier_refund", ct):D6}";
            var method = string.IsNullOrWhiteSpace(command.Request.PaymentMethod)
                ? "CASH"
                : command.Request.PaymentMethod.Trim().ToUpperInvariant();
            var note = command.Request.Notes?.Trim();

            _context.TrxFinancialTransactions.Add(new TrxFinancialTransaction
            {
                TxCode = code,
                PartnerId = partner.PartnerId,
                TxType = PurchaseReturnLogic.RefundTxType,
                Amount = amount,
                PaymentMethod = method,
                ReferenceType = PurchaseReturnLogic.ReferenceType,
                ReferenceId = ret.PurchaseReturnId,
                TransactionDate = command.Request.PaymentDate.HasValue
                    ? VietnamTime.From(command.Request.PaymentDate)
                    : VietnamTime.Now,
                CreatedBy = _currentUser.UserId.Value,
                Status = PurchaseReturnLogic.Completed,
                Description = string.IsNullOrEmpty(note)
                    ? $"Nhà cung cấp trả tiền phiếu trả hàng nhập {ret.ReturnCode}"
                    : note,
            });

            ret.RefundAmount = (ret.RefundAmount ?? 0) + amount;
            partner.CurrentPayable = (partner.CurrentPayable ?? 0) + amount;

            await _context.SaveChangesAsync(ct);
            if (transaction != null) await transaction.CommitAsync(ct);
        }
        catch (Exception ex)
        {
            if (transaction != null) await transaction.RollbackAsync(ct);
            return Result.Failure<PurchaseReturnDetailDto>($"Lỗi khi ghi nhận tiền nhà cung cấp trả: {ex.InnerException?.Message ?? ex.Message}");
        }

        var saved = await PurchaseReturnLogic.LoadAsync(_context, ret.PurchaseReturnId, ct);
        var payments = await PurchaseReturnLogic.LoadPaymentsAsync(_context, saved!, ct);
        return Result.Success(await PurchaseReturnLogic.WithOffsetAsync(_context, PurchaseReturnLogic.ToDetail(saved!, payments), ct));
    }
}
