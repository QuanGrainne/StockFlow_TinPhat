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

public record CompleteTransferCommand(int Id, int UserId) : IRequest<Result<TransferDetailDto>>;

public class CompleteTransferCommandHandler : IRequestHandler<CompleteTransferCommand, Result<TransferDetailDto>>
{
    private readonly IStockFlowDbContext _context;

    public CompleteTransferCommandHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<TransferDetailDto>> Handle(CompleteTransferCommand command, CancellationToken cancellationToken)
    {
        var transfer = await _context.TrxStockTransfers
            .Include(t => t.DtlStockTransferItems)
            .FirstOrDefaultAsync(t => t.StockTransferId == command.Id, cancellationToken);

        if (transfer == null)
        {
            return Result.Failure<TransferDetailDto>("Không tìm thấy phiếu chuyển hàng.");
        }

        if (!string.Equals(transfer.Status, "DRAFT", StringComparison.OrdinalIgnoreCase))
        {
            return Result.Failure<TransferDetailDto>($"Chỉ phiếu ở trạng thái 'Phiếu tạm' mới có thể xuất chuyển đi. Trạng thái hiện tại: {transfer.Status}.");
        }

        if (transfer.DtlStockTransferItems.Count == 0)
        {
            return Result.Failure<TransferDetailDto>("Phiếu chuyển không có mặt hàng nào.");
        }

        var productIds = transfer.DtlStockTransferItems.Select(i => i.ProductId).Distinct().ToList();
        var balances = await _context.TrxInventoryBalances
            .Where(b => b.WarehouseId == transfer.SourceWarehouseId && productIds.Contains(b.ProductId))
            .ToListAsync(cancellationToken);

        var products = await _context.MstProducts
            .Where(p => productIds.Contains(p.ProductId))
            .ToDictionaryAsync(p => p.ProductId, cancellationToken);

        // Kiểm tra tồn kho
        foreach (var item in transfer.DtlStockTransferItems)
        {
            var qty = item.Quantity ?? 0;
            var balance = balances.FirstOrDefault(b => b.ProductId == item.ProductId);
            var currentStock = balance?.Quantity ?? 0;
            var prodName = products.TryGetValue(item.ProductId, out var prod) ? prod.ProductName : $"SP #{item.ProductId}";

            if (currentStock < qty)
            {
                return Result.Failure<TransferDetailDto>(
                    $"Mặt hàng '{prodName}' không đủ tồn kho để chuyển (Tồn hiện tại: {currentStock}, Cần chuyển: {qty}).");
            }
        }

        // Trừ tồn kho và ghi nhật ký
        foreach (var item in transfer.DtlStockTransferItems)
        {
            var qty = item.Quantity ?? 0;
            item.IssuedQuantity = qty;

            var balance = balances.FirstOrDefault(b => b.ProductId == item.ProductId);
            if (balance != null)
            {
                balance.Quantity = (balance.Quantity ?? 0) - qty;
                balance.LastUpdated = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified);
            }

            var trx = new TrxInventoryTransaction
            {
                WarehouseId = transfer.SourceWarehouseId,
                ProductId = item.ProductId,
                TransactionType = "TRANSFER_OUT",
                Quantity = -qty,
                ReferenceType = "TRANSFER",
                TransactionDate = TransferHelper.GetVietnamTime(),
                CreatedBy = command.UserId,
            };
            await _context.TrxInventoryTransactions.AddAsync(trx, cancellationToken);
        }

        transfer.Status = "IN_TRANSIT";
        if (!transfer.TransferDate.HasValue)
        {
            transfer.TransferDate = TransferHelper.GetVietnamTime();
        }

        await _context.SaveChangesAsync(cancellationToken);

        return await new GetTransferByIdQueryHandler(_context).Handle(new GetTransferByIdQuery(transfer.StockTransferId), cancellationToken);
    }
}
