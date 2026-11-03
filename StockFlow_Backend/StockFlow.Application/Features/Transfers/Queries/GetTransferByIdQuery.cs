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

namespace StockFlow.Application.Features.Transfers.Queries;

public record GetTransferByIdQuery(int Id) : IRequest<Result<TransferDetailDto>>;

public class GetTransferByIdQueryHandler : IRequestHandler<GetTransferByIdQuery, Result<TransferDetailDto>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService? _currentUserService;

    public GetTransferByIdQueryHandler(IStockFlowDbContext context, ICurrentUserService? currentUserService = null)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<TransferDetailDto>> Handle(GetTransferByIdQuery request, CancellationToken cancellationToken)
    {
        var t = await _context.TrxStockTransfers
            .Include(x => x.SourceWarehouse)
            .Include(x => x.DestWarehouse)
            .Include(x => x.CreatedByNavigation)
            .Include(x => x.DtlStockTransferItems)
                .ThenInclude(i => i.Product)
                    .ThenInclude(p => p.BaseUnit)
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.StockTransferId == request.Id, cancellationToken);

        if (t == null)
        {
            return Result.Failure<TransferDetailDto>($"Không tìm thấy phiếu chuyển hàng #{request.Id}.");
        }

        // Cô lập dữ liệu kho: chỉ xem phiếu có kho xuất hoặc kho nhận thuộc phạm vi được phân quyền.
        // (_currentUserService = null khi các command nội bộ gọi lại handler này sau khi đã tự kiểm tra quyền.)
        if (_currentUserService != null &&
            !await _currentUserService.HasWarehouseAccessAsync(t.SourceWarehouseId, cancellationToken) &&
            !await _currentUserService.HasWarehouseAccessAsync(t.DestWarehouseId, cancellationToken))
        {
            return Result.Failure<TransferDetailDto>("Bạn không có quyền xem phiếu chuyển hàng này.");
        }

        var productIds = t.DtlStockTransferItems.Select(i => i.ProductId).Distinct().ToList();

        // Lấy tồn kho hiện tại ở 2 đầu kho
        var stockBalances = await _context.TrxInventoryBalances
            .Where(b => (b.WarehouseId == t.SourceWarehouseId || b.WarehouseId == t.DestWarehouseId)
                     && productIds.Contains(b.ProductId))
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        decimal totalQty = 0;
        decimal totalReceived = 0;
        decimal totalAmount = 0;
        var itemDtos = new List<TransferItemDetailDto>();

        foreach (var item in t.DtlStockTransferItems)
        {
            var p = item.Product;
            var qty = item.Quantity ?? 0;
            var rec = item.ReceivedQuantity;
            // Giá chuyển = giá vốn kho xuất lúc xuất (đã lưu); phiếu tạm thì lấy giá vốn hiện tại của kho xuất
            var price = item.UnitCost
                ?? (p != null
                    ? TransferStockOps.CostOf(stockBalances.Where(b => b.WarehouseId == t.SourceWarehouseId && b.ProductId == item.ProductId), p)
                    : 0);
            var lineTotal = qty * price;

            totalQty += qty;
            if (rec.HasValue) totalReceived += rec.Value;
            totalAmount += lineTotal;

            var sourceStock = stockBalances
                .Where(b => b.WarehouseId == t.SourceWarehouseId && b.ProductId == item.ProductId)
                .Sum(b => b.Quantity ?? 0);

            var destStock = stockBalances
                .Where(b => b.WarehouseId == t.DestWarehouseId && b.ProductId == item.ProductId)
                .Sum(b => b.Quantity ?? 0);

            itemDtos.Add(new TransferItemDetailDto(
                TransferItemId: item.TransferItemId,
                ProductId: item.ProductId,
                ProductCode: p?.ProductCode ?? $"SP-{item.ProductId}",
                ProductName: p?.ProductName ?? "Sản phẩm",
                UnitName: p?.BaseUnit?.UnitName ?? "Cái",
                SourceStock: sourceStock,
                DestStock: destStock,
                TransferQuantity: qty,
                ReceivedQuantity: rec,
                TransferPrice: price,
                LineTotal: lineTotal,
                Notes: item.Notes,
                ReceiveNotes: item.ReceiveNotes
            ));
        }

        // Người nhận = người ghi thẻ kho nhập chuyển (TRANSFER_IN) của phiếu này
        string? receivedByName = null;
        if (t.ReceivedDate.HasValue)
        {
            receivedByName = await _context.TrxInventoryTransactions
                .AsNoTracking()
                .Where(x => x.ReferenceType == "TRANSFER" && x.ReferenceId == t.StockTransferId && x.TransactionType == "TRANSFER_IN")
                .OrderBy(x => x.TransactionId)
                .Select(x => x.CreatedByNavigation.FullName ?? x.CreatedByNavigation.Username)
                .FirstOrDefaultAsync(cancellationToken);
        }

        var detail = new TransferDetailDto(
            StockTransferId: t.StockTransferId,
            TransferCode: t.TransferCode ?? $"CK{t.StockTransferId:D6}",
            TransferDate: t.TransferDate,
            ReceivedDate: t.ReceivedDate,
            SourceWarehouseId: t.SourceWarehouseId,
            SourceWarehouseCode: t.SourceWarehouse?.WarehouseCode ?? $"K00{t.SourceWarehouseId}",
            SourceWarehouseName: t.SourceWarehouse?.WarehouseName ?? $"Kho #{t.SourceWarehouseId}",
            DestWarehouseId: t.DestWarehouseId,
            DestWarehouseCode: t.DestWarehouse?.WarehouseCode ?? $"K00{t.DestWarehouseId}",
            DestWarehouseName: t.DestWarehouse?.WarehouseName ?? $"Kho #{t.DestWarehouseId}",
            CreatedBy: t.CreatedBy,
            CreatedByName: t.CreatedByNavigation?.FullName ?? t.CreatedByNavigation?.Username ?? "Nhân viên",
            Status: t.Status ?? "DRAFT",
            TotalQuantity: totalQty,
            TotalReceivedQuantity: string.Equals(t.Status, "RECEIVED", StringComparison.OrdinalIgnoreCase) ? totalReceived : null,
            TotalAmount: totalAmount,
            Notes: t.Notes,
            Items: itemDtos,
            ReceivedByName: receivedByName,
            ReceiveNotes: t.ReceiveNotes
        );

        return Result.Success(detail);
    }
}
