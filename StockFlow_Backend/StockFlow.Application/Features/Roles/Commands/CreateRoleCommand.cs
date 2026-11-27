using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Roles.Common;
using StockFlow.Application.Features.Roles.DTOs;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Roles.Commands;

public record CreateRoleCommand(CreateRoleRequest Request) : IRequest<Result<RoleDto>>;

public class CreateRoleCommandValidator : AbstractValidator<CreateRoleCommand>
{
    public CreateRoleCommandValidator()
    {
        RuleFor(x => x.Request.Name)
            .NotEmpty().WithMessage("Tên vai trò không được để trống.");

        RuleFor(x => x.Request.Code)
            .NotEmpty().WithMessage("Mã vai trò không được để trống.");
    }
}

public class CreateRoleCommandHandler : IRequestHandler<CreateRoleCommand, Result<RoleDto>>
{
    private readonly IStockFlowDbContext _context;

    public CreateRoleCommandHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<RoleDto>> Handle(CreateRoleCommand command, CancellationToken cancellationToken)
    {
        var req = command.Request;
        var roleCode = req.Code.Trim();
        var roleName = req.Name.Trim();

        // So cả tên lưu trong DB ("Manager"), tên hiển thị ("Quản lý") và mã vai trò ("ROLE_MANAGER",
        // vai trò tự tạo lưu mã ở "[CODE:…]" trong mô tả) để không tạo được vai trò trùng (DEF-E2E-04).
        var newCode = PermissionConstants.ToRoleCode(roleCode);
        var roles = await _context.SecRoles
            .AsNoTracking()
            .Where(r => r.RoleName != null)
            .Select(r => new { r.RoleName, r.Description })
            .ToListAsync(cancellationToken);

        var exists = roles.Any(r =>
        {
            var name = r.RoleName!.Trim();
            var codeMatch = System.Text.RegularExpressions.Regex.Match(r.Description ?? "", @"\[CODE:([^\]]+)\]");
            var existingCode = PermissionConstants.ToRoleCode(codeMatch.Success ? codeMatch.Groups[1].Value.Trim() : name);
            return name.Equals(roleName, StringComparison.OrdinalIgnoreCase)
                || PermissionConstants.ToRoleDisplayName(name).Equals(roleName, StringComparison.OrdinalIgnoreCase)
                || existingCode.Equals(newCode, StringComparison.OrdinalIgnoreCase)
                || PermissionConstants.ToRoleCode(name).Equals(newCode, StringComparison.OrdinalIgnoreCase);
        });

        if (exists)
        {
            return Result.Failure<RoleDto>($"Vai trò '{roleName}' hoặc mã '{roleCode}' đã tồn tại trong hệ thống.");
        }

        var rawDesc = string.IsNullOrWhiteSpace(req.Description) 
            ? "Vai trò phân quyền tùy biến mở rộng theo yêu cầu doanh nghiệp." 
            : req.Description.Trim();
        var fullDesc = $"[CODE:{roleCode}] {rawDesc}";

        var newRole = new SecRole
        {
            RoleName = roleName,
            Description = fullDesc.Length > 255 ? fullDesc[..255] : fullDesc
        };

        await _context.SecRoles.AddAsync(newRole, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        var totalRoles = await _context.SecRoles.CountAsync(cancellationToken);

        var response = new RoleDto(
            Id: $"ROLE-{newRole.RoleId:D2}",
            Name: newRole.RoleName,
            Code: PermissionConstants.ToRoleCode(roleCode),
            Rank: req.Rank ?? $"Rank #{totalRoles}",
            IsSystem: false,
            Description: newRole.Description,
            StaffCount: 0
        );

        return Result.Success(response);
    }
}
