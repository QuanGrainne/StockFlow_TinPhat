using FluentValidation;
using MediatR;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Production.DTOs;
using StockFlow.Application.Features.Production.Helpers;
using StockFlow.Domain.Services;

namespace StockFlow.Application.Features.Production.Queries;

/// <summary>
/// UC-PP-03 (kế hoạch đang soạn, chưa lưu): nhu cầu NVL dự kiến cho danh sách thành phẩm / số lượng gửi lên.
/// Số còn lại bằng tổng số vì chưa có lệnh nào. Không lưu kết quả.
/// </summary>
public record PreviewPlanMaterialRequirementsQuery(PreviewPlanMaterialRequirementsRequest Request)
    : IRequest<Result<PlanMaterialRequirementsDto>>;

public class PreviewPlanMaterialRequirementsQueryValidator : AbstractValidator<PreviewPlanMaterialRequirementsQuery>
{
    public PreviewPlanMaterialRequirementsQueryValidator()
    {
        RuleFor(x => x.Request.Items)
            .Must(i => i is { Count: > 0 }).WithMessage("Vui lòng chọn ít nhất một thành phẩm.");
        RuleForEach(x => x.Request.Items).ChildRules(item =>
        {
            item.RuleFor(i => i.ProductId).GreaterThan(0).WithMessage("Vui lòng chọn thành phẩm.");
            item.RuleFor(i => i.PlannedQuantity)
                .Must(q => q > 0 && ProductionHelper.HasMaxScale(q, ProductionPolicy.QuantityScale))
                .WithMessage("Số lượng kế hoạch phải lớn hơn 0 và có tối đa 2 chữ số thập phân.");
        });
    }
}

public class PreviewPlanMaterialRequirementsQueryHandler
    : IRequestHandler<PreviewPlanMaterialRequirementsQuery, Result<PlanMaterialRequirementsDto>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public PreviewPlanMaterialRequirementsQueryHandler(IStockFlowDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<PlanMaterialRequirementsDto>> Handle(PreviewPlanMaterialRequirementsQuery query, CancellationToken ct)
    {
        var req = query.Request;
        if (req.WarehouseId is int warehouseId && !await _currentUser.HasWarehouseAccessAsync(warehouseId, ct))
            return Result.Failure<PlanMaterialRequirementsDto>(ProductionMessages.NoWarehouseAccess);

        // Cùng thành phẩm gửi nhiều dòng thì cộng dồn (form đang soạn có thể chưa gộp)
        var lines = req.Items
            .GroupBy(i => i.ProductId)
            .Select(g => (g.Key, g.Sum(i => i.PlannedQuantity), g.Sum(i => i.PlannedQuantity)))
            .ToList();

        var result = await ProductionPlanReader.MaterialRequirementsAsync(_context, lines, req.WarehouseId, ct);
        return Result.Success(result);
    }
}
