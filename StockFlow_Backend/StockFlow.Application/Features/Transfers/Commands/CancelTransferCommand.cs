using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Transfers.Helpers;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Transfers.Commands;

public record CancelTransferCommand(int Id, string? Reason, int UserId) : IRequest<Result<bool>>;

public class CancelTransferCommandHandler : IRequestHandler<CancelTransferCommand, Result<bool>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public CancelTransferCommandHandler(IStockFlowDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
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

        // Cô lập dữ liệu kho (UC-33): hủy phiếu chuyển hàng của kho xuất này
        if (!await _currentUserService.HasWarehouseAccessAsync(transfer.SourceWarehouseId, cancellationToken))
        {
            return Result.Failure<bool>("Bạn không có quyền hủy phiếu chuyển hàng của kho xuất này.");
        }

        if (string.Equals(transfer.Status, "CANCELLED", StringComparison.OrdinalIgnoreCase))
        {
            return Result.Failure<bool>("Phiếu chuyển hàng này đã bị hủy trước đó.");
        }

        var isInTransit = string.Equals(transfer.Status, "IN_TRANSIT", StringComparison.OrdinalIgnoreCase);
        var isReceived = string.Equals(transfer.Status, "RECEIVED", StringComparison.OrdinalIgnoreCase);

        // Hủy phiếu đã nhận sẽ trừ lại tồn kho nhận → cần quyền trên cả kho nhận
        if (isReceived && !await _currentUserService.HasWarehouseAccessAsync(transfer.DestWarehouseId, cancellationToken))
        {
            return Result.Failure<bool>("Bạn không có quyền hủy phiếu đã nhận vì không quản lý kho nhận hàng.");
        }

        if (isInTransit || isReceived)
        {
            var productIds = transfer.DtlStockTransferItems.Select(i => i.ProductId).Distinct().ToList();
            var products = await _context.MstProducts
                .Where(p => productIds.Contains(p.ProductId))
                .ToDictionaryAsync(p => p.ProductId, cancellationToken);

            foreach (var item in transfer.DtlStockTransferItems)
            {
                var product = products[item.ProductId];
                var issuedQty = item.IssuedQuantity ?? item.Quantity ?? 0;
                var unitCost = item.UnitCost
                    ?? (await TransferStockOps.WarehouseStockAsync(_context, transfer.SourceWarehouseId, product, cancellationToken)).UnitCost;

                // Đã nhận: trừ lại đúng SL_Nhận khỏi kho nhận
                if (isReceived)
                {
                    var receivedQty = item.ReceivedQuantity ?? issuedQty;
                    await TransferStockOps.OutboundAsync(
                        _context, transfer.DestWarehouseId, product, receivedQty,
                        "TRANSFER_CANCEL_OUT", transfer.StockTransferId, command.UserId, cancellationToken);
                }

                // Hoàn trả toàn bộ SL_Chuyển về kho xuất theo giá vốn lúc xuất
                await TransferStockOps.InboundAsync(
                    _context, transfer.SourceWarehouseId, product, issuedQty, unitCost,
                    "TRANSFER_CANCEL_IN", transfer.StockTransferId, command.UserId, cancellationToken);
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
