using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Roles.Common;
using StockFlow.Application.Features.Roles.DTOs;

namespace StockFlow.Application.Features.Roles.Queries;

public record GetRolePermissionsQuery(string RoleCode) : IRequest<Result<List<PermissionModuleDto>>>;

public class GetRolePermissionsQueryHandler : IRequestHandler<GetRolePermissionsQuery, Result<List<PermissionModuleDto>>>
{
    private readonly IStockFlowDbContext _context;

    public GetRolePermissionsQueryHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<List<PermissionModuleDto>>> Handle(GetRolePermissionsQuery request, CancellationToken cancellationToken)
    {
        var targetNormalized = PermissionConstants.ToRoleCode(request.RoleCode);

        var roles = await _context.SecRoles
            .Include(r => r.Permissions)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var role = roles.FirstOrDefault(r => 
            PermissionConstants.ToRoleCode(r.RoleName ?? "").Equals(targetNormalized, StringComparison.OrdinalIgnoreCase) ||
            (r.RoleName != null && r.RoleName.Equals(request.RoleCode, StringComparison.OrdinalIgnoreCase)));

        var hasAssignedPermissions = role != null && role.Permissions.Any();
        var grantedCodes = role?.Permissions
            .Where(p => !string.IsNullOrEmpty(p.PermissionCode))
            .Select(p => p.PermissionCode!.ToUpperInvariant())
            .ToHashSet() ?? new HashSet<string>();

        var modules = PermissionConstants.Modules.Select(m =>
        {
            bool read, create, update, delete, approve;

            if (hasAssignedPermissions)
            {
                read = grantedCodes.Contains($"{m.ModuleKey}_READ");
                create = grantedCodes.Contains($"{m.ModuleKey}_CREATE");
                update = grantedCodes.Contains($"{m.ModuleKey}_UPDATE");
                delete = grantedCodes.Contains($"{m.ModuleKey}_DELETE");
                approve = grantedCodes.Contains($"{m.ModuleKey}_APPROVE");
            }
            else
            {
                // Fallback default permissions based on role type
                switch (targetNormalized)
                {
                    case "ROLE_ADMIN":
                        read = true; create = true; update = true; delete = true; approve = true;
                        break;
                    case "ROLE_MANAGER":
                        read = true; create = true; update = true;
                        delete = m.Id != "MOD-01";
                        approve = true;
                        break;
                    case "ROLE_SALES":
                        read = true;
                        create = m.Id == "MOD-05" || m.Id == "MOD-03";
                        update = m.Id == "MOD-05";
                        delete = false;
                        approve = false;
                        break;
                    case "ROLE_WAREHOUSE":
                        read = true;
                        create = m.Id == "MOD-04" || m.Id == "MOD-06";
                        update = m.Id == "MOD-06";
                        delete = false;
                        approve = false;
                        break;
                    case "ROLE_PRODUCTION":
                        read = true;
                        create = m.Id == "MOD-07";
                        update = m.Id == "MOD-07";
                        delete = false;
                        approve = false;
                        break;
                    default:
                        read = true; create = false; update = false; delete = false; approve = false;
                        break;
                }
            }

            return new PermissionModuleDto(
                Id: m.Id,
                Stt: m.Stt,
                Name: m.Name,
                Code: m.DisplayCode,
                Description: m.Description,
                Read: read,
                Create: create,
                Update: update,
                Delete: delete,
                Approve: approve
            );
        }).ToList();

        return Result.Success(modules);
    }
}
