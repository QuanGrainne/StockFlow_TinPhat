using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Purchases.Helpers;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Transfers.Helpers;

/// <summary>
/// Biến động tồn kho của phiếu chuyển hàng, dùng chung helper tồn kho của nhập hàng (PurchaseStockOps):
/// - Xuất chuyển: trừ tồn kho xuất theo giá vốn hiện tại của kho xuất (giá vốn kho xuất không đổi).
/// - Nhận hàng: cộng tồn kho nhận theo giá vốn lúc xuất → giá vốn kho nhận tính lại bình quân gia quyền.
/// Mỗi biến động ghi 1 dòng thẻ kho với ReferenceType = TRANSFER, ReferenceId = mã phiếu chuyển.
/// </summary>
public static class TransferStockOps
{
    public const string ReferenceType = "TRANSFER";

    private static async Task<List<TrxInventoryBalance>> BalancesAsync(
        IStockFlowDbContext context, int warehouseId, int productId, CancellationToken ct)
    {
        var rows = await context.TrxInventoryBalances
            .Where(b => b.WarehouseId == warehouseId && b.ProductId == productId)
            .ToListAsync(ct);
        // Dòng tồn vừa thêm trong cùng giao dịch (chưa lưu DB)
        rows.AddRange(context.TrxInventoryBalances.Local
            .Where(b => b.WarehouseId == warehouseId && b.ProductId == productId && !rows.Contains(b)));
        return rows;
    }

    /// <summary>Tổng tồn và giá vốn bình quân (theo các dòng còn hàng) của 1 hàng tại 1 kho.</summary>
    public static async Task<(decimal Quantity, decimal UnitCost)> WarehouseStockAsync(
        IStockFlowDbContext context, int warehouseId, MstProduct product, CancellationToken ct)
    {
        var rows = await BalancesAsync(context, warehouseId, product.ProductId, ct);
        return (rows.Sum(b => b.Quantity ?? 0), CostOf(rows, product));
    }

    /// <summary>Giá vốn của 1 hàng tại 1 kho từ các dòng tồn của kho đó (bình quân theo SL dương).</summary>
    public static decimal CostOf(IEnumerable<TrxInventoryBalance> rows, MstProduct product)
    {
        rows = rows.ToList();
        var positive = rows.Where(b => (b.Quantity ?? 0) > 0).ToList();
        var qty = positive.Sum(b => b.Quantity ?? 0);
        if (qty > 0)
            return Math.Round(positive.Sum(b => (b.Quantity ?? 0) * (b.UnitCost ?? 0)) / qty, 2, MidpointRounding.AwayFromZero);
        return rows.Select(b => b.UnitCost).FirstOrDefault(c => c.HasValue && c.Value > 0) ?? product.MovingAverageCost ?? 0;
    }

    /// <summary>
    /// Trừ tồn tại 1 kho: lần lượt vào các dòng còn hàng (vị trí / lô), phần còn lại vào dòng mặc định.
    /// Trả về giá vốn bình quân của kho trước khi trừ (giá trị xuất).
    /// </summary>
    public static async Task<decimal> OutboundAsync(
        IStockFlowDbContext context, int warehouseId, MstProduct product, decimal qty,
        string transactionType, int transferId, int userId, CancellationToken ct,
        string referenceType = ReferenceType)
    {
        var rows = await BalancesAsync(context, warehouseId, product.ProductId, ct);
        var cost = CostOf(rows, product);
        if (qty <= 0) return cost;

        var products = new Dictionary<int, MstProduct> { [product.ProductId] = product };
        var reference = new PurchaseStockOps.StockRef(transactionType, referenceType, transferId, userId);
        var remaining = qty;
        foreach (var b in rows.Where(b => (b.Quantity ?? 0) > 0).OrderByDescending(b => b.Quantity).ToList())
        {
            if (remaining <= 0) break;
            var take = Math.Min(remaining, b.Quantity ?? 0);
            await PurchaseStockOps.OutboundAsync(context,
                new PurchaseStockOps.StockKey(b.WarehouseId, b.ProductId, b.LocationId, b.LotId),
                take, b.UnitCost ?? cost, products, reference, ct);
            remaining -= take;
        }
        if (remaining > 0)
        {
            await PurchaseStockOps.OutboundAsync(context,
                new PurchaseStockOps.StockKey(warehouseId, product.ProductId, null, null),
                remaining, cost, products, reference, ct);
        }
        return cost;
    }

    /// <summary>Cộng tồn vào dòng mặc định của kho theo giá vốn bình quân gia quyền.</summary>
    public static Task InboundAsync(
        IStockFlowDbContext context, int warehouseId, MstProduct product, decimal qty, decimal unitCost,
        string transactionType, int transferId, int userId, CancellationToken ct,
        string referenceType = ReferenceType)
    {
        if (qty <= 0) return Task.CompletedTask;
        var products = new Dictionary<int, MstProduct> { [product.ProductId] = product };
        return PurchaseStockOps.InboundAsync(context,
            new PurchaseStockOps.StockKey(warehouseId, product.ProductId, null, null),
            qty, unitCost, products,
            new PurchaseStockOps.StockRef(transactionType, referenceType, transferId, userId), ct);
    }
}
