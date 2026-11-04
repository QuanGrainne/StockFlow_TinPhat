namespace StockFlow.Application.Features.Stocktakes.DTOs;

/// <summary>1 dòng hàng của phiếu kiểm kho.</summary>
public record StocktakeItemDto(
    int StocktakeItemId,
    int ProductId,
    string ProductCode,
    string ProductName,
    string Unit,
    decimal SystemQty,
    decimal ActualQty,
    decimal Discrepancy,
    decimal UnitCost,
    decimal DiscrepancyValue);

/// <summary>Phiếu kiểm kho trên danh sách (kèm tổng số liệu như KiotViet).</summary>
public record StocktakeListDto(
    int StocktakeId,
    string StocktakeCode,
    DateTime? StocktakeDate,
    int WarehouseId,
    string WarehouseName,
    string Status,
    int ItemCount,
    decimal TotalActualQty,
    decimal TotalActualValue,
    decimal IncreaseQty,
    decimal IncreaseValue,
    decimal DecreaseQty,
    decimal DecreaseValue,
    decimal TotalDiscrepancyQty,
    decimal TotalDiscrepancyValue,
    DateTime? BalancedDate,
    string CreatedByName,
    string? BalancedByName,
    string? Notes);

public record StocktakeDetailDto(
    StocktakeListDto Summary,
    List<StocktakeItemDto> Items);

public class StocktakeItemRequest
{
    public int ProductId { get; set; }
    public decimal ActualQty { get; set; }
}

/// <summary>Lưu phiếu kiểm: Status DRAFT = Lưu tạm, BALANCED = Hoàn thành (cân bằng kho).</summary>
public class SaveStocktakeRequest
{
    public int? WarehouseId { get; set; }
    public string? StocktakeCode { get; set; }
    public string? Notes { get; set; }
    public string Status { get; set; } = "DRAFT";
    public List<StocktakeItemRequest> Items { get; set; } = new();
}

public class MergeStocktakesRequest
{
    public List<int> StocktakeIds { get; set; } = new();
}
