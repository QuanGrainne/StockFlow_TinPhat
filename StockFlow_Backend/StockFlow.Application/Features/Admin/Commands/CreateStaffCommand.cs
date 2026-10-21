using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Admin.DTOs;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Admin.Commands;

public record CreateStaffCommand(CreateStaffRequest Request) : IRequest<Result<StaffDto>>;

public class CreateStaffCommandValidator : AbstractValidator<CreateStaffCommand>
{
    public CreateStaffCommandValidator()
    {
        RuleFor(x => x.Request.Name)
            .NotEmpty().WithMessage("Họ và tên nhân viên không được để trống.");

        RuleFor(x => x.Request.Email)
            .NotEmpty().WithMessage("Email không được để trống.")
            .EmailAddress().WithMessage("Email không đúng định dạng.");

        RuleFor(x => x.Request.Role)
            .NotEmpty().WithMessage("Vai trò không được để trống.");
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

        // 1. Tạo username từ Email (hoặc code)
        var username = req.Email.Split('@')[0].ToLower().Trim();
        if (await _context.SecUsers.AnyAsync(u => u.Username == username || u.Email == req.Email, cancellationToken))
        {
            // Nếu username trùng thì nối thêm đuôi ngẫu nhiên
            username = $"{username}_{Random.Shared.Next(100, 999)}";
        }

        // 2. Xác định vai trò
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

        if (role == null)
        {
            return Result.Failure<StaffDto>($"Không tìm thấy vai trò '{req.Role}' trong hệ thống.");
        }

        // 3. Mật khẩu mặc định: StockFlow@123
        var defaultPasswordHash = _passwordHasher.Hash("StockFlow@123");

        var now = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified);

        var newUser = new SecUser
        {
            Username = username,
            FullName = req.Name.Trim(),
            Email = req.Email.Trim(),
            Phone = req.Phone?.Trim() ?? "",
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
            var warehouses = await _context.MstWarehouses
                .Where(w => w.WarehouseCode != null && req.AssignedWarehouses.Contains(w.WarehouseCode))
                .ToListAsync(cancellationToken);

            foreach (var wh in warehouses)
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

        var roleTitleMap = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            { "Admin", "Quản trị viên" },
            { "Manager", "Quản lý" },
            { "SalesStaff", "Nhân viên bán hàng" },
            { "WarehouseStaff", "Nhân viên kho" },
            { "ProductionStaff", "Nhân viên sản xuất" }
        };

        var roleTitle = roleTitleMap.GetValueOrDefault(role.RoleName ?? "", "Nhân viên");

        var response = new StaffDto(
            Id: newUser.UserId.ToString(),
            Code: req.Code ?? $"NV-NV{newUser.UserId:D3}",
            Name: newUser.FullName ?? "",
            Title: req.Title ?? "Chuyên viên",
            Email: newUser.Email ?? "",
            Phone: newUser.Phone ?? "",
            Department: req.Department ?? "Quản trị hệ thống",
            Role: req.Role.ToUpper(),
            RoleTitle: roleTitle,
            AssignedWarehouses: assignedWarehouses,
            Status: newUser.IsActive == false ? "LOCKED" : "ACTIVE",
            Avatar: null
        );

        return Result.Success(response);
    }
}
