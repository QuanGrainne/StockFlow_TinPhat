using StockFlow.Application.Features.Purchases.DTOs;

namespace StockFlow.Application.Features.Purchases.Helpers;

/// <summary>
/// Tính tiền phiếu nhập:
/// - Thành tiền dòng = SL × đơn giá × (1 − %giảm dòng)
/// - Tổng tiền hàng = Σ thành tiền dòng
/// - Giảm giá phiếu (VND) được phân bổ theo tỷ lệ thành tiền vào giá vốn từng dòng (UnitLandedCost)
///   → Σ SL × UnitLandedCost = Tổng tiền hàng − Giảm giá phiếu = số tiền cần trả NCC.
/// </summary>
public static class PurchasePricing
{
    public sealed record Line(CreatePurchaseItemRequest Request, decimal EffectivePrice, decimal LandedCost);

    public sealed record Result(List<Line> Lines, decimal GoodsTotal, decimal DiscountApplied, decimal NetTotal);

    public static Result Compute(IEnumerable<CreatePurchaseItemRequest> items, decimal orderDiscount)
    {
        var list = items.ToList();
        var effective = list
            .Select(i => i.UnitPrice * (1 - Math.Clamp(i.DiscountPercent, 0, 100) / 100m))
            .ToList();

        var goodsTotal = list.Select((i, idx) => i.Quantity * effective[idx]).Sum();
        var discount = Math.Clamp(Math.Round(orderDiscount, 0, MidpointRounding.AwayFromZero), 0, Math.Max(0, goodsTotal));
        var factor = goodsTotal > 0 ? (goodsTotal - discount) / goodsTotal : 1m;

        var lines = list
            .Select((i, idx) => new Line(
                i,
                effective[idx],
                Math.Round(effective[idx] * factor, 4, MidpointRounding.AwayFromZero)))
            .ToList();

        var netTotal = lines.Sum(l => l.Request.Quantity * l.LandedCost);
        return new Result(lines, goodsTotal, discount, netTotal);
    }
}
