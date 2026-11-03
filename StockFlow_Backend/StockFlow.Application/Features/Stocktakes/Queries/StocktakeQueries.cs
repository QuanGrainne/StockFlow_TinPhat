using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Stocktakes.DTOs;
using StockFlow.Application.Features.Stocktakes.Helpers;

namespace StockFlow.Application.Features.Stocktakes.Queries;

public record GetStocktakesQuery(
    List<int>? WarehouseIds,
    List<string>? Statuses,
    DateTime? FromDate,
    DateTime? ToDate,
    string? Search) : IRequest<Result<List<StocktakeListDto>>>;

public record GetStocktakeByIdQuery(int Id) : IRequest<Result<StocktakeDetailDto>>;

public class StocktakeQueryHandler :
    IRequestHandler<GetStocktakesQuery, Result<List<StocktakeListDto>>>,
    IRequestHandler<GetStocktakeByIdQuery, Result<StocktakeDetailDto>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public StocktakeQueryHandler(IStockFlowDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<List<StocktakeListDto>>> Handle(GetStocktakesQuery request, CancellationToken ct)
    {
        // Cô lập dữ liệu kho: chỉ thấy phiếu của các kho được phân quyền
        var authorized = await _currentUser.GetAuthorizedWarehouseIdsAsync(ct);
        var query = _context.TrxStocktakes
            .AsNoTracking()
            .Include(t => t.Warehouse)
            .Include(t => t.ConductedByNavigation)
            .Include(t => t.DtlStocktakeItems)
            .Where(t => authorized.Contains(t.WarehouseId));

        if (request.WarehouseIds is { Count: > 0 })
            query = query.Where(t => request.WarehouseIds.Contains(t.WarehouseId));
        if (request.Statuses is { Count: > 0 })
        {
            var statuses = request.Statuses.Select(s => s.Trim().ToUpperInvariant()).ToList();
            query = query.Where(t => t.Status != null && statuses.Contains(t.Status));
        }
        if (request.FromDate.HasValue)
            query = query.Where(t => t.StocktakeDate >= request.FromDate.Value.Date);
        if (request.ToDate.HasValue)
            query = query.Where(t => t.StocktakeDate < request.ToDate.Value.Date.AddDays(1));
        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var term = request.Search.Trim().ToLower();
            query = query.Where(t =>
                (t.StocktakeCode != null && t.StocktakeCode.ToLower().Contains(term)) ||
                (t.Notes != null && t.Notes.ToLower().Contains(term)));
        }

        var rows = await query
            .OrderByDescending(t => t.StocktakeDate)
            .ThenByDescending(t => t.StocktakeId)
            .ToListAsync(ct);
        var names = await StocktakeLogic.UserNamesAsync(_context, rows.Select(r => r.BalancedBy), ct);
        return Result.Success(rows.Select(r => StocktakeLogic.ToListDto(r, names)).ToList());
    }

    public async Task<Result<StocktakeDetailDto>> Handle(GetStocktakeByIdQuery request, CancellationToken ct)
    {
        var stocktake = await StocktakeLogic.LoadAsync(_context, request.Id, ct);
        if (stocktake == null)
            return Result.Failure<StocktakeDetailDto>($"Không tìm thấy phiếu kiểm kho #{request.Id}.");
        if (!await _currentUser.HasWarehouseAccessAsync(stocktake.WarehouseId, ct))
            return Result.Failure<StocktakeDetailDto>("Bạn không có quyền xem phiếu kiểm của kho này.");
        return Result.Success(await StocktakeLogic.ToDetailAsync(_context, stocktake, ct));
    }
}
