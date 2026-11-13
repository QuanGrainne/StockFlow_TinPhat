using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Common.Inventory;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Production.Helpers;

/// <summary>
/// Biến động tồn kho của luồng sản xuất, đi qua sổ tồn kho dùng chung IInventoryLedger
/// (cập nhật trx_inventory_balances + ghi 1 dòng trx_inventory_transactions cho mỗi biến động).
/// - Xuất NVL: ReferenceType = STOCK_ISSUE, ReferenceId = id phiếu xuất (UC-46).
/// - Nhập thành phẩm: ReferenceType = FINISHED_GOODS_RECEIPT, ReferenceId = id phiếu nhập thành phẩm (UC-49).
/// </summary>
public static class ProductionStockOps
{
    public const string IssueTransactionType = "PRODUCTION_ISSUE";
    public const string IssueReferenceType = "STOCK_ISSUE";
    public const string ReceiptTransactionType = "PRODUCTION_RECEIPT";
    public const string ReceiptReferenceType = "FINISHED_GOODS_RECEIPT";

    /// <summary>Tồn hiện có theo từng mặt hàng tại một kho (tổng mọi vị trí / lô).</summary>
    public static async Task<Dictionary<int, decimal>> AvailableAsync(
        IStockFlowDbContext context, int warehouseId, IEnumerable<int> productIds, CancellationToken ct)
    {
        var ids = productIds.Distinct().ToList();
        if (ids.Count == 0) return new Dictionary<int, decimal>();

        var rows = await context.TrxInventoryBalances.AsNoTracking()
            .Where(b => b.WarehouseId == warehouseId && ids.Contains(b.ProductId))
            .GroupBy(b => b.ProductId)
            .Select(g => new { ProductId = g.Key, Qty = g.Sum(b => b.Quantity ?? 0) })
            .ToListAsync(ct);

        var result = ids.ToDictionary(id => id, _ => 0m);
        foreach (var r in rows) result[r.ProductId] = r.Qty;
        return result;
    }

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

    /// <summary>Giá vốn bình quân của 1 hàng tại 1 kho theo các dòng tồn còn hàng.</summary>
    private static decimal WarehouseCost(IReadOnlyCollection<TrxInventoryBalance> rows, MstProduct product)
    {
        var positive = rows.Where(b => (b.Quantity ?? 0) > 0).ToList();
        var qty = positive.Sum(b => b.Quantity ?? 0);
        if (qty > 0)
        {
            return Math.Round(positive.Sum(b => (b.Quantity ?? 0) * (b.UnitCost ?? 0)) / qty, 2, MidpointRounding.AwayFromZero);
        }
        return rows.Select(b => b.UnitCost).FirstOrDefault(c => c.HasValue && c.Value > 0) ?? product.MovingAverageCost ?? 0;
    }

    /// <summary>
    /// Xuất NVL khỏi kho: trừ lần lượt các dòng tồn còn hàng (vị trí / lô) theo giá vốn của dòng.
    /// Handler đã kiểm tra đủ tồn (BR-33) trước khi gọi. Trả về giá trị xuất (SL × giá vốn) để tính giá vốn thành phẩm.
    /// </summary>
    public static async Task<decimal> IssueAsync(
        IStockFlowDbContext context, IInventoryLedger ledger, int warehouseId, MstProduct product, decimal qty,
        StockRef reference, DateTime transactionDate, CancellationToken ct)
    {
        if (qty <= 0) return 0;

        var rows = await BalancesAsync(context, warehouseId, product.ProductId, ct);
        var cost = WarehouseCost(rows, product);
        var products = new Dictionary<int, MstProduct> { [product.ProductId] = product };

        decimal value = 0;
        var remaining = qty;
        foreach (var b in rows.Where(b => (b.Quantity ?? 0) > 0).OrderByDescending(b => b.Quantity).ToList())
        {
            if (remaining <= 0) break;
            var take = Math.Min(remaining, b.Quantity ?? 0);
            var price = b.UnitCost ?? cost;
            await ledger.OutboundAsync(
                new StockKey(b.WarehouseId, b.ProductId, b.LocationId, b.LotId),
                take, price, products, reference, ct, transactionDate: transactionDate);
            value += take * price;
            remaining -= take;
        }

        if (remaining > 0)
        {
            // Phòng hờ (không xảy ra khi đã kiểm tra tồn): phần còn lại trừ vào dòng mặc định của kho
            await ledger.OutboundAsync(
                new StockKey(warehouseId, product.ProductId, null, null),
                remaining, cost, products, reference, ct, transactionDate: transactionDate);
            value += remaining * cost;
        }

        return value;
    }

    /// <summary>Nhập thành phẩm vào kho (vị trí / lô) theo đơn giá vốn đã tính.</summary>
    public static Task ReceiveAsync(
        IInventoryLedger ledger, int warehouseId, int? locationId, int? lotId, MstProduct product, decimal qty,
        decimal unitCost, StockRef reference, DateTime transactionDate, CancellationToken ct)
    {
        if (qty <= 0) return Task.CompletedTask;
        var products = new Dictionary<int, MstProduct> { [product.ProductId] = product };
        return ledger.InboundAsync(
            new StockKey(warehouseId, product.ProductId, locationId, lotId),
            qty, unitCost, products, reference, ct, transactionDate: transactionDate);
    }

    /// <summary>Tổng giá trị NVL đã xuất cho một lệnh sản xuất (theo giá vốn ghi trên thẻ kho lúc xuất).</summary>
    public static async Task<decimal> IssuedMaterialValueAsync(
        IStockFlowDbContext context, int productionOrderId, CancellationToken ct)
    {
        var issueIds = context.TrxStockIssues
            .Where(i => i.ProductionOrderId == productionOrderId && i.IssueType == StockIssueType.Production)
            .Select(i => i.StockIssueId);

        var value = await context.TrxInventoryTransactions.AsNoTracking()
            .Where(t => t.ReferenceType == IssueReferenceType
                        && t.TransactionType == IssueTransactionType
                        && t.ReferenceId != null
                        && issueIds.Contains(t.ReferenceId.Value))
            .SumAsync(t => -(t.Quantity ?? 0) * (t.TransactionPrice ?? 0), ct);

        return value < 0 ? 0 : value;
    }
}
