using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Production.Helpers;

/// <summary>Thông báo hệ thống của luồng sản xuất (nội dung theo MSG trong SRS, hiển thị tiếng Việt).</summary>
public static class ProductionMessages
{
    public const string NoActiveBom = "Thành phẩm chưa có BOM đang áp dụng. Vui lòng thiết lập BOM trước."; // MSG58
    public const string OrderNotFound = "Không tìm thấy lệnh sản xuất hoặc lệnh không còn khả dụng."; // MSG16
    public const string BomNotFound = "Không tìm thấy BOM hoặc BOM không còn khả dụng."; // MSG16
    public const string StatusNotAllowed = "Lệnh sản xuất không thể thay đổi ở trạng thái hiện tại."; // MSG17
    public const string ReasonRequired = "Vui lòng nhập lý do."; // MSG40
    public const string NormReasonRequired = "Vui lòng nhập lý do điều chỉnh định mức."; // BR-51
    public const string RequirementBelowIssued = "Nhu cầu NVL không được thấp hơn số lượng đã xuất."; // BR-52
    public const string InvalidIssueQuantity = "Số lượng thực xuất không được âm và không được vượt tồn kho hiện có."; // MSG28, BR-33
    public const string ExceedsPlan = "Số lượng nhận vượt số lượng kế hoạch còn lại của lệnh sản xuất."; // MSG42
    public const string MaterialUsageWarning =
        "Số thành phẩm cần nhiều NVL hơn số đã xuất theo BOM. Vui lòng nhập ghi chú để tiếp tục."; // MSG43
    public const string NoWarehouseAccess = "Bạn không có quyền thao tác trên kho này."; // MSG04, BR-04
    public const string QuantityLimit =
        "Số lượng hoặc nhu cầu nguyên vật liệu vượt giới hạn lưu trữ của hệ thống. Vui lòng giảm số lượng hoặc kiểm tra định mức."; // V-04
}

public static class ProductionHelper
{
    /// <summary>Tên hiển thị người dùng (họ tên, nếu trống thì tên đăng nhập).</summary>
    public static string UserName(SecUser? user) =>
        user == null ? "" : !string.IsNullOrWhiteSpace(user.FullName) ? user.FullName! : user.Username ?? "";

    /// <summary>
    /// Sinh mã chứng từ từ sequence PostgreSQL qua ITransactionCodeGenerator (theo quy tắc trong Thiết lập đơn hàng);
    /// bỏ qua mã đã tồn tại (dữ liệu cũ / quy tắc ngẫu nhiên) để không trùng.
    /// </summary>
    public static async Task<string> NextCodeAsync(
        IStockFlowDbContext context,
        ITransactionCodeGenerator generator,
        string documentType,
        Func<string, CancellationToken, Task<bool>> exists,
        CancellationToken ct)
    {
        var settings = await context.MstOrderSettings.AsNoTracking()
            .FirstOrDefaultAsync(s => s.SettingId == 1, ct) ?? new MstOrderSetting();

        for (var attempt = 0; attempt < 50; attempt++)
        {
            var code = await generator.GenerateCodeAsync(documentType, settings, ct);
            if (!await exists(code, ct)) return code;
        }
        throw new InvalidOperationException("Không sinh được mã chứng từ sản xuất mới.");
    }

    /// <summary>Số có tối đa <paramref name="scale"/> chữ số thập phân.</summary>
    public static bool HasMaxScale(decimal value, int scale) =>
        decimal.Round(value, scale) == value;

    /// <summary>Kho đang hoạt động hay không.</summary>
    public static Task<bool> IsActiveWarehouseAsync(IStockFlowDbContext context, int warehouseId, CancellationToken ct) =>
        context.MstWarehouses.AnyAsync(w => w.WarehouseId == warehouseId && w.IsActive != false, ct);
}
