using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Products.DTOs;

namespace StockFlow.Application.Features.Products.Queries;

public record GetProductCategoriesQuery : IRequest<Result<List<ProductCategoryDto>>>;

public class GetProductCategoriesQueryHandler : IRequestHandler<GetProductCategoriesQuery, Result<List<ProductCategoryDto>>>
{
    private readonly IStockFlowDbContext _context;

    public GetProductCategoriesQueryHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<List<ProductCategoryDto>>> Handle(GetProductCategoriesQuery request, CancellationToken cancellationToken)
    {
        var categories = await _context.MstProductCategories
            .Include(c => c.MstProducts)
            .OrderBy(c => c.CategoryId)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var result = categories.Select(c => new ProductCategoryDto(
            CategoryId: c.CategoryId,
            CategoryName: c.CategoryName ?? $"Danh mục #{c.CategoryId}",
            Description: c.Description,
            IsActive: c.IsActive ?? true,
            ProductCount: c.MstProducts.Count,
            ActiveProductCount: c.MstProducts.Count(p => p.IsActive != false)
        )).ToList();

        return Result.Success(result);
    }
}

public record GetProductUnitsQuery : IRequest<Result<List<ProductUnitDto>>>;

public class GetProductUnitsQueryHandler : IRequestHandler<GetProductUnitsQuery, Result<List<ProductUnitDto>>>
{
    private readonly IStockFlowDbContext _context;

    public GetProductUnitsQueryHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<List<ProductUnitDto>>> Handle(GetProductUnitsQuery request, CancellationToken cancellationToken)
    {
        var units = await _context.MstUnits
            .OrderBy(u => u.UnitId)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var result = units.Select(u => new ProductUnitDto(
            UnitId: u.UnitId,
            UnitName: u.UnitName ?? "",
            Abbreviation: u.Abbreviation ?? u.UnitName ?? ""
        )).ToList();

        return Result.Success(result);
    }
}
