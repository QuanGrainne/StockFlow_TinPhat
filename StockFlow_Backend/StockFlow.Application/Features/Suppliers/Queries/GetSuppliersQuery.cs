using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Suppliers.DTOs;

namespace StockFlow.Application.Features.Suppliers.Queries;

/// <summary>
/// Truy vấn danh sách Nhà cung cấp kèm tìm kiếm và bộ lọc.
/// </summary>
public record GetSuppliersQuery(
    string? Search = null,
    string? DebtStatus = null,
    string? Status = null
) : IRequest<Result<List<SupplierDto>>>;

public class GetSuppliersQueryHandler : IRequestHandler<GetSuppliersQuery, Result<List<SupplierDto>>>
{
    private readonly IStockFlowDbContext _context;

    public GetSuppliersQueryHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<List<SupplierDto>>> Handle(GetSuppliersQuery query, CancellationToken cancellationToken)
    {
        // 1. Chỉ lấy đối tác có loại là Nhà cung cấp (SUPPLIER hoặc BOTH)
        var dbQuery = _context.MstBusinessPartners
            .Where(p => p.PartnerType != null && 
                       (p.PartnerType.ToUpper() == "SUPPLIER" || p.PartnerType.ToUpper() == "BOTH"))
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

        // 3. Lọc theo tình trạng công nợ phải trả
        if (!string.IsNullOrWhiteSpace(query.DebtStatus) && !query.DebtStatus.Equals("ALL", StringComparison.OrdinalIgnoreCase))
        {
            if (query.DebtStatus.Equals("HAS_DEBT", StringComparison.OrdinalIgnoreCase))
            {
                dbQuery = dbQuery.Where(p => (p.CurrentPayable ?? 0) > 0);
            }
            else if (query.DebtStatus.Equals("NO_DEBT", StringComparison.OrdinalIgnoreCase))
            {
                dbQuery = dbQuery.Where(p => (p.CurrentPayable ?? 0) <= 0);
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

        // 5. Sắp xếp danh sách
        var partners = await dbQuery
            .OrderBy(p => p.PartnerId)
            .ToListAsync(cancellationToken);

        // 6. Map sang DTO
        var dtos = partners.Select(p => new SupplierDto(
            Id: p.PartnerId.ToString(),
            PartnerId: p.PartnerId,
            Code: p.PartnerCode ?? $"NCC{p.PartnerId:D6}",
            Name: p.PartnerName ?? "",
            Type: p.PartnerType ?? "SUPPLIER",
            Phone: p.Phone,
            Email: p.Email,
            Address: p.Address,
            CreditLimit: p.CreditLimit ?? 0m,
            CurrentPayable: p.CurrentPayable ?? 0m,
            CurrentDebt: p.CurrentDebt ?? 0m,
            Status: p.IsActive != false ? "ACTIVE" : "INACTIVE"
        )).ToList();

        return Result.Success(dtos);
    }
}
