using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Admin.DTOs;
using StockFlow.Application.Features.Roles.Common;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Admin.Commands;

public record UpdateStaffCommand(int UserId, UpdateStaffRequest Request) : IRequest<Result<StaffDto>>;

public class UpdateStaffCommandValidator : AbstractValidator<UpdateStaffCommand>
{
    public UpdateStaffCommandValidator()
    {
        // BR-35: Admin đổi mật khẩu cho nhân viên thì mật khẩu mới phải đủ mạnh; để trống = giữ mật khẩu cũ
        RuleFor(x => x.Request.Password!)
            .Cascade(CascadeMode.Stop)
            .StrongPassword("Mật khẩu mới")
            .When(x => !string.IsNullOrWhiteSpace(x.Request.Password));
    }
}

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

        // Cập nhật vai trò linh hoạt theo ID, Mã hoặc Tên vai trò
        var roleInput = (req.Role ?? "").Trim();
        int? parsedRoleId = null;
        if (roleInput.StartsWith("ROLE-", StringComparison.OrdinalIgnoreCase) && int.TryParse(roleInput[5..], out var rNum))
        {
            parsedRoleId = rNum;
        }
        else if (int.TryParse(roleInput, out var directRid))
        {
            parsedRoleId = directRid;
        }

        var allRoles = await _context.SecRoles.ToListAsync(cancellationToken);
        var role = allRoles.FirstOrDefault(r =>
            (parsedRoleId.HasValue && r.RoleId == parsedRoleId.Value) ||
            string.Equals(r.RoleName, roleInput, StringComparison.OrdinalIgnoreCase) ||
            (r.Description != null && r.Description.Contains($"[CODE:{roleInput}]", StringComparison.OrdinalIgnoreCase)) ||
            string.Equals(PermissionConstants.ToRoleCode(r.RoleName ?? ""), PermissionConstants.ToRoleCode(roleInput), StringComparison.OrdinalIgnoreCase) ||
            string.Equals(PermissionConstants.ToRoleCode(r.RoleName ?? ""), roleInput, StringComparison.OrdinalIgnoreCase) ||
            string.Equals(r.RoleName, PermissionConstants.ToRoleDisplayName(roleInput), StringComparison.OrdinalIgnoreCase) ||
            (roleInput.Equals("ADMIN", StringComparison.OrdinalIgnoreCase) && r.RoleName != null && r.RoleName.Contains("Admin", StringComparison.OrdinalIgnoreCase)) ||
            (roleInput.Equals("MANAGER", StringComparison.OrdinalIgnoreCase) && r.RoleName != null && r.RoleName.Contains("Manager", StringComparison.OrdinalIgnoreCase)) ||
            (roleInput.Equals("SALES", StringComparison.OrdinalIgnoreCase) && r.RoleName != null && (r.RoleName.Contains("Sales", StringComparison.OrdinalIgnoreCase) || r.RoleName.Contains("Bán hàng", StringComparison.OrdinalIgnoreCase))) ||
            (roleInput.Equals("WAREHOUSE", StringComparison.OrdinalIgnoreCase) && r.RoleName != null && (r.RoleName.Contains("Warehouse", StringComparison.OrdinalIgnoreCase) || r.RoleName.Contains("Kho", StringComparison.OrdinalIgnoreCase))) ||
            (roleInput.Equals("PRODUCTION", StringComparison.OrdinalIgnoreCase) && r.RoleName != null && (r.RoleName.Contains("Production", StringComparison.OrdinalIgnoreCase) || r.RoleName.Contains("Sản xuất", StringComparison.OrdinalIgnoreCase)))
        );

        var isAdminUser = user.UserId == 1 || string.Equals(user.Username, "admin", StringComparison.OrdinalIgnoreCase);

        // Tài khoản phải luôn có vai trò (UC-10 E10.x, SYS-ROL-08): gửi vai trò rỗng thì báo lỗi như khi tạo mới,
        // không lặng lẽ giữ vai trò cũ. Admin ban đầu luôn được gán lại vai trò Admin bên dưới.
        if (!isAdminUser && string.IsNullOrWhiteSpace(roleInput))
        {
            return Result.Failure<StaffDto>("Vai trò không được để trống.");
        }

        // Nếu là tài khoản Admin ban đầu: vai trò cố định là Admin, không thể đổi sang vai trò khác
        if (isAdminUser)
        {
            var adminRole = allRoles.FirstOrDefault(r => r.RoleId == 1 || (r.RoleName != null && r.RoleName.Contains("Admin", StringComparison.OrdinalIgnoreCase)));
            if (adminRole != null)
            {
                role = adminRole;
            }
        }
        else
        {
            // Nếu không phải admin: không được phép gán vai trò Admin
            if (role != null && (role.RoleId == 1 || (role.RoleName != null && role.RoleName.Contains("Admin", StringComparison.OrdinalIgnoreCase)) || roleInput.Equals("ROLE_ADMIN", StringComparison.OrdinalIgnoreCase) || roleInput.Equals("ADMIN", StringComparison.OrdinalIgnoreCase)))
            {
                return Result.Failure<StaffDto>("Không thể gán vai trò Quản trị viên (ROLE_ADMIN) cho nhân viên khác.");
            }
        }

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
            var allWarehouses = await _context.MstWarehouses.ToListAsync(cancellationToken);
            var selectedWarehouses = new List<MstWarehouse>();

            foreach (var whInput in req.AssignedWarehouses.Where(w => !string.IsNullOrWhiteSpace(w)))
            {
                var input = whInput.Trim();
                var matched = allWarehouses.FirstOrDefault(w =>
                    string.Equals(w.WarehouseCode, input, StringComparison.OrdinalIgnoreCase) ||
                    (int.TryParse(input, out var wid) && w.WarehouseId == wid) ||
                    (input.Equals("WH-HN-01", StringComparison.OrdinalIgnoreCase) && (w.WarehouseCode == "K001" || (w.WarehouseName != null && w.WarehouseName.Contains("Gia Lâm")))) ||
                    (input.Equals("K001", StringComparison.OrdinalIgnoreCase) && (w.WarehouseCode == "WH-HN-01" || (w.WarehouseName != null && w.WarehouseName.Contains("Gia Lâm")))) ||
                    (input.Equals("WH-HN-02", StringComparison.OrdinalIgnoreCase) && (w.WarehouseCode == "K002" || (w.WarehouseName != null && w.WarehouseName.Contains("Đông Anh")))) ||
                    (input.Equals("K002", StringComparison.OrdinalIgnoreCase) && (w.WarehouseCode == "WH-HN-02" || (w.WarehouseName != null && w.WarehouseName.Contains("Đông Anh")))) ||
                    (input.Equals("WH-HN-03", StringComparison.OrdinalIgnoreCase) && (w.WarehouseCode == "K003" || (w.WarehouseName != null && w.WarehouseName.Contains("Hà Đông")))) ||
                    (input.Equals("K003", StringComparison.OrdinalIgnoreCase) && (w.WarehouseCode == "WH-HN-03" || (w.WarehouseName != null && w.WarehouseName.Contains("Hà Đông")))) ||
                    (input.Equals("WH-HN-04", StringComparison.OrdinalIgnoreCase) && (w.WarehouseCode == "K004" || (w.WarehouseName != null && w.WarehouseName.Contains("Hoàn Kiếm")))) ||
                    (input.Equals("K004", StringComparison.OrdinalIgnoreCase) && (w.WarehouseCode == "WH-HN-04" || (w.WarehouseName != null && w.WarehouseName.Contains("Hoàn Kiếm"))))
                );

                if (matched != null && !selectedWarehouses.Any(sw => sw.WarehouseId == matched.WarehouseId))
                {
                    selectedWarehouses.Add(matched);
                }
            }

            foreach (var wh in selectedWarehouses)
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

        var finalRoleEntity = role ?? user.JncUserRoles.FirstOrDefault()?.Role;
        var finalRoleCode = finalRoleEntity != null 
            ? PermissionConstants.ToRoleCode(finalRoleEntity.RoleName ?? $"ROLE_{finalRoleEntity.RoleId}") 
            : PermissionConstants.ToRoleCode(req.Role ?? "ROLE_STAFF");
        if (finalRoleEntity?.Description != null)
        {
            var match = System.Text.RegularExpressions.Regex.Match(finalRoleEntity.Description, @"\[CODE:([^\]]+)\]");
            if (match.Success)
            {
                finalRoleCode = match.Groups[1].Value.Trim();
            }
        }
        var finalRoleTitle = finalRoleEntity != null 
            ? PermissionConstants.ToRoleDisplayName(finalRoleEntity.RoleName ?? "Nhân viên") 
            : "Nhân viên";

        var response = new StaffDto(
            Id: user.UserId.ToString(),
            Code: $"NV-NV{user.UserId:D3}",
            Name: user.FullName ?? "",
            Title: string.IsNullOrWhiteSpace(req.Title) ? finalRoleTitle : req.Title,
            Email: user.Email ?? "",
            Phone: user.Phone ?? "",
            Department: req.Department ?? "",
            Role: finalRoleCode,
            RoleTitle: finalRoleTitle,
            AssignedWarehouses: assignedWarehouses,
            Status: user.IsActive == false ? "LOCKED" : "ACTIVE",
            Avatar: user.Avatar,
            Username: user.Username
        );

        return Result.Success(response);
    }
}
