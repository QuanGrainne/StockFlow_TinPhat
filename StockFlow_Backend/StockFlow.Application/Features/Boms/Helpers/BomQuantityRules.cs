namespace StockFlow.Application.Features.Boms.Helpers;

/// <summary>
/// Kiểm tra số chữ số thập phân theo BR-53: vượt quá thì TỪ CHỐI, không tự cắt/làm tròn.
/// (Cột numeric(18,6) của PostgreSQL sẽ tự làm tròn nếu để lọt xuống, nên phải chặn ở đây.)
/// </summary>
public static class BomQuantityRules
{
    /// <summary>Giá trị lớn nhất của DECIMAL(18,6).</summary>
    public const decimal MaxQuantity = 999_999_999_999.999999m;

    public const decimal MaxWastage = 100m;

    /// <summary>Định mức: &gt; 0, ≤ giá trị lớn nhất của cột, tối đa 6 chữ số thập phân.</summary>
    public static bool IsValidQuantity(decimal value) =>
        value > 0 && value <= MaxQuantity && HasAtMostDecimals(value, 6);

    /// <summary>Hao hụt %: từ 0 đến 100, tối đa 4 chữ số thập phân.</summary>
    public static bool IsValidWastage(decimal value) =>
        value >= 0 && value <= MaxWastage && HasAtMostDecimals(value, 4);

    /// <summary>
    /// True nếu <paramref name="value"/> không có chữ số thập phân thứ <c>places + 1</c> trở đi khác 0.
    /// Làm tròn về <c>places</c> chữ số rồi so sánh: khác nhau nghĩa là có phần bị cắt.
    /// </summary>
    public static bool HasAtMostDecimals(decimal value, int places) =>
        decimal.Round(value, places) == value;

    /// <summary>Bỏ các số 0 thừa ở cuối khi trả ra API (0.025000 → 0.025), không đổi giá trị.</summary>
    public static decimal Normalize(decimal value) => value / 1.0000000000000000000000000000m;
}
