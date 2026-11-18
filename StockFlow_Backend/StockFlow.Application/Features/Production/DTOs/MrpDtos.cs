using System;
using System.Collections.Generic;

namespace StockFlow.Application.Features.Production.DTOs;

public record RunMrpRequest(
    DateOnly PeriodEnd,
    List<int> WarehouseIds,
    bool IncludePendingPlans = false);

public record MrpRunSummaryDto(
    int MrpRunId,
    string RunCode,
    DateTime RunAt,
    string RunByName,
    DateOnly PeriodStart,
    DateOnly PeriodEnd,
    List<MrpWarehouseLookupDto> Warehouses,
    bool IncludePendingPlans,
    int MaterialCount,
    int ShortageCount,
    int LateCount,
    List<MrpProductLookupDto> ProductsWithoutBom,
    bool IsStale,
    List<string> StaleReasons);

public record MrpRunListItemDto(
    int MrpRunId,
    string RunCode,
    DateTime RunAt,
    string RunByName,
    DateOnly PeriodStart,
    DateOnly PeriodEnd,
    string WarehouseNames,
    int MaterialCount,
    int ShortageCount,
    int LateCount);

public record MrpWarehouseLookupDto(int WarehouseId, string WarehouseName);

public record MrpProductLookupDto(int ProductId, string ProductCode, string ProductName);

public record MrpDemandSourceDto(string Type, string Code, string ProductCode, decimal Quantity);

public record MrpDailyRequirementDto(
    DateOnly Date,
    int MaterialId,
    string MaterialCode,
    string MaterialName,
    string UnitName,
    decimal GrossRequirement,
    List<MrpDemandSourceDto> Sources);

public record MrpMonthlyMaterialDemandDto(
    int MaterialId,
    string MaterialCode,
    string MaterialName,
    string UnitName,
    List<decimal> Quantities,
    decimal Total);

public record MrpMonthlyDemandDto(
    List<string> Buckets,
    List<MrpMonthlyMaterialDemandDto> Materials);

public record MrpAffectedRequirementDto(
    string Type,
    string Code,
    string ProductCode,
    DateOnly NeededDate,
    decimal ShortageQty);

public record MrpOtherWarehouseStockDto(
    int WarehouseId,
    string WarehouseName,
    decimal OnHand);

public record MrpShortageDto(
    int MaterialId,
    string MaterialCode,
    string MaterialName,
    string UnitName,
    DateOnly? FirstShortageDate,
    decimal TotalNetRequirement,
    bool IsLate,
    bool HasLeadTime,
    decimal OnHand,
    decimal OnOrderWithoutDate,
    List<MrpAffectedRequirementDto> Affected,
    List<MrpOtherWarehouseStockDto> OtherWarehouses);

public record MrpProjectionRowDto(
    DateOnly Date,
    decimal GrossRequirement,
    decimal ScheduledReceipt,
    decimal ProjectedBalance,
    decimal NetRequirement,
    decimal PlannedReceipt,
    decimal ProjectedBalanceAfterPlan,
    DateOnly? PlannedReleaseDate,
    bool IsLate);

public record MrpProjectionDto(
    MrpProductLookupDto Material,
    string UnitName,
    decimal OpeningBalance,
    decimal SafetyStock,
    int? LeadTimeDays,
    List<MrpProjectionRowDto> Rows);

public record MrpLastSupplierDto(int PartnerId, string PartnerName);

public record MrpPurchaseSuggestionDto(
    int MaterialId,
    string MaterialCode,
    string MaterialName,
    string UnitName,
    decimal SuggestedQty,
    decimal SuggestedQtyRounded,
    DateOnly? RequiredReceiptDate,
    DateOnly? ReleaseDate,
    string Status,
    MrpLastSupplierDto? LastSupplier);
