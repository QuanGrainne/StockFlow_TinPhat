using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;

namespace StockFlow.Application.Features.Admin.Commands;

public record ResetStaffPasswordCommand(int UserId, string? NewPassword = null) : IRequest<Result<string>>;

public class ResetStaffPasswordCommandHandler : IRequestHandler<ResetStaffPasswordCommand, Result<string>>
{
    private readonly IStockFlowDbContext _context;
    private readonly IPasswordHasher _passwordHasher;

    public ResetStaffPasswordCommandHandler(IStockFlowDbContext context, IPasswordHasher passwordHasher)
    {
        _context = context;
        _passwordHasher = passwordHasher;
    }

    public async Task<Result<string>> Handle(ResetStaffPasswordCommand command, CancellationToken cancellationToken)
    {
        var user = await _context.SecUsers.FirstOrDefaultAsync(u => u.UserId == command.UserId, cancellationToken);
        if (user == null)
        {
            return Result.Failure<string>("Không tìm thấy thông tin nhân viên.");
        }

        var newPassword = string.IsNullOrWhiteSpace(command.NewPassword) ? "TinPhat@2026" : command.NewPassword;
        user.PasswordHash = _passwordHasher.Hash(newPassword);
        user.UpdatedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified);

        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success(newPassword);
    }
}
