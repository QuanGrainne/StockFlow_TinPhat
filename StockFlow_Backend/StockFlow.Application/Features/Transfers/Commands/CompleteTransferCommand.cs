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

public record CompleteTransferCommand(int Id, int UserId) : IRequest<Result<TransferDetailDto>>, IRetryOnConcurrencyConflict;

public class CompleteTransferCommandHandler : IRequestHandler<CompleteTransferCommand, Result<TransferDetailDto>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public CompleteTransferCommandHandler(IStockFlowDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<TransferDetailDto>> Handle(CompleteTransferCommand command, CancellationToken cancellationToken)
    {
        await using var tx = await TransferHelper.BeginLockedAsync(_context, command.Id, cancellationToken);

        var transfer = await _context.TrxStockTransfers
            .Include(t => t.DtlStockTransferItems)
            .FirstOrDefaultAsync(t => t.StockTransferId == command.Id, cancellationToken);

        if (transfer == null)
        {
            return Result.Failure<TransferDetailDto>("Không tìm thấy phiếu chuyển hàng.");
        }

        // Cô lập dữ liệu kho (UC-33): xuất hàng chuyển kho từ kho này
        if (!await _currentUserService.HasWarehouseAccessAsync(transfer.SourceWarehouseId, cancellationToken))
        {
            return Result.Failure<TransferDetailDto>("Bạn không có quyền xuất hàng chuyển kho từ kho này.");
        }

        if (!transfer.CanIssue())
        {
            return Result.Failure<TransferDetailDto>($"Chỉ phiếu ở trạng thái 'Phiếu tạm' mới có thể xuất chuyển đi. Trạng thái hiện tại: {transfer.Status}.");
        }

        if (transfer.DtlStockTransferItems.Count == 0)
        {
            return Result.Failure<TransferDetailDto>("Phiếu chuyển không có mặt hàng nào.");
        }

        var productIds = transfer.DtlStockTransferItems.Select(i => i.ProductId).Distinct().ToList();
        var products = await _context.MstProducts
            .Where(p => productIds.Contains(p.ProductId))
            .ToDictionaryAsync(p => p.ProductId, cancellationToken);

        // Cho phép xuất chuyển khi tồn kho không đủ (tồn kho xuất có thể âm), giống chính sách nhập / trả hàng.
        // Màn hình tạo phiếu đã cảnh báo và yêu cầu xác nhận khi SL chuyển vượt tồn.
        var missing = productIds.Where(id => !products.ContainsKey(id)).ToList();
        if (missing.Count > 0)
        {
            return Result.Failure<TransferDetailDto>($"Không tìm thấy hàng hóa #{string.Join(", #", missing)}.");
        }

        // Cài đặt "Cho phép chuyển hàng khi âm kho" (mặc định bật): bật thì cho xuất dù tồn kho xuất không đủ (kho xuất âm),
        // màn hình tạo phiếu cảnh báo và hỏi xác nhận; tắt thì chặn khi SL chuyển vượt tồn kho xuất.
        var settings = await _context.MstOrderSettings.AsNoTracking().FirstOrDefaultAsync(s => s.SettingId == 1, cancellationToken)
            ?? new MstOrderSetting();
        if (!settings.AllowNegativeStockTransfer)
        {
            foreach (var g in transfer.DtlStockTransferItems.GroupBy(i => i.ProductId))
            {
                var requested = g.Sum(i => i.Quantity ?? 0);
                var (stock, _) = await TransferStockOps.WarehouseStockAsync(_context, transfer.SourceWarehouseId, products[g.Key], cancellationToken);
                if (stock < requested)
                {
                    var p = products[g.Key];
                    return Result.Failure<TransferDetailDto>(
                        $"Hàng {p.ProductCode} - {p.ProductName} chỉ còn tồn {stock:0.##} tại kho xuất, không đủ chuyển {requested:0.##}. Cài đặt hiện không cho chuyển hàng khi âm kho.");
                }
            }
        }

        // Trừ tồn kho xuất theo giá vốn hiện tại của kho, lưu giá vốn để nhập vào kho nhận / hoàn khi hủy
        foreach (var item in transfer.DtlStockTransferItems)
        {
            var qty = item.Quantity ?? 0;
            item.IssuedQuantity = qty;
            item.UnitCost = await TransferStockOps.OutboundAsync(
                _context, transfer.SourceWarehouseId, products[item.ProductId], qty,
                "TRANSFER_OUT", transfer.StockTransferId, command.UserId, cancellationToken);
        }

        transfer.MarkInTransit();
        if (!transfer.TransferDate.HasValue)
        {
            transfer.TransferDate = TransferHelper.GetVietnamTime();
        }

        await _context.SaveChangesAsync(cancellationToken);
        if (tx != null) await tx.CommitAsync(cancellationToken);

        return await new GetTransferByIdQueryHandler(_context).Handle(new GetTransferByIdQuery(transfer.StockTransferId), cancellationToken);
    }
}
