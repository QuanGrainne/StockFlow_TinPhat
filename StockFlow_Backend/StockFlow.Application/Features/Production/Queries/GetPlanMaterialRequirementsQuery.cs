using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Production.DTOs;
using StockFlow.Application.Features.Production.Helpers;

namespace StockFlow.Application.Features.Production.Queries;

/// <summary>
/// UC-PP-03 (kế hoạch đã lưu): nhu cầu NVL dự kiến theo tổng số kế hoạch và theo số còn lại chưa lập lệnh (luồng 2a),
/// so với tồn tại kho NVL đã chọn. Kho phải thuộc quyền người dùng. Không lưu kết quả.
/// </summary>
public record GetPlanMaterialRequirementsQuery(int ProductionPlanId, int? WarehouseId)
    : IRequest<Result<PlanMaterialRequirementsDto>>;

public class GetPlanMaterialRequirementsQueryHandler
    : IRequestHandler<GetPlanMaterialRequirementsQuery, Result<PlanMaterialRequirementsDto>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public GetPlanMaterialRequirementsQueryHandler(IStockFlowDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<PlanMaterialRequirementsDto>> Handle(GetPlanMaterialRequirementsQuery query, CancellationToken ct)
    {
        if (query.WarehouseId is int warehouseId && !await _currentUser.HasWarehouseAccessAsync(warehouseId, ct))
            return Result.Failure<PlanMaterialRequirementsDto>(ProductionMessages.NoWarehouseAccess);

        var exists = await _context.TrxProductionPlans.AnyAsync(p => p.ProductionPlanId == query.ProductionPlanId, ct);
        if (!exists) return Result.Failure<PlanMaterialRequirementsDto>(ProductionPlanMessages.PlanNotFound);

        var planItems = await _context.DtlProductionPlanItems.AsNoTracking()
            .Where(i => i.ProductionPlanId == query.ProductionPlanId)
            .Select(i => new { i.ProductId, i.PlannedQuantity })
            .ToListAsync(ct);
        var ordered = await ProductionPlanRules.OrderedQuantitiesAsync(_context, query.ProductionPlanId, null, ct);

        var lines = planItems
            .Select(i => (i.ProductId, i.PlannedQuantity, Math.Max(0, i.PlannedQuantity - ordered.GetValueOrDefault(i.ProductId))))
            .ToList();

        var result = await ProductionPlanReader.MaterialRequirementsAsync(_context, lines, query.WarehouseId, ct);
        return Result.Success(result);
    }
}
