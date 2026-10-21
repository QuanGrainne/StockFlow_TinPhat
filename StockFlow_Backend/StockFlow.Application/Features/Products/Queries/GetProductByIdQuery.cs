using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Products.DTOs;

namespace StockFlow.Application.Features.Products.Queries;

public record GetProductByIdQuery(int ProductId) : IRequest<Result<ProductDetailDto>>;

public class GetProductByIdQueryHandler : IRequestHandler<GetProductByIdQuery, Result<ProductDetailDto>>
{
    private readonly IStockFlowDbContext _context;

    public GetProductByIdQueryHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<ProductDetailDto>> Handle(GetProductByIdQuery request, CancellationToken cancellationToken)
    {
        var product = await _context.MstProducts
            .Include(p => p.Category)
            .Include(p => p.BaseUnit)
            .Include(p => p.TrxInventoryBalances)
                .ThenInclude(b => b.Warehouse)
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.ProductId == request.ProductId, cancellationToken);

        if (product == null)
        {
            return Result.Failure<ProductDetailDto>("Không tìm thấy thông tin hàng hóa.");
        }

        var costPrice = product.MovingAverageCost ?? 0;
        var standardPrice = costPrice > 0 ? Math.Round(costPrice * 1.35m, 0) : 0;
        var totalStock = product.TrxInventoryBalances.Sum(b => b.Quantity ?? 0);

        var warehouses = product.TrxInventoryBalances
            .GroupBy(b => b.WarehouseId)
            .Select(g =>
            {
                var first = g.First();
                return new ProductWarehouseStockDto(
                    WarehouseId: g.Key,
                    WarehouseCode: first.Warehouse?.WarehouseCode ?? $"WH-{g.Key}",
                    WarehouseName: first.Warehouse?.WarehouseName ?? $"Kho #{g.Key}",
                    Quantity: g.Sum(x => x.Quantity ?? 0),
                    UnitCost: g.Average(x => x.UnitCost ?? costPrice)
                );
            }).ToList();

        var detail = new ProductDetailDto(
            Id: product.ProductId.ToString(),
            ProductId: product.ProductId,
            Code: product.ProductCode ?? $"PROD-{product.ProductId:D3}",
            Name: product.ProductName ?? "",
            Type: product.ProductType ?? "FINISHED",
            CategoryId: product.CategoryId,
            CategoryName: product.Category?.CategoryName ?? "Chung",
            BaseUnitId: product.BaseUnitId,
            Uom: product.BaseUnit?.UnitName ?? product.BaseUnit?.Abbreviation ?? "Cái",
            StandardPrice: standardPrice,
            CostPrice: costPrice,
            ReorderPoint: product.ReorderPoint ?? 0,
            TotalStockQuantity: totalStock,
            Status: product.IsActive != false ? "ACTIVE" : "INACTIVE",
            Description: product.Description,
            CreatedAt: product.CreatedAt,
            Warehouses: warehouses
        );

        return Result.Success(detail);
    }
}
