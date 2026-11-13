using MediatR;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Production.DTOs;
using StockFlow.Application.Features.Production.Helpers;

namespace StockFlow.Application.Features.Production.Queries;

/// <summary>
/// UC-44 / UC-58: danh sách lệnh sản xuất (lọc trạng thái, ngày lập lệnh, tìm theo mã lệnh / thành phẩm / xưởng).
/// Không có dữ liệu giá (BR-39).
/// </summary>
public record GetProductionOrdersQuery(
    List<string>? Statuses,
    DateTime? FromDate,
    DateTime? ToDate,
    string? Search,
    /// <summary>Chỉ lệnh có phiếu nhập thành phẩm cần Manager xem xét (BR-37)</summary>
    bool NeedsReviewOnly
) : IRequest<Result<List<ProductionOrderSummaryDto>>>;

public class GetProductionOrdersQueryHandler : IRequestHandler<GetProductionOrdersQuery, Result<List<ProductionOrderSummaryDto>>>
{
    private readonly IStockFlowDbContext _context;

    public GetProductionOrdersQueryHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<List<ProductionOrderSummaryDto>>> Handle(GetProductionOrdersQuery query, CancellationToken ct)
    {
        var q = _context.TrxProductionOrders.AsQueryable();

        if (query.Statuses is { Count: > 0 })
        {
            var statuses = query.Statuses.Select(s => s.Trim().ToUpperInvariant()).ToList();
            q = q.Where(o => o.Status != null && statuses.Contains(o.Status));
        }
        if (query.FromDate.HasValue)
        {
            var from = query.FromDate.Value.Date;
            q = q.Where(o => o.StartDate >= from);
        }
        if (query.ToDate.HasValue)
        {
            var to = query.ToDate.Value.Date.AddDays(1);
            q = q.Where(o => o.StartDate < to);
        }
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var s = query.Search.Trim().ToLower();
            q = q.Where(o => (o.ProductionOrderCode != null && o.ProductionOrderCode.ToLower().Contains(s))
                             || (o.Product.ProductCode != null && o.Product.ProductCode.ToLower().Contains(s))
                             || (o.Product.ProductName != null && o.Product.ProductName.ToLower().Contains(s))
                             || (o.Workshop != null && o.Workshop.ToLower().Contains(s)));
        }
        if (query.NeedsReviewOnly)
        {
            q = q.Where(o => o.TrxFinishedGoodsReceipts.Any(f => f.NeedsReview));
        }

        var list = await ProductionReader.OrderSummariesAsync(
            q.OrderByDescending(o => o.StartDate).ThenByDescending(o => o.ProductionOrderId), ct);
        return Result.Success(list);
    }
}
