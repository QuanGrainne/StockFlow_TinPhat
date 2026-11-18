using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Production.DTOs;

namespace StockFlow.Application.Features.Production.Queries;

public record GetMrpRunsQuery(
    DateOnly? FromDate = null,
    DateOnly? ToDate = null,
    int? WarehouseId = null) : IRequest<Result<List<MrpRunListItemDto>>>;

public class GetMrpRunsQueryHandler : IRequestHandler<GetMrpRunsQuery, Result<List<MrpRunListItemDto>>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public GetMrpRunsQueryHandler(IStockFlowDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<List<MrpRunListItemDto>>> Handle(GetMrpRunsQuery request, CancellationToken ct)
    {
        var query = _context.TrxMrpRuns.AsNoTracking()
            .Include(r => r.RunByNavigation)
            .AsQueryable();

        if (request.FromDate.HasValue)
        {
            query = query.Where(r => r.PeriodStart >= request.FromDate.Value);
        }

        if (request.ToDate.HasValue)
        {
            query = query.Where(r => r.PeriodEnd <= request.ToDate.Value);
        }

        var runs = await query
            .OrderByDescending(r => r.RunAt)
            .ThenByDescending(r => r.MrpRunId)
            .Take(100)
            .ToListAsync(ct);

        // Đọc danh sách kho để hiển thị tên và kiểm tra quyền
        var allWarehouses = await _context.MstWarehouses.AsNoTracking()
            .ToDictionaryAsync(w => w.WarehouseId, w => w.WarehouseName, ct);

        var result = new List<MrpRunListItemDto>();

        foreach (var r in runs)
        {
            var whIds = r.WarehouseIds.Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(s => int.TryParse(s.Trim(), out var id) ? id : 0)
                .Where(id => id > 0)
                .ToList();

            if (request.WarehouseId.HasValue && !whIds.Contains(request.WarehouseId.Value))
            {
                continue;
            }

            // Chỉ trả về nếu người dùng có quyền với các kho trong lần chạy đó
            var hasAccess = true;
            foreach (var whId in whIds)
            {
                if (!await _currentUser.HasWarehouseAccessAsync(whId, ct))
                {
                    hasAccess = false;
                    break;
                }
            }
            if (!hasAccess) continue;

            var whNames = string.Join(", ", whIds.Select(id => allWarehouses.GetValueOrDefault(id, $"Kho #{id}")));

            result.Add(new MrpRunListItemDto(
                r.MrpRunId,
                r.RunCode,
                r.RunAt,
                r.RunByNavigation?.FullName ?? r.RunByNavigation?.Username ?? "N/A",
                r.PeriodStart,
                r.PeriodEnd,
                whNames,
                r.MaterialCount,
                r.ShortageCount,
                r.LateCount));
        }

        return Result.Success(result);
    }
}
