namespace StockFlow.Application.Common.Interfaces;

/// <summary>
/// Tính danh sách mã quyền (VD: STOCK_CREATE) hiệu lực của một người dùng,
/// dựa trên vai trò hiện tại trong DB (không dựa vào token, để thay đổi phân quyền có hiệu lực ngay).
/// </summary>
public interface IUserPermissionService
{
    /// <summary>
    /// Trả về tập mã quyền phân hệ (chữ hoa) của người dùng.
    /// Tài khoản không tồn tại hoặc đã bị khóa trả về tập rỗng.
    /// Vai trò chưa được cấu hình quyền sẽ dùng quyền mặc định theo loại vai trò.
    /// </summary>
    Task<IReadOnlySet<string>> GetPermissionCodesAsync(int userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Trả về tập mã chức năng navbar (FEAT_*, VD FEAT_POS) mà người dùng được dùng, theo ma trận Phân quyền chức năng.
    /// Vai trò chưa cấu hình dùng chức năng mặc định; Admin luôn giữ chức năng của màn phân quyền.
    /// Tài khoản không tồn tại hoặc đã bị khóa trả về tập rỗng.
    /// </summary>
    Task<IReadOnlySet<string>> GetFeatureCodesAsync(int userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// True nếu người dùng đang hoạt động và có vai trò Quản trị viên.
    /// </summary>
    Task<bool> IsAdminAsync(int userId, CancellationToken cancellationToken = default);
}
