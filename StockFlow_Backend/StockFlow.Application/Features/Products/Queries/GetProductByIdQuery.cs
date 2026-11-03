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
    private readonly ICurrentUserService _currentUserService;

    public GetProductByIdQueryHandler(
        IStockFlowDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
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
        var standardPrice = product.StandardPrice ?? (costPrice > 0 ? Math.Round(costPrice * 1.35m, 0) : 0);

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

        // Data Isolation: Nếu là tài khoản nhân viên (không phải Admin), ẩn các kho không có quyền
        if (_currentUserService.IsAuthenticated && !_currentUserService.IsAdmin)
        {
            var authorizedIds = await _currentUserService.GetAuthorizedWarehouseIdsAsync(cancellationToken);
            warehouses = warehouses.Where(w => authorizedIds.Contains(w.WarehouseId)).ToList();
        }

        var totalStock = warehouses.Sum(w => w.Quantity);

        List<ProductConversionUnitDto>? units = null;
        List<ProductAttributeDto>? attributes = null;
        List<ProductVariantItemDto>? variants = null;
        string? supplier = null;

        if (!string.IsNullOrWhiteSpace(product.VariantsJson))
        {
            try
            {
                using var doc = System.Text.Json.JsonDocument.Parse(product.VariantsJson);
                var root = doc.RootElement;
                if (root.TryGetProperty("units", out var uEl))
                {
                    units = System.Text.Json.JsonSerializer.Deserialize<List<ProductConversionUnitDto>>(uEl.GetRawText());
                }
                if (root.TryGetProperty("attributes", out var aEl))
                {
                    attributes = System.Text.Json.JsonSerializer.Deserialize<List<ProductAttributeDto>>(aEl.GetRawText());
                }
                if (root.TryGetProperty("variants", out var vEl))
                {
                    variants = System.Text.Json.JsonSerializer.Deserialize<List<ProductVariantItemDto>>(vEl.GetRawText());
                }
                if (root.TryGetProperty("supplier", out var supEl))
                {
                    supplier = supEl.GetString();
                }
            }
            catch
            {
                // Ignore parse errors on malformed JSON
            }
        }

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
            Barcode: product.Barcode,
            Brand: product.Brand,
            MinSafeStock: product.MinSafeStock,
            MaxSafeStock: product.MaxSafeStock,
            Weight: product.Weight,
            Dimensions: product.Dimensions,
            LocationName: product.LocationName,
            IsDirectSale: product.IsDirectSale,
            HasRewardPoints: product.HasRewardPoints,
            ImageUrl: product.ImageUrl,
            VariantsJson: product.VariantsJson,
            Description: product.Description,
            CreatedAt: product.CreatedAt,
            Warehouses: warehouses,
            Units: units,
            Attributes: attributes,
            Variants: variants,
            Supplier: supplier
        );

        return Result.Success(detail);
    }
}
