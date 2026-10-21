namespace StockFlow.Application.Features.Products.DTOs;

public record ProductDto(
    string Id,
    int ProductId,
    string Code,
    string Name,
    string Type,
    int CategoryId,
    string CategoryName,
    int BaseUnitId,
    string Uom,
    decimal StandardPrice,
    decimal CostPrice,
    decimal ReorderPoint,
    decimal StockQuantity,
    string Status,
    string? Description = null,
    DateTime? CreatedAt = null
);

public record ProductWarehouseStockDto(
    int WarehouseId,
    string WarehouseCode,
    string WarehouseName,
    decimal Quantity,
    decimal UnitCost
);

public record ProductDetailDto(
    string Id,
    int ProductId,
    string Code,
    string Name,
    string Type,
    int CategoryId,
    string CategoryName,
    int BaseUnitId,
    string Uom,
    decimal StandardPrice,
    decimal CostPrice,
    decimal ReorderPoint,
    decimal TotalStockQuantity,
    string Status,
    string? Description,
    DateTime? CreatedAt,
    List<ProductWarehouseStockDto> Warehouses
);

public record ProductCategoryDto(
    int CategoryId,
    string CategoryName,
    string? Description,
    bool IsActive,
    int ProductCount
);

public record ProductUnitDto(
    int UnitId,
    string UnitName,
    string Abbreviation
);

public record CreateProductRequest(
    string Code,
    string Name,
    string Type,
    int? CategoryId = null,
    string? CategoryName = null,
    int? BaseUnitId = null,
    string? Uom = null,
    decimal? StandardPrice = null,
    decimal? CostPrice = null,
    decimal? ReorderPoint = null,
    string? Description = null,
    decimal? InitialStock = null,
    int? InitialWarehouseId = null
);

public record UpdateProductRequest(
    string? Code = null,
    string? Name = null,
    string? Type = null,
    int? CategoryId = null,
    int? BaseUnitId = null,
    string? Uom = null,
    decimal? StandardPrice = null,
    decimal? CostPrice = null,
    decimal? ReorderPoint = null,
    string? Description = null,
    bool? IsActive = null
);
