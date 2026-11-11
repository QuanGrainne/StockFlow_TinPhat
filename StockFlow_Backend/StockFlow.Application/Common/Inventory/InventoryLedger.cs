using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Purchases.Helpers;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Common.Inventory;

/// <summary>
/// Cài đặt sổ tồn kho (chuyển nguyên văn phần lõi từ PurchaseStockOps):
/// - Nhập kho: cộng tồn + tính lại giá vốn BQ.
/// - Xuất ngược: trừ tồn + tính ngược giá vốn BQ.
/// Mỗi thao tác đều ghi 1 dòng thẻ kho (TrxInventoryTransaction).
/// </summary>
public sealed class InventoryLedger(IStockFlowDbContext context) : IInventoryLedger
{
    private async Task<TrxInventoryBalance?> FindBalanceAsync(StockKey key, CancellationToken ct)
    {
        return context.TrxInventoryBalances.Local.FirstOrDefault(b =>
                   b.WarehouseId == key.WarehouseId && b.ProductId == key.ProductId &&
                   b.LocationId == key.LocationId && b.LotId == key.LotId)
               ?? await context.TrxInventoryBalances.FirstOrDefaultAsync(b =>
                   b.WarehouseId == key.WarehouseId && b.ProductId == key.ProductId &&
                   b.LocationId == key.LocationId && b.LotId == key.LotId, ct);
    }

    /// <summary>Tồn kho và giá vốn hiện tại tại một vị trí.</summary>
    public async Task<(decimal Quantity, decimal UnitCost)> GetBalanceAsync(StockKey key, CancellationToken ct)
    {
        var balance = await FindBalanceAsync(key, ct);
        return (balance?.Quantity ?? 0, balance?.UnitCost ?? 0);
    }

    /// <summary>Cộng tồn kho theo giá vốn bình quân gia quyền.</summary>
    public async Task InboundAsync(
        StockKey key,
        decimal qty,
        decimal price,
        IReadOnlyDictionary<int, MstProduct> products,
        StockRef reference,
        CancellationToken ct,
        decimal? transactionPrice = null)
    {
        var balance = await FindBalanceAsync(key, ct);

        var currentQty = balance?.Quantity ?? 0;
        var currentCost = balance?.UnitCost ?? 0;
        var newCost = GoodsReceiptHelper.CalculateMovingAverageCost(currentQty, currentCost, qty, price);

        if (balance == null)
        {
            context.TrxInventoryBalances.Add(new TrxInventoryBalance
            {
                WarehouseId = key.WarehouseId,
                ProductId = key.ProductId,
                LocationId = key.LocationId,
                LotId = key.LotId,
                Quantity = qty,
                UnitCost = newCost,
                LastUpdated = VietnamTime.Now,
            });
        }
        else
        {
            balance.Quantity = currentQty + qty;
            balance.UnitCost = newCost;
            balance.LastUpdated = VietnamTime.Now;
        }

        if (products.TryGetValue(key.ProductId, out var product))
        {
            product.MovingAverageCost = newCost;
        }

        AddCardEntry(key, qty, reference, transactionPrice ?? price, newCost, currentQty + qty);
    }

    /// <summary>
    /// Trừ tồn và tính ngược giá vốn BQ: (Tồn × Giá − SL × Giá xuất) / (Tồn − SL);
    /// hết tồn hoặc ra số âm thì giữ nguyên giá vốn hiện tại. Cho phép tồn âm (theo chính sách hiện tại).
    /// </summary>
    public async Task OutboundAsync(
        StockKey key,
        decimal qty,
        decimal price,
        IReadOnlyDictionary<int, MstProduct> products,
        StockRef reference,
        CancellationToken ct,
        decimal? transactionPrice = null)
    {
        var balance = await FindBalanceAsync(key, ct);

        var currentQty = balance?.Quantity ?? 0;
        var currentCost = balance?.UnitCost ?? 0;
        var remainingQty = currentQty - qty;

        var newCost = currentCost;
        if (remainingQty > 0 && currentCost > 0)
        {
            var reversed = (currentQty * currentCost - qty * price) / remainingQty;
            if (reversed > 0) newCost = Math.Round(reversed, 2, MidpointRounding.AwayFromZero);
        }

        if (balance == null)
        {
            context.TrxInventoryBalances.Add(new TrxInventoryBalance
            {
                WarehouseId = key.WarehouseId,
                ProductId = key.ProductId,
                LocationId = key.LocationId,
                LotId = key.LotId,
                Quantity = -qty,
                UnitCost = currentCost,
                LastUpdated = VietnamTime.Now,
            });
        }
        else
        {
            balance.Quantity = remainingQty;
            balance.UnitCost = newCost;
            balance.LastUpdated = VietnamTime.Now;
        }

        if (products.TryGetValue(key.ProductId, out var product))
        {
            product.MovingAverageCost = newCost;
        }

        AddCardEntry(key, -qty, reference, transactionPrice ?? price, newCost, remainingQty);
    }

    /// <summary>Ghi 1 dòng thẻ kho: SL biến động, Giá GD, giá vốn và tồn cuối ngay sau giao dịch.</summary>
    private void AddCardEntry(
        StockKey key, decimal signedQty, StockRef reference,
        decimal transactionPrice, decimal unitCostAfter, decimal balanceAfter)
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
            TransactionDate = VietnamTime.Now,
            CreatedBy = reference.UserId,
            TransactionPrice = transactionPrice,
            UnitCost = unitCostAfter,
            BalanceAfter = balanceAfter,
        });
    }
}
