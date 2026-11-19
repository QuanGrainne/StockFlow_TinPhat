using System;
using System.Collections.Generic;
using System.Linq;

namespace StockFlow.Domain.Services;

/// <summary>
/// Chính sách giá vốn thuần (không truy cập DB). Chuyển nguyên văn từ
/// GoodsReceiptHelper.CalculateMovingAverageCost ở T21; GoodsReceiptHelper giữ chữ ký và gọi sang đây.
/// Giá vốn tính theo từng hàng hóa tại từng kho (gộp mọi vị trí / lô), lưu và hiển thị 3 chữ số thập phân.
/// </summary>
public static class CostingPolicy
{
    /// <summary>Số chữ số thập phân của giá vốn (lưu + hiển thị, VD 33.257,062).</summary>
    public const int CostDecimals = 3;

    /// <summary>Làm tròn giá vốn về <see cref="CostDecimals"/> chữ số thập phân.</summary>
    public static decimal RoundCost(decimal cost) =>
        Math.Round(cost, CostDecimals, MidpointRounding.AwayFromZero);

    /// <summary>
    /// Tính toán Giá vốn bình quân gia quyền di động (Moving Average Cost) tại kho sau mỗi lần nhập hàng.
    /// Công thức: (Tồn cũ * Giá cũ + SL nhập * Giá nhập) / (Tồn cũ + SL nhập)
    /// </summary>
    /// <param name="currentQty">Số lượng tồn kho hiện tại của cả kho (trước khi cộng phiếu nhập)</param>
    /// <param name="currentUnitCost">Giá vốn bình quân hiện tại của kho</param>
    /// <param name="incomingQty">Số lượng hàng nhập mới thực tế</param>
    /// <param name="incomingUnitPrice">Đơn giá nhập thực tế (sau chiết khấu)</param>
    /// <returns>Giá vốn bình quân mới đã làm tròn 3 chữ số thập phân</returns>
    public static decimal CalculateMovingAverageCost(
        decimal currentQty,
        decimal currentUnitCost,
        decimal incomingQty,
        decimal incomingUnitPrice)
    {
        if (incomingQty <= 0)
        {
            return currentUnitCost;
        }

        // Nếu kho chưa có hàng hoặc đang bị âm tồn (do xuất kho trước khi nhập):
        // Giá vốn mới sẽ được chốt bằng chính đơn giá của lô hàng mới nhập này
        if (currentQty <= 0 || currentUnitCost <= 0)
        {
            return RoundCost(incomingUnitPrice);
        }

        decimal totalQty = currentQty + incomingQty;
        if (totalQty <= 0)
        {
            return RoundCost(incomingUnitPrice);
        }

        decimal totalValue = (currentQty * currentUnitCost) + (incomingQty * incomingUnitPrice);
        decimal newAverageCost = totalValue / totalQty;

        return RoundCost(newAverageCost);
    }

    /// <summary>
    /// Giá vốn bình quân theo số lượng của nhiều dòng tồn (VD mọi vị trí / lô của 1 hàng trong 1 kho, hoặc mọi kho):
    /// Σ(SL × giá) / ΣSL, chỉ tính các dòng còn hàng (SL &gt; 0) và đã có giá vốn (giá &gt; 0; giá 0 = chưa có giá vốn,
    /// VD lô thành phẩm nhập khi hàng chưa có giá). Không có dòng như vậy thì lấy giá dương đầu tiên,
    /// không có thì trả <paramref name="fallback"/>.
    /// </summary>
    public static decimal WeightedAverageCost(IEnumerable<(decimal Quantity, decimal UnitCost)> rows, decimal fallback = 0)
    {
        var list = rows.ToList();
        var positive = list.Where(r => r.Quantity > 0 && r.UnitCost > 0).ToList();
        var qty = positive.Sum(r => r.Quantity);
        if (qty > 0)
        {
            return RoundCost(positive.Sum(r => r.Quantity * r.UnitCost) / qty);
        }

        var firstCost = list.Select(r => r.UnitCost).FirstOrDefault(c => c > 0);
        return firstCost > 0 ? firstCost : fallback;
    }
}
