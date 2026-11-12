using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.WarehousePermissions.DTOs;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.WarehousePermissions.Commands;

public record UpdateWarehouseCommand(int WarehouseId, UpdateWarehouseRequest Request) : IRequest<Result<WarehouseFacilityDto>>;

public class UpdateWarehouseCommandHandler : IRequestHandler<UpdateWarehouseCommand, Result<WarehouseFacilityDto>>
{
    private readonly IStockFlowDbContext _context;

    public UpdateWarehouseCommandHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<WarehouseFacilityDto>> Handle(UpdateWarehouseCommand command, CancellationToken cancellationToken)
    {
        var warehouse = await _context.MstWarehouses
            .Include(w => w.JncUserWarehouseAccesses)
            .FirstOrDefaultAsync(w => w.WarehouseId == command.WarehouseId, cancellationToken);

        if (warehouse == null)
        {
            return Result.Failure<WarehouseFacilityDto>("Không tìm thấy kho.");
        }

        var req = command.Request;
        if (string.IsNullOrWhiteSpace(req.WarehouseName))
        {
            return Result.Failure<WarehouseFacilityDto>("Tên kho không được để trống.");
        }

        warehouse.WarehouseName = req.WarehouseName.Trim();
        if (req.Address != null) warehouse.Address = req.Address.Trim();
        if (req.Description != null) warehouse.Description = req.Description.Trim();
        if (req.IsActive.HasValue) warehouse.IsActive = req.IsActive.Value;

        await _context.SaveChangesAsync(cancellationToken);

        var dto = new WarehouseFacilityDto(
            Id: warehouse.WarehouseCode ?? $"FAC-{warehouse.WarehouseId:D2}",
            WarehouseId: warehouse.WarehouseId,
            Code: warehouse.WarehouseCode ?? $"WH-{warehouse.WarehouseId:D2}",
            Name: warehouse.WarehouseName,
            Address: warehouse.Address ?? "Hà Nội, Việt Nam",
            StaffCount: warehouse.JncUserWarehouseAccesses.Count,
            Area: !string.IsNullOrWhiteSpace(warehouse.Description) ? warehouse.Description : "3,500 m²",
            Status: warehouse.IsActive != false ? "ACTIVE" : "INACTIVE",
            Description: warehouse.Description
        );

        return Result.Success(dto);
    }
}
