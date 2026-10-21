using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.WarehousePermissions.DTOs;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.WarehousePermissions.Commands;

public record CreateWarehouseCommand(CreateWarehouseRequest Request) : IRequest<Result<WarehouseFacilityDto>>;

public class CreateWarehouseCommandHandler : IRequestHandler<CreateWarehouseCommand, Result<WarehouseFacilityDto>>
{
    private readonly IStockFlowDbContext _context;

    public CreateWarehouseCommandHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<WarehouseFacilityDto>> Handle(CreateWarehouseCommand command, CancellationToken cancellationToken)
    {
        var req = command.Request;
        if (string.IsNullOrWhiteSpace(req.WarehouseCode))
        {
            return Result.Failure<WarehouseFacilityDto>("Mã kho không được để trống.");
        }

        if (string.IsNullOrWhiteSpace(req.WarehouseName))
        {
            return Result.Failure<WarehouseFacilityDto>("Tên kho không được để trống.");
        }

        var codeExists = await _context.MstWarehouses
            .AnyAsync(w => w.WarehouseCode == req.WarehouseCode.Trim().ToUpper(), cancellationToken);

        if (codeExists)
        {
            return Result.Failure<WarehouseFacilityDto>($"Mã kho '{req.WarehouseCode}' đã tồn tại trong hệ thống.");
        }

        var warehouse = new MstWarehouse
        {
            WarehouseCode = req.WarehouseCode.Trim().ToUpper(),
            WarehouseName = req.WarehouseName.Trim(),
            Address = req.Address?.Trim(),
            Description = req.Description?.Trim(),
            IsActive = req.IsActive ?? true
        };

        await _context.MstWarehouses.AddAsync(warehouse, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        var dto = new WarehouseFacilityDto(
            Id: warehouse.WarehouseCode,
            WarehouseId: warehouse.WarehouseId,
            Code: warehouse.WarehouseCode,
            Name: warehouse.WarehouseName,
            Address: warehouse.Address ?? "Hà Nội, Việt Nam",
            StaffCount: 0,
            Area: !string.IsNullOrWhiteSpace(warehouse.Description) ? warehouse.Description : "3,500 m²",
            Status: warehouse.IsActive != false ? "ACTIVE" : "INACTIVE",
            Description: warehouse.Description
        );

        return Result.Success(dto);
    }
}

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

public record ToggleWarehouseStatusCommand(int WarehouseId) : IRequest<Result<bool>>;

public class ToggleWarehouseStatusCommandHandler : IRequestHandler<ToggleWarehouseStatusCommand, Result<bool>>
{
    private readonly IStockFlowDbContext _context;

    public ToggleWarehouseStatusCommandHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<bool>> Handle(ToggleWarehouseStatusCommand command, CancellationToken cancellationToken)
    {
        var warehouse = await _context.MstWarehouses.FirstOrDefaultAsync(w => w.WarehouseId == command.WarehouseId, cancellationToken);
        if (warehouse == null)
        {
            return Result.Failure<bool>("Không tìm thấy kho.");
        }

        warehouse.IsActive = warehouse.IsActive != true;
        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success(warehouse.IsActive.Value);
    }
}

public record DeleteWarehouseCommand(int WarehouseId) : IRequest<Result<bool>>;

public class DeleteWarehouseCommandHandler : IRequestHandler<DeleteWarehouseCommand, Result<bool>>
{
    private readonly IStockFlowDbContext _context;

    public DeleteWarehouseCommandHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<bool>> Handle(DeleteWarehouseCommand command, CancellationToken cancellationToken)
    {
        var warehouse = await _context.MstWarehouses
            .Include(w => w.TrxInventoryBalances)
            .Include(w => w.JncUserWarehouseAccesses)
            .FirstOrDefaultAsync(w => w.WarehouseId == command.WarehouseId, cancellationToken);

        if (warehouse == null)
        {
            return Result.Failure<bool>("Không tìm thấy kho.");
        }

        var hasInventory = warehouse.TrxInventoryBalances.Any(b => (b.Quantity ?? 0) > 0);
        if (hasInventory)
        {
            // Soft-deactivate if warehouse has inventory stock
            warehouse.IsActive = false;
            await _context.SaveChangesAsync(cancellationToken);
            return Result.Success(true);
        }

        try
        {
            // Remove user accesses first
            _context.JncUserWarehouseAccesses.RemoveRange(warehouse.JncUserWarehouseAccesses);
            _context.MstWarehouses.Remove(warehouse);
            await _context.SaveChangesAsync(cancellationToken);
            return Result.Success(true);
        }
        catch
        {
            // Fallback soft deactivate on foreign key constraint
            warehouse.IsActive = false;
            await _context.SaveChangesAsync(cancellationToken);
            return Result.Success(true);
        }
    }
}

