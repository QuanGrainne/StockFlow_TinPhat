using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Transfers.DTOs;
using StockFlow.Application.Features.Transfers.Queries;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Transfers.Commands;

public record UpdateTransferCommand(
    int Id,
    UpdateTransferRequest Request,
    int UserId
) : IRequest<Result<TransferDetailDto>>;

public class UpdateTransferCommandHandler : IRequestHandler<UpdateTransferCommand, Result<TransferDetailDto>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public UpdateTransferCommandHandler(IStockFlowDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<TransferDetailDto>> Handle(UpdateTransferCommand command, CancellationToken cancellationToken)
    {
        var req = command.Request;
        var transfer = await _context.TrxStockTransfers
            .Include(t => t.DtlStockTransferItems)
            .FirstOrDefaultAsync(t => t.StockTransferId == command.Id, cancellationToken);

        if (transfer == null)
        {
            return Result.Failure<TransferDetailDto>("Không tìm thấy phiếu chuyển hàng.");
        }

        // Cô lập dữ liệu kho (UC-33): sửa phiếu chuyển hàng của kho xuất này
        if (!await _currentUserService.HasWarehouseAccessAsync(transfer.SourceWarehouseId, cancellationToken))
        {
            return Result.Failure<TransferDetailDto>("Bạn không có quyền sửa phiếu chuyển hàng của kho xuất này.");
        }

        if (!string.Equals(transfer.Status, "DRAFT", StringComparison.OrdinalIgnoreCase))
        {
            return Result.Failure<TransferDetailDto>($"Chỉ có thể sửa phiếu ở trạng thái 'Phiếu tạm'. Trạng thái hiện tại: {transfer.Status}.");
        }

        if (req.DestWarehouseId == transfer.SourceWarehouseId)
        {
            return Result.Failure<TransferDetailDto>("Chi nhánh nhận hàng phải khác chi nhánh chuyển đi.");
        }

        if (req.Items == null || req.Items.Count == 0)
        {
            return Result.Failure<TransferDetailDto>("Vui lòng chọn ít nhất 1 mặt hàng cần chuyển.");
        }

        transfer.DestWarehouseId = req.DestWarehouseId;
        if (req.TransferDate.HasValue)
        {
            transfer.TransferDate = DateTime.SpecifyKind(req.TransferDate.Value, DateTimeKind.Unspecified);
        }
        transfer.Notes = req.Notes?.Trim();

        // Xóa các mặt hàng cũ và thêm lại
        _context.DtlStockTransferItems.RemoveRange(transfer.DtlStockTransferItems);

        foreach (var it in req.Items)
        {
            if (it.Quantity <= 0) continue;
            var item = new DtlStockTransferItem
            {
                StockTransferId = transfer.StockTransferId,
                ProductId = it.ProductId,
                Quantity = it.Quantity,
                IssuedQuantity = 0,
                ReceivedQuantity = null
            };
            await _context.DtlStockTransferItems.AddAsync(item, cancellationToken);
        }

        await _context.SaveChangesAsync(cancellationToken);

        return await new GetTransferByIdQueryHandler(_context).Handle(new GetTransferByIdQuery(transfer.StockTransferId), cancellationToken);
    }
}
