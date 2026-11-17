using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Production.DTOs;
using StockFlow.Application.Features.Production.Helpers;

namespace StockFlow.Application.Features.Production.Commands;

/// <summary>
/// UC-PP-04 luồng 4a: từ chối kế hoạch Chờ duyệt → Bị từ chối, bắt buộc lý do (BR-PP-17).
/// Lý do ghi vào cuối ghi chú kế hoạch vì chưa có cột riêng (file 07, G2).
/// </summary>
public record RejectProductionPlanCommand(int ProductionPlanId, ProductionPlanReasonRequest Request)
    : IRequest<Result<ProductionPlanDetailDto>>;

public class RejectProductionPlanCommandHandler : IRequestHandler<RejectProductionPlanCommand, Result<ProductionPlanDetailDto>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IUserPermissionService _permissions;

    public RejectProductionPlanCommandHandler(
        IStockFlowDbContext context, ICurrentUserService currentUser, IUserPermissionService permissions)
    {
        _context = context;
        _currentUser = currentUser;
        _permissions = permissions;
    }

    public async Task<Result<ProductionPlanDetailDto>> Handle(RejectProductionPlanCommand command, CancellationToken ct)
    {
        if (_currentUser.UserId is not int userId)
            return Result.Failure<ProductionPlanDetailDto>("Không xác định được người dùng đăng nhập.");

        var reasonError = ProductionPlanRules.ValidateReason(command.Request?.Reason);
        if (reasonError != null) return Result.Failure<ProductionPlanDetailDto>(reasonError);

        await using var tx = await _context.BeginTransactionAsync(ct);
        await _context.AcquireTransactionLockAsync(ProductionPlanRules.LockKey(command.ProductionPlanId), ct);

        var plan = await _context.TrxProductionPlans
            .FirstOrDefaultAsync(p => p.ProductionPlanId == command.ProductionPlanId, ct);
        if (plan == null) return Result.Failure<ProductionPlanDetailDto>(ProductionPlanMessages.PlanNotFound);

        var user = await ProductionPlanPermissions.LoadAsync(_permissions, userId, ct);
        var error = ProductionPlanPermissions.CheckApproveOrReject(plan, user);
        if (error != null) return Result.Failure<ProductionPlanDetailDto>(error);

        var actor = await _context.SecUsers.AsNoTracking().FirstOrDefaultAsync(u => u.UserId == userId, ct);
        var now = VietnamTime.Now;
        plan.MarkRejected();
        plan.Notes = ProductionPlanRules.AppendNote(
            plan.Notes, "Từ chối", ProductionHelper.UserName(actor), now, command.Request!.Reason!);
        ProductionPlanRules.Touch(plan, userId, now);

        await _context.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        var detail = await ProductionPlanReader.DetailAsync(_context, _permissions, userId, plan.ProductionPlanId, ct);
        return Result.Success(detail!);
    }
}
