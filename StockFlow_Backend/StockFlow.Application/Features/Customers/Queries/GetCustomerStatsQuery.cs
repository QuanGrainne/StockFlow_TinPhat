using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Customers.DTOs;

namespace StockFlow.Application.Features.Customers.Queries;

/// <summary>
/// Truy vấn thống kê các chỉ số KPI Khách hàng từ Database.
/// </summary>
public record GetCustomerStatsQuery : IRequest<Result<CustomerStatsDto>>;

public class GetCustomerStatsQueryHandler : IRequestHandler<GetCustomerStatsQuery, Result<CustomerStatsDto>>
{
    private readonly IStockFlowDbContext _context;

    public GetCustomerStatsQueryHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<CustomerStatsDto>> Handle(GetCustomerStatsQuery request, CancellationToken cancellationToken)
    {
        var customers = await _context.MstBusinessPartners
            .Where(p => p.PartnerType != null && 
                       (p.PartnerType.ToUpper() == "CUSTOMER" || p.PartnerType.ToUpper() == "BOTH"))
            // Ẩn hồ sơ "Khách lẻ" dùng nội bộ cho đơn POS không chọn khách
            .Where(p => p.PartnerCode != "KH00000")
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var now = VietnamTime.Now;
        var monthStart = new DateTime(now.Year, now.Month, 1);
        var total = customers.Count;
        var activeCount = customers.Count(c => c.IsActive != false);
        var inactiveCount = customers.Count(c => c.IsActive == false);
        var activePercent = total > 0 ? Math.Round((decimal)activeCount / total * 100, 1) : 0;

        var totalDebt = customers.Sum(c => c.CurrentDebt ?? 0);
        var debtCount = customers.Count(c => (c.CurrentDebt ?? 0) > 0);
        var overdueCount = customers.Count(c => (c.CurrentDebt ?? 0) > (c.CreditLimit ?? 0));

        var totalCreditLimit = customers.Sum(c => c.CreditLimit ?? 0);
        var creditUsage = totalCreditLimit > 0 ? Math.Round(totalDebt / totalCreditLimit * 100, 1) : 0;

        var stats = new CustomerStatsDto(
            TotalCustomers: total,
            NewThisMonth: customers.Count(c => c.CreatedAt.HasValue && c.CreatedAt.Value >= monthStart), // khách tạo trong tháng này
            ActiveCustomers: activeCount,
            ActivePercentage: activePercent,
            InactiveCustomers: inactiveCount,
            TotalDebt: totalDebt,
            DebtCustomersCount: debtCount,
            OverdueCount: overdueCount,
            TotalCreditLimit: totalCreditLimit,
            CreditUsagePercent: creditUsage
        );

        return Result<CustomerStatsDto>.Success(stats);
    }
}

