using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Roles.Common;

namespace StockFlow.Application.Features.Roles.Commands;

public record DeleteRoleCommand(string RoleIdOrCode) : IRequest<Result<bool>>;

public class DeleteRoleCommandHandler : IRequestHandler<DeleteRoleCommand, Result<bool>>
{
    private readonly IStockFlowDbContext _context;

    public DeleteRoleCommandHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<bool>> Handle(DeleteRoleCommand command, CancellationToken cancellationToken)
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
            .Include(r => r.Permissions)
            .ToListAsync(cancellationToken);

        var role = roles.FirstOrDefault(r => 
            (parsedId.HasValue && r.RoleId == parsedId.Value) ||
            (r.RoleName != null && r.RoleName.Equals(key, StringComparison.OrdinalIgnoreCase)) ||
            PermissionConstants.ToRoleCode(r.RoleName ?? "").Equals(key, StringComparison.OrdinalIgnoreCase));

        if (role == null)
        {
            return Result.Failure<bool>($"Không tìm thấy vai trò '{key}'.");
        }

        if (role.RoleId <= 5)
        {
            return Result.Failure<bool>("Không thể xóa vai trò hệ thống mặc định (Quản trị viên, Quản lý, Bán hàng, Kho, Sản xuất).");
        }

        if (role.JncUserRoles.Any())
        {
            return Result.Failure<bool>($"Vai trò đang được phân công cho {role.JncUserRoles.Count} nhân sự. Vui lòng chuyển nhân sự sang vai trò khác trước khi xóa.");
        }

        // Xóa liên kết quyền nếu có
        role.Permissions.Clear();
        _context.SecRoles.Remove(role);

        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success(true);
    }
}
