namespace StockFlow.Application.Features.Roles.DTOs;

/// <summary>Chức năng navbar được tick của một vai trò (mã frontend, VD "feat-pos").</summary>
/// <param name="Configured">false = vai trò chưa lưu ma trận lần nào, đang dùng chức năng mặc định</param>
public record RoleFeaturesDto(string RoleCode, string RoleName, List<string> Features, bool Configured);
