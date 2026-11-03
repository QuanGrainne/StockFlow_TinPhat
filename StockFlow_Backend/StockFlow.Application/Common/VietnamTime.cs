namespace StockFlow.Application.Common;

/// <summary>
/// Chuẩn hóa thời gian về giờ Việt Nam (UTC+7) để lưu vào cột <c>timestamp without time zone</c>.
/// Quy ước toàn hệ thống: DB lưu giờ địa phương Việt Nam (xem CLAUDE.md → Timestamps).
/// </summary>
public static class VietnamTime
{
    private static readonly TimeSpan Offset = TimeSpan.FromHours(7);

    /// <summary>Giờ Việt Nam hiện tại (không phụ thuộc múi giờ của máy chủ).</summary>
    public static DateTime Now => DateTime.SpecifyKind(DateTime.UtcNow.Add(Offset), DateTimeKind.Unspecified);

    /// <summary>
    /// Chuyển thời điểm client gửi lên sang giờ Việt Nam.
    /// - Chuỗi ISO có 'Z' (VD: <c>new Date().toISOString()</c>) → Kind=Utc → cộng 7 giờ.
    /// - Chuỗi có offset (+07:00...) → Kind=Local → đổi về UTC rồi cộng 7 giờ.
    /// - Không có múi giờ → coi như đã là giờ Việt Nam.
    /// - null → giờ Việt Nam hiện tại.
    /// </summary>
    public static DateTime From(DateTime? input)
    {
        if (!input.HasValue) return Now;

        var dt = input.Value;
        return dt.Kind switch
        {
            DateTimeKind.Utc => DateTime.SpecifyKind(dt.Add(Offset), DateTimeKind.Unspecified),
            DateTimeKind.Local => DateTime.SpecifyKind(dt.ToUniversalTime().Add(Offset), DateTimeKind.Unspecified),
            _ => DateTime.SpecifyKind(dt, DateTimeKind.Unspecified),
        };
    }
}
