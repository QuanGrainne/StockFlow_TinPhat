using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Production.DTOs;
using StockFlow.Application.Features.Production.Helpers;

namespace StockFlow.Application.Features.Production.Commands;

/// <summary>
/// UC-PP-06 luồng 1a–1c: đóng kế hoạch Đã duyệt → Đã đóng (Manager, đóng bằng tay — Q9).
/// Phần chưa lập lệnh bị bỏ; các lệnh đang mở vẫn chạy bình thường (BR-PP-23).
/// </summary>
public record CloseProductionPlanCommand(int ProductionPlanId) : IRequest<Result<ProductionPlanDetailDto>>;

public class CloseProductionPlanCommandHandler : IRequestHandler<CloseProductionPlanCommand, Result<ProductionPlanDetailDto>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IUserPermissionService _permissions;

    public CloseProductionPlanCommandHandler(
        IStockFlowDbContext context, ICurrentUserService currentUser, IUserPermissionService permissions)
    {
        _context = context;
        _currentUser = currentUser;
        _permissions = permissions;
    }

    public async Task<Result<ProductionPlanDetailDto>> Handle(CloseProductionPlanCommand command, CancellationToken ct)
    {
        if (_currentUser.UserId is not int userId)
            return Result.Failure<ProductionPlanDetailDto>("Không xác định được người dùng đăng nhập.");

        await using var tx = await _context.BeginTransactionAsync(ct);
        await _context.AcquireTransactionLockAsync(ProductionPlanRules.LockKey(command.ProductionPlanId), ct);

        var plan = await _context.TrxProductionPlans
            .FirstOrDefaultAsync(p => p.ProductionPlanId == command.ProductionPlanId, ct);
        if (plan == null) return Result.Failure<ProductionPlanDetailDto>(ProductionPlanMessages.PlanNotFound);

        var user = await ProductionPlanPermissions.LoadAsync(_permissions, userId, ct);
        var error = ProductionPlanPermissions.CheckClose(plan, user);
        if (error != null) return Result.Failure<ProductionPlanDetailDto>(error);

        plan.MarkClosed();
        ProductionPlanRules.Touch(plan, userId, VietnamTime.Now);

        await _context.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        var detail = await ProductionPlanReader.DetailAsync(_context, _permissions, userId, plan.ProductionPlanId, ct);
        return Result.Success(detail!);
    }
}
