using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Production.DTOs;
using StockFlow.Application.Features.Production.Helpers;

namespace StockFlow.Application.Features.Production.Queries;

/// <summary>
/// UC-49 bước 8 / A49.2: kiểm tra trước khi xác nhận nhập thành phẩm — số còn lại theo kế hoạch (BR-35)
/// và cảnh báo dùng NVL vượt số đã xuất (BR-37, MSG43). Không ghi dữ liệu.
/// </summary>
public record CheckFinishedGoodsReceiptQuery(
    int ProductionOrderId, decimal AcceptedQuantity, decimal DefectQuantity, int? ProductionOrderItemId = null)
    : IRequest<Result<FinishedGoodsCheckDto>>;

public class CheckFinishedGoodsReceiptQueryHandler : IRequestHandler<CheckFinishedGoodsReceiptQuery, Result<FinishedGoodsCheckDto>>
{
    private readonly IStockFlowDbContext _context;

    public CheckFinishedGoodsReceiptQueryHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<FinishedGoodsCheckDto>> Handle(CheckFinishedGoodsReceiptQuery query, CancellationToken ct)
    {
        var order = await _context.TrxProductionOrders.AsNoTracking()
            .Include(o => o.DtlProductionOrderItems)
            .FirstOrDefaultAsync(o => o.ProductionOrderId == query.ProductionOrderId, ct);
        if (order == null) return Result.Failure<FinishedGoodsCheckDto>(ProductionMessages.OrderNotFound);

        var targetItem = query.ProductionOrderItemId.HasValue
            ? order.DtlProductionOrderItems.FirstOrDefault(i => i.ProductionOrderItemId == query.ProductionOrderItemId.Value)
            : order.DtlProductionOrderItems.OrderBy(i => i.ProductionOrderItemId).FirstOrDefault();

        var planned = targetItem?.PlannedQuantity ?? order.PlannedQuantity ?? 0;
        var received = targetItem?.ActualQuantity ?? order.ActualQuantity ?? 0;
        var (accepted, defect) = await FinishedGoodsRules.ProducedSoFarAsync(
            _context, order.ProductionOrderId, ct, targetItem?.ProductionOrderItemId);
        var producedAfter = accepted + defect + Math.Max(0, query.AcceptedQuantity) + Math.Max(0, query.DefectQuantity);
        var warnings = await FinishedGoodsRules.MaterialWarningsAsync(
            _context, order, producedAfter, ct, targetItem?.ProductionOrderItemId, planned);

        return Result.Success(new FinishedGoodsCheckDto(planned, received, Math.Max(0, planned - received), warnings));
    }
}
