using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Customers.Commands;
using StockFlow.Application.Features.SalesReturns.Queries;

namespace StockFlow.Application.Features.Customers.Queries;

/// <summary>
/// Xem 1 phiếu chi trả tiền khách (CUSTOMER_REFUND) theo mã: PC... phiếu chi độc lập khi cửa hàng nợ khách,
/// hoặc TTTH... trả tiền theo phiếu trả hàng. Chỉ phiếu chi độc lập (ReferenceType = CUSTOMER) hủy được ở đây.
/// </summary>
public record GetCustomerDebtRefundQuery(int PartnerId, string Code) : IRequest<Result<DebtVoucherDetailDto>>;

public class GetCustomerDebtRefundQueryHandler : IRequestHandler<GetCustomerDebtRefundQuery, Result<DebtVoucherDetailDto>>
{
    private readonly IStockFlowDbContext _context;

    public GetCustomerDebtRefundQueryHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<DebtVoucherDetailDto>> Handle(GetCustomerDebtRefundQuery request, CancellationToken ct)
    {
        var code = (request.Code ?? "").Trim();
        var partner = await _context.MstBusinessPartners.AsNoTracking()
            .FirstOrDefaultAsync(p => p.PartnerId == request.PartnerId, ct);
        if (partner == null || string.IsNullOrEmpty(code))
            return Result.Failure<DebtVoucherDetailDto>("Không tìm thấy phiếu chi.");

        var txs = await _context.TrxFinancialTransactions.AsNoTracking()
            .Include(t => t.CreatedByNavigation)
            .Where(t => t.PartnerId == partner.PartnerId && t.TxCode == code && t.TxType == SalesReturnOps.RefundTxType)
            .OrderBy(t => t.TxId)
            .ToListAsync(ct);
        if (txs.Count == 0)
            return Result.Failure<DebtVoucherDetailDto>($"Không tìm thấy phiếu chi {code}.");

        var returnIds = txs.Where(t => t.ReferenceType == SalesReturnOps.ReferenceType && t.ReferenceId.HasValue)
            .Select(t => t.ReferenceId!.Value).Distinct().ToList();
        var returns = await _context.TrxReturnRequests.AsNoTracking()
            .Where(r => returnIds.Contains(r.ReturnRequestId))
            .Select(r => new { r.ReturnRequestId, r.ReturnCode, r.RequestDate })
            .ToDictionaryAsync(r => r.ReturnRequestId, ct);

        var lines = txs.Select(t =>
            t.ReferenceType == SalesReturnOps.ReferenceType && t.ReferenceId.HasValue
            && returns.TryGetValue(t.ReferenceId.Value, out var r)
                ? new DebtVoucherLineDto("SALES_RETURN", r.ReturnRequestId, r.ReturnCode ?? $"TH{r.ReturnRequestId:D6}", r.RequestDate, t.Amount ?? 0)
                : new DebtVoucherLineDto(null, null, null, null, t.Amount ?? 0)).ToList();

        var first = txs[0];
        var status = txs.Any(t => t.Status != "CANCELLED") ? first.Status ?? "COMPLETED" : "CANCELLED";
        var standalone = txs.All(t => t.ReferenceType == CreateCustomerDebtRefundCommandHandler.ReferenceType);

        return Result.Success(new DebtVoucherDetailDto(
            Code: code,
            VoucherType: "PAYMENT",
            TypeLabel: "Phiếu chi — Trả tiền khách",
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
