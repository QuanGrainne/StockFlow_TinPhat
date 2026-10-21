using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Roles.Common;
using StockFlow.Application.Features.Roles.DTOs;

namespace StockFlow.Application.Features.Roles.Commands;

public record UpdateRoleCommand(string RoleIdOrCode, UpdateRoleRequest Request) : IRequest<Result<RoleDto>>;

public class UpdateRoleCommandValidator : AbstractValidator<UpdateRoleCommand>
{
    public UpdateRoleCommandValidator()
    {
        RuleFor(x => x.Request.Name)
            .NotEmpty().WithMessage("Tên vai trò không được để trống.");
    }
}

public class UpdateRoleCommandHandler : IRequestHandler<UpdateRoleCommand, Result<RoleDto>>
{
    private readonly IStockFlowDbContext _context;

    public UpdateRoleCommandHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<RoleDto>> Handle(UpdateRoleCommand command, CancellationToken cancellationToken)
    {
        var key = command.RoleIdOrCode.Trim();
        int? parsedId = null;
        if (key.StartsWith("ROLE-", StringComparison.OrdinalIgnoreCase) && int.TryParse(key[5..], out var num))
        {
            parsedId = num;
        }
        else if (int.TryParse(key, out var directId))
        {
            parsedId = directId;
        }

        var roles = await _context.SecRoles
            .Include(r => r.JncUserRoles)
            .ToListAsync(cancellationToken);

        var role = roles.FirstOrDefault(r => 
            (parsedId.HasValue && r.RoleId == parsedId.Value) ||
            (r.RoleName != null && r.RoleName.Equals(key, StringComparison.OrdinalIgnoreCase)) ||
            PermissionConstants.ToRoleCode(r.RoleName ?? "").Equals(key, StringComparison.OrdinalIgnoreCase));

        if (role == null)
        {
            return Result.Failure<RoleDto>($"Không tìm thấy vai trò '{key}'.");
        }

        var isSystem = role.RoleId <= 5;
        var req = command.Request;

        // Chỉ cập nhật tên nếu không phải vai trò cốt lõi hoặc cập nhật phần hiển thị
        if (!isSystem && !string.IsNullOrWhiteSpace(req.Name))
        {
            role.RoleName = req.Name.Trim();
        }

        if (req.Description != null)
        {
            role.Description = req.Description.Trim();
        }

        await _context.SaveChangesAsync(cancellationToken);

        var response = new RoleDto(
            Id: $"ROLE-{role.RoleId:D2}",
            Name: isSystem ? PermissionConstants.ToRoleDisplayName(role.RoleName ?? "") : (role.RoleName ?? ""),
            Code: PermissionConstants.ToRoleCode(role.RoleName ?? $"ROLE_{role.RoleId}"),
            Rank: $"Rank #{role.RoleId}",
            IsSystem: isSystem,
            Description: role.Description ?? "",
            StaffCount: role.JncUserRoles.Count
        );

        return Result.Success(response);
    }
}
