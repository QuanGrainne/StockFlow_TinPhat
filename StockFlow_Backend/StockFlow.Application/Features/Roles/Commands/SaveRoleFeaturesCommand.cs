using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Roles.Common;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Roles.Commands;

/// <summary>
/// Lưu ma trận Phân quyền chức năng: roleCode → danh sách chức năng navbar được tick.
/// Mỗi chức năng lưu thành mã quyền FEAT_* trong bảng quyền của vai trò; quyền phân hệ (MODULE_ACTION)
/// được suy ra lại từ các chức năng được tick. Chỉ cập nhật các vai trò có trong yêu cầu.
/// </summary>
public record SaveRoleFeaturesCommand(Dictionary<string, List<string>> Matrix) : IRequest<Result<bool>>;

public class SaveRoleFeaturesCommandHandler : IRequestHandler<SaveRoleFeaturesCommand, Result<bool>>
{
    private readonly IStockFlowDbContext _context;

    public SaveRoleFeaturesCommandHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<bool>> Handle(SaveRoleFeaturesCommand command, CancellationToken cancellationToken)
    {
        if (command.Matrix == null || command.Matrix.Count == 0)
            return Result.Failure<bool>("Không có dữ liệu phân quyền để lưu.");

        var roles = await _context.SecRoles
            .Include(r => r.Permissions)
            .ToListAsync(cancellationToken);

        // Kiểm tra trước: vai trò phải tồn tại, mã chức năng phải hợp lệ
        var targets = new List<(SecRole Role, HashSet<string> FeatureIds)>();
        foreach (var (roleCode, featureIds) in command.Matrix)
        {
            var normalized = PermissionConstants.ToRoleCode(roleCode);
            var role = roles.FirstOrDefault(r =>
                PermissionConstants.ToRoleCode(r.RoleName ?? "").Equals(normalized, StringComparison.OrdinalIgnoreCase) ||
                (r.RoleName != null && r.RoleName.Equals(roleCode, StringComparison.OrdinalIgnoreCase)));
            if (role == null)
                return Result.Failure<bool>($"Không tìm thấy vai trò '{roleCode}' trong hệ thống.");

            var ids = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var id in featureIds ?? new List<string>())
            {
                var def = FeatureConstants.FindById(id);
                if (def == null) return Result.Failure<bool>($"Chức năng '{id}' không hợp lệ.");
                ids.Add(def.Id);
            }

            // Admin không được tự bỏ quyền vào màn phân quyền
            if (normalized == "ROLE_ADMIN") ids.UnionWith(FeatureConstants.AdminLockedFeatureIds);

            targets.Add((role, ids));
        }

        // Đảm bảo đủ các dòng quyền (phân hệ + chức năng + mã đánh dấu) trong sec_permissions
        var permMap = (await _context.SecPermissions.ToListAsync(cancellationToken))
            .Where(p => !string.IsNullOrEmpty(p.PermissionCode))
            .GroupBy(p => p.PermissionCode!.ToUpperInvariant())
            .ToDictionary(g => g.Key, g => g.First());

        var actions = new[] { "READ", "CREATE", "UPDATE", "DELETE", "APPROVE" };
        var addedAny = false;
        void Ensure(string code, string name, string module, string description)
        {
            if (permMap.ContainsKey(code)) return;
            var p = new SecPermission { PermissionCode = code, PermissionName = name, Module = module, Description = description };
            _context.SecPermissions.Add(p);
            permMap[code] = p;
            addedAny = true;
        }

        foreach (var mod in PermissionConstants.Modules)
            foreach (var act in actions)
                Ensure($"{mod.ModuleKey}_{act}", $"{act} quyền phân hệ {mod.Name}", mod.ModuleKey, $"{act} trên phân hệ {mod.DisplayCode} {mod.Name}");
        foreach (var f in FeatureConstants.Features)
            Ensure(f.Code, $"Chức năng {f.Name}", FeatureConstants.PermissionModule, $"Dùng chức năng navbar {f.Name} ({f.Id})");
        Ensure(FeatureConstants.ConfiguredMarker, "Đã cấu hình phân quyền chức năng", FeatureConstants.PermissionModule,
            "Đánh dấu vai trò đã lưu ma trận Phân quyền chức năng");

        if (addedAny) await _context.SaveChangesAsync(cancellationToken);

        foreach (var (role, ids) in targets)
        {
            var codes = FeatureConstants.DeriveModulePermissionCodes(ids);
            codes.UnionWith(ids.Select(FeatureConstants.ToCode));
            codes.Add(FeatureConstants.ConfiguredMarker);

            role.Permissions.Clear();
            foreach (var code in codes)
            {
                if (permMap.TryGetValue(code.ToUpperInvariant(), out var p)) role.Permissions.Add(p);
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success(true);
    }
}
