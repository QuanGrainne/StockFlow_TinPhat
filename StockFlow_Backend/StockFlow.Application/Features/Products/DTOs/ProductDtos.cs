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
    string? Supplier = null,
    List<ProductWarehouseStockDto>? Warehouses = null,
    // MRP: số ngày từ lúc đặt tới lúc hàng vào kho; rỗng = chưa khai báo
    int? LeadTimeDays = null
);

public record ProductWarehouseStockDto(
    int WarehouseId,
    string WarehouseCode,
    string WarehouseName,
    decimal Quantity,
    decimal UnitCost,
    // Khách đặt: SL của đơn đặt hàng còn mở chưa giao (giữ hàng, chưa trừ tồn thực tế)
    decimal ReservedQuantity = 0
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
    string? Supplier = null,
    // MRP: số ngày từ lúc đặt tới lúc hàng vào kho; rỗng = chưa khai báo
    int? LeadTimeDays = null
);

public record ProductCategoryDto(
    int CategoryId,
    string CategoryName,
    string? Description,
    bool IsActive,
    int ProductCount,
    int ActiveProductCount = 0 // số hàng hóa đang kinh doanh (is_active khác false)
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
    /// <summary>MRP: thời gian giao (ngày, 0–365); rỗng = chưa khai báo.</summary>
    public int? LeadTimeDays { get; set; }
}

public class UpdateProductRequest
{
    public string? Code { get; set; }
    public string? Name { get; set; }
    public string? Type { get; set; }
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
    public decimal? InitialStock { get; set; }
    public int? InitialWarehouseId { get; set; }
    public List<ProductConversionUnitDto>? Units { get; set; }
    public List<ProductAttributeDto>? Attributes { get; set; }
    public List<ProductVariantItemDto>? Variants { get; set; }
    /// <summary>
    /// Phạm vi áp dụng giá vốn mới (CostPrice): null/rỗng = toàn hệ thống (mọi kho), có giá trị = chỉ các kho này.
    /// </summary>
    public List<int>? CostWarehouseIds { get; set; }
    /// <summary>MRP: thời gian giao (ngày, 0–365). Rỗng = không đổi; muốn xóa thì gửi <see cref="ClearLeadTime"/> = true.</summary>
    public int? LeadTimeDays { get; set; }
    /// <summary>true = xóa thời gian giao (về "chưa khai báo").</summary>
    public bool? ClearLeadTime { get; set; }
}

public class ImportProductItemRequest
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Type { get; set; } = "FINISHED";
    public string? CategoryName { get; set; }
    public string? Brand { get; set; }
    public string? Uom { get; set; }
    public decimal? StandardPrice { get; set; }
    public decimal? CostPrice { get; set; }
    public decimal? StockQuantity { get; set; }
    public decimal? MinSafeStock { get; set; }
    public decimal? MaxSafeStock { get; set; }
    public string? Barcode { get; set; }
    public string? Description { get; set; }
    public decimal? Weight { get; set; }
    public string? LocationName { get; set; }
    public string? ImageUrl { get; set; }
    public bool? IsActive { get; set; } = true;
    public bool? IsDirectSale { get; set; } = true;
    public string? Supplier { get; set; }
    public string? WarehouseName { get; set; }
}

public class ImportProductsRequest
{
    public List<ImportProductItemRequest> Products { get; set; } = new();
    public string DuplicateCodeAction { get; set; } = "ERROR"; // "ERROR" or "REPLACE_NAME"
    public bool UpdateStock { get; set; } = false;
    public bool UpdateCostPrice { get; set; } = false;
    public bool UpdateDescription { get; set; } = false;
    public string? TargetWarehouse { get; set; }
}

public class ImportProductsResultDto
{
    public int ImportedCount { get; set; }
    public int UpdatedCount { get; set; }
    public int TotalCount { get; set; }
    public string Message { get; set; } = string.Empty;
    public List<ProductDto> Products { get; set; } = new();
}

/// <summary>Yêu cầu nhập thêm (ADD) hoặc cân chỉnh (SET) tồn kho của 1 hàng hóa tại 1 kho.</summary>
public record AdjustProductStockRequest(int WarehouseId, decimal Quantity, string Mode = "ADD", string? Note = null);

/// <summary>Kết quả điều chỉnh tồn kho tại 1 kho.</summary>
public record ProductStockAdjustmentDto(
    int ProductId,
    int WarehouseId,
    string WarehouseCode,
    string WarehouseName,
    decimal PreviousQuantity,
    decimal NewQuantity,
    decimal Delta,
    decimal UnitCost,
    string? StocktakeCode = null);
