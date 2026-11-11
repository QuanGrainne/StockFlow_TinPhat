namespace StockFlow.Application.Common.Inventory;

/// <summary>Vị trí tồn kho: kho + sản phẩm + vị trí + lô.</summary>
public sealed record StockKey(int WarehouseId, int ProductId, int? LocationId, int? LotId);
