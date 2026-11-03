using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Roles.Common;

namespace StockFlow.Infrastructure.Services;

/// <summary>
/// Tính quyền hiệu lực của người dùng từ DB. Đăng ký Scoped nên kết quả được cache trong phạm vi 1 request.
/// </summary>
public class UserPermissionService : IUserPermissionService
{
    private static readonly IReadOnlySet<string> Empty = new HashSet<string>();

    private readonly IStockFlowDbContext _context;
    private readonly Dictionary<int, (bool IsAdmin, IReadOnlySet<string> Codes)> _cache = new();

    public UserPermissionService(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlySet<string>> GetPermissionCodesAsync(int userId, CancellationToken cancellationToken = default)
        => (await LoadAsync(userId, cancellationToken)).Codes;

    public async Task<bool> IsAdminAsync(int userId, CancellationToken cancellationToken = default)
        => (await LoadAsync(userId, cancellationToken)).IsAdmin;

    private async Task<(bool IsAdmin, IReadOnlySet<string> Codes)> LoadAsync(int userId, CancellationToken cancellationToken)
    {
        if (_cache.TryGetValue(userId, out var cached)) return cached;

        var user = await _context.SecUsers
            .AsNoTracking()
            .Where(u => u.UserId == userId)
            .Select(u => new
            {
                u.IsActive,
                Roles = u.JncUserRoles
                    .Where(ur => ur.Role != null)
                    .Select(ur => new
                    {
                        ur.Role.RoleName,
                        Codes = ur.Role.Permissions
                            .Where(p => p.PermissionCode != null && p.PermissionCode != "")
                            .Select(p => p.PermissionCode!)
                            .ToList()
                    })
                    .ToList()
            })
            .FirstOrDefaultAsync(cancellationToken);

        (bool, IReadOnlySet<string>) result;

        if (user == null || user.IsActive == false)
        {
            // Tài khoản không tồn tại hoặc đã bị khóa: token cũ không còn quyền gì.
            result = (false, Empty);
        }
        else
        {
            var isAdmin = user.Roles.Any(r =>
                !string.IsNullOrEmpty(r.RoleName) &&
                PermissionConstants.ToRoleCode(r.RoleName) == "ROLE_ADMIN");

            var codes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            if (isAdmin)
            {
                // Admin luôn có toàn quyền, kể cả khi ma trận quyền của vai trò Admin bị sửa nhầm.
                codes.UnionWith(PermissionConstants.GetDefaultPermissionCodes("ROLE_ADMIN"));
            }
            else
            {
                foreach (var role in user.Roles)
                {
                    // Vai trò chưa được cấu hình ma trận quyền thì dùng quyền mặc định theo loại vai trò.
                    if (role.Codes.Count > 0)
                        codes.UnionWith(role.Codes.Select(c => c.ToUpperInvariant()));
                    else if (!string.IsNullOrEmpty(role.RoleName))
                        codes.UnionWith(PermissionConstants.GetDefaultPermissionCodes(role.RoleName));
                }
            }

            result = (isAdmin, codes);
        }

        _cache[userId] = result;
        return result;
    }
}
