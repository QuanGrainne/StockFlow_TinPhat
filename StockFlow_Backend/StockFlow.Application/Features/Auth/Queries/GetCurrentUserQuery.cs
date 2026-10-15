using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Auth.DTOs;

namespace StockFlow.Application.Features.Auth.Queries;

public record GetCurrentUserQuery(int UserId) : IRequest<Result<CurrentUserResponse>>;

public class GetCurrentUserQueryHandler : IRequestHandler<GetCurrentUserQuery, Result<CurrentUserResponse>>
{
    private readonly IStockFlowDbContext _context;

    public GetCurrentUserQueryHandler(IStockFlowDbContext context)
    {
        _context = context;
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

        var response = new CurrentUserResponse(
            user.UserId,
            user.Username ?? "",
            user.FullName ?? "",
            user.Email ?? "",
            user.Phone,
            user.IsActive ?? true,
            roles,
            warehouses);

        return Result.Success(response);
    }
}
