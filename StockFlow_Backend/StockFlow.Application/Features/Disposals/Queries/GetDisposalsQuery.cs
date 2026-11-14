using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Disposals.DTOs;
using StockFlow.Application.Features.Disposals.Helpers;

namespace StockFlow.Application.Features.Disposals.Queries;

/// <summary>
/// Danh sách phiếu xuất hủy, chỉ trong các kho người dùng được phân quyền.
/// WarehouseIds rỗng = mọi kho được phân quyền. FromDate/ToDate lọc theo ngày hủy (giờ Việt Nam, ToDate tính hết ngày).
/// </summary>
public record GetDisposalsQuery(List<int> WarehouseIds, List<string> Statuses, DateTime? FromDate, DateTime? ToDate)
    : IRequest<Result<List<DisposalSummaryDto>>>;

public class GetDisposalsQueryHandler : IRequestHandler<GetDisposalsQuery, Result<List<DisposalSummaryDto>>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public GetDisposalsQueryHandler(IStockFlowDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<List<DisposalSummaryDto>>> Handle(GetDisposalsQuery query, CancellationToken ct)
    {
        var authorized = await _currentUser.GetAuthorizedWarehouseIdsAsync(ct);
        var warehouseIds = query.WarehouseIds.Count > 0
            ? query.WarehouseIds.Where(authorized.Contains).ToList()
            : authorized.ToList();
        if (warehouseIds.Count == 0) return Result.Success(new List<DisposalSummaryDto>());

        var q = _context.TrxInventoryDisposals.AsNoTracking()
            .Include(d => d.Warehouse)
            .Include(d => d.ProcessedByNavigation)
            .Include(d => d.CreatedByNavigation)
            .Include(d => d.DtlInventoryDisposalItems)
            .Where(d => warehouseIds.Contains(d.WarehouseId));

        var statuses = query.Statuses.Where(s => !string.IsNullOrWhiteSpace(s)).Select(s => s.Trim().ToUpperInvariant()).ToList();
        if (statuses.Count > 0) q = q.Where(d => d.Status != null && statuses.Contains(d.Status));
        if (query.FromDate.HasValue)
        {
            var from = query.FromDate.Value.Date;
            q = q.Where(d => d.DisposalDate >= from);
        }
        if (query.ToDate.HasValue)
        {
            var toExclusive = query.ToDate.Value.Date.AddDays(1);
            q = q.Where(d => d.DisposalDate < toExclusive);
        }

        var list = await q.OrderByDescending(d => d.DisposalDate).ThenByDescending(d => d.DisposalId).ToListAsync(ct);
        var costs = await DisposalLogic.UnitCostsAsync(_context, list, ct);
        return Result.Success(list.Select(d => DisposalLogic.ToSummary(d, costs)).ToList());
    }
}
