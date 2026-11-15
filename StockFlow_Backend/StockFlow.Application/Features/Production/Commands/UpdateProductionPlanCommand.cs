using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Production.DTOs;
using StockFlow.Application.Features.Production.Helpers;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Production.Commands;

/// <summary>
/// UC-PP-02 luồng 2a / 2b: sửa kế hoạch.
/// - Nháp, Bị từ chối: sửa toàn bộ (BR-PP-12). Kế hoạch bị từ chối vẫn ở Bị từ chối tới khi gửi duyệt lại.
/// - Đã duyệt: chỉ người có quyền duyệt; không đổi tên, kỳ; số lượng không thấp hơn số đã lập lệnh;
///   không xóa dòng đã có lệnh; dòng thêm mới phải có BOM đang áp dụng (BR-PP-13, Q5: không duyệt lại).
/// Dòng được nhận diện theo thành phẩm (mỗi thành phẩm một dòng, BR-PP-06).
/// Chỉ người lập hoặc người có quyền duyệt sửa kế hoạch chưa duyệt (Q-V4); bản client đang xem đã cũ thì từ chối (Q-V5).
/// </summary>
public record UpdateProductionPlanCommand(int ProductionPlanId, SaveProductionPlanRequest Request)
    : IRequest<Result<ProductionPlanDetailDto>>;

public class UpdateProductionPlanCommandValidator : AbstractValidator<UpdateProductionPlanCommand>
{
    public UpdateProductionPlanCommandValidator()
    {
        RuleFor(x => x.Request).NotNull().WithMessage("Thiếu dữ liệu kế hoạch.")
            .SetValidator(new SaveProductionPlanRequestValidator());
    }
}

