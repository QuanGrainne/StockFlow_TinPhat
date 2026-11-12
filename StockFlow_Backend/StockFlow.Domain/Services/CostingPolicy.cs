using System;

namespace StockFlow.Domain.Services;

/// <summary>
/// Chính sách giá vốn thuần (không truy cập DB). Chuyển nguyên văn từ
/// GoodsReceiptHelper.CalculateMovingAverageCost ở T21; GoodsReceiptHelper giữ chữ ký và gọi sang đây.
/// </summary>
public static class CostingPolicy
{
    /// <summary>
    /// Tính toán Giá vốn bình quân gia quyền di động (Moving Average Cost) tại kho sau mỗi lần nhập hàng.
    /// Công thức: (Tồn cũ * Giá cũ + SL nhập * Giá nhập) / (Tồn cũ + SL nhập)
    /// </summary>
    /// <param name="currentQty">Số lượng tồn kho hiện tại (trước khi cộng phiếu nhập)</param>
    /// <param name="currentUnitCost">Giá vốn bình quân hiện tại trong kho</param>
    /// <param name="incomingQty">Số lượng hàng nhập mới thực tế</param>
    /// <param name="incomingUnitPrice">Đơn giá nhập thực tế (sau chiết khấu)</param>
    /// <returns>Giá vốn bình quân mới đã làm tròn 2 chữ số thập phân</returns>
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
            return Math.Round(incomingUnitPrice, 2, MidpointRounding.AwayFromZero);
        }

        decimal totalQty = currentQty + incomingQty;
        if (totalQty <= 0)
        {
            return Math.Round(incomingUnitPrice, 2, MidpointRounding.AwayFromZero);
        }

        decimal totalValue = (currentQty * currentUnitCost) + (incomingQty * incomingUnitPrice);
        decimal newAverageCost = totalValue / totalQty;

        return Math.Round(newAverageCost, 2, MidpointRounding.AwayFromZero);
    }
}
