using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Production.DTOs;
using StockFlow.Application.Features.Production.Helpers;

namespace StockFlow.Application.Features.Production.Commands;

/// <summary>
/// UC-PP-04 bước 1–2: gửi duyệt kế hoạch Nháp / Bị từ chối → Chờ duyệt.
/// Mọi thành phẩm phải có BOM đang áp dụng (BR-PP-09), còn hoạt động và đúng loại (V-08, Q-V2);
/// kỳ đã qua phải có ghi chú (Q-V1); chỉ người lập hoặc người duyệt gửi được (Q-V4). Không có chức năng rút lại (Q6).
/// </summary>
public record SubmitProductionPlanCommand(int ProductionPlanId) : IRequest<Result<ProductionPlanDetailDto>>;

public class SubmitProductionPlanCommandHandler : IRequestHandler<SubmitProductionPlanCommand, Result<ProductionPlanDetailDto>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IUserPermissionService _permissions;

    public SubmitProductionPlanCommandHandler(
        IStockFlowDbContext context, ICurrentUserService currentUser, IUserPermissionService permissions)
    {
        _context = context;
        _currentUser = currentUser;
        _permissions = permissions;
    }

    public async Task<Result<ProductionPlanDetailDto>> Handle(SubmitProductionPlanCommand command, CancellationToken ct)
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
        var error = ProductionPlanPermissions.CheckSubmit(plan, user);
        if (error != null) return Result.Failure<ProductionPlanDetailDto>(error);

        // V-08 / Q-V2 / BR-PP-09: có dòng, thành phẩm còn hoạt động, đúng loại, có BOM đang áp dụng
        // (thành phẩm / BOM có thể đã đổi sau khi lưu nháp)
        var readyError = await ProductionPlanRules.ValidateReadyForApprovalAsync(
            _context, plan.DtlProductionPlanItems.Select(i => i.ProductId).ToList(), ct);
        if (readyError != null) return Result.Failure<ProductionPlanDetailDto>(readyError);

        // Q-V1: nháp lập cho tương lai có thể đã thành quá khứ khi chờ gửi duyệt
        if (ProductionPlanRules.RequiresPastPeriodNote(plan.PeriodEnd, plan.Notes, ProductionPlanRules.Today()))
            return Result.Failure<ProductionPlanDetailDto>(ProductionPlanMessages.PastPeriodNoteRequired);

        plan.MarkPendingApproval();
        ProductionPlanRules.Touch(plan, userId, VietnamTime.Now);

        await _context.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        var detail = await ProductionPlanReader.DetailAsync(_context, _permissions, userId, plan.ProductionPlanId, ct);
        return Result.Success(detail!);
    }
}
