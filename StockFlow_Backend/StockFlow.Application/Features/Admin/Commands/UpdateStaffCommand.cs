using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Admin.DTOs;

namespace StockFlow.Application.Features.Admin.Commands;

public record UpdateStaffCommand(int UserId, UpdateStaffRequest Request) : IRequest<Result<StaffDto>>;

public class UpdateStaffCommandHandler : IRequestHandler<UpdateStaffCommand, Result<StaffDto>>
{
    private readonly IStockFlowDbContext _context;

    public UpdateStaffCommandHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<StaffDto>> Handle(UpdateStaffCommand command, CancellationToken cancellationToken)
    {
        var user = await _context.SecUsers
            .Include(u => u.JncUserRoles)
                .ThenInclude(ur => ur.Role)
            .Include(u => u.JncUserWarehouseAccesses)
                .ThenInclude(wa => wa.Warehouse)
            .FirstOrDefaultAsync(u => u.UserId == command.UserId, cancellationToken);

        if (user == null)
        {
            return Result.Failure<StaffDto>("Không tìm thấy thông tin nhân viên.");
        }

        var req = command.Request;
        user.FullName = req.Name.Trim();
        user.Email = req.Email.Trim();
        user.Phone = req.Phone?.Trim() ?? "";
        user.UpdatedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified);

        // Cập nhật vai trò
        var targetRoleName = req.Role.ToUpper() switch
        {
            "ADMIN" or "ROLE_ADMIN" => "Admin",
            "MANAGER" or "ROLE_MANAGER" => "Manager",
            "SALES" or "ROLE_SALES" => "SalesStaff",
            "WAREHOUSE" or "ROLE_WAREHOUSE" => "WarehouseStaff",
            "PRODUCTION" or "ROLE_PRODUCTION" => "ProductionStaff",
            _ => req.Role
        };

        var role = await _context.SecRoles.FirstOrDefaultAsync(r =>
            r.RoleName != null && (r.RoleName.ToLower() == targetRoleName.ToLower() || r.RoleName.ToLower() == req.Role.ToLower()),
            cancellationToken);

        if (role != null)
        {
            _context.JncUserRoles.RemoveRange(user.JncUserRoles);
            await _context.JncUserRoles.AddAsync(new Domain.Entities.JncUserRole
            {
                UserId = user.UserId,
                RoleId = role.RoleId,
                AssignedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified)
            }, cancellationToken);
        }

        // Cập nhật kho phân quyền
        _context.JncUserWarehouseAccesses.RemoveRange(user.JncUserWarehouseAccesses);
        var assignedWarehouses = new List<string>();
        if (req.AssignedWarehouses != null && req.AssignedWarehouses.Count > 0)
        {
            var warehouses = await _context.MstWarehouses
                .Where(w => w.WarehouseCode != null && req.AssignedWarehouses.Contains(w.WarehouseCode))
                .ToListAsync(cancellationToken);

            foreach (var wh in warehouses)
            {
                await _context.JncUserWarehouseAccesses.AddAsync(new Domain.Entities.JncUserWarehouseAccess
                {
                    UserId = user.UserId,
                    WarehouseId = wh.WarehouseId,
                    AssignedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified)
                }, cancellationToken);
                assignedWarehouses.Add(wh.WarehouseCode!);
            }
        }

        await _context.SaveChangesAsync(cancellationToken);

        var roleTitleMap = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            { "Admin", "Quản trị viên" },
            { "Manager", "Quản lý" },
            { "SalesStaff", "Nhân viên bán hàng" },
            { "WarehouseStaff", "Nhân viên kho" },
            { "ProductionStaff", "Nhân viên sản xuất" }
        };

        var roleTitle = roleTitleMap.GetValueOrDefault(role?.RoleName ?? "", "Nhân viên");

        var response = new StaffDto(
            Id: user.UserId.ToString(),
            Code: $"NV-NV{user.UserId:D3}",
            Name: user.FullName ?? "",
            Title: req.Title ?? "Chuyên viên",
            Email: user.Email ?? "",
            Phone: user.Phone ?? "",
            Department: req.Department ?? "Quản trị hệ thống",
            Role: req.Role.ToUpper(),
            RoleTitle: roleTitle,
            AssignedWarehouses: assignedWarehouses,
            Status: user.IsActive == false ? "LOCKED" : "ACTIVE",
            Avatar: null
        );

        return Result.Success(response);
    }
}
