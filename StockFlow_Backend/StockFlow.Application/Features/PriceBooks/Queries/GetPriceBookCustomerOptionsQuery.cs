using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.PriceBooks.DTOs;
using StockFlow.Application.Features.PriceBooks.Services;

namespace StockFlow.Application.Features.PriceBooks.Queries;

/// <summary>
/// Gợi ý khách hàng khi chọn phạm vi "Khách hàng cụ thể" của bảng giá: khách đang hoạt động, không gồm khách lẻ.
/// Tìm theo mã, tên, điện thoại; tối đa 30 kết quả.
/// Đặt trong module bảng giá để người chỉ có chức năng "Thiết lập giá" vẫn chọn được khách.
/// </summary>
public record GetPriceBookCustomerOptionsQuery(string? Search) : IRequest<Result<List<PriceBookCustomerRefDto>>>;

public class GetPriceBookCustomerOptionsQueryHandler
    : IRequestHandler<GetPriceBookCustomerOptionsQuery, Result<List<PriceBookCustomerRefDto>>>
{
    private const int MaxResults = 30;
    private readonly IStockFlowDbContext _context;

    public GetPriceBookCustomerOptionsQueryHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<List<PriceBookCustomerRefDto>>> Handle(GetPriceBookCustomerOptionsQuery request, CancellationToken ct)
    {
        var query = _context.MstBusinessPartners.AsNoTracking()
            .Where(p => p.IsActive != false
                        && p.PartnerCode != PriceBookScope.WalkInCustomerCode
                        && p.PartnerType != null
                        && (p.PartnerType.ToUpper() == "CUSTOMER" || p.PartnerType.ToUpper() == "BOTH"));

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var s = request.Search.Trim().ToLower();
            query = query.Where(p =>
                (p.PartnerCode != null && p.PartnerCode.ToLower().Contains(s)) ||
                (p.PartnerName != null && p.PartnerName.ToLower().Contains(s)) ||
                (p.Phone != null && p.Phone.Contains(s)));
        }

        var items = await query
            .OrderBy(p => p.PartnerName)
            .Take(MaxResults)
            .Select(p => new PriceBookCustomerRefDto(p.PartnerId, p.PartnerCode, p.PartnerName, p.Phone))
            .ToListAsync(ct);

        return Result.Success(items);
    }
}
