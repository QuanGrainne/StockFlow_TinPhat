using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Domain.Entities;
using StockFlow.Domain.Services;

namespace StockFlow.Application.Common.Inventory;

/// <summary>
/// Đọc giá vốn từ các dòng tồn kho (trx_inventory_balances).
/// Giá vốn bình quân tính theo HÀNG HÓA TẠI TỪNG KHO: gộp mọi vị trí / lô của hàng trong kho đó.
/// Giá vốn chung của hàng hóa (MstProduct.MovingAverageCost) = bình quân theo SL trên mọi kho.
/// </summary>
public static class InventoryCosting
{
    /// <summary>
    /// Mọi dòng tồn của 1 hàng hóa (mọi kho / vị trí / lô), gồm cả dòng mới thêm chưa lưu.
    /// Nạp từ DB vào bộ theo dõi rồi đọc DbSet.Local để thấy cả thay đổi chưa SaveChanges.
    /// </summary>
    public static async Task<List<TrxInventoryBalance>> ProductRowsAsync(
        IStockFlowDbContext context, int productId, CancellationToken ct)
    {
        await context.TrxInventoryBalances.Where(b => b.ProductId == productId).LoadAsync(ct);
        return context.TrxInventoryBalances.Local.Where(b => b.ProductId == productId).ToList();
    }

    /// <summary>Giá vốn bình quân theo SL của các dòng tồn (3 chữ số thập phân).</summary>
    public static decimal CostOf(IEnumerable<TrxInventoryBalance> rows, decimal fallback = 0) =>
        CostingPolicy.WeightedAverageCost(rows.Select(b => (b.Quantity ?? 0, b.UnitCost ?? 0)), fallback);
}
