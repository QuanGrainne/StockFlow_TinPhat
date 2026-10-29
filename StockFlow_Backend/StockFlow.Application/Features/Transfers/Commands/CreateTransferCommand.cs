using System;
using System.Collections.Generic;
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

public record CreateTransferCommand(
    CreateTransferRequest Request,
    int UserId
) : IRequest<Result<TransferDetailDto>>;

public class CreateTransferCommandHandler : IRequestHandler<CreateTransferCommand, Result<TransferDetailDto>>
{
    private readonly IStockFlowDbContext _context;

    public CreateTransferCommandHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<TransferDetailDto>> Handle(CreateTransferCommand command, CancellationToken cancellationToken)
    {
        var req = command.Request;

        // 1. Validation kho chuyển và kho nhận
        if (req.SourceWarehouseId <= 0)
        {
            return Result.Failure<TransferDetailDto>("Vui lòng chọn chi nhánh kho chuyển đi.");
        }

        if (req.DestWarehouseId <= 0)
        {
            return Result.Failure<TransferDetailDto>("Vui lòng chọn chi nhánh kho nhận hàng.");
        }

        if (req.SourceWarehouseId == req.DestWarehouseId)
        {
            return Result.Failure<TransferDetailDto>("Chi nhánh nhận hàng phải khác chi nhánh chuyển đi.");
        }

        if (req.Items == null || req.Items.Count == 0)
        {
            return Result.Failure<TransferDetailDto>("Vui lòng chọn ít nhất 1 mặt hàng cần chuyển.");
        }

        foreach (var it in req.Items)
        {
            if (it.Quantity <= 0)
            {
                return Result.Failure<TransferDetailDto>("Số lượng chuyển của các mặt hàng phải lớn hơn 0.");
            }
        }

        // 2. Sinh mã phiếu chuyển
        string finalCode;
        if (string.IsNullOrWhiteSpace(req.TransferCode) || req.TransferCode.Trim().Equals("Mã phiếu tự động", StringComparison.OrdinalIgnoreCase))
        {
            finalCode = await TransferHelper.GenerateNextTransferCodeAsync(_context, cancellationToken);
        }
        else
        {
            finalCode = req.TransferCode.Trim().ToUpper();
            var exists = await _context.TrxStockTransfers
                .AnyAsync(t => t.TransferCode == finalCode, cancellationToken);
            if (exists)
            {
                return Result.Failure<TransferDetailDto>($"Mã phiếu chuyển '{finalCode}' đã tồn tại trong hệ thống.");
            }
        }

        var isComplete = string.Equals(req.Status, "IN_TRANSIT", StringComparison.OrdinalIgnoreCase) ||
                         string.Equals(req.Status, "COMPLETE", StringComparison.OrdinalIgnoreCase);

        var finalStatus = isComplete ? "IN_TRANSIT" : "DRAFT";
        var transferDate = TransferHelper.GetVietnamTime(req.TransferDate);

        // 3. Nếu là trạng thái Hoàn thành (IN_TRANSIT): Trừ tồn kho tại kho xuất và ghi nhận nhật ký xuất kho chuyển đi (TRANSFER_OUT)
        if (isComplete)
        {
            var productIds = req.Items.Select(i => i.ProductId).Distinct().ToList();
            var balances = await _context.TrxInventoryBalances
                .Where(b => b.WarehouseId == req.SourceWarehouseId && productIds.Contains(b.ProductId))
                .ToListAsync(cancellationToken);

            // Trừ tồn kho tại kho xuất và ghi nhận nhật ký xuất kho chuyển đi (TRANSFER_OUT)
            foreach (var item in req.Items)
            {
                var balance = balances.FirstOrDefault(b => b.ProductId == item.ProductId);
                if (balance != null)
                {
                    balance.Quantity = (balance.Quantity ?? 0) - item.Quantity;
                    balance.LastUpdated = transferDate;
                }
                else
                {
                    var newBalance = new TrxInventoryBalance
                    {
                        WarehouseId = req.SourceWarehouseId,
                        ProductId = item.ProductId,
                        Quantity = -item.Quantity,
                        LastUpdated = transferDate
                    };
                    await _context.TrxInventoryBalances.AddAsync(newBalance, cancellationToken);
                }

                // Ghi transaction lịch sử
                var trx = new TrxInventoryTransaction
                {
                    WarehouseId = req.SourceWarehouseId,
                    ProductId = item.ProductId,
                    TransactionType = "TRANSFER_OUT",
                    Quantity = -item.Quantity,
                    ReferenceType = "TRANSFER",
                    TransactionDate = transferDate,
                    CreatedBy = command.UserId,
                };
                await _context.TrxInventoryTransactions.AddAsync(trx, cancellationToken);
            }
        }

        // 4. Tạo bản ghi Header
        var transfer = new TrxStockTransfer
        {
            TransferCode = finalCode,
            SourceWarehouseId = req.SourceWarehouseId,
            DestWarehouseId = req.DestWarehouseId,
            CreatedBy = command.UserId,
            TransferDate = transferDate,
            Status = finalStatus,
            Notes = req.Notes?.Trim()
        };

        await _context.TrxStockTransfers.AddAsync(transfer, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        // 5. Tạo các dòng chi tiết
        foreach (var it in req.Items)
        {
            var detailItem = new DtlStockTransferItem
            {
                StockTransferId = transfer.StockTransferId,
                ProductId = it.ProductId,
                Quantity = it.Quantity,
                IssuedQuantity = isComplete ? it.Quantity : 0,
                ReceivedQuantity = null
            };
            await _context.DtlStockTransferItems.AddAsync(detailItem, cancellationToken);
        }

        await _context.SaveChangesAsync(cancellationToken);

        // 6. Trả về chi tiết phiếu vừa tạo
        return await new GetTransferByIdQueryHandler(_context).Handle(new GetTransferByIdQuery(transfer.StockTransferId), cancellationToken);
    }
}
