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
            var roleCode = PermissionConstants.ToRoleCode(r.RoleName ?? $"ROLE_{r.RoleId}");
            var displayName = PermissionConstants.ToRoleDisplayName(r.RoleName ?? $"Vai trò {r.RoleId}");
            var rank = $"Rank #{index + 1}";
            var isSystem = r.RoleId <= 5;
            var desc = r.Description ?? $"Mô tả cho vai trò {displayName}";

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
