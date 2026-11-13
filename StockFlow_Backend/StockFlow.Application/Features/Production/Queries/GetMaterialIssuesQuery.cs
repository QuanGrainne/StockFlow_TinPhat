using MediatR;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Production.DTOs;
using StockFlow.Application.Features.Production.Helpers;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Production.Queries;

/// <summary>
/// UC-46 / UC-60: danh sách phiếu xuất NVL sản xuất của các kho được phân quyền (BR-04),
/// lọc kho, ngày xuất, loại phiếu (chính / bổ sung), tìm theo mã phiếu / mã lệnh / thành phẩm.
/// </summary>
public record GetMaterialIssuesQuery(
    List<int>? WarehouseIds,
    DateTime? FromDate,
    DateTime? ToDate,
    string? Search,
    bool? IsSupplementary
) : IRequest<Result<List<MaterialIssueDto>>>;

public class GetMaterialIssuesQueryHandler : IRequestHandler<GetMaterialIssuesQuery, Result<List<MaterialIssueDto>>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public GetMaterialIssuesQueryHandler(IStockFlowDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<List<MaterialIssueDto>>> Handle(GetMaterialIssuesQuery query, CancellationToken ct)
    {
        var authorized = await _currentUser.GetAuthorizedWarehouseIdsAsync(ct);
        var warehouseIds = query.WarehouseIds is { Count: > 0 }
            ? authorized.Where(id => query.WarehouseIds.Contains(id)).ToList()
            : authorized.ToList();

        var q = _context.TrxStockIssues.Where(i => i.IssueType == StockIssueType.Production);
        if (query.FromDate.HasValue)
        {
            var from = query.FromDate.Value.Date;
            q = q.Where(i => (i.ProcessedDate ?? i.RequestedDate) >= from);
        }
        if (query.ToDate.HasValue)
        {
            var to = query.ToDate.Value.Date.AddDays(1);
            q = q.Where(i => (i.ProcessedDate ?? i.RequestedDate) < to);
        }
        if (query.IsSupplementary.HasValue)
        {
            var supplementary = query.IsSupplementary.Value;
            q = q.Where(i => (i.IsSupplementary == true) == supplementary);
        }
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var s = query.Search.Trim().ToLower();
            q = q.Where(i => (i.IssueCode != null && i.IssueCode.ToLower().Contains(s))
                             || (i.ProductionOrder != null && i.ProductionOrder.ProductionOrderCode != null
                                 && i.ProductionOrder.ProductionOrderCode.ToLower().Contains(s))
                             || (i.ProductionOrder != null && i.ProductionOrder.Product.ProductName != null
                                 && i.ProductionOrder.Product.ProductName.ToLower().Contains(s)));
        }

        return Result.Success(await ProductionReader.IssuesAsync(q, warehouseIds, ct));
    }
}
