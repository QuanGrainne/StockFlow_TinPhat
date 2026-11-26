using StockFlow.Application.Common.Interfaces;

namespace StockFlow.Application.Features.Reports.Helpers;

/// <summary>
/// Kỳ báo cáo theo ngày (giờ Việt Nam): [From 00:00, To + 1 ngày 00:00).
/// Các cột thời gian trong DB đã lưu giờ Việt Nam nên so sánh trực tiếp.
/// </summary>
public sealed record ReportPeriod(DateTime Start, DateTime EndExclusive)
{
    public static ReportPeriod Of(DateOnly from, DateOnly to) =>
        new(from.ToDateTime(TimeOnly.MinValue), to.AddDays(1).ToDateTime(TimeOnly.MinValue));
}

/// <summary>
/// Phạm vi kho của báo cáo (BR-04 – cô lập dữ liệu kho): chỉ các kho trong
/// ICurrentUserService.GetAuthorizedWarehouseIdsAsync (Admin = mọi kho đang hoạt động).
/// Lọc một kho ngoài danh sách được phân quyền thì từ chối.
/// </summary>
public static class ReportScope
{
    public const string ForbiddenWarehouseMessage = "Bạn không có quyền xem dữ liệu của kho này.";

    /// <summary>Danh sách kho dùng để lọc số liệu; Error khác null khi warehouseId không được phân quyền.</summary>
    public static async Task<(List<int> WarehouseIds, string? Error)> ResolveWarehousesAsync(
        ICurrentUserService currentUser, int? warehouseId, CancellationToken ct)
    {
        var authorized = (await currentUser.GetAuthorizedWarehouseIdsAsync(ct)).ToList();
        if (!warehouseId.HasValue) return (authorized, null);
        return authorized.Contains(warehouseId.Value)
            ? (new List<int> { warehouseId.Value }, null)
            : (new List<int>(), ForbiddenWarehouseMessage);
    }

    /// <summary>Số ngày tối đa của một kỳ báo cáo.</summary>
    public const int MaxPeriodDays = 366;

    public static bool IsValidPeriod(DateOnly from, DateOnly to) =>
        from <= to && to.DayNumber - from.DayNumber + 1 <= MaxPeriodDays;
}
