using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.WarehousePermissions.DTOs;

namespace StockFlow.Application.Features.WarehousePermissions.Queries;

public record GetWarehousePermissionsQuery(string? Search, string? WarehouseFilter) 
    : IRequest<Result<List<WarehouseStaffAccessDto>>>;

public class GetWarehousePermissionsQueryHandler 
    : IRequestHandler<GetWarehousePermissionsQuery, Result<List<WarehouseStaffAccessDto>>>
{
    private readonly IStockFlowDbContext _context;

    public GetWarehousePermissionsQueryHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<List<WarehouseStaffAccessDto>>> Handle(GetWarehousePermissionsQuery query, CancellationToken cancellationToken)
    {
        var usersQuery = _context.SecUsers
            .Include(u => u.JncUserRoles)
                .ThenInclude(ur => ur.Role)
            .Include(u => u.JncUserWarehouseAccesses)
                .ThenInclude(wa => wa.Warehouse)
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var s = query.Search.ToLower().Trim();
            usersQuery = usersQuery.Where(u =>
                (u.FullName != null && u.FullName.ToLower().Contains(s)) ||
                (u.Username != null && u.Username.ToLower().Contains(s)) ||
                (u.Email != null && u.Email.ToLower().Contains(s)) ||
                (u.Phone != null && u.Phone.Contains(s)));
        }

        var users = await usersQuery.OrderBy(u => u.UserId).ToListAsync(cancellationToken);

        var roleMap = new Dictionary<string, (string RoleCode, string RoleTitle, string Department)>(StringComparer.OrdinalIgnoreCase)
        {
            { "Admin", ("ADMIN", "Quản trị viên", "Quản trị hệ thống") },
            { "Manager", ("MANAGER", "Quản lý", "Ban Giám đốc") },
            { "SalesStaff", ("SALES", "Nhân viên bán hàng", "Phòng Kinh doanh") },
            { "WarehouseStaff", ("WAREHOUSE", "Nhân viên kho", "Kho vận & Logistics") },
            { "ProductionStaff", ("PRODUCTION", "Nhân viên sản xuất", "Xưởng Sản xuất") }
        };

        var result = users.Select(u =>
        {
            var primaryRole = u.JncUserRoles.FirstOrDefault()?.Role?.RoleName ?? "WarehouseStaff";
            var (roleCode, roleTitle, defaultDept) = roleMap.GetValueOrDefault(primaryRole, ("WAREHOUSE", "Nhân viên", "Kho vận & Logistics"));

            var assignedWarehouseCodes = u.JncUserWarehouseAccesses
                .Where(w => w.Warehouse?.WarehouseCode != null)
                .Select(w => w.Warehouse!.WarehouseCode!)
                .ToList();

            var assignedDetails = u.JncUserWarehouseAccesses
                .Where(w => w.Warehouse != null)
                .Select(w => new WarehouseSimpleDto(
                    WarehouseId: w.Warehouse.WarehouseId,
                    Code: w.Warehouse.WarehouseCode ?? "",
                    Name: w.Warehouse.WarehouseName ?? ""
                ))
                .ToList();

            return new WarehouseStaffAccessDto(
                Id: u.UserId.ToString(),
                UserId: u.UserId,
                Code: $"NV-NV{u.UserId:D3}",
                Name: u.FullName ?? u.Username ?? "",
                Title: roleTitle,
                Email: u.Email ?? "",
                Phone: u.Phone ?? "",
                Department: defaultDept,
                Role: roleCode,
                RoleTitle: roleTitle,
                AssignedWarehouses: assignedWarehouseCodes,
                AssignedWarehouseDetails: assignedDetails,
                Status: u.IsActive == false ? "LOCKED" : "ACTIVE",
                Avatar: null
            );
        }).ToList();

        if (!string.IsNullOrWhiteSpace(query.WarehouseFilter) && query.WarehouseFilter != "ALL")
        {
            result = result.Where(r => r.AssignedWarehouses.Contains(query.WarehouseFilter, StringComparer.OrdinalIgnoreCase) ||
                                       r.AssignedWarehouseDetails.Any(d => d.WarehouseId.ToString() == query.WarehouseFilter)).ToList();
        }

        return Result.Success(result);
    }
}
