namespace StockFlow.Application.Common.Interfaces;

/// <summary>
/// Dịch vụ trích xuất danh tính và phân quyền kho của người dùng đang đăng nhập (Current User).
/// </summary>
public interface ICurrentUserService
{
    int? UserId { get; }
    string? Username { get; }
    bool IsAuthenticated { get; }
    bool IsAdmin { get; }
    IReadOnlyList<string> Roles { get; }
    IReadOnlyList<int> WarehouseIds { get; }

    /// <summary>
    /// Lấy danh sách ID các kho mà người dùng được cấp quyền truy cập.
    /// Nếu là Admin, trả về toàn bộ ID kho hoạt động trong hệ thống.
    /// </summary>
    Task<IReadOnlyList<int>> GetAuthorizedWarehouseIdsAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Kiểm tra người dùng có quyền thao tác trên một kho cụ thể hay không.
    /// Admin luôn có quyền trên mọi kho.
    /// </summary>
    Task<bool> HasWarehouseAccessAsync(int warehouseId, CancellationToken cancellationToken = default);
}
