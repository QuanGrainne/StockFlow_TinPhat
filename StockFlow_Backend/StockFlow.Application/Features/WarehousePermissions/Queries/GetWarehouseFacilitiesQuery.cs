using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.WarehousePermissions.DTOs;

namespace StockFlow.Application.Features.WarehousePermissions.Queries;

public record GetWarehouseFacilitiesQuery : IRequest<Result<List<WarehouseFacilityDto>>>;

public class GetWarehouseFacilitiesQueryHandler : IRequestHandler<GetWarehouseFacilitiesQuery, Result<List<WarehouseFacilityDto>>>
{
    private readonly IStockFlowDbContext _context;

    public GetWarehouseFacilitiesQueryHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<List<WarehouseFacilityDto>>> Handle(GetWarehouseFacilitiesQuery request, CancellationToken cancellationToken)
    {
        var warehouses = await _context.MstWarehouses
            .Include(w => w.JncUserWarehouseAccesses)
            .OrderBy(w => w.WarehouseId)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var result = warehouses.Select(w => new WarehouseFacilityDto(
            Id: w.WarehouseCode ?? $"FAC-{w.WarehouseId:D2}",
            WarehouseId: w.WarehouseId,
            Code: w.WarehouseCode ?? $"WH-{w.WarehouseId:D2}",
            Name: w.WarehouseName ?? $"Kho #{w.WarehouseId}",
            Address: w.Address ?? "Hà Nội, Việt Nam",
            StaffCount: w.JncUserWarehouseAccesses.Count,
            Area: !string.IsNullOrWhiteSpace(w.Description) && w.Description.Contains("m²") ? w.Description : "3,500 m²",
            Status: w.IsActive != false ? "ACTIVE" : "INACTIVE",
            Description: w.Description
        )).ToList();

        return Result.Success(result);
    }
}
