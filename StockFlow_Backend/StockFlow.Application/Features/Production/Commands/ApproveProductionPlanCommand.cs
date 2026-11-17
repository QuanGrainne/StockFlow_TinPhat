using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Production.DTOs;
using StockFlow.Application.Features.Production.Helpers;

namespace StockFlow.Application.Features.Production.Commands;

/// <summary>
/// UC-PP-04 bước 4–5: người có quyền duyệt duyệt kế hoạch Chờ duyệt → Đã duyệt, ghi người duyệt và thời điểm.
/// Thiếu NVL chỉ cảnh báo, không chặn duyệt (BR-PP-15). Người lập được tự duyệt (Q2).
/// R-05 (Q-R2 chốt 15/11/2026: chặn): kiểm lại như lúc gửi duyệt — thành phẩm mất BOM đang áp dụng, ngừng hoạt động
/// hoặc không còn là thành phẩm / bán thành phẩm trong lúc chờ duyệt thì không cho duyệt, để kế hoạch đã duyệt luôn lập lệnh được.
/// </summary>
public record ApproveProductionPlanCommand(int ProductionPlanId) : IRequest<Result<ProductionPlanDetailDto>>;

public class ApproveProductionPlanCommandHandler : IRequestHandler<ApproveProductionPlanCommand, Result<ProductionPlanDetailDto>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IUserPermissionService _permissions;

    public ApproveProductionPlanCommandHandler(
        IStockFlowDbContext context, ICurrentUserService currentUser, IUserPermissionService permissions)
    {
        _context = context;
        _currentUser = currentUser;
        _permissions = permissions;
    }

    public async Task<Result<ProductionPlanDetailDto>> Handle(ApproveProductionPlanCommand command, CancellationToken ct)
    {
        if (_currentUser.UserId is not int userId)
            return Result.Failure<ProductionPlanDetailDto>("Không xác định được người dùng đăng nhập.");

        await using var tx = await _context.BeginTransactionAsync(ct);
        await _context.AcquireTransactionLockAsync(ProductionPlanRules.LockKey(command.ProductionPlanId), ct);

        var plan = await _context.TrxProductionPlans
            .Include(p => p.DtlProductionPlanItems)
            .FirstOrDefaultAsync(p => p.ProductionPlanId == command.ProductionPlanId, ct);
        if (plan == null) return Result.Failure<ProductionPlanDetailDto>(ProductionPlanMessages.PlanNotFound);

        var user = await ProductionPlanPermissions.LoadAsync(_permissions, userId, ct);
        var error = ProductionPlanPermissions.CheckApproveOrReject(plan, user);
        if (error != null) return Result.Failure<ProductionPlanDetailDto>(error);

        // R-05: chặn duyệt nếu thành phẩm / BOM đã thay đổi sau khi gửi duyệt
        var readyError = await ProductionPlanRules.ValidateReadyForApprovalAsync(
            _context, plan.DtlProductionPlanItems.Select(i => i.ProductId).ToList(), ct);
        if (readyError != null)
            return Result.Failure<ProductionPlanDetailDto>($"Không duyệt được kế hoạch. {readyError}");

        var now = VietnamTime.Now;
        plan.MarkApproved();
        plan.ApprovedBy = userId;
        plan.ApprovalDate = now;
        ProductionPlanRules.Touch(plan, userId, now);

        await _context.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        var detail = await ProductionPlanReader.DetailAsync(_context, _permissions, userId, plan.ProductionPlanId, ct);
        return Result.Success(detail!);
    }
}
