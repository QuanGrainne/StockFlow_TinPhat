using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Auth.DTOs;
using StockFlow.Application.Features.Roles.Common;

namespace StockFlow.Application.Features.Auth.Commands;

public record LoginCommand(string Username, string Password) : IRequest<Result<LoginResponse>>;

public class LoginCommandValidator : AbstractValidator<LoginCommand>
{
    public LoginCommandValidator()
    {
        RuleFor(x => x.Username)
            .NotEmpty().WithMessage("Tên đăng nhập không được để trống.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Mật khẩu không được để trống.");
    }
}

public class LoginCommandHandler : IRequestHandler<LoginCommand, Result<LoginResponse>>
{
    private readonly IStockFlowDbContext _context;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenGenerator _jwtTokenGenerator;
    private readonly IUserPermissionService _permissionService;

    public LoginCommandHandler(
        IStockFlowDbContext context,
        IPasswordHasher passwordHasher,
        IJwtTokenGenerator jwtTokenGenerator,
        IUserPermissionService permissionService)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _jwtTokenGenerator = jwtTokenGenerator;
        _permissionService = permissionService;
    }

    public async Task<Result<LoginResponse>> Handle(LoginCommand request, CancellationToken cancellationToken)
    {
        var input = request.Username.Trim();
        var user = await _context.SecUsers
            .Include(u => u.JncUserRoles)
                .ThenInclude(ur => ur.Role)
            .Include(u => u.JncUserWarehouseAccesses)
                .ThenInclude(wa => wa.Warehouse)
            .FirstOrDefaultAsync(u => 
                (u.Username != null && u.Username.ToLower() == input.ToLower()) || 
                (u.Email != null && u.Email.ToLower() == input.ToLower()), 
                cancellationToken);

        // Hỗ trợ đăng nhập bằng Mã nhân viên dạng NV-NV001 hoặc số ID
        if (user == null && input.StartsWith("NV-NV", StringComparison.OrdinalIgnoreCase))
        {
            var idPart = input.Substring(5).TrimStart('0');
            if (int.TryParse(idPart, out var parsedId))
            {
                user = await _context.SecUsers
                    .Include(u => u.JncUserRoles)
                        .ThenInclude(ur => ur.Role)
                    .Include(u => u.JncUserWarehouseAccesses)
                        .ThenInclude(wa => wa.Warehouse)
                    .FirstOrDefaultAsync(u => u.UserId == parsedId, cancellationToken);
            }
        }

        if (user == null || string.IsNullOrEmpty(user.PasswordHash) || !_passwordHasher.Verify(request.Password, user.PasswordHash))
        {
            return Result.Failure<LoginResponse>("Tên đăng nhập hoặc mật khẩu không chính xác.");
        }

        if (user.IsActive == false)
        {
            return Result.Failure<LoginResponse>("Tài khoản của bạn đã bị vô hiệu hóa.");
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

        var warehouseIds = warehouses.Select(w => w.WarehouseId);

        var token = _jwtTokenGenerator.GenerateToken(
            user.UserId,
            user.Username ?? "",
            user.FullName ?? "",
            roles,
            warehouseIds);

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

        var response = new LoginResponse(
            token,
            user.UserId,
            user.Username ?? "",
            user.FullName ?? "",
            user.Email ?? "",
            roles,
            warehouses,
            permissions,
            avatar,
            staffCode,
            roleTitle);

        return Result.Success(response);
    }
}
