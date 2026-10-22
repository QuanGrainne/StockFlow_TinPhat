using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;

namespace StockFlow.Application.Features.Admin.Commands;

public record ToggleStaffStatusCommand(int UserId) : IRequest<Result<bool>>;

public class ToggleStaffStatusCommandHandler : IRequestHandler<ToggleStaffStatusCommand, Result<bool>>
{
    private readonly IStockFlowDbContext _context;

    public ToggleStaffStatusCommandHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<bool>> Handle(ToggleStaffStatusCommand command, CancellationToken cancellationToken)
    {
        var user = await _context.SecUsers.FirstOrDefaultAsync(u => u.UserId == command.UserId, cancellationToken);
        if (user == null)
        {
            return Result.Failure<bool>("Không tìm thấy thông tin nhân viên.");
        }

        if (user.UserId == 1 || string.Equals(user.Username, "admin", StringComparison.OrdinalIgnoreCase))
        {
            return Result.Failure<bool>("Không thể khóa tài khoản Quản trị viên Hệ thống (Admin).");
        }

        user.IsActive = !(user.IsActive ?? true);
        user.UpdatedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified);

        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success(user.IsActive.Value);
    }
}
