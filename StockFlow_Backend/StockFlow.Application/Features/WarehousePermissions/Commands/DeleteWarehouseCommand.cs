using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.WarehousePermissions.DTOs;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.WarehousePermissions.Commands;

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

        // Kiểm tra nếu kho đang có nhân sự trực thuộc thì không cho xóa
        if (warehouse.JncUserWarehouseAccesses.Any())
        {
            return Result.Failure<bool>($"Không thể xóa cơ sở kho '{warehouse.WarehouseName}' vì đang có {warehouse.JncUserWarehouseAccesses.Count} nhân sự được phân quyền trực thuộc. Vui lòng gỡ hoặc chuyển hết nhân sự sang kho khác trước khi xóa.");
        }

        var hasInventory = warehouse.TrxInventoryBalances.Any(b => (b.Quantity ?? 0) > 0);
        if (hasInventory)
        {
            return Result.Failure<bool>($"Không thể xóa cơ sở kho '{warehouse.WarehouseName}' vì kho đang có hàng tồn kho. Vui lòng điều chuyển hoặc xuất toàn bộ tồn kho trước khi xóa.");
        }

        try
        {
            _context.MstWarehouses.Remove(warehouse);
            await _context.SaveChangesAsync(cancellationToken);
            return Result.Success(true);
        }
        catch (Exception ex)
        {
            return Result.Failure<bool>($"Không thể xóa kho do có dữ liệu liên kết trong hệ thống ({ex.Message}).");
        }
    }
}
