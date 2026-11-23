using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.PurchaseReturns.Helpers;
using StockFlow.Application.Features.Suppliers.Commands;
using StockFlow.Application.Features.Suppliers.Helpers;

namespace StockFlow.Application.Features.Suppliers.Queries;

/// <summary>
/// Xem 1 phiếu công nợ của nhà cung cấp theo mã:
/// - PC... phiếu chi thanh toán nợ NCC (SUPPLIER_PAYMENT, có thể phân bổ vào nhiều phiếu nhập);
/// - PT... phiếu thu tiền NCC trả (SUPPLIER_REFUND: theo phiếu trả hàng nhập hoặc thu độc lập khi NCC nợ cửa hàng).
/// Chỉ phiếu thu độc lập (ReferenceType = SUPPLIER) hủy được ở đây.
/// </summary>
public record GetSupplierVoucherQuery(int PartnerId, string Code) : IRequest<Result<DebtVoucherDetailDto>>;

public class GetSupplierVoucherQueryHandler : IRequestHandler<GetSupplierVoucherQuery, Result<DebtVoucherDetailDto>>
{
    private readonly IStockFlowDbContext _context;

    public GetSupplierVoucherQueryHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<DebtVoucherDetailDto>> Handle(GetSupplierVoucherQuery request, CancellationToken ct)
    {
        var code = (request.Code ?? "").Trim();
        var partner = await _context.MstBusinessPartners.AsNoTracking()
            .FirstOrDefaultAsync(p => p.PartnerId == request.PartnerId, ct);
        if (partner == null || string.IsNullOrEmpty(code))
            return Result.Failure<DebtVoucherDetailDto>("Không tìm thấy phiếu.");

        var txs = await _context.TrxFinancialTransactions.AsNoTracking()
            .Include(t => t.CreatedByNavigation)
            .Where(t => t.PartnerId == partner.PartnerId && t.TxCode == code
                        && (t.TxType == SupplierDebtCalculator.PaymentTxType || t.TxType == PurchaseReturnLogic.RefundTxType))
            .OrderBy(t => t.TxId)
            .ToListAsync(ct);
        if (txs.Count == 0)
            return Result.Failure<DebtVoucherDetailDto>($"Không tìm thấy phiếu {code}.");

        var first = txs[0];
        var isRefund = first.TxType == PurchaseReturnLogic.RefundTxType;

        // Tên chứng từ được phân bổ (phiếu nhập / phiếu trả hàng nhập)
        var grIds = txs.Where(t => t.ReferenceType == SupplierDebtCalculator.GoodsReceiptRef && t.ReferenceId.HasValue)
            .Select(t => t.ReferenceId!.Value).Distinct().ToList();
        var receipts = await _context.TrxGoodsReceipts.AsNoTracking()
            .Where(r => grIds.Contains(r.GrId))
            .Select(r => new { r.GrId, r.GrCode, r.ReceivedDate })
            .ToDictionaryAsync(r => r.GrId, ct);
        var returnIds = txs.Where(t => t.ReferenceType == PurchaseReturnLogic.ReferenceType && t.ReferenceId.HasValue)
            .Select(t => t.ReferenceId!.Value).Distinct().ToList();
        var returns = await _context.TrxPurchaseReturns.AsNoTracking()
            .Where(r => returnIds.Contains(r.PurchaseReturnId))
            .Select(r => new { r.PurchaseReturnId, r.ReturnCode, r.ReturnDate })
            .ToDictionaryAsync(r => r.PurchaseReturnId, ct);

        var lines = txs.Select(t =>
        {
            if (t.ReferenceType == SupplierDebtCalculator.GoodsReceiptRef && t.ReferenceId.HasValue
                && receipts.TryGetValue(t.ReferenceId.Value, out var gr))
                return new DebtVoucherLineDto("GOODS_RECEIPT", gr.GrId, gr.GrCode ?? $"PN{gr.GrId:D6}", gr.ReceivedDate, t.Amount ?? 0);
            if (t.ReferenceType == PurchaseReturnLogic.ReferenceType && t.ReferenceId.HasValue
                && returns.TryGetValue(t.ReferenceId.Value, out var pr))
                return new DebtVoucherLineDto("PURCHASE_RETURN", pr.PurchaseReturnId, pr.ReturnCode ?? $"THN{pr.PurchaseReturnId:D6}", pr.ReturnDate, t.Amount ?? 0);
            return new DebtVoucherLineDto(null, null, null, null, t.Amount ?? 0);
        }).ToList();

        var status = txs.Any(t => t.Status != "CANCELLED") ? first.Status ?? "COMPLETED" : "CANCELLED";
        var standalone = isRefund && txs.All(t => t.ReferenceType == CreateSupplierRefundReceiptCommandHandler.ReferenceType);

        return Result.Success(new DebtVoucherDetailDto(
            Code: code,
            VoucherType: isRefund ? "RECEIPT" : "PAYMENT",
            TypeLabel: isRefund ? "Phiếu thu — Nhà cung cấp trả tiền" : "Phiếu chi — Thanh toán nhà cung cấp",
            TransactionDate: first.TransactionDate,
            CreatedByName: first.CreatedByNavigation?.FullName ?? first.CreatedByNavigation?.Username,
            PaymentMethod: first.PaymentMethod ?? "CASH",
            Amount: txs.Sum(t => t.Amount ?? 0),
            Description: first.Description,
            Status: status,
            PartnerCode: partner.PartnerCode ?? "",
            PartnerName: partner.PartnerName ?? "",
            Lines: lines,
            CanCancel: standalone && status != "CANCELLED"));
    }
}
