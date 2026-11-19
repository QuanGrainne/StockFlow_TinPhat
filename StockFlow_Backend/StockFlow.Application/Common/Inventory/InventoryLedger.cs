using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Purchases.Helpers;
using StockFlow.Domain.Entities;
using StockFlow.Domain.Services;

namespace StockFlow.Application.Common.Inventory;

/// <summary>
/// Cài đặt sổ tồn kho:
/// - Nhập kho: cộng tồn + tính lại giá vốn bình quân gia quyền.
/// - Xuất ngược: trừ tồn + tính ngược giá vốn bình quân.
/// Giá vốn tính theo HÀNG HÓA TẠI TỪNG KHO (gộp mọi vị trí / lô): tồn trước = tổng tồn của hàng trong kho,
/// sau mỗi biến động mọi dòng tồn (lô / vị trí) của hàng trong kho đó nhận cùng một giá vốn.
/// Giá vốn chung của hàng hóa = bình quân theo SL trên mọi kho. Giá vốn làm tròn 3 chữ số thập phân.
/// Mỗi thao tác đều ghi 1 dòng thẻ kho (TrxInventoryTransaction), tồn cuối = tổng tồn của hàng trong kho.
/// </summary>
public sealed class InventoryLedger(IStockFlowDbContext context) : IInventoryLedger
{
    private static bool Matches(TrxInventoryBalance b, StockKey key) =>
        b.WarehouseId == key.WarehouseId && b.ProductId == key.ProductId &&
        b.LocationId == key.LocationId && b.LotId == key.LotId;

    /// <summary>Mọi dòng tồn của hàng tại kho trong key (gồm cả dòng chưa lưu).</summary>
    private async Task<List<TrxInventoryBalance>> WarehouseRowsAsync(StockKey key, CancellationToken ct) =>
        (await InventoryCosting.ProductRowsAsync(context, key.ProductId, ct))
        .Where(b => b.WarehouseId == key.WarehouseId)
        .ToList();

    /// <summary>Dòng tồn đúng vị trí / lô; chưa có thì tạo mới (SL 0) và thêm vào danh sách dòng của kho.</summary>
    private TrxInventoryBalance RowFor(List<TrxInventoryBalance> rows, StockKey key, decimal unitCost)
    {
        var balance = rows.FirstOrDefault(b => Matches(b, key));
        if (balance != null) return balance;

        balance = new TrxInventoryBalance
        {
            WarehouseId = key.WarehouseId,
            ProductId = key.ProductId,
            LocationId = key.LocationId,
            LotId = key.LotId,
            Quantity = 0,
            UnitCost = unitCost,
            LastUpdated = VietnamTime.Now,
        };
        context.TrxInventoryBalances.Add(balance);
        rows.Add(balance);
        return balance;
    }

    /// <summary>Gán cùng giá vốn cho mọi dòng tồn của hàng trong kho.</summary>
    private static void ApplyCost(IEnumerable<TrxInventoryBalance> rows, decimal unitCost)
    {
        var now = VietnamTime.Now;
        foreach (var row in rows)
        {
            row.UnitCost = unitCost;
            row.LastUpdated = now;
        }
    }

    /// <summary>Giá vốn chung của hàng hóa = bình quân theo SL trên mọi kho (sau biến động vừa ghi).</summary>
    private async Task UpdateProductCostAsync(
        IReadOnlyDictionary<int, MstProduct> products, int productId, decimal warehouseCost, CancellationToken ct)
    {
        if (!products.TryGetValue(productId, out var product)) return;
        var allRows = await InventoryCosting.ProductRowsAsync(context, productId, ct);
        product.MovingAverageCost = InventoryCosting.CostOf(allRows, warehouseCost);
    }

    /// <summary>
    /// Tồn tại đúng vị trí / lô và giá vốn của hàng tại kho đó (giá vốn chung mọi lô của kho).
    /// Chưa có dòng tồn ở vị trí / lô này thì SL = 0 nhưng vẫn trả giá vốn của kho.
    /// </summary>
    public async Task<(decimal Quantity, decimal UnitCost)> GetBalanceAsync(StockKey key, CancellationToken ct)
    {
        var rows = await WarehouseRowsAsync(key, ct);
        var balance = rows.FirstOrDefault(b => Matches(b, key));
        return (balance?.Quantity ?? 0, InventoryCosting.CostOf(rows));
    }

