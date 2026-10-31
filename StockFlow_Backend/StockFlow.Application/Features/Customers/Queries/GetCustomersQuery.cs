using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Customers.DTOs;

namespace StockFlow.Application.Features.Customers.Queries;

/// <summary>
/// Truy vấn danh sách Khách hàng từ bảng mst_business_partners với partner_type = 'CUSTOMER'.
/// </summary>
public record GetCustomersQuery(
    string? Search = null,
    string? DebtStatus = null,
    string? Status = null
) : IRequest<Result<List<CustomerDto>>>;

public class GetCustomersQueryHandler : IRequestHandler<GetCustomersQuery, Result<List<CustomerDto>>>
{
    private readonly IStockFlowDbContext _context;

    public GetCustomersQueryHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<List<CustomerDto>>> Handle(GetCustomersQuery query, CancellationToken cancellationToken)
    {
        // 1. Chỉ lấy đối tác có loại là Khách hàng (CUSTOMER hoặc BOTH) - LOẠI BỎ TOÀN BỘ SUPPLIER
        var dbQuery = _context.MstBusinessPartners
            .Where(p => p.PartnerType != null && 
                       (p.PartnerType.ToUpper() == "CUSTOMER" || p.PartnerType.ToUpper() == "BOTH"))
            .AsNoTracking();

        // 2. Tìm kiếm từ khóa đa năng (Mã, Tên, Số điện thoại, Email, Địa chỉ)
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var s = query.Search.ToLower().Trim();
            dbQuery = dbQuery.Where(p =>
                (p.PartnerCode != null && p.PartnerCode.ToLower().Contains(s)) ||
                (p.PartnerName != null && p.PartnerName.ToLower().Contains(s)) ||
                (p.Phone != null && p.Phone.ToLower().Contains(s)) ||
                (p.Email != null && p.Email.ToLower().Contains(s)) ||
                (p.Address != null && p.Address.ToLower().Contains(s)));
        }

        // 3. Lọc theo tình trạng công nợ
        if (!string.IsNullOrWhiteSpace(query.DebtStatus) && !query.DebtStatus.Equals("ALL", StringComparison.OrdinalIgnoreCase))
        {
            if (query.DebtStatus.Equals("HAS_DEBT", StringComparison.OrdinalIgnoreCase))
            {
                dbQuery = dbQuery.Where(p => (p.CurrentDebt ?? 0) > 0);
            }
            else if (query.DebtStatus.Equals("NO_DEBT", StringComparison.OrdinalIgnoreCase))
            {
                dbQuery = dbQuery.Where(p => (p.CurrentDebt ?? 0) <= 0);
            }
            else if (query.DebtStatus.Equals("OVER_LIMIT", StringComparison.OrdinalIgnoreCase))
            {
                dbQuery = dbQuery.Where(p => (p.CurrentDebt ?? 0) > (p.CreditLimit ?? 0));
            }
        }

        // 4. Lọc theo trạng thái hoạt động (ACTIVE / INACTIVE)
        if (!string.IsNullOrWhiteSpace(query.Status) && !query.Status.Equals("ALL", StringComparison.OrdinalIgnoreCase))
        {
            if (query.Status.Equals("ACTIVE", StringComparison.OrdinalIgnoreCase))
            {
                dbQuery = dbQuery.Where(p => p.IsActive != false);
            }
            else if (query.Status.Equals("INACTIVE", StringComparison.OrdinalIgnoreCase))
            {
                dbQuery = dbQuery.Where(p => p.IsActive == false);
            }
        }

        // 5. Sắp xếp: ID mới nhất lên trước
        var rawList = await dbQuery
            .OrderByDescending(p => p.PartnerId)
            .ToListAsync(cancellationToken);

        // 6. Map sang DTO
        var dtos = rawList.Select(p =>
        {
            var creditLimit = p.CreditLimit ?? 0;
            var currentDebt = p.CurrentDebt ?? 0;
            var isOverLimit = creditLimit > 0 && currentDebt > creditLimit;
            var status = (p.IsActive != false) ? "ACTIVE" : "INACTIVE";

            return new CustomerDto(
                Id: p.PartnerId.ToString(),
                PartnerId: p.PartnerId,
                Code: p.PartnerCode ?? $"KH{p.PartnerId.ToString().PadLeft(5, '0')}",
                Name: p.PartnerName ?? "Khách hàng chưa đặt tên",
                Type: p.PartnerType ?? "CUSTOMER",
                Phone: p.Phone,
                Email: p.Email,
                Address: p.Address,
                CreditLimit: creditLimit,
                CurrentDebt: currentDebt,
                CurrentPayable: p.CurrentPayable ?? 0,
                Status: status,
                IsOverCreditLimit: isOverLimit
            );
        }).ToList();

        return Result<List<CustomerDto>>.Success(dtos);
    }
}

