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
    string ScopeCustomerType,
    List<string>? ScopeCustomerGroupCodes,
    string ScopeUserType,
    List<int>? ScopeUserIds,
    int TotalItemsCount,
    DateTime? UpdatedAt
);

public record PriceBookMatrixItemDto(
    int ProductId,
    string ProductCode,
    string ProductName,
    string CategoryName,
    string UnitName,
    decimal CostPrice,
    decimal LatestPurchasePrice,
    decimal StockQuantity,
    Dictionary<int, decimal?> Prices
);

public record PriceBookMatrixResultDto(
    List<PriceBookMatrixItemDto> Items,
    int TotalCount,
    int PageIndex,
    int PageSize
);

public record UpdateProductPriceItemDto(
    int ProductId,
    decimal Price
);
