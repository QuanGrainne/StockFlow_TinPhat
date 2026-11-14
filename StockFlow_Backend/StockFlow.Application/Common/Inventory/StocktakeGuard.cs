using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common.Interfaces;

namespace StockFlow.Application.Common.Inventory;

/// <summary>
/// BR-42: khi một phiếu kiểm kho đang mở (đang kiểm / chờ duyệt) thì không được xác nhận nhập, xuất, chuyển,
/// huỷ hàng cho các mặt hàng thuộc phiếu kiểm đó tại kho đó.
/// Code hiện tại: phiếu kiểm "đang mở" = trạng thái DRAFT (Phiếu tạm); BALANCED/CANCELLED là đã kết thúc.
/// Hàm dùng chung; hiện chỉ module Sản xuất gọi (các module khác chưa áp dụng BR-42).
/// </summary>
public static class StocktakeGuard
{
    /// <summary>Trạng thái phiếu kiểm còn đang mở (chưa cân bằng, chưa huỷ).</summary>
    public static readonly string[] ActiveStatuses = { "DRAFT" };

    /// <summary>
    /// Trả về thông báo lỗi (MSG50) nếu có mặt hàng đang nằm trong phiếu kiểm kho đang mở của kho; null nếu không bị chặn.
    /// </summary>
    public static async Task<string?> CheckAsync(
        IStockFlowDbContext context, int warehouseId, IEnumerable<int> productIds, CancellationToken ct)
    {
        var ids = productIds.Distinct().ToList();
        if (ids.Count == 0) return null;

        var blocked = await context.DtlStocktakeItems.AsNoTracking()
            .Where(i => ids.Contains(i.ProductId)
                        && i.Stocktake.WarehouseId == warehouseId
                        && i.Stocktake.Status != null
                        && ActiveStatuses.Contains(i.Stocktake.Status))
            .Select(i => new { i.Stocktake.StocktakeCode, i.Product.ProductCode })
            .FirstOrDefaultAsync(ct);

        return blocked == null
            ? null
            : $"Mặt hàng {blocked.ProductCode} đang được kiểm kho (phiếu {blocked.StocktakeCode}). "
              + "Không thể xác nhận giao dịch cho đến khi phiếu kiểm kho kết thúc.";
    }
}
