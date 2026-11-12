using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Customers.DTOs;
using StockFlow.Application.Features.Customers.Helpers;

namespace StockFlow.Application.Features.Customers.Queries;

/// <summary>
/// Danh sách Khách hàng (mst_business_partners, partner_type CUSTOMER / BOTH) kèm bộ lọc như màn Nhà cung cấp:
/// chi nhánh tạo, ngày tạo, giới tính, tổng bán (giá trị + khoảng thời gian tính), nợ hiện tại, trạng thái.
/// </summary>
public record GetCustomersQuery(
    string? Search = null,
    string? DebtStatus = null,
    string? Status = null,
    int? CreatedWarehouseId = null,
    DateTime? CreatedFrom = null,
    DateTime? CreatedTo = null,
    string? Gender = null,
    decimal? MinSales = null,
    decimal? MaxSales = null,
    DateTime? SalesFrom = null,
    DateTime? SalesTo = null,
    decimal? MinDebt = null,
    decimal? MaxDebt = null
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
        var dbQuery = _context.MstBusinessPartners
            .Where(p => p.PartnerType != null &&
                        (p.PartnerType.ToUpper() == "CUSTOMER" || p.PartnerType.ToUpper() == "BOTH"))
            // Ẩn hồ sơ "Khách lẻ" dùng nội bộ cho đơn POS không chọn khách
            .Where(p => p.PartnerCode != "KH00000")
            .AsNoTracking();

        // Từ khóa: mã, tên, điện thoại (1, 2), email, địa chỉ
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var s = query.Search.ToLower().Trim();
            dbQuery = dbQuery.Where(p =>
                (p.PartnerCode != null && p.PartnerCode.ToLower().Contains(s)) ||
                (p.PartnerName != null && p.PartnerName.ToLower().Contains(s)) ||
                (p.Phone != null && p.Phone.ToLower().Contains(s)) ||
                (p.Phone2 != null && p.Phone2.ToLower().Contains(s)) ||
                (p.Email != null && p.Email.ToLower().Contains(s)) ||
                (p.Address != null && p.Address.ToLower().Contains(s)));
        }

        // Tình trạng công nợ (giữ tương thích bộ lọc cũ)
        if (!string.IsNullOrWhiteSpace(query.DebtStatus) && !query.DebtStatus.Equals("ALL", StringComparison.OrdinalIgnoreCase))
        {
            if (query.DebtStatus.Equals("HAS_DEBT", StringComparison.OrdinalIgnoreCase))
                dbQuery = dbQuery.Where(p => (p.CurrentDebt ?? 0) > 0);
            else if (query.DebtStatus.Equals("NO_DEBT", StringComparison.OrdinalIgnoreCase))
                dbQuery = dbQuery.Where(p => (p.CurrentDebt ?? 0) <= 0);
            else if (query.DebtStatus.Equals("OVER_LIMIT", StringComparison.OrdinalIgnoreCase))
                dbQuery = dbQuery.Where(p => (p.CurrentDebt ?? 0) > (p.CreditLimit ?? 0));
        }

        // Trạng thái hoạt động
        if (!string.IsNullOrWhiteSpace(query.Status) && !query.Status.Equals("ALL", StringComparison.OrdinalIgnoreCase))
        {
            if (query.Status.Equals("ACTIVE", StringComparison.OrdinalIgnoreCase))
                dbQuery = dbQuery.Where(p => p.IsActive != false);
            else if (query.Status.Equals("INACTIVE", StringComparison.OrdinalIgnoreCase))
                dbQuery = dbQuery.Where(p => p.IsActive == false);
        }

        // Chi nhánh tạo
        if (query.CreatedWarehouseId.HasValue && query.CreatedWarehouseId.Value > 0)
            dbQuery = dbQuery.Where(p => p.CreatedWarehouseId == query.CreatedWarehouseId.Value);

        // Ngày tạo (theo ngày)
        if (query.CreatedFrom.HasValue)
            dbQuery = dbQuery.Where(p => p.CreatedAt >= query.CreatedFrom.Value.Date);
        if (query.CreatedTo.HasValue)
        {
            var end = query.CreatedTo.Value.Date.AddDays(1);
            dbQuery = dbQuery.Where(p => p.CreatedAt < end);
        }

        // Giới tính
        var gender = CustomerProfileHelper.NormalizeGender(query.Gender);
        if (gender != null)
            dbQuery = dbQuery.Where(p => p.Gender == gender);

        // Nợ hiện tại (khoảng giá trị)
        if (query.MinDebt.HasValue) dbQuery = dbQuery.Where(p => (p.CurrentDebt ?? 0) >= query.MinDebt.Value);
        if (query.MaxDebt.HasValue) dbQuery = dbQuery.Where(p => (p.CurrentDebt ?? 0) <= query.MaxDebt.Value);

        var partners = await dbQuery.OrderByDescending(p => p.PartnerId).ToListAsync(cancellationToken);
        var lookups = await CustomerProfileHelper.LoadLookupsAsync(_context, partners, query.SalesFrom, query.SalesTo, cancellationToken);

        var dtos = partners.Select(p => CustomerProfileHelper.ToDto(p, lookups));

        // Tổng bán (khoảng giá trị, tính trong khoảng thời gian bán đã chọn)
        if (query.MinSales.HasValue) dtos = dtos.Where(d => d.TotalSales >= query.MinSales.Value);
        if (query.MaxSales.HasValue) dtos = dtos.Where(d => d.TotalSales <= query.MaxSales.Value);

        return Result<List<CustomerDto>>.Success(dtos.ToList());
    }
}
