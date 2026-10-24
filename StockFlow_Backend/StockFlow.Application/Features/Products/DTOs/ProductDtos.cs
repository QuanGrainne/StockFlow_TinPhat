namespace StockFlow.Application.Features.Products.DTOs;

public class ProductConversionUnitDto
{
    public string Name { get; set; } = string.Empty;
    public decimal ConversionRate { get; set; } = 1;
    public bool IsBase { get; set; }
    public bool IsDirectSale { get; set; } = true;
}

public class ProductAttributeDto
{
    public string Name { get; set; } = string.Empty;
    public List<string> Values { get; set; } = new();
}

public class ProductVariantItemDto
{
    public string? AttributeValue { get; set; }
    public string UnitName { get; set; } = string.Empty;
    public decimal ConversionRate { get; set; } = 1;
    public string? Code { get; set; }
    public string? Barcode { get; set; }
    public decimal CostPrice { get; set; }
    public decimal SalePrice { get; set; }
    public decimal Stock { get; set; }
}

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
    string? Barcode = null,
    string? Brand = null,
    decimal? MinSafeStock = null,
    decimal? MaxSafeStock = null,
    decimal? Weight = null,
    string? Dimensions = null,
    string? LocationName = null,
    bool? IsDirectSale = true,
    bool? HasRewardPoints = true,
    string? ImageUrl = null,
    string? VariantsJson = null,
    string? Description = null,
    DateTime? CreatedAt = null,
    string? Supplier = null
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
    string? Barcode,
    string? Brand,
    decimal? MinSafeStock,
    decimal? MaxSafeStock,
    decimal? Weight,
    string? Dimensions,
    string? LocationName,
    bool? IsDirectSale,
    bool? HasRewardPoints,
    string? ImageUrl,
    string? VariantsJson,
    string? Description,
    DateTime? CreatedAt,
    List<ProductWarehouseStockDto> Warehouses,
    List<ProductConversionUnitDto>? Units = null,
    List<ProductAttributeDto>? Attributes = null,
    List<ProductVariantItemDto>? Variants = null,
    string? Supplier = null
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

public class CreateProductRequest
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = "FINISHED";
    public int? CategoryId { get; set; }
    public string? CategoryName { get; set; }
    public int? BaseUnitId { get; set; }
    public string? Uom { get; set; }
    public decimal? StandardPrice { get; set; }
    public decimal? CostPrice { get; set; }
    public decimal? ReorderPoint { get; set; }
    public decimal? MinSafeStock { get; set; }
    public decimal? MaxSafeStock { get; set; }
    public string? Barcode { get; set; }
    public string? Brand { get; set; }
    public decimal? Weight { get; set; }
    public string? Dimensions { get; set; }
    public string? LocationName { get; set; }
    public bool? IsDirectSale { get; set; } = true;
    public bool? HasRewardPoints { get; set; } = true;
    public string? ImageUrl { get; set; }
    public string? VariantsJson { get; set; }
    public string? Description { get; set; }
    public decimal? InitialStock { get; set; }
    public int? InitialWarehouseId { get; set; }
    public List<ProductConversionUnitDto>? Units { get; set; }
    public List<ProductAttributeDto>? Attributes { get; set; }
    public List<ProductVariantItemDto>? Variants { get; set; }
    public DateTime? CreatedAt { get; set; }
    public string? Supplier { get; set; }
}

public class UpdateProductRequest
{
    public string? Code { get; set; }
    public string? Name { get; set; }
    public string? Type { get; set; }
    public int? CategoryId { get; set; }
    public int? BaseUnitId { get; set; }
    public string? Uom { get; set; }
    public decimal? StandardPrice { get; set; }
    public decimal? CostPrice { get; set; }
    public decimal? ReorderPoint { get; set; }
    public decimal? MinSafeStock { get; set; }
    public decimal? MaxSafeStock { get; set; }
    public string? Barcode { get; set; }
    public string? Brand { get; set; }
    public string? Supplier { get; set; }
    public decimal? Weight { get; set; }
    public string? Dimensions { get; set; }
    public string? LocationName { get; set; }
    public bool? IsDirectSale { get; set; }
    public bool? HasRewardPoints { get; set; }
    public string? ImageUrl { get; set; }
    public string? VariantsJson { get; set; }
    public string? Description { get; set; }
    public bool? IsActive { get; set; }
    public List<ProductConversionUnitDto>? Units { get; set; }
    public List<ProductAttributeDto>? Attributes { get; set; }
    public List<ProductVariantItemDto>? Variants { get; set; }
}
