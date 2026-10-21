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
    private readonly IPasswordHasher _passwordHasher;

    public UpdateStaffCommandHandler(IStockFlowDbContext context, IPasswordHasher passwordHasher)
    {
        _context = context;
        _passwordHasher = passwordHasher;
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

        if (string.IsNullOrWhiteSpace(req.Name))
        {
            return Result.Failure<StaffDto>("Họ và tên nhân viên không được để trống.");
        }

        if (string.IsNullOrWhiteSpace(req.Phone))
        {
            return Result.Failure<StaffDto>("Số điện thoại không được để trống.");
        }

        user.FullName = req.Name.Trim();
        user.Email = req.Email?.Trim() ?? "";
        user.Phone = req.Phone.Trim();
        if (req.Avatar != null)
        {
            user.Avatar = string.IsNullOrWhiteSpace(req.Avatar) ? null : req.Avatar.Trim();
        }
        user.UpdatedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified);

        // Kiểm tra trùng email nếu có nhập email
        if (!string.IsNullOrWhiteSpace(req.Email))
        {
            var emailClean = req.Email.Trim();
            var emailExists = await _context.SecUsers.AnyAsync(u => u.UserId != user.UserId && u.Email == emailClean, cancellationToken);
            if (emailExists)
            {
                return Result.Failure<StaffDto>($"Email '{emailClean}' đã được sử dụng cho một tài khoản khác.");
            }
        }

        // Cập nhật tên đăng nhập nếu có truyền vào
        if (!string.IsNullOrWhiteSpace(req.Username))
        {
            var newUsername = req.Username.Trim().ToLower();
            if (newUsername != user.Username?.ToLower())
            {
                var usernameExists = await _context.SecUsers.AnyAsync(u => u.UserId != user.UserId && u.Username == newUsername, cancellationToken);
                if (usernameExists)
                {
                    return Result.Failure<StaffDto>($"Tên đăng nhập '{newUsername}' đã tồn tại trong hệ thống. Vui lòng chọn tên đăng nhập khác.");
                }
                user.Username = newUsername;
            }
        }

        // Cập nhật mật khẩu nếu có truyền vào từ form
        if (!string.IsNullOrWhiteSpace(req.Password))
        {
            user.PasswordHash = _passwordHasher.Hash(req.Password.Trim());
        }

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
            Title: string.IsNullOrWhiteSpace(req.Title) ? roleTitle : req.Title,
            Email: user.Email ?? "",
            Phone: user.Phone ?? "",
            Department: req.Department ?? "",
            Role: req.Role.ToUpper(),
            RoleTitle: roleTitle,
            AssignedWarehouses: assignedWarehouses,
            Status: user.IsActive == false ? "LOCKED" : "ACTIVE",
            Avatar: user.Avatar,
            Username: user.Username
        );

        return Result.Success(response);
    }
}
