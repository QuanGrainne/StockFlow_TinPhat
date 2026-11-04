using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Purchases.Helpers;

/// <summary>
/// Thao tác tồn kho theo giá vốn bình quân gia quyền:
/// - Nhập kho: cộng tồn + tính lại giá vốn BQ (phiếu nhập hoàn thành, hủy phiếu trả hàng nhập...).
/// - Xuất ngược: trừ tồn + tính ngược giá vốn BQ (hủy / sửa phiếu nhập đã hoàn thành, trả hàng nhập...).
/// Mỗi thao tác đều ghi 1 dòng thẻ kho (TrxInventoryTransaction).
/// </summary>
public static class PurchaseStockOps
{
    /// <summary>Vị trí tồn kho: kho + sản phẩm + vị trí + lô.</summary>
    public sealed record StockKey(int WarehouseId, int ProductId, int? LocationId, int? LotId);

    /// <summary>Chứng từ gây ra biến động kho (ghi vào thẻ kho).</summary>
    public sealed record StockRef(string TransactionType, string ReferenceType, int ReferenceId, int UserId);

    private static async Task<TrxInventoryBalance?> FindBalanceAsync(
        IStockFlowDbContext context, StockKey key, CancellationToken ct)
    {
        return context.TrxInventoryBalances.Local.FirstOrDefault(b =>
                   b.WarehouseId == key.WarehouseId && b.ProductId == key.ProductId &&
                   b.LocationId == key.LocationId && b.LotId == key.LotId)
               ?? await context.TrxInventoryBalances.FirstOrDefaultAsync(b =>
                   b.WarehouseId == key.WarehouseId && b.ProductId == key.ProductId &&
                   b.LocationId == key.LocationId && b.LotId == key.LotId, ct);
    }

    /// <summary>Giá nhập trên phiếu (đơn giá sau giảm giá của dòng, chưa phân bổ giảm giá tổng phiếu) — Giá GD trên thẻ kho.</summary>
    public static decimal LinePrice(DtlGoodsReceiptItem item) =>
        Math.Round((item.UnitPrice ?? item.UnitLandedCost ?? 0) * (1 - (item.DiscountPercent ?? 0) / 100m), 2, MidpointRounding.AwayFromZero);

    public static decimal Quantity(DtlGoodsReceiptItem item) =>
        item.AcceptedQty ?? item.ReceivedQty ?? item.OrderedQty ?? 0;

    /// <summary>Tồn kho và giá vốn hiện tại tại một vị trí.</summary>
    public static async Task<(decimal Quantity, decimal UnitCost)> GetBalanceAsync(
        IStockFlowDbContext context, StockKey key, CancellationToken ct)
    {
        var balance = await FindBalanceAsync(context, key, ct);
        return (balance?.Quantity ?? 0, balance?.UnitCost ?? 0);
    }

    /// <summary>Cộng tồn kho theo giá vốn bình quân gia quyền.</summary>
    public static async Task InboundAsync(
        IStockFlowDbContext context,
        StockKey key,
        decimal qty,
        decimal price,
        IReadOnlyDictionary<int, MstProduct> products,
        StockRef reference,
        CancellationToken ct,
        decimal? transactionPrice = null)
    {
        var balance = await FindBalanceAsync(context, key, ct);

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

        AddCardEntry(context, key, qty, reference, transactionPrice ?? price, newCost, currentQty + qty);
    }

    /// <summary>
    /// Trừ tồn và tính ngược giá vốn BQ: (Tồn × Giá − SL × Giá xuất) / (Tồn − SL);
    /// hết tồn hoặc ra số âm thì giữ nguyên giá vốn hiện tại. Cho phép tồn âm (theo chính sách hiện tại).
    /// </summary>
    public static async Task OutboundAsync(
        IStockFlowDbContext context,
        StockKey key,
        decimal qty,
        decimal price,
        IReadOnlyDictionary<int, MstProduct> products,
        StockRef reference,
        CancellationToken ct,
        decimal? transactionPrice = null)
    {
        var balance = await FindBalanceAsync(context, key, ct);

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

        AddCardEntry(context, key, -qty, reference, transactionPrice ?? price, newCost, remainingQty);
    }

    /// <summary>Ghi 1 dòng thẻ kho: SL biến động, Giá GD, giá vốn và tồn cuối ngay sau giao dịch.</summary>
    private static void AddCardEntry(
        IStockFlowDbContext context, StockKey key, decimal signedQty, StockRef reference,
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

    private static StockKey KeyOf(TrxGoodsReceipt receipt, DtlGoodsReceiptItem item) =>
        new(receipt.WarehouseId, item.ProductId, item.LocationId, item.LotId);

    /// <summary>Nhập kho 1 dòng phiếu nhập (giống lúc hoàn thành phiếu nhập).</summary>
    public static Task ApplyInboundAsync(
        IStockFlowDbContext context,
        TrxGoodsReceipt receipt,
        DtlGoodsReceiptItem item,
        IReadOnlyDictionary<int, MstProduct> products,
        string transactionType,
        int userId,
        CancellationToken ct) =>
        InboundAsync(context, KeyOf(receipt, item), Quantity(item), item.UnitLandedCost ?? 0, products,
            new StockRef(transactionType, "GOODS_RECEIPT", receipt.GrId, userId), ct, LinePrice(item));

    /// <summary>Đảo nhập kho 1 dòng phiếu nhập (khi hủy / sửa phiếu đã nhập).</summary>
    public static Task ReverseInboundAsync(
        IStockFlowDbContext context,
        TrxGoodsReceipt receipt,
        DtlGoodsReceiptItem item,
        IReadOnlyDictionary<int, MstProduct> products,
        string transactionType,
        int userId,
        CancellationToken ct) =>
        OutboundAsync(context, KeyOf(receipt, item), Quantity(item), item.UnitLandedCost ?? 0, products,
            new StockRef(transactionType, "GOODS_RECEIPT", receipt.GrId, userId), ct, LinePrice(item));
}
