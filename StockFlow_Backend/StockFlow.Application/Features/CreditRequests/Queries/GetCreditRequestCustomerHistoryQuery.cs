using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.CreditRequests.Common;
using StockFlow.Application.Features.CreditRequests.DTOs;
using StockFlow.Application.Features.Customers.Helpers;

namespace StockFlow.Application.Features.CreditRequests.Queries;

/// <summary>
/// Thông tin khách của một yêu cầu hạn mức để Kế toán trưởng xét duyệt (UC-64, A62.2):
/// tổng quan mua hàng (hóa đơn đã hoàn thành) và lịch sử thanh toán (phiếu thu, hàng trả lại).
/// Cách lọc dữ liệu giống sổ công nợ ở màn Khách hàng (GetCustomerByIdQuery).
/// </summary>
public record GetCreditRequestCustomerHistoryQuery(int RequestId) : IRequest<Result<CustomerCreditHistoryDto>>;

public class GetCreditRequestCustomerHistoryQueryHandler
    : IRequestHandler<GetCreditRequestCustomerHistoryQuery, Result<CustomerCreditHistoryDto>>
{
    private const int RecentCount = 10;
    private readonly IStockFlowDbContext _context;

    public GetCreditRequestCustomerHistoryQueryHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<CustomerCreditHistoryDto>> Handle(GetCreditRequestCustomerHistoryQuery request, CancellationToken ct)
    {
        var partnerId = await _context.TrxCreditLimitRequests.AsNoTracking()
            .Where(r => r.RequestId == request.RequestId)
            .Select(r => (int?)r.PartnerId)
            .FirstOrDefaultAsync(ct);
        if (partnerId == null)
            return Result<CustomerCreditHistoryDto>.Failure(CreditRequestMessages.NotFound);

        var partner = await _context.MstBusinessPartners.AsNoTracking()
            .FirstAsync(p => p.PartnerId == partnerId.Value, ct);

        var now = VietnamTime.Now;
        // 12 tháng gần nhất tính từ ngày đầu tháng của 11 tháng trước (gồm tháng hiện tại)
        var since = new DateTime(now.Year, now.Month, 1).AddMonths(-11);

        // Hóa đơn bán đã hoàn thành (không gồm đơn đặt hàng)
        var invoices = await _context.TrxOrders.AsNoTracking()
            .Where(o => o.PartnerId == partner.PartnerId
                        && o.OrderType != "BOOKING"
                        && o.Status == CustomerProfileHelper.CompletedStatus)
            .Select(o => new
            {
                o.OrderId,
                o.OrderCode,
                o.OrderDate,
                Total = o.TotalAmount ?? 0,
                Paid = o.PaidAmount ?? 0,
                Outstanding = o.OutstandingAmount ?? 0,
            })
            .ToListAsync(ct);

        // Phiếu thu của khách (không gồm phiếu đã hủy)
        var receipts = await _context.TrxFinancialTransactions.AsNoTracking()
            .Where(t => t.PartnerId == partner.PartnerId && t.TxType == "RECEIPT" && (t.Status == null || t.Status != "CANCELLED"))
            .Select(t => new { t.TxId, t.TxCode, t.TransactionDate, Amount = t.Amount ?? 0, t.PaymentMethod, t.ReferenceType, t.ReferenceId })
            .ToListAsync(ct);

        var returns12M = await _context.TrxReturnRequests.AsNoTracking()
            .Where(r => r.PartnerId == partner.PartnerId && r.Status == "COMPLETED" && r.RequestDate >= since)
            .SumAsync(r => (decimal?)r.TotalAmount, ct) ?? 0;

        var orderCodes = invoices.ToDictionary(o => o.OrderId, o => o.OrderCode ?? $"HD{o.OrderId:D6}");
        var invoices12M = invoices.Where(o => o.OrderDate >= since).ToList();
        var receipts12M = receipts.Where(t => t.TransactionDate >= since).ToList();
        var lastReceipt = receipts.OrderByDescending(t => t.TransactionDate).ThenByDescending(t => t.TxId).FirstOrDefault();

        var months = Enumerable.Range(0, 12).Select(i => since.AddMonths(i)).ToList();
        bool InMonth(DateTime? d, DateTime m) => d.HasValue && d.Value.Year == m.Year && d.Value.Month == m.Month;

        var dto = new CustomerCreditHistoryDto
        {
            PartnerId = partner.PartnerId,
            PartnerCode = partner.PartnerCode,
            PartnerName = partner.PartnerName,
            Phone = partner.Phone,
            CustomerSince = partner.CreatedAt,
            CurrentDebt = partner.CurrentDebt ?? 0,
            CreditLimit = partner.CreditLimit ?? 0,

            InvoiceCountAll = invoices.Count,
            TotalPurchaseAll = invoices.Sum(o => o.Total),
            InvoiceCount12M = invoices12M.Count,
            TotalPurchase12M = invoices12M.Sum(o => o.Total),
            AverageInvoice12M = invoices12M.Count == 0 ? 0 : Math.Round(invoices12M.Average(o => o.Total), 0),
            FirstPurchaseDate = invoices.Min(o => o.OrderDate),
            LastPurchaseDate = invoices.Max(o => o.OrderDate),
            MonthlyPurchases = months.Select(m => new CreditHistoryMonthDto(
                    m.ToString("MM/yyyy"),
                    invoices12M.Count(o => InMonth(o.OrderDate, m)),
                    invoices12M.Where(o => InMonth(o.OrderDate, m)).Sum(o => o.Total),
                    receipts12M.Where(t => InMonth(t.TransactionDate, m)).Sum(t => t.Amount)))
                .ToList(),
            RecentInvoices = invoices
                .OrderByDescending(o => o.OrderDate).ThenByDescending(o => o.OrderId)
                .Take(RecentCount)
                .Select(o => new CreditHistoryInvoiceDto(o.OrderId, orderCodes[o.OrderId], o.OrderDate, o.Total, o.Paid, o.Outstanding))
                .ToList(),

            TotalPaidAll = receipts.Sum(t => t.Amount),
            TotalPaid12M = receipts12M.Sum(t => t.Amount),
            PaymentCount12M = receipts12M.Count,
            LastPaymentDate = lastReceipt?.TransactionDate,
            LastPaymentAmount = lastReceipt?.Amount,
            TotalReturns12M = returns12M,
            RecentPayments = receipts
                .OrderByDescending(t => t.TransactionDate).ThenByDescending(t => t.TxId)
                .Take(RecentCount)
                .Select(t =>
                {
                    var orderCode = t.ReferenceType == "SALES_ORDER" && t.ReferenceId.HasValue && orderCodes.TryGetValue(t.ReferenceId.Value, out var c)
                        ? c
                        : null;
                    return new CreditHistoryPaymentDto(t.TxCode ?? $"PT{t.TxId:D6}", t.TransactionDate, t.Amount, t.PaymentMethod, orderCode);
                })
                .ToList(),
        };

        return Result<CustomerCreditHistoryDto>.Success(dto);
    }
}
