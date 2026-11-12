using StockFlow.Application.Common.Inventory;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Common.Interfaces;

/// <summary>
/// Sổ tồn kho dùng chung: mọi biến động tồn đi qua đây để cập nhật trx_inventory_balances
/// và ghi đúng 1 dòng thẻ kho trx_inventory_transactions (giá vốn bình quân gia quyền).
/// Code mới tiêm IInventoryLedger; code cũ gọi qua PurchaseStockOps / TransferStockOps (cùng một cài đặt).
/// </summary>
public interface IInventoryLedger
{
    /// <summary>Tồn kho và giá vốn hiện tại tại một vị trí.</summary>
    Task<(decimal Quantity, decimal UnitCost)> GetBalanceAsync(StockKey key, CancellationToken ct);

    /// <summary>Cộng tồn kho theo giá vốn bình quân gia quyền + ghi thẻ kho.</summary>
    Task InboundAsync(
        StockKey key,
        decimal qty,
        decimal price,
        IReadOnlyDictionary<int, MstProduct> products,
        StockRef reference,
        CancellationToken ct,
        decimal? transactionPrice = null,
        DateTime? transactionDate = null);

    /// <summary>Trừ tồn và tính ngược giá vốn bình quân + ghi thẻ kho (cho phép tồn âm).</summary>
    Task OutboundAsync(
        StockKey key,
        decimal qty,
        decimal price,
        IReadOnlyDictionary<int, MstProduct> products,
        StockRef reference,
        CancellationToken ct,
        decimal? transactionPrice = null,
        DateTime? transactionDate = null);
}
