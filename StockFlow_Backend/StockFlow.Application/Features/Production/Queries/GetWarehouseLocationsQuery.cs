using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Production.DTOs;
using StockFlow.Application.Features.Production.Helpers;

namespace StockFlow.Application.Features.Production.Queries;

/// <summary>UC-49 bước 3: vị trí lưu kho đang hoạt động của kho thành phẩm (chỉ kho được phân quyền, BR-04).</summary>
public record GetWarehouseLocationsQuery(int WarehouseId) : IRequest<Result<List<WarehouseLocationDto>>>;

public class GetWarehouseLocationsQueryHandler : IRequestHandler<GetWarehouseLocationsQuery, Result<List<WarehouseLocationDto>>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public GetWarehouseLocationsQueryHandler(IStockFlowDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<List<WarehouseLocationDto>>> Handle(GetWarehouseLocationsQuery query, CancellationToken ct)
    {
        if (!await _currentUser.HasWarehouseAccessAsync(query.WarehouseId, ct))
            return Result.Failure<List<WarehouseLocationDto>>(ProductionMessages.NoWarehouseAccess);

        var list = await _context.MstWarehouseLocations.AsNoTracking()
            .Where(l => l.WarehouseId == query.WarehouseId && l.IsActive != false)
            .OrderBy(l => l.LocationCode)
            .Select(l => new WarehouseLocationDto(l.LocationId, l.LocationCode, l.LocationName))
            .ToListAsync(ct);
        return Result.Success(list);
    }
}
