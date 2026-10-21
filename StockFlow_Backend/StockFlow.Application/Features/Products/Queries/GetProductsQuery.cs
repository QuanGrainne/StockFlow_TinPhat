using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Products.DTOs;

namespace StockFlow.Application.Features.Products.Queries;

public record GetProductsQuery(
    string? Search = null,
    string? Type = null,
    int? CategoryId = null,
    int? WarehouseId = null,
    bool? LowStockOnly = null,
    string? Status = null
) : IRequest<Result<List<ProductDto>>>;

public class GetProductsQueryHandler : IRequestHandler<GetProductsQuery, Result<List<ProductDto>>>
{
    private readonly IStockFlowDbContext _context;

    public GetProductsQueryHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<List<ProductDto>>> Handle(GetProductsQuery query, CancellationToken cancellationToken)
    {
        var productsQuery = _context.MstProducts
            .Include(p => p.Category)
            .Include(p => p.BaseUnit)
            .Include(p => p.TrxInventoryBalances)
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var s = query.Search.ToLower().Trim();
            productsQuery = productsQuery.Where(p =>
                (p.ProductCode != null && p.ProductCode.ToLower().Contains(s)) ||
                (p.ProductName != null && p.ProductName.ToLower().Contains(s)));
        }

        if (!string.IsNullOrWhiteSpace(query.Type) && query.Type != "ALL")
        {
            var t = query.Type.Trim();
            productsQuery = productsQuery.Where(p => p.ProductType != null && p.ProductType.ToUpper() == t.ToUpper());
        }

        if (query.CategoryId.HasValue && query.CategoryId.Value > 0)
        {
            productsQuery = productsQuery.Where(p => p.CategoryId == query.CategoryId.Value);
        }

        if (!string.IsNullOrWhiteSpace(query.Status) && query.Status != "ALL")
        {
            if (query.Status.Equals("ACTIVE", StringComparison.OrdinalIgnoreCase))
                productsQuery = productsQuery.Where(p => p.IsActive == true);
            else if (query.Status.Equals("INACTIVE", StringComparison.OrdinalIgnoreCase) || query.Status.Equals("LOCKED", StringComparison.OrdinalIgnoreCase))
                productsQuery = productsQuery.Where(p => p.IsActive == false);
        }

        var products = await productsQuery.OrderBy(p => p.ProductId).ToListAsync(cancellationToken);

        var result = products.Select(p =>
        {
            decimal stockQty;
            if (query.WarehouseId.HasValue && query.WarehouseId.Value > 0)
            {
                stockQty = p.TrxInventoryBalances
                    .Where(b => b.WarehouseId == query.WarehouseId.Value)
                    .Sum(b => b.Quantity ?? 0);
            }
            else
            {
                stockQty = p.TrxInventoryBalances.Sum(b => b.Quantity ?? 0);
            }

            var costPrice = p.MovingAverageCost ?? 0;
            var standardPrice = p.StandardPrice ?? (costPrice > 0 ? Math.Round(costPrice * 1.35m, 0) : 0);

            return new ProductDto(
                Id: p.ProductId.ToString(),
                ProductId: p.ProductId,
                Code: p.ProductCode ?? $"PROD-{p.ProductId:D3}",
                Name: p.ProductName ?? "",
                Type: p.ProductType ?? "FINISHED",
                CategoryId: p.CategoryId,
                CategoryName: p.Category?.CategoryName ?? "Chung",
                BaseUnitId: p.BaseUnitId,
                Uom: p.BaseUnit?.UnitName ?? p.BaseUnit?.Abbreviation ?? "Cái",
                StandardPrice: standardPrice,
                CostPrice: costPrice,
                ReorderPoint: p.ReorderPoint ?? 0,
                StockQuantity: stockQty,
                Status: p.IsActive != false ? "ACTIVE" : "INACTIVE",
                Barcode: p.Barcode,
                Brand: p.Brand,
                MinSafeStock: p.MinSafeStock,
                MaxSafeStock: p.MaxSafeStock,
                Weight: p.Weight,
                Dimensions: p.Dimensions,
                LocationName: p.LocationName,
                IsDirectSale: p.IsDirectSale,
                HasRewardPoints: p.HasRewardPoints,
                ImageUrl: p.ImageUrl,
                VariantsJson: p.VariantsJson,
                Description: p.Description,
                CreatedAt: p.CreatedAt
            );
        }).ToList();

        if (query.LowStockOnly == true)
        {
            result = result.Where(r => r.StockQuantity <= r.ReorderPoint).ToList();
        }

        return Result.Success(result);
    }
}
