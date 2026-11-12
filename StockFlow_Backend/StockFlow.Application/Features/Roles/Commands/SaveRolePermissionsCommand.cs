using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Roles.Common;
using StockFlow.Application.Features.Roles.DTOs;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Roles.Commands;

public record SaveRolePermissionsCommand(string RoleCode, List<PermissionModuleDto> Modules) : IRequest<Result<bool>>;

public class SaveRolePermissionsCommandHandler : IRequestHandler<SaveRolePermissionsCommand, Result<bool>>
{
    private readonly IStockFlowDbContext _context;

    public SaveRolePermissionsCommandHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<bool>> Handle(SaveRolePermissionsCommand command, CancellationToken cancellationToken)
    {
        var targetNormalized = PermissionConstants.ToRoleCode(command.RoleCode);

        var roles = await _context.SecRoles
            .Include(r => r.Permissions)
            .ToListAsync(cancellationToken);

        var role = roles.FirstOrDefault(r =>
            PermissionConstants.ToRoleCode(r.RoleName ?? "").Equals(targetNormalized, StringComparison.OrdinalIgnoreCase) ||
            (r.RoleName != null && r.RoleName.Equals(command.RoleCode, StringComparison.OrdinalIgnoreCase)));

        if (role == null)
        {
            return Result.Failure<bool>($"Không tìm thấy vai trò '{command.RoleCode}' trong hệ thống.");
        }

        // 1. Đảm bảo tất cả 45 permissions đã tồn tại trong database
        var allDbPermissions = await _context.SecPermissions.ToListAsync(cancellationToken);
        var permMap = allDbPermissions.ToDictionary(p => p.PermissionCode?.ToUpperInvariant() ?? "", p => p);

        var actions = new[] { "READ", "CREATE", "UPDATE", "DELETE", "APPROVE" };
        var addedAny = false;

        foreach (var mod in PermissionConstants.Modules)
        {
            foreach (var act in actions)
            {
                var code = $"{mod.ModuleKey}_{act}".ToUpperInvariant();
                if (!permMap.ContainsKey(code))
                {
                    var newPerm = new SecPermission
                    {
                        PermissionCode = code,
                        PermissionName = $"{act} quyền phân hệ {mod.Name}",
                        Module = mod.ModuleKey,
                        Description = $"{act} trên phân hệ {mod.DisplayCode} {mod.Name}"
                    };
                    await _context.SecPermissions.AddAsync(newPerm, cancellationToken);
                    permMap[code] = newPerm;
                    addedAny = true;
                }
            }
        }

        if (addedAny)
        {
            await _context.SaveChangesAsync(cancellationToken);
        }

        // 2. Xác định danh sách PermissionCode được bật
        var targetCodes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var m in command.Modules)
        {
            // Trích xuất moduleKey từ code, ví dụ "[AUTH]" -> "AUTH" hoặc đối chiếu theo Id
            var meta = PermissionConstants.Modules.FirstOrDefault(meta => 
                meta.Id.Equals(m.Id, StringComparison.OrdinalIgnoreCase) || 
                meta.DisplayCode.Equals(m.Code, StringComparison.OrdinalIgnoreCase) ||
                meta.ModuleKey.Equals(m.Code.Trim('[', ']'), StringComparison.OrdinalIgnoreCase));

            var key = meta?.ModuleKey ?? m.Code.Trim('[', ']');

            if (m.Read) targetCodes.Add($"{key}_READ");
            if (m.Create) targetCodes.Add($"{key}_CREATE");
            if (m.Update) targetCodes.Add($"{key}_UPDATE");
            if (m.Delete) targetCodes.Add($"{key}_DELETE");
            if (m.Approve) targetCodes.Add($"{key}_APPROVE");
        }

        // 3. Cập nhật navigation property role.Permissions
        // Giữ nguyên các mã chức năng navbar (FEAT_*), chỉ thay quyền phân hệ
        foreach (var old in role.Permissions.Where(p => !FeatureConstants.IsFeatureCode(p.PermissionCode)).ToList())
        {
            role.Permissions.Remove(old);
        }
        foreach (var code in targetCodes)
        {
            if (permMap.TryGetValue(code.ToUpperInvariant(), out var p))
            {
                role.Permissions.Add(p);
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success(true);
    }
}
