using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Production.DTOs;
using StockFlow.Application.Features.Production.Helpers;

namespace StockFlow.Application.Features.Production.Queries;

/// <summary>
/// Tra cứu mặt hàng cho form BOM và form lập lệnh sản xuất: mã, tên, đơn vị cơ sở, đã có BOM đang áp dụng chưa,
/// tồn tại kho đang chọn (nếu được quyền kho). Không trả giá (BR-39).
/// </summary>
public record SearchProductionProductsQuery(string? Search, int? WarehouseId, bool ActiveBomOnly, int Limit)
    : IRequest<Result<List<ProductionProductLookupDto>>>;

public class SearchProductionProductsQueryHandler
    : IRequestHandler<SearchProductionProductsQuery, Result<List<ProductionProductLookupDto>>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public SearchProductionProductsQueryHandler(IStockFlowDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<List<ProductionProductLookupDto>>> Handle(SearchProductionProductsQuery query, CancellationToken ct)
    {
        var q = _context.MstProducts.AsNoTracking().Where(p => p.IsActive != false);
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var s = query.Search.Trim().ToLower();
            q = q.Where(p => (p.ProductCode != null && p.ProductCode.ToLower().Contains(s))
                             || (p.ProductName != null && p.ProductName.ToLower().Contains(s)));
        }
        if (query.ActiveBomOnly) q = q.Where(p => p.MstBoms.Any(b => b.IsActive == true));

        var limit = query.Limit is > 0 and <= 100 ? query.Limit : 30;
        var rows = await q
            .OrderBy(p => p.ProductCode)
            .Take(limit)
            .Select(p => new
            {
                p.ProductId,
                Code = p.ProductCode ?? "",
                Name = p.ProductName ?? "",
                Unit = p.BaseUnit.UnitName ?? "",
                p.ProductType,
                HasBom = p.MstBoms.Any(b => b.IsActive == true),
            })
            .ToListAsync(ct);

        int? warehouseId = query.WarehouseId.HasValue && await _currentUser.HasWarehouseAccessAsync(query.WarehouseId.Value, ct)
            ? query.WarehouseId
            : null;
        var available = warehouseId.HasValue
            ? await ProductionStockOps.AvailableAsync(_context, warehouseId.Value, rows.Select(r => r.ProductId), ct)
            : null;

        return Result.Success(rows.Select(r => new ProductionProductLookupDto(
            r.ProductId, r.Code, r.Name, r.Unit, r.ProductType, r.HasBom,
            available != null ? available.GetValueOrDefault(r.ProductId) : null)).ToList());
    }
}
