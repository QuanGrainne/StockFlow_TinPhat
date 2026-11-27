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
    private readonly Dictionary<int, (bool IsAdmin, IReadOnlySet<string> Codes, IReadOnlySet<string> Features)> _cache = new();

    public UserPermissionService(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlySet<string>> GetPermissionCodesAsync(int userId, CancellationToken cancellationToken = default)
        => (await LoadAsync(userId, cancellationToken)).Codes;

    public async Task<IReadOnlySet<string>> GetFeatureCodesAsync(int userId, CancellationToken cancellationToken = default)
        => (await LoadAsync(userId, cancellationToken)).Features;

    public async Task<bool> IsAdminAsync(int userId, CancellationToken cancellationToken = default)
        => (await LoadAsync(userId, cancellationToken)).IsAdmin;

    private async Task<(bool IsAdmin, IReadOnlySet<string> Codes, IReadOnlySet<string> Features)> LoadAsync(int userId, CancellationToken cancellationToken)
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

        (bool, IReadOnlySet<string>, IReadOnlySet<string>) result;

        if (user == null || user.IsActive == false)
        {
            // Tài khoản không tồn tại hoặc đã bị khóa: token cũ không còn quyền gì.
            result = (false, Empty, Empty);
        }
        else
        {
            var isAdmin = user.Roles.Any(r =>
                !string.IsNullOrEmpty(r.RoleName) &&
                PermissionConstants.ToRoleCode(r.RoleName) == "ROLE_ADMIN");

            var codes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var features = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var role in user.Roles)
            {
                var moduleCodes = role.Codes.Where(c => !FeatureConstants.IsFeatureCode(c)).ToList();
                var featureCodes = role.Codes.Where(FeatureConstants.IsFeatureCode).ToList();

                // Vai trò chưa được cấu hình ma trận quyền thì dùng quyền mặc định theo loại vai trò.
                if (!isAdmin)
                {
                    if (moduleCodes.Count > 0)
                        codes.UnionWith(moduleCodes.Select(c => c.ToUpperInvariant()));
                    else if (!string.IsNullOrEmpty(role.RoleName))
                        codes.UnionWith(PermissionConstants.GetDefaultPermissionCodes(role.RoleName));
                }

                // Chức năng navbar: đã cấu hình (có mã đánh dấu) thì dùng đúng các mục được tick, chưa thì dùng mặc định.
                if (featureCodes.Any(c => c.Equals(FeatureConstants.ConfiguredMarker, StringComparison.OrdinalIgnoreCase)))
                {
                    features.UnionWith(featureCodes
                        .Where(c => !c.Equals(FeatureConstants.ConfiguredMarker, StringComparison.OrdinalIgnoreCase))
                        .Select(c => c.ToUpperInvariant()));
                }
                else if (!string.IsNullOrEmpty(role.RoleName))
                {
                    features.UnionWith(FeatureConstants.GetDefaultFeatureIds(role.RoleName).Select(FeatureConstants.ToCode));
                }
            }

            if (isAdmin)
            {
                // Admin luôn có toàn quyền phân hệ, kể cả khi ma trận quyền của vai trò Admin bị sửa nhầm.
                // Chức năng navbar cũng vậy: Admin luôn có mọi chức năng, không tự khóa mình (DEF-E2E-05).
                codes.UnionWith(PermissionConstants.GetDefaultPermissionCodes("ROLE_ADMIN"));
                features.UnionWith(FeatureConstants.AdminLockedFeatureIds.Select(FeatureConstants.ToCode));
            }

            result = (isAdmin, codes, features);
        }

        _cache[userId] = result;
        return result;
    }
}
