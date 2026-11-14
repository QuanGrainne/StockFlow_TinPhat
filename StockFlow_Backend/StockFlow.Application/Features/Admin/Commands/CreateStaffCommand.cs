using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Admin.DTOs;
using StockFlow.Application.Features.Roles.Common;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Admin.Commands;

public record CreateStaffCommand(CreateStaffRequest Request) : IRequest<Result<StaffDto>>;

public class CreateStaffCommandValidator : AbstractValidator<CreateStaffCommand>
{
    public CreateStaffCommandValidator()
    {
        RuleFor(x => x.Request.Username)
            .NotEmpty().WithMessage("Tên đăng nhập không được để trống.");

        RuleFor(x => x.Request.Name)
            .NotEmpty().WithMessage("Họ và tên nhân viên không được để trống.");

        RuleFor(x => x.Request.Phone)
            .NotEmpty().WithMessage("Số điện thoại không được để trống.");

        RuleFor(x => x.Request.Email)
            .EmailAddress().WithMessage("Email không đúng định dạng.")
            .When(x => !string.IsNullOrWhiteSpace(x.Request.Email));

        RuleFor(x => x.Request.Role)
            .NotEmpty().WithMessage("Vai trò không được để trống.");

        // BR-35: Admin tự nhập mật khẩu thì phải đủ mạnh; để trống → dùng mật khẩu mặc định TinPhat@2026 (đã đạt BR-35)
        RuleFor(x => x.Request.Password!)
            .Cascade(CascadeMode.Stop)
            .StrongPassword()
            .When(x => !string.IsNullOrWhiteSpace(x.Request.Password));
    }
}

public class CreateStaffCommandHandler : IRequestHandler<CreateStaffCommand, Result<StaffDto>>
{
    private readonly IStockFlowDbContext _context;
    private readonly IPasswordHasher _passwordHasher;

    public CreateStaffCommandHandler(IStockFlowDbContext context, IPasswordHasher passwordHasher)
    {
        _context = context;
        _passwordHasher = passwordHasher;
    }

    public async Task<Result<StaffDto>> Handle(CreateStaffCommand command, CancellationToken cancellationToken)
    {
        var req = command.Request;

        // 1. Tên đăng nhập: Bắt buộc từ req.Username
        var username = req.Username?.Trim().ToLower();
        if (string.IsNullOrWhiteSpace(username))
        {
            return Result.Failure<StaffDto>("Tên đăng nhập không được để trống.");
        }

        var existingUser = await _context.SecUsers.FirstOrDefaultAsync(u => 
            u.Username == username || 
            (!string.IsNullOrWhiteSpace(req.Email) && u.Email == req.Email.Trim()), 
            cancellationToken);

        if (existingUser != null)
        {
            if (existingUser.Username == username)
            {
                return Result.Failure<StaffDto>($"Tên đăng nhập '{username}' đã tồn tại trong hệ thống. Vui lòng chọn tên đăng nhập khác.");
            }
            if (!string.IsNullOrWhiteSpace(req.Email) && existingUser.Email == req.Email.Trim())
            {
                return Result.Failure<StaffDto>($"Email '{req.Email}' đã được sử dụng cho một tài khoản khác.");
            }
        }

        // 2. Xác định vai trò linh hoạt theo ID, Mã hoặc Tên vai trò trong CSDL
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

        if (role == null)
        {
            return Result.Failure<StaffDto>($"Không tìm thấy vai trò '{req.Role}' trong hệ thống.");
        }

        // Chặn tạo thêm nhân viên với vai trò Quản trị viên (ROLE_ADMIN)
        if (role.RoleId == 1 || (role.RoleName != null && role.RoleName.Contains("Admin", StringComparison.OrdinalIgnoreCase)) || roleInput.Equals("ROLE_ADMIN", StringComparison.OrdinalIgnoreCase) || roleInput.Equals("ADMIN", StringComparison.OrdinalIgnoreCase))
        {
            return Result.Failure<StaffDto>("Không thể tạo tài khoản nhân viên với vai trò Quản trị viên (ROLE_ADMIN). Vai trò này chỉ dành riêng cho tài khoản Admin ban đầu.");
        }

        // 3. Mật khẩu khởi tạo (ưu tiên mật khẩu người dùng nhập trong form, mặc định TinPhat@2026)
        var passwordToHash = !string.IsNullOrWhiteSpace(req.Password) ? req.Password.Trim() : "TinPhat@2026";
        var defaultPasswordHash = _passwordHasher.Hash(passwordToHash);

        var now = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified);

        var newUser = new SecUser
        {
            Username = username,
            FullName = req.Name.Trim(),
            Email = req.Email?.Trim() ?? "",
            Phone = req.Phone?.Trim() ?? "",
            Avatar = string.IsNullOrWhiteSpace(req.Avatar) ? null : req.Avatar.Trim(),
            PasswordHash = defaultPasswordHash,
            IsActive = req.Status?.ToUpper() != "LOCKED",
            CreatedAt = now,
            UpdatedAt = now
        };

        await _context.SecUsers.AddAsync(newUser, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        // 4. Gán vai trò (JncUserRole)
        var userRole = new JncUserRole
        {
            UserId = newUser.UserId,
            RoleId = role.RoleId,
            AssignedAt = now
        };
        await _context.JncUserRoles.AddAsync(userRole, cancellationToken);

        // 5. Gán phân quyền kho (JncUserWarehouseAccess)
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
                await _context.JncUserWarehouseAccesses.AddAsync(new JncUserWarehouseAccess
                {
                    UserId = newUser.UserId,
                    WarehouseId = wh.WarehouseId,
                    AssignedAt = now
                }, cancellationToken);
                assignedWarehouses.Add(wh.WarehouseCode!);
            }
        }

        await _context.SaveChangesAsync(cancellationToken);

        var finalRoleCode = PermissionConstants.ToRoleCode(role.RoleName ?? $"ROLE_{role.RoleId}");
        if (role.Description != null)
        {
            var match = System.Text.RegularExpressions.Regex.Match(role.Description, @"\[CODE:([^\]]+)\]");
            if (match.Success)
            {
                finalRoleCode = match.Groups[1].Value.Trim();
            }
        }
        var finalRoleTitle = PermissionConstants.ToRoleDisplayName(role.RoleName ?? "Nhân viên");

        var response = new StaffDto(
            Id: newUser.UserId.ToString(),
            Code: !string.IsNullOrWhiteSpace(req.Code) ? req.Code.Trim() : $"NV-NV{newUser.UserId:D3}",
            Name: newUser.FullName ?? "",
            Title: string.IsNullOrWhiteSpace(req.Title) ? finalRoleTitle : req.Title,
            Email: newUser.Email ?? "",
            Phone: newUser.Phone ?? "",
            Department: req.Department ?? "",
            Role: finalRoleCode,
            RoleTitle: finalRoleTitle,
            AssignedWarehouses: assignedWarehouses,
            Status: newUser.IsActive == false ? "LOCKED" : "ACTIVE",
            Avatar: newUser.Avatar,
            Username: newUser.Username
        );

        return Result.Success(response);
    }
}