    /// <summary>
    /// Cộng tồn kho theo giá vốn bình quân gia quyền của cả kho:
    /// (Tổng tồn kho × Giá vốn kho + SL nhập × Giá nhập) / (Tổng tồn kho + SL nhập).
    /// </summary>
    public async Task InboundAsync(
        StockKey key,
        decimal qty,
        decimal price,
        IReadOnlyDictionary<int, MstProduct> products,
        StockRef reference,
        CancellationToken ct,
        decimal? transactionPrice = null,
        DateTime? transactionDate = null)
    {
        var rows = await WarehouseRowsAsync(key, ct);
        var warehouseQty = rows.Sum(b => b.Quantity ?? 0);
        var warehouseCost = InventoryCosting.CostOf(rows);
        var newCost = GoodsReceiptHelper.CalculateMovingAverageCost(warehouseQty, warehouseCost, qty, price);

        var balance = RowFor(rows, key, newCost);
        balance.Quantity = (balance.Quantity ?? 0) + qty;
        ApplyCost(rows, newCost);

        await UpdateProductCostAsync(products, key.ProductId, newCost, ct);

        AddCardEntry(key, qty, reference, transactionPrice ?? price, newCost, warehouseQty + qty, transactionDate);
    }

    /// <summary>
    /// Trừ tồn và tính ngược giá vốn bình quân của cả kho: (Tổng tồn × Giá vốn − SL × Giá xuất) / (Tổng tồn − SL);
    /// hết tồn hoặc ra số âm thì giữ nguyên giá vốn hiện tại. Xuất đúng giá vốn (bán, chuyển, hủy) thì giá vốn không đổi.
    /// Cho phép tồn âm (theo chính sách hiện tại).
    /// </summary>
    public async Task OutboundAsync(
        StockKey key,
        decimal qty,
        decimal price,
        IReadOnlyDictionary<int, MstProduct> products,
        StockRef reference,
        CancellationToken ct,
        decimal? transactionPrice = null,
        DateTime? transactionDate = null)
    {
        var rows = await WarehouseRowsAsync(key, ct);
        var warehouseQty = rows.Sum(b => b.Quantity ?? 0);
        var warehouseCost = InventoryCosting.CostOf(rows);
        var remainingQty = warehouseQty - qty;

        var newCost = warehouseCost;
        if (remainingQty > 0 && warehouseCost > 0)
        {
            var reversed = (warehouseQty * warehouseCost - qty * price) / remainingQty;
            if (reversed > 0) newCost = CostingPolicy.RoundCost(reversed);
        }

        var balance = RowFor(rows, key, warehouseCost);
        balance.Quantity = (balance.Quantity ?? 0) - qty;
        ApplyCost(rows, newCost);

        await UpdateProductCostAsync(products, key.ProductId, newCost, ct);

        AddCardEntry(key, -qty, reference, transactionPrice ?? price, newCost, remainingQty, transactionDate);
    }

    /// <summary>Ghi 1 dòng thẻ kho: SL biến động, Giá GD, giá vốn của kho và tổng tồn của hàng trong kho ngay sau giao dịch.</summary>
    private void AddCardEntry(
        StockKey key, decimal signedQty, StockRef reference,
        decimal transactionPrice, decimal unitCostAfter, decimal balanceAfter, DateTime? transactionDate)
    {
        context.TrxInventoryTransactions.Add(new TrxInventoryTransaction
        {
            WarehouseId = key.WarehouseId,
            ProductId = key.ProductId,
            LocationId = key.LocationId,
            LotId = key.LotId,
            TransactionType = reference.TransactionType,
            Quantity = signedQty,
            ReferenceType = reference.ReferenceType,
            ReferenceId = reference.ReferenceId,
            TransactionDate = transactionDate ?? VietnamTime.Now,
            CreatedBy = reference.UserId,
            TransactionPrice = transactionPrice,
            UnitCost = unitCostAfter,
            BalanceAfter = balanceAfter,
        });
    }
}
