using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Production.DTOs;
using StockFlow.Application.Features.Production.Helpers;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Production.Commands;

/// <summary>
/// UC-PP-06: hủy kế hoạch, bắt buộc lý do.
/// - Nháp / Bị từ chối / Chờ duyệt: người lập hoặc người có quyền duyệt.
/// - Đã duyệt: người có quyền duyệt, và kế hoạch không còn lệnh nào chưa hủy (BR-PP-22).
/// Không đổi các lệnh đã lập (BR-PP-23); không xóa kế hoạch khỏi DB (BR-PP-24).
/// </summary>
public record CancelProductionPlanCommand(int ProductionPlanId, ProductionPlanReasonRequest Request)
    : IRequest<Result<ProductionPlanDetailDto>>;

public class CancelProductionPlanCommandHandler : IRequestHandler<CancelProductionPlanCommand, Result<ProductionPlanDetailDto>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IUserPermissionService _permissions;

    public CancelProductionPlanCommandHandler(
        IStockFlowDbContext context, ICurrentUserService currentUser, IUserPermissionService permissions)
    {
        _context = context;
        _currentUser = currentUser;
        _permissions = permissions;
    }

    public async Task<Result<ProductionPlanDetailDto>> Handle(CancelProductionPlanCommand command, CancellationToken ct)
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

        var hasActiveOrders = await _context.TrxProductionOrders.AnyAsync(
            o => o.ProductionPlanId == plan.ProductionPlanId && o.Status != ProductionOrderStatus.Cancelled, ct);

        var user = await ProductionPlanPermissions.LoadAsync(_permissions, userId, ct);
        var error = ProductionPlanPermissions.CheckCancel(plan, user, hasActiveOrders);
        if (error != null) return Result.Failure<ProductionPlanDetailDto>(error);

        var actor = await _context.SecUsers.AsNoTracking().FirstOrDefaultAsync(u => u.UserId == userId, ct);
        var now = VietnamTime.Now;
        plan.MarkCancelled();
        plan.Notes = ProductionPlanRules.AppendNote(
            plan.Notes, "Hủy", ProductionHelper.UserName(actor), now, command.Request!.Reason!);
        ProductionPlanRules.Touch(plan, userId, now);

        await _context.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        var detail = await ProductionPlanReader.DetailAsync(_context, _permissions, userId, plan.ProductionPlanId, ct);
        return Result.Success(detail!);
    }
}
