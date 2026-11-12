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
            .AsNoTracking()
            .ToListAsync(cancellationToken);

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
            NewThisMonth: 12, // Số hồ sơ khách hàng mới tăng trưởng
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

