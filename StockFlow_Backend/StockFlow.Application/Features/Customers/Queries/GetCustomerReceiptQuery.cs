using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Customers.DTOs;

namespace StockFlow.Application.Features.Customers.Queries;

/// <summary>
/// Chi tiết 1 phiếu thu của khách hàng theo mã (TTHD000085, TTHD000085-1, PT000001...):
/// thông tin phiếu + các hóa đơn được phân bổ (giá trị hóa đơn, đã thu trước phiếu này, tiền thu).
/// Phiếu thu cũ chưa có mã được nhận theo mã hiển thị TT + mã hóa đơn.
/// </summary>
public record GetCustomerReceiptQuery(int PartnerId, string Code) : IRequest<Result<CustomerReceiptDetailDto>>;

public class GetCustomerReceiptQueryHandler : IRequestHandler<GetCustomerReceiptQuery, Result<CustomerReceiptDetailDto>>
{
    private readonly IStockFlowDbContext _context;

    public GetCustomerReceiptQueryHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<CustomerReceiptDetailDto>> Handle(GetCustomerReceiptQuery request, CancellationToken cancellationToken)
    {
        var code = (request.Code ?? "").Trim();
        var partner = await _context.MstBusinessPartners.AsNoTracking()
            .FirstOrDefaultAsync(p => p.PartnerId == request.PartnerId, cancellationToken);
        if (partner == null || string.IsNullOrEmpty(code))
            return Result<CustomerReceiptDetailDto>.Failure("Không tìm thấy phiếu thu.");

        var receipts = await _context.TrxFinancialTransactions.AsNoTracking()
            .Include(t => t.CreatedByNavigation)
            .Where(t => t.PartnerId == partner.PartnerId && t.TxType == "RECEIPT")
            .ToListAsync(cancellationToken);

        var orderIds = receipts.Where(t => t.ReferenceType == "SALES_ORDER" && t.ReferenceId.HasValue)
            .Select(t => t.ReferenceId!.Value).Distinct().ToList();
        var orders = await _context.TrxOrders.AsNoTracking()
            .Where(o => orderIds.Contains(o.OrderId))
            .Select(o => new { o.OrderId, o.OrderCode, o.OrderDate, Total = o.TotalAmount ?? 0, o.PaymentStatus, o.OrderType })
            .ToDictionaryAsync(o => o.OrderId, cancellationToken);

        string DisplayCode(StockFlow.Domain.Entities.TrxFinancialTransaction t) =>
            t.TxCode ?? (t.ReferenceType == "SALES_ORDER" && t.ReferenceId.HasValue && orders.TryGetValue(t.ReferenceId.Value, out var o)
                ? $"TT{o.OrderCode}"
                : $"PT{t.TxId:D6}");

        var lines = receipts.Where(t => string.Equals(DisplayCode(t), code, StringComparison.OrdinalIgnoreCase)).ToList();
        if (lines.Count == 0)
            return Result<CustomerReceiptDetailDto>.Failure($"Không tìm thấy phiếu thu {code}.");

        var first = lines.OrderBy(t => t.TxId).First();
        var allocations = lines
            .Where(t => t.ReferenceType == "SALES_ORDER" && t.ReferenceId.HasValue && orders.ContainsKey(t.ReferenceId.Value))
            .Select(t =>
            {
                var o = orders[t.ReferenceId!.Value];
                // Đã thu trước phiếu này = các phiếu thu khác (chưa hủy) của hóa đơn, ghi nhận trước phiếu này
                var paidBefore = receipts
                    .Where(x => x.TxId != t.TxId && x.ReferenceType == "SALES_ORDER" && x.ReferenceId == t.ReferenceId &&
                                x.Status != "CANCELLED" &&
                                ((x.TransactionDate ?? DateTime.MinValue) < (t.TransactionDate ?? DateTime.MinValue) ||
                                 ((x.TransactionDate ?? DateTime.MinValue) == (t.TransactionDate ?? DateTime.MinValue) && x.TxId < t.TxId)))
                    .Sum(x => x.Amount ?? 0);
                return new CustomerReceiptAllocationDto(o.OrderId, o.OrderCode ?? $"HD{o.OrderId:D6}", o.OrderDate, o.Total,
                    paidBefore, t.Amount ?? 0, o.PaymentStatus, o.OrderType ?? "INVOICE");
            })
            .ToList();

        return Result<CustomerReceiptDetailDto>.Success(new CustomerReceiptDetailDto(
            Code: DisplayCode(first),
            TransactionDate: first.TransactionDate,
            CreatedByName: first.CreatedByNavigation?.FullName ?? first.CreatedByNavigation?.Username,
            PaymentMethod: first.PaymentMethod ?? "CASH",
            TotalAmount: lines.Sum(t => t.Amount ?? 0),
            Description: first.Description,
            Status: first.Status ?? "COMPLETED",
            PartnerId: partner.PartnerId,
            PartnerCode: partner.PartnerCode ?? "",
            PartnerName: partner.PartnerName ?? "",
            Allocations: allocations));
    }
}
