using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Transfers.DTOs;
using StockFlow.Application.Features.Transfers.Helpers;
using StockFlow.Application.Features.Transfers.Queries;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Transfers.Commands;

public record ReceiveTransferCommand(
    int Id,
    ReceiveTransferRequest Request,
    int UserId
) : IRequest<Result<TransferDetailDto>>;

public class ReceiveTransferCommandHandler : IRequestHandler<ReceiveTransferCommand, Result<TransferDetailDto>>
{
    private readonly IStockFlowDbContext _context;

    public ReceiveTransferCommandHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<TransferDetailDto>> Handle(ReceiveTransferCommand command, CancellationToken cancellationToken)
    {
        var transfer = await _context.TrxStockTransfers
            .Include(t => t.DtlStockTransferItems)
            .FirstOrDefaultAsync(t => t.StockTransferId == command.Id, cancellationToken);

        if (transfer == null)
        {
            return Result.Failure<TransferDetailDto>("Không tìm thấy phiếu chuyển hàng.");
        }

        if (!string.Equals(transfer.Status, "IN_TRANSIT", StringComparison.OrdinalIgnoreCase))
        {
            return Result.Failure<TransferDetailDto>($"Chỉ phiếu ở trạng thái 'Đang chuyển' mới có thể nhận hàng. Trạng thái hiện tại: {transfer.Status}.");
        }

        // 1. Kiểm tra chênh lệch số lượng (nhận thiếu)
        bool hasDiscrepancy = false;
        foreach (var item in transfer.DtlStockTransferItems)
        {
            var reqItem = command.Request.Items?.FirstOrDefault(ri =>
                (ri.TransferItemId.HasValue && ri.TransferItemId.Value == item.TransferItemId) ||
                ri.ProductId == item.ProductId);

            decimal actualReceived = reqItem != null ? Math.Max(0, reqItem.ReceivedQuantity) : (item.Quantity ?? 0);
            if (actualReceived < (item.Quantity ?? 0))
            {
                hasDiscrepancy = true;
            }
        }

        // Bắt buộc nhập ghi chú khi phát hiện nhận thiếu hàng
        if (hasDiscrepancy && string.IsNullOrWhiteSpace(command.Request.Notes))
        {
            return Result.Failure<TransferDetailDto>("Phát hiện nhận thiếu hàng! Bắt buộc phải nhập ghi chú lý do thiếu hàng trước khi xác nhận Nhận hàng.");
        }

        var productIds = transfer.DtlStockTransferItems.Select(i => i.ProductId).Distinct().ToList();
        var destBalances = await _context.TrxInventoryBalances
            .Where(b => b.WarehouseId == transfer.DestWarehouseId && productIds.Contains(b.ProductId))
            .ToListAsync(cancellationToken);

        var receivedDate = TransferHelper.GetVietnamTime(command.Request.ReceivedDate);

        // Kiểm tra logic thời gian nhận hàng > thời gian chuyển hàng
        if (transfer.TransferDate.HasValue && receivedDate <= transfer.TransferDate.Value)
        {
            return Result.Failure<TransferDetailDto>(
                $"Thời gian nhận hàng ({receivedDate:dd/MM/yyyy HH:mm}) phải lớn hơn thời gian chuyển hàng ({transfer.TransferDate.Value:dd/MM/yyyy HH:mm})."
            );
        }

        // 2. Duyệt các mặt hàng và CHỈ cộng đúng actualReceived (SL_Nhận) vào kho nhận
        foreach (var item in transfer.DtlStockTransferItems)
        {
            var reqItem = command.Request.Items?.FirstOrDefault(ri =>
                (ri.TransferItemId.HasValue && ri.TransferItemId.Value == item.TransferItemId) ||
                ri.ProductId == item.ProductId);

            decimal actualReceived = reqItem != null ? Math.Max(0, reqItem.ReceivedQuantity) : (item.Quantity ?? 0);
            item.ReceivedQuantity = actualReceived;

            // Cộng vào tồn kho tại chi nhánh nhận (CHỈ cộng SL_Nhận)
            if (actualReceived > 0)
            {
                var balance = destBalances.FirstOrDefault(b => b.ProductId == item.ProductId);
                if (balance != null)
                {
                    balance.Quantity = (balance.Quantity ?? 0) + actualReceived;
                    balance.LastUpdated = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified);
                }
                else
                {
                    var newBalance = new TrxInventoryBalance
                    {
                        WarehouseId = transfer.DestWarehouseId,
                        ProductId = item.ProductId,
                        Quantity = actualReceived,
                        LastUpdated = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified)
                    };
                    await _context.TrxInventoryBalances.AddAsync(newBalance, cancellationToken);
                }

                // Ghi nhận giao dịch nhập chuyển kho (TRANSFER_IN) đúng bằng SL_Nhận
                var trx = new TrxInventoryTransaction
                {
                    WarehouseId = transfer.DestWarehouseId,
                    ProductId = item.ProductId,
                    TransactionType = "TRANSFER_IN",
                    Quantity = actualReceived,
                    ReferenceType = "TRANSFER",
                    TransactionDate = receivedDate,
                    CreatedBy = command.UserId,
                };
                await _context.TrxInventoryTransactions.AddAsync(trx, cancellationToken);
            }
        }

        transfer.Status = "RECEIVED";
        transfer.ReceivedDate = receivedDate;
        if (!string.IsNullOrWhiteSpace(command.Request.Notes))
        {
            transfer.Notes = string.IsNullOrWhiteSpace(transfer.Notes)
                ? $"[Nhận hàng]: {command.Request.Notes.Trim()}"
                : $"{transfer.Notes} | [Nhận hàng]: {command.Request.Notes.Trim()}";
        }

        await _context.SaveChangesAsync(cancellationToken);

        return await new GetTransferByIdQueryHandler(_context).Handle(new GetTransferByIdQuery(transfer.StockTransferId), cancellationToken);
    }
}
