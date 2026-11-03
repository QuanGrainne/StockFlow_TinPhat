using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Auth.DTOs;
using StockFlow.Application.Features.Roles.Common;

namespace StockFlow.Application.Features.Auth.Queries;

public record GetCurrentUserQuery(int UserId) : IRequest<Result<CurrentUserResponse>>;

public class GetCurrentUserQueryHandler : IRequestHandler<GetCurrentUserQuery, Result<CurrentUserResponse>>
{
    private readonly IStockFlowDbContext _context;
    private readonly IUserPermissionService _permissionService;

    public GetCurrentUserQueryHandler(IStockFlowDbContext context, IUserPermissionService permissionService)
    {
        _context = context;
        _permissionService = permissionService;
    }

    public async Task<Result<CurrentUserResponse>> Handle(GetCurrentUserQuery request, CancellationToken cancellationToken)
    {
        var user = await _context.SecUsers
            .Include(u => u.JncUserRoles)
                .ThenInclude(ur => ur.Role)
            .Include(u => u.JncUserWarehouseAccesses)
                .ThenInclude(wa => wa.Warehouse)
            .FirstOrDefaultAsync(u => u.UserId == request.UserId, cancellationToken);

        if (user == null)
        {
            return Result.Failure<CurrentUserResponse>("Người dùng không tồn tại.");
        }

        var roles = user.JncUserRoles
            .Where(r => r.Role != null && !string.IsNullOrEmpty(r.Role.RoleName))
            .Select(r => r.Role.RoleName!)
            .ToList();

        var warehouses = user.JncUserWarehouseAccesses
            .Where(w => w.Warehouse != null)
            .Select(w => new WarehouseSummaryDto(
                w.WarehouseId,
                w.Warehouse.WarehouseCode ?? "",
                w.Warehouse.WarehouseName ?? ""))
            .ToList();

        // Cùng nguồn quyền với backend authorization (RequirePermission) để FE và BE luôn khớp.
        var permissions = (await _permissionService.GetPermissionCodesAsync(user.UserId, cancellationToken))
            .OrderBy(p => p)
            .ToList();

        var roleEntity = user.JncUserRoles.FirstOrDefault()?.Role;
        var primaryRoleName = roleEntity?.RoleName ?? (roles.FirstOrDefault() ?? "Nhân viên");
        var roleTitle = PermissionConstants.ToRoleDisplayName(primaryRoleName);
        var staffCode = (user.Username?.ToLower() == "admin" || user.UserId == 1)
            ? "NV-ADMIN"
            : $"NV-NV{user.UserId:D3}";
        var avatar = !string.IsNullOrEmpty(user.Avatar)
            ? user.Avatar
            : (user.UserId == 1 ? "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80" : null);

        var response = new CurrentUserResponse(
            user.UserId,
            user.Username ?? "",
            user.FullName ?? "",
            user.Email ?? "",
            user.Phone,
            user.IsActive ?? true,
            roles,
            warehouses,
            permissions,
            avatar,
            staffCode,
            roleTitle);

        return Result.Success(response);
    }
}
