using System;
using System.Collections.Generic;

namespace StockFlow.Application.Features.PriceBooks.DTOs;

public record PriceBookDto(
    int PriceBookId,
    string? PriceBookCode,
    string PriceBookName,
    DateTime? EffectiveFrom,
    DateTime? EffectiveTo,
    bool IsActive,
    bool IsDefault,
    string? FormulaBaseType,
    int? FormulaBasePriceBookId,
    string? FormulaBasePriceBookName,
    string? FormulaOperator,
    decimal? FormulaValue,
    string? FormulaUnit,
    bool AllowUnlistedProducts,
    bool WarnUnlistedProducts,
    string ScopeBranchType,
    List<int>? ScopeWarehouseIds,
    /// <summary>"ALL" = mọi khách; "SPECIFIC" = chỉ các khách trong ScopeCustomerIds</summary>
    string ScopeCustomerType,
    List<int>? ScopeCustomerIds,
    /// <summary>Mã, tên các khách được chọn (để hiển thị)</summary>
    List<PriceBookCustomerRefDto> ScopeCustomers,
    int TotalItemsCount,
    DateTime? UpdatedAt
);

/// <summary>Khách hàng trong phạm vi bảng giá / gợi ý khi chọn khách.</summary>
public record PriceBookCustomerRefDto(int PartnerId, string? PartnerCode, string? PartnerName, string? Phone);

public record PriceBookMatrixItemDto(
    int ProductId,
    string ProductCode,
    string ProductName,
    string CategoryName,
    string UnitName,
    decimal CostPrice,
    decimal LatestPurchasePrice,
    decimal StockQuantity,
    Dictionary<int, decimal?> Prices,
    // Dòng đơn vị quy đổi của hàng (VD SP004330 = "bịch" của SP004328): mã đơn vị và số đơn vị cơ bản trong 1 đơn vị.
    // null = dòng hàng (đơn vị cơ bản). Giá vốn, tồn đã quy theo đơn vị này.
    string? UnitCode = null,
    decimal ConversionRate = 1
);

public record PriceBookMatrixResultDto(
    List<PriceBookMatrixItemDto> Items,
    int TotalCount,
    int PageIndex,
    int PageSize
);

public record UpdateProductPriceItemDto(
    int ProductId,
    decimal Price,
    // Có giá trị = giá của đơn vị quy đổi có mã này (chỉ sửa ở Bảng giá chung, lưu vào giá bán của đơn vị trong variants_json)
    string? UnitCode = null
);