public class UpdateProductionPlanCommandHandler : IRequestHandler<UpdateProductionPlanCommand, Result<ProductionPlanDetailDto>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IUserPermissionService _permissions;

    public UpdateProductionPlanCommandHandler(
        IStockFlowDbContext context, ICurrentUserService currentUser, IUserPermissionService permissions)
    {
        _context = context;
        _currentUser = currentUser;
        _permissions = permissions;
    }

    public async Task<Result<ProductionPlanDetailDto>> Handle(UpdateProductionPlanCommand command, CancellationToken ct)
    {
        var req = command.Request;
        if (_currentUser.UserId is not int userId)
            return Result.Failure<ProductionPlanDetailDto>("Không xác định được người dùng đăng nhập.");

        await using var tx = await _context.BeginTransactionAsync(ct);
        await _context.AcquireTransactionLockAsync(ProductionPlanRules.LockKey(command.ProductionPlanId), ct);

        var plan = await _context.TrxProductionPlans
            .Include(p => p.DtlProductionPlanItems)
            .Include(p => p.UpdatedByNavigation)
            .FirstOrDefaultAsync(p => p.ProductionPlanId == command.ProductionPlanId, ct);
        if (plan == null) return Result.Failure<ProductionPlanDetailDto>(ProductionPlanMessages.PlanNotFound);

        // Q-V5: client đang sửa bản cũ (đã có người lưu sau khi client tải) → từ chối, không ghi đè
        if (req.ExpectedUpdatedAt is DateTime expected && !ProductionPlanRules.IsSameVersion(expected, plan.UpdatedAt))
            return Result.Failure<ProductionPlanDetailDto>(ProductionPlanRules.ConcurrencyConflict(
                ProductionHelper.UserName(plan.UpdatedByNavigation), plan.UpdatedAt));

        var user = await ProductionPlanPermissions.LoadAsync(_permissions, userId, ct);
        var permissionError = ProductionPlanPermissions.CheckEdit(plan, user);
        if (permissionError != null) return Result.Failure<ProductionPlanDetailDto>(permissionError);

        var refError = await ProductionPlanRules.ValidateReferencesAsync(_context, _currentUser, req.Items, ct);
        if (refError != null) return Result.Failure<ProductionPlanDetailDto>(refError);

        var limited = plan.CanEditLimited();
        var existingByProduct = plan.DtlProductionPlanItems.ToDictionary(i => i.ProductId);
        var requestedIds = req.Items.Select(i => i.ProductId).ToHashSet();

        if (limited)
        {
            if (!string.Equals(plan.PlanName, req.PlanName.Trim(), StringComparison.Ordinal)
                || plan.PeriodStart != req.PeriodStart!.Value || plan.PeriodEnd != req.PeriodEnd!.Value)
                return Result.Failure<ProductionPlanDetailDto>("Kế hoạch đã duyệt không được đổi tên hoặc kỳ kế hoạch.");

            var ordered = await ProductionPlanRules.OrderedQuantitiesAsync(_context, plan.ProductionPlanId, null, ct);
            var allIds = requestedIds.Concat(existingByProduct.Keys).Distinct().ToList();
            var codes = await _context.MstProducts.AsNoTracking()
                .Where(p => allIds.Contains(p.ProductId))
                .ToDictionaryAsync(p => p.ProductId, p => p.ProductCode ?? "", ct);

            foreach (var removed in existingByProduct.Values.Where(i => !requestedIds.Contains(i.ProductId)))
            {
                if (ordered.GetValueOrDefault(removed.ProductId) > 0)
                    return Result.Failure<ProductionPlanDetailDto>(
                        $"Không được xóa dòng đã có lệnh sản xuất ({codes.GetValueOrDefault(removed.ProductId)}).");
            }
            foreach (var item in req.Items)
            {
                var orderedQty = ordered.GetValueOrDefault(item.ProductId);
                if (item.PlannedQuantity < orderedQty)
                    return Result.Failure<ProductionPlanDetailDto>(
                        $"Số lượng kế hoạch của {codes.GetValueOrDefault(item.ProductId)} không được thấp hơn số đã lập lệnh ({orderedQty:0.##}).");
            }

            var newIds = requestedIds.Where(id => !existingByProduct.ContainsKey(id)).ToList();
            var withoutBom = await ProductionPlanRules.ProductsWithoutActiveBomAsync(_context, newIds, ct);
            if (withoutBom.Count > 0)
                return Result.Failure<ProductionPlanDetailDto>(
                    $"{ProductionMessages.NoActiveBom} ({string.Join(", ", withoutBom.Select(id => codes.GetValueOrDefault(id)))})");
        }
        else
        {
            plan.PlanName = req.PlanName.Trim();
            plan.PeriodStart = req.PeriodStart!.Value;
            plan.PeriodEnd = req.PeriodEnd!.Value;
        }
        plan.Notes = ProductionPlanRules.NormalizeText(req.Notes);
        ProductionPlanRules.Touch(plan, userId, VietnamTime.Now);

        // Đồng bộ dòng theo thành phẩm: sửa dòng có sẵn, thêm dòng mới, xóa dòng không còn trong request
        foreach (var removed in existingByProduct.Values.Where(i => !requestedIds.Contains(i.ProductId)).ToList())
        {
            _context.DtlProductionPlanItems.Remove(removed);
        }
        foreach (var item in req.Items)
        {
            if (!existingByProduct.TryGetValue(item.ProductId, out var line))
            {
                line = new DtlProductionPlanItem { ProductId = item.ProductId };
                plan.DtlProductionPlanItems.Add(line);
            }
            line.PlannedQuantity = item.PlannedQuantity;
            line.PlannedStartDate = item.PlannedStartDate!.Value;
            line.PlannedEndDate = item.PlannedEndDate!.Value;
            line.WarehouseId = item.WarehouseId;
            line.Notes = ProductionPlanRules.NormalizeText(item.Notes);
        }

        await _context.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        var detail = await ProductionPlanReader.DetailAsync(_context, _permissions, userId, plan.ProductionPlanId, ct);
        return Result.Success(detail!);
    }
}
