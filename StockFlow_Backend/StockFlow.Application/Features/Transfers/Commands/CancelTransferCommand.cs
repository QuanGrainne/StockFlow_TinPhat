using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Transfers.Commands;

public record CancelTransferCommand(int Id, string? Reason, int UserId) : IRequest<Result<bool>>;

public class CancelTransferCommandHandler : IRequestHandler<CancelTransferCommand, Result<bool>>
{
    private readonly IStockFlowDbContext _context;

    public CancelTransferCommandHandler(IStockFlowDbContext context)
    {
        _context = context;
    }

    public async Task<Result<bool>> Handle(CancelTransferCommand command, CancellationToken cancellationToken)
    {
        var transfer = await _context.TrxStockTransfers
            .Include(t => t.DtlStockTransferItems)
            .FirstOrDefaultAsync(t => t.StockTransferId == command.Id, cancellationToken);

        if (transfer == null)
        {
            return Result.Failure<bool>("Không tìm thấy phiếu chuyển hàng.");
        }

        if (string.Equals(transfer.Status, "CANCELLED", StringComparison.OrdinalIgnoreCase))
        {
            return Result.Failure<bool>("Phiếu chuyển hàng này đã bị hủy trước đó.");
        }

        var productIds = transfer.DtlStockTransferItems.Select(i => i.ProductId).Distinct().ToList();

        // TRƯỜNG HỢP 1: Hủy khi đang ở trạng thái "Đang chuyển" (IN_TRANSIT)
        // -> Hoàn trả SL_Chuyển vào tồn kho của Chi nhánh chuyển (Stock_Source += SL_Chuyển)
        if (string.Equals(transfer.Status, "IN_TRANSIT", StringComparison.OrdinalIgnoreCase))
        {
            var sourceBalances = await _context.TrxInventoryBalances
                .Where(b => b.WarehouseId == transfer.SourceWarehouseId && productIds.Contains(b.ProductId))
                .ToListAsync(cancellationToken);

            foreach (var item in transfer.DtlStockTransferItems)
            {
                var qty = item.Quantity ?? 0;
                var balance = sourceBalances.FirstOrDefault(b => b.ProductId == item.ProductId);
                if (balance != null)
                {
                    balance.Quantity = (balance.Quantity ?? 0) + qty;
                    balance.LastUpdated = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified);
                }
                else
                {
                    var newBalance = new TrxInventoryBalance
                    {
                        WarehouseId = transfer.SourceWarehouseId,
                        ProductId = item.ProductId,
                        Quantity = qty,
                        LastUpdated = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified)
                    };
                    await _context.TrxInventoryBalances.AddAsync(newBalance, cancellationToken);
                }

                // Ghi nhận hoàn xuất tại kho chuyển
                var trx = new TrxInventoryTransaction
                {
                    WarehouseId = transfer.SourceWarehouseId,
                    ProductId = item.ProductId,
                    TransactionType = "TRANSFER_CANCEL_IN",
                    Quantity = qty,
                    ReferenceType = "TRANSFER",
                    TransactionDate = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified),
                    CreatedBy = command.UserId,
                };
                await _context.TrxInventoryTransactions.AddAsync(trx, cancellationToken);
            }
        }
        // TRƯỜNG HỢP 2: Hủy khi phiếu đã ở trạng thái "Đã nhận" (RECEIVED)
        // -> Trừ ngược lại SL_Nhận khỏi tồn kho của Chi nhánh nhận (Stock_Dest -= SL_Nhận)
        // -> Cộng hoàn trả lại SL_Chuyển vào tồn kho của Chi nhánh chuyển (Stock_Source += SL_Chuyển)
        else if (string.Equals(transfer.Status, "RECEIVED", StringComparison.OrdinalIgnoreCase))
        {
            var allBalances = await _context.TrxInventoryBalances
                .Where(b => (b.WarehouseId == transfer.SourceWarehouseId || b.WarehouseId == transfer.DestWarehouseId)
                         && productIds.Contains(b.ProductId))
                .ToListAsync(cancellationToken);

            foreach (var item in transfer.DtlStockTransferItems)
            {
                var transferQty = item.Quantity ?? 0;
                var receivedQty = item.ReceivedQuantity ?? transferQty;

                // 1. Trừ ngược SL_Nhận khỏi kho nhận
                var destBalance = allBalances.FirstOrDefault(b => b.WarehouseId == transfer.DestWarehouseId && b.ProductId == item.ProductId);
                if (destBalance != null)
                {
                    destBalance.Quantity = Math.Max(0, (destBalance.Quantity ?? 0) - receivedQty);
                    destBalance.LastUpdated = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified);
                }

                var trxDest = new TrxInventoryTransaction
                {
                    WarehouseId = transfer.DestWarehouseId,
                    ProductId = item.ProductId,
                    TransactionType = "TRANSFER_CANCEL_OUT",
                    Quantity = -receivedQty,
                    ReferenceType = "TRANSFER",
                    TransactionDate = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified),
                    CreatedBy = command.UserId,
                };
                await _context.TrxInventoryTransactions.AddAsync(trxDest, cancellationToken);

                // 2. Cộng hoàn trả lại SL_Chuyển cho kho chuyển
                var sourceBalance = allBalances.FirstOrDefault(b => b.WarehouseId == transfer.SourceWarehouseId && b.ProductId == item.ProductId);
                if (sourceBalance != null)
                {
                    sourceBalance.Quantity = (sourceBalance.Quantity ?? 0) + transferQty;
                    sourceBalance.LastUpdated = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified);
                }
                else
                {
                    var newBalance = new TrxInventoryBalance
                    {
                        WarehouseId = transfer.SourceWarehouseId,
                        ProductId = item.ProductId,
                        Quantity = transferQty,
                        LastUpdated = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified)
                    };
                    await _context.TrxInventoryBalances.AddAsync(newBalance, cancellationToken);
                }

                var trxSource = new TrxInventoryTransaction
                {
                    WarehouseId = transfer.SourceWarehouseId,
                    ProductId = item.ProductId,
                    TransactionType = "TRANSFER_CANCEL_IN",
                    Quantity = transferQty,
                    ReferenceType = "TRANSFER",
                    TransactionDate = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified),
                    CreatedBy = command.UserId,
                };
                await _context.TrxInventoryTransactions.AddAsync(trxSource, cancellationToken);
            }
        }

        transfer.Status = "CANCELLED";
        if (!string.IsNullOrWhiteSpace(command.Reason))
        {
            transfer.Notes = string.IsNullOrWhiteSpace(transfer.Notes)
                ? $"[Lý do hủy]: {command.Reason.Trim()}"
                : $"{transfer.Notes} | [Lý do hủy]: {command.Reason.Trim()}";
        }

        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success(true);
    }
}
