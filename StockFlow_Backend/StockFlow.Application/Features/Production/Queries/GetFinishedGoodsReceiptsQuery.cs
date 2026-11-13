using MediatR;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Production.DTOs;
using StockFlow.Application.Features.Production.Helpers;

namespace StockFlow.Application.Features.Production.Queries;

/// <summary>
/// UC-49 / UC-61: danh sách phiếu nhập thành phẩm của các kho được phân quyền (BR-04),
/// lọc kho, ngày nhập, phiếu cần Manager xem xét (BR-37), tìm theo mã phiếu / mã lệnh / thành phẩm / số lô.
/// </summary>
public record GetFinishedGoodsReceiptsQuery(
    List<int>? WarehouseIds,
    DateTime? FromDate,
    DateTime? ToDate,
    string? Search,
    bool NeedsReviewOnly
) : IRequest<Result<List<FinishedGoodsReceiptDto>>>;

public class GetFinishedGoodsReceiptsQueryHandler : IRequestHandler<GetFinishedGoodsReceiptsQuery, Result<List<FinishedGoodsReceiptDto>>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public GetFinishedGoodsReceiptsQueryHandler(IStockFlowDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<List<FinishedGoodsReceiptDto>>> Handle(GetFinishedGoodsReceiptsQuery query, CancellationToken ct)
    {
        var authorized = await _currentUser.GetAuthorizedWarehouseIdsAsync(ct);
        var warehouseIds = query.WarehouseIds is { Count: > 0 }
            ? authorized.Where(id => query.WarehouseIds.Contains(id)).ToList()
            : authorized.ToList();

        var q = _context.TrxFinishedGoodsReceipts.AsQueryable();
        if (query.FromDate.HasValue)
        {
            var from = query.FromDate.Value.Date;
            q = q.Where(f => f.ReceivedDate >= from);
        }
        if (query.ToDate.HasValue)
        {
            var to = query.ToDate.Value.Date.AddDays(1);
            q = q.Where(f => f.ReceivedDate < to);
        }
        if (query.NeedsReviewOnly) q = q.Where(f => f.NeedsReview);
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var s = query.Search.Trim().ToLower();
            q = q.Where(f => (f.FgrCode != null && f.FgrCode.ToLower().Contains(s))
                             || (f.ProductionOrder.ProductionOrderCode != null && f.ProductionOrder.ProductionOrderCode.ToLower().Contains(s))
                             || (f.Product.ProductName != null && f.Product.ProductName.ToLower().Contains(s))
                             || (f.Product.ProductCode != null && f.Product.ProductCode.ToLower().Contains(s))
                             || (f.Lot != null && f.Lot.LotNumber != null && f.Lot.LotNumber.ToLower().Contains(s)));
        }

        return Result.Success(await ProductionReader.ReceiptsAsync(q, warehouseIds, ct));
    }
}
