using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.WarehousePermissions.DTOs;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.WarehousePermissions.Commands;

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
