using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Customers.DTOs;

namespace StockFlow.Application.Features.Customers.Queries;

/// <summary>
/// Truy vấn chi tiết một Khách hàng theo PartnerId hoặc Mã khách hàng.
/// </summary>
public record GetCustomerByIdQuery(int PartnerId) : IRequest<Result<CustomerDetailDto>>;

public class GetCustomerByIdQueryHandler : IRequestHandler<GetCustomerByIdQuery, Result<CustomerDetailDto>>
{
    private readonly IStockFlowDbContext _context;

    public GetCustomerByIdQueryHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<CustomerDetailDto>> Handle(GetCustomerByIdQuery query, CancellationToken cancellationToken)
    {
        var partner = await _context.MstBusinessPartners
            .Include(p => p.TrxOrders)
            .FirstOrDefaultAsync(p => p.PartnerId == query.PartnerId &&
                                      p.PartnerType != null &&
                                      (p.PartnerType.ToUpper() == "CUSTOMER" || p.PartnerType.ToUpper() == "BOTH"),
                                 cancellationToken);

        if (partner == null)
        {
            return Result<CustomerDetailDto>.Failure($"Không tìm thấy khách hàng với mã ID #{query.PartnerId}");
        }

        var creditLimit = partner.CreditLimit ?? 0;
        var currentDebt = partner.CurrentDebt ?? 0;
        var isOverLimit = creditLimit > 0 && currentDebt > creditLimit;
        var status = (partner.IsActive != false) ? "ACTIVE" : "INACTIVE";

        var recentOrders = partner.TrxOrders
            .OrderByDescending(o => o.OrderDate)
            .Take(5)
            .Select(o => new CustomerRecentOrderDto(
                OrderId: o.OrderId,
                OrderCode: o.OrderCode ?? $"DH-{o.OrderId}",
                OrderDate: o.OrderDate,
                TotalAmount: o.TotalAmount ?? 0,
                Status: o.Status
            )).ToList();

        var detail = new CustomerDetailDto(
            Id: partner.PartnerId.ToString(),
            PartnerId: partner.PartnerId,
            Code: partner.PartnerCode ?? $"KH{partner.PartnerId.ToString().PadLeft(5, '0')}",
            Name: partner.PartnerName ?? "Khách hàng",
            Type: partner.PartnerType ?? "CUSTOMER",
            Phone: partner.Phone,
            Email: partner.Email,
            Address: partner.Address,
            CreditLimit: creditLimit,
            CurrentDebt: currentDebt,
            CurrentPayable: partner.CurrentPayable ?? 0,
            Status: status,
            IsOverCreditLimit: isOverLimit,
            RecentOrders: recentOrders
        );

        return Result<CustomerDetailDto>.Success(detail);
    }
}

