using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Roles.Common;
using StockFlow.Application.Features.Roles.DTOs;

namespace StockFlow.Application.Features.Roles.Queries;

public record GetRolesQuery : IRequest<Result<List<RoleDto>>>;

public class GetRolesQueryHandler : IRequestHandler<GetRolesQuery, Result<List<RoleDto>>>
{
    private readonly IStockFlowDbContext _context;

    public GetRolesQueryHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<List<RoleDto>>> Handle(GetRolesQuery request, CancellationToken cancellationToken)
    {
        var roles = await _context.SecRoles
            .Include(r => r.JncUserRoles)
            .OrderBy(r => r.RoleId)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var result = roles.Select((r, index) =>
        {
            var isSystem = r.RoleId == 1 || (r.RoleName != null && (r.RoleName.Equals("Admin", StringComparison.OrdinalIgnoreCase) || r.RoleName.Equals("ROLE_ADMIN", StringComparison.OrdinalIgnoreCase)));
            var displayName = isSystem ? "Quản trị viên" : PermissionConstants.ToRoleDisplayName(r.RoleName ?? $"Vai trò {r.RoleId}");
            var rank = $"Rank #{index + 1}";
            var roleCode = PermissionConstants.ToRoleCode(r.RoleName ?? $"ROLE_{r.RoleId}");
            var desc = r.Description ?? $"Mô tả cho vai trò {displayName}";
            if (!string.IsNullOrWhiteSpace(r.Description))
            {
                var match = System.Text.RegularExpressions.Regex.Match(r.Description, @"\[CODE:([^\]]+)\]");
                if (match.Success)
                {
                    roleCode = match.Groups[1].Value.Trim();
                    desc = r.Description.Replace(match.Value, "").Trim();
                }
            }

            return new RoleDto(
                Id: $"ROLE-{r.RoleId:D2}",
                Name: displayName,
                Code: roleCode,
                Rank: rank,
                IsSystem: isSystem,
                Description: desc,
                StaffCount: r.JncUserRoles.Count
            );
        }).ToList();

        return Result.Success(result);
    }
}
