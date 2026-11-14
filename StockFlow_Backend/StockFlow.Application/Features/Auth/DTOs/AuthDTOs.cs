namespace StockFlow.Application.Features.Auth.DTOs;

public record LoginRequest(string Username, string Password);

public record WarehouseSummaryDto(int WarehouseId, string WarehouseCode, string WarehouseName);

public record LoginResponse(
    string Token,
    int UserId,
    string Username,
    string FullName,
    string Email,
    List<string> Roles,
    List<WarehouseSummaryDto> Warehouses,
    List<string>? Permissions = null,
    string? Avatar = null,
    string? Code = null,
    string? Title = null);

public record CurrentUserResponse(
    int UserId,
    string Username,
    string FullName,
    string Email,
    string? Phone,
    bool IsActive,
    List<string> Roles,
    List<WarehouseSummaryDto> Warehouses,
    List<string>? Permissions = null,
    string? Avatar = null,
    string? Code = null,
    string? Title = null);

/// <summary>Yêu cầu đổi mật khẩu của chính tài khoản đang đăng nhập (UC-50, BR-35..BR-37)</summary>
public record ChangePasswordRequest(string CurrentPassword, string NewPassword, string ConfirmNewPassword);
