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
) : IRequest<Result<TransferDetailDto>>, IRetryOnConcurrencyConflict;

public class ReceiveTransferCommandHandler : IRequestHandler<ReceiveTransferCommand, Result<TransferDetailDto>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public ReceiveTransferCommandHandler(IStockFlowDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
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

        // Cô lập dữ liệu kho (UC-33): xác nhận nhận hàng cho kho nhận này
        if (!await _currentUserService.HasWarehouseAccessAsync(transfer.DestWarehouseId, cancellationToken))
        {
            return Result.Failure<TransferDetailDto>("Bạn không có quyền xác nhận nhận hàng cho kho nhận này.");
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
        // Ghi chú nhận: lấy ghi chú gửi kèm lúc nhận, nếu không có thì dùng ghi chú nhận đã lưu trước (lúc đang chuyển)
        if (hasDiscrepancy && string.IsNullOrWhiteSpace(command.Request.Notes) && string.IsNullOrWhiteSpace(transfer.ReceiveNotes))
        {
            return Result.Failure<TransferDetailDto>("Phát hiện nhận thiếu hàng! Bắt buộc phải nhập ghi chú lý do thiếu hàng trước khi xác nhận Nhận hàng.");
        }

        var productIds = transfer.DtlStockTransferItems.Select(i => i.ProductId).Distinct().ToList();
        var products = await _context.MstProducts
            .Where(p => productIds.Contains(p.ProductId))
            .ToDictionaryAsync(p => p.ProductId, cancellationToken);

        var receivedDate = TransferHelper.GetVietnamTime(command.Request.ReceivedDate);

        // Kiểm tra logic thời gian nhận hàng > thời gian chuyển hàng
        if (transfer.TransferDate.HasValue && receivedDate <= transfer.TransferDate.Value)
        {
            return Result.Failure<TransferDetailDto>(
                $"Thời gian nhận hàng ({receivedDate:dd/MM/yyyy HH:mm}) phải lớn hơn thời gian chuyển hàng ({transfer.TransferDate.Value:dd/MM/yyyy HH:mm})."
            );
        }

        // 2. CHỈ cộng đúng SL_Nhận vào kho nhận, theo giá vốn lúc xuất → giá vốn kho nhận tính lại bình quân
        foreach (var item in transfer.DtlStockTransferItems)
        {
            var reqItem = command.Request.Items?.FirstOrDefault(ri =>
                (ri.TransferItemId.HasValue && ri.TransferItemId.Value == item.TransferItemId) ||
                ri.ProductId == item.ProductId);

            decimal actualReceived = reqItem != null ? Math.Max(0, reqItem.ReceivedQuantity) : (item.Quantity ?? 0);
            item.ReceivedQuantity = actualReceived;
            if (reqItem != null)
            {
                item.ReceiveNotes = string.IsNullOrWhiteSpace(reqItem.Notes) ? null : reqItem.Notes.Trim();
            }

            var product = products[item.ProductId];
            var unitCost = item.UnitCost
                ?? (await TransferStockOps.WarehouseStockAsync(_context, transfer.SourceWarehouseId, product, cancellationToken)).UnitCost;
            item.UnitCost = unitCost;

            await TransferStockOps.InboundAsync(
                _context, transfer.DestWarehouseId, product, actualReceived, unitCost,
                "TRANSFER_IN", transfer.StockTransferId, command.UserId, cancellationToken);
        }

        transfer.Status = "RECEIVED";
        transfer.ReceivedDate = receivedDate;
        // Ghi chú nhận lưu riêng (không nối vào ghi chú chuyển như trước)
        if (!string.IsNullOrWhiteSpace(command.Request.Notes))
        {
            transfer.ReceiveNotes = command.Request.Notes.Trim();
        }

        await _context.SaveChangesAsync(cancellationToken);

        return await new GetTransferByIdQueryHandler(_context).Handle(new GetTransferByIdQuery(transfer.StockTransferId), cancellationToken);
    }
}
