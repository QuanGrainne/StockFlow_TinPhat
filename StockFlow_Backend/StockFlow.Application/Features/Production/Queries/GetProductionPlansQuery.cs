using MediatR;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Production.DTOs;
using StockFlow.Application.Features.Production.Helpers;

namespace StockFlow.Application.Features.Production.Queries;

/// <summary>
/// UC-PP-01 bước 1–2: danh sách kế hoạch sản xuất, lọc trạng thái, kỳ (kế hoạch có kỳ giao với khoảng lọc),
/// tìm theo mã / tên. Không giới hạn theo kho (Q10).
/// </summary>
public record GetProductionPlansQuery(
    List<string>? Statuses,
    DateOnly? FromDate,
    DateOnly? ToDate,
    string? Search
) : IRequest<Result<List<ProductionPlanSummaryDto>>>;

public class GetProductionPlansQueryHandler : IRequestHandler<GetProductionPlansQuery, Result<List<ProductionPlanSummaryDto>>>
{
    private readonly IStockFlowDbContext _context;

    public GetProductionPlansQueryHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<List<ProductionPlanSummaryDto>>> Handle(GetProductionPlansQuery query, CancellationToken ct)
    {
        var q = _context.TrxProductionPlans.AsQueryable();

        if (query.Statuses is { Count: > 0 })
        {
            var statuses = query.Statuses.Select(s => s.Trim().ToUpperInvariant()).ToList();
            q = q.Where(p => statuses.Contains(p.Status));
        }
        if (query.FromDate.HasValue)
        {
            var from = query.FromDate.Value;
            q = q.Where(p => p.PeriodEnd >= from);
        }
        if (query.ToDate.HasValue)
        {
            var to = query.ToDate.Value;
            q = q.Where(p => p.PeriodStart <= to);
        }
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var s = query.Search.Trim().ToLower();
            q = q.Where(p => p.PlanCode.ToLower().Contains(s) || p.PlanName.ToLower().Contains(s));
        }

        var list = await ProductionPlanReader.SummariesAsync(
            q.OrderByDescending(p => p.PlanDate).ThenByDescending(p => p.ProductionPlanId), ct);
        return Result.Success(list);
    }
}
