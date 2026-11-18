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
/// UC-PP-02: lập kế hoạch sản xuất, lưu ở trạng thái Nháp. Không tạo lệnh, không đổi tồn kho (BR-PP-08).
/// Thành phẩm chưa có BOM đang áp dụng vẫn lưu nháp được (BR-PP-09); chi tiết trả về cờ HasActiveBom để cảnh báo.
/// </summary>
public record CreateProductionPlanCommand(SaveProductionPlanRequest Request) : IRequest<Result<ProductionPlanDetailDto>>;

public class CreateProductionPlanCommandValidator : AbstractValidator<CreateProductionPlanCommand>
{
    public CreateProductionPlanCommandValidator()
    {
        RuleFor(x => x.Request).NotNull().WithMessage("Thiếu dữ liệu kế hoạch.")
            .SetValidator(new SaveProductionPlanRequestValidator());
    }
}

public class CreateProductionPlanCommandHandler : IRequestHandler<CreateProductionPlanCommand, Result<ProductionPlanDetailDto>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IUserPermissionService _permissions;
    private readonly ITransactionCodeGenerator _codeGenerator;

    public CreateProductionPlanCommandHandler(
        IStockFlowDbContext context, ICurrentUserService currentUser, IUserPermissionService permissions,
        ITransactionCodeGenerator codeGenerator)
    {
        _context = context;
        _currentUser = currentUser;
        _permissions = permissions;
        _codeGenerator = codeGenerator;
    }

    public async Task<Result<ProductionPlanDetailDto>> Handle(CreateProductionPlanCommand command, CancellationToken ct)
    {
        var req = command.Request;
        if (_currentUser.UserId is not int userId)
            return Result.Failure<ProductionPlanDetailDto>("Không xác định được người dùng đăng nhập.");

        var refError = await ProductionPlanRules.ValidateReferencesAsync(_context, _currentUser, req.Items, ct);
        if (refError != null) return Result.Failure<ProductionPlanDetailDto>(refError);

        var warehouseError = await ProductionPlanRules.ValidateMaterialWarehouseAsync(_context, _currentUser, req.WarehouseId, userId, ct);
        if (warehouseError != null) return Result.Failure<ProductionPlanDetailDto>(warehouseError);

        await using var tx = await _context.BeginTransactionAsync(ct);

        var code = await ProductionHelper.NextCodeAsync(_context, _codeGenerator, "PRODUCTION_PLAN",
            (c, token) => _context.TrxProductionPlans.AnyAsync(p => p.PlanCode == c, token), ct);

        var now = VietnamTime.Now;
        // Ngày đã được validator bắt buộc (V-01) nên .Value an toàn
        var plan = new TrxProductionPlan
        {
            PlanCode = code,
            PlanName = req.PlanName.Trim(),
            PlanDate = now,
            PeriodStart = req.PeriodStart!.Value,
            PeriodEnd = req.PeriodEnd!.Value,
            Status = ProductionPlanStatus.Draft,
            CreatedBy = userId,
            Notes = ProductionPlanRules.NormalizeText(req.Notes),
            WarehouseId = req.WarehouseId,
        };
        ProductionPlanRules.Touch(plan, userId, now);
        foreach (var item in req.Items)
        {
            plan.DtlProductionPlanItems.Add(new DtlProductionPlanItem
            {
                ProductId = item.ProductId,
                PlannedQuantity = item.PlannedQuantity,
                PlannedStartDate = item.PlannedStartDate!.Value,
                PlannedEndDate = item.PlannedEndDate!.Value,
                WarehouseId = item.WarehouseId,
                Notes = ProductionPlanRules.NormalizeText(item.Notes),
            });
        }
        _context.TrxProductionPlans.Add(plan);

        await _context.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        var detail = await ProductionPlanReader.DetailAsync(_context, _permissions, userId, plan.ProductionPlanId, ct);
        return Result.Success(detail!);
    }
}
