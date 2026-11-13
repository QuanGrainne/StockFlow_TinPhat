using MediatR;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Production.DTOs;
using StockFlow.Application.Features.Production.Helpers;

namespace StockFlow.Application.Features.Production.Queries;

/// <summary>
/// UC-59 / A58.1 bước 2–4: hiển thị BOM đang áp dụng và nhu cầu NVL dự kiến, tồn và thiếu hụt tại kho NVL đang chọn.
/// </summary>
public record GetRequirementPreviewQuery(int ProductId, decimal PlannedQuantity, int? WarehouseId)
    : IRequest<Result<RequirementPreviewDto>>;

public class GetRequirementPreviewQueryHandler : IRequestHandler<GetRequirementPreviewQuery, Result<RequirementPreviewDto>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public GetRequirementPreviewQueryHandler(IStockFlowDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<RequirementPreviewDto>> Handle(GetRequirementPreviewQuery query, CancellationToken ct)
    {
        // Tồn chỉ lấy ở kho được phân quyền (BR-04)
        int? warehouseId = query.WarehouseId.HasValue && await _currentUser.HasWarehouseAccessAsync(query.WarehouseId.Value, ct)
            ? query.WarehouseId
            : null;

        var preview = await ProductionReader.RequirementPreviewAsync(
            _context, query.ProductId, Math.Max(0, query.PlannedQuantity), warehouseId, ct);
        return preview == null
            ? Result.Failure<RequirementPreviewDto>(ProductionMessages.NoActiveBom)
            : Result.Success(preview);
    }
}
