using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Admin.DTOs;

namespace StockFlow.Application.Features.Admin.Queries;

public record GetStaffListQuery(string? Search, string? Status, string? Department) : IRequest<Result<List<StaffDto>>>;

public class GetStaffListQueryHandler : IRequestHandler<GetStaffListQuery, Result<List<StaffDto>>>
{
    private readonly IStockFlowDbContext _context;

    public GetStaffListQueryHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<List<StaffDto>>> Handle(GetStaffListQuery query, CancellationToken cancellationToken)
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

        if (!string.IsNullOrWhiteSpace(query.Status) && query.Status != "ALL")
        {
            if (query.Status == "ACTIVE")
                usersQuery = usersQuery.Where(u => u.IsActive == true);
            else if (query.Status == "LOCKED")
                usersQuery = usersQuery.Where(u => u.IsActive == false);
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
            var primaryRole = u.JncUserRoles.FirstOrDefault()?.Role?.RoleName ?? "SalesStaff";
            var (roleCode, roleTitle, defaultDept) = roleMap.GetValueOrDefault(primaryRole, ("SALES", "Nhân viên", "Phòng Kinh doanh"));

            var warehouses = u.JncUserWarehouseAccesses
                .Where(w => w.Warehouse?.WarehouseCode != null)
                .Select(w => w.Warehouse!.WarehouseCode!)
                .ToList();

            return new StaffDto(
                Id: u.UserId.ToString(),
                Code: $"NV-NV{u.UserId:D3}",
                Name: u.FullName ?? u.Username ?? "",
                Title: roleTitle,
                Email: u.Email ?? "",
                Phone: u.Phone ?? "",
                Department: defaultDept,
                Role: roleCode,
                RoleTitle: roleTitle,
                AssignedWarehouses: warehouses,
                Status: u.IsActive == false ? "LOCKED" : "ACTIVE",
                Avatar: null
            );
        }).ToList();

        if (!string.IsNullOrWhiteSpace(query.Department) && query.Department != "ALL")
        {
            result = result.Where(r => r.Department == query.Department).ToList();
        }

        return Result.Success(result);
    }
}
