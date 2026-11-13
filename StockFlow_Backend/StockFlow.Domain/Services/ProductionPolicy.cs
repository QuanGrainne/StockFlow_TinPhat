using System;

namespace StockFlow.Domain.Services;

/// <summary>
/// Chính sách sản xuất thuần (không truy cập DB, không đọc giờ).
/// Số lượng tồn kho / nhu cầu lưu numeric(18,2) nên kết quả cuối mỗi dòng làm tròn half-up 2 chữ số,
/// không làm tròn các bước trung gian.
/// </summary>
public static class ProductionPolicy
{
    /// <summary>Số chữ số thập phân của số lượng tồn kho, nhu cầu và số đã xuất.</summary>
    public const int QuantityScale = 2;

    /// <summary>Làm tròn số lượng về độ chính xác lưu trữ (half-up).</summary>
    public static decimal RoundQuantity(decimal value) =>
        Math.Round(value, QuantityScale, MidpointRounding.AwayFromZero);

    /// <summary>
    /// BR-31: Nhu cầu NVL = SL kế hoạch × Định mức trên 1 đơn vị × (1 + Hao hụt% / 100).
    /// </summary>
    /// <param name="plannedQuantity">Số lượng thành phẩm kế hoạch</param>
    /// <param name="normPerUnit">Định mức NVL cho 1 đơn vị thành phẩm (đơn vị cơ sở của NVL)</param>
    /// <param name="wastageRatePercent">Tỷ lệ hao hụt, tính theo phần trăm (3.5 = 3,5%)</param>
    public static decimal CalculateRequirement(decimal plannedQuantity, decimal normPerUnit, decimal wastageRatePercent)
    {
        if (plannedQuantity <= 0 || normPerUnit <= 0) return 0;
        var rate = wastageRatePercent < 0 ? 0 : wastageRatePercent;
        return RoundQuantity(plannedQuantity * normPerUnit * (1 + rate / 100m));
    }

    /// <summary>BR-32: Số còn thiếu = Nhu cầu − Đã xuất, tối thiểu 0.</summary>
    public static decimal CalculateShortage(decimal requiredQuantity, decimal issuedQuantity) =>
        Math.Max(0, RoundQuantity(requiredQuantity - issuedQuantity));

    /// <summary>
    /// BR-37: Lượng NVL cần cho số thành phẩm đã nhận (luỹ kế) theo nhu cầu của lệnh:
    /// Nhu cầu × (SL thành phẩm luỹ kế / SL kế hoạch). Dùng nhu cầu của lệnh (kể cả đã điều chỉnh) làm chuẩn.
    /// </summary>
    public static decimal MaterialNeededFor(decimal requiredQuantity, decimal plannedQuantity, decimal receivedQuantity)
    {
        if (plannedQuantity <= 0 || receivedQuantity <= 0) return 0;
        return RoundQuantity(requiredQuantity * receivedQuantity / plannedQuantity);
    }

    /// <summary>
    /// Đơn giá vốn thành phẩm khi nhập kho (quyết định nhóm 13/11/2026):
    /// tổng giá trị NVL đã xuất cho lệnh (theo giá vốn lúc xuất) ÷ SL kế hoạch. Không phải giá thành đầy đủ.
    /// </summary>
    public static decimal CalculateFinishedGoodsUnitCost(decimal totalIssuedMaterialValue, decimal plannedQuantity)
    {
        if (plannedQuantity <= 0 || totalIssuedMaterialValue <= 0) return 0;
        return Math.Round(totalIssuedMaterialValue / plannedQuantity, 2, MidpointRounding.AwayFromZero);
    }
}
