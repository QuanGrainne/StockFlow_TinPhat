using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Domain.Entities;
using StockFlow.Application.Features.Transfers.DTOs;

namespace StockFlow.Application.Features.Transfers.Queries;

public record GetTransfersQuery(
    int? SourceWarehouseId = null,
    int? DestWarehouseId = null,
    List<int>? WarehouseIds = null,
    string? Status = null,
    DateTime? FromDate = null,
    DateTime? ToDate = null,
    string? DateType = null, // "transfer" | "received"
    string? Search = null
) : IRequest<Result<List<TransferListDto>>>;

public class GetTransfersQueryHandler : IRequestHandler<GetTransfersQuery, Result<List<TransferListDto>>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public GetTransfersQueryHandler(IStockFlowDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<List<TransferListDto>>> Handle(GetTransfersQuery request, CancellationToken cancellationToken)
    {
        var query = _context.TrxStockTransfers
            .Include(t => t.SourceWarehouse)
            .Include(t => t.DestWarehouse)
            .Include(t => t.CreatedByNavigation)
            .Include(t => t.DtlStockTransferItems)
                .ThenInclude(i => i.Product)
            .AsNoTracking();

        // 1. Lọc theo kho xuất (Chuyển đi)
        if (request.SourceWarehouseId.HasValue && request.SourceWarehouseId.Value > 0)
        {
            query = query.Where(t => t.SourceWarehouseId == request.SourceWarehouseId.Value);
        }

        // 2. Lọc theo kho nhận (Nhận về)
        if (request.DestWarehouseId.HasValue && request.DestWarehouseId.Value > 0)
        {
            query = query.Where(t => t.DestWarehouseId == request.DestWarehouseId.Value);
        }

        // 3. Lọc theo danh sách kho được phân quyền của user
        if (request.WarehouseIds != null && request.WarehouseIds.Count > 0)
        {
            query = query.Where(t => request.WarehouseIds.Contains(t.SourceWarehouseId) || request.WarehouseIds.Contains(t.DestWarehouseId));
        }

        // 3b. Cô lập dữ liệu kho: luôn giới hạn trong các kho người dùng được phân quyền (Admin = mọi kho hoạt động)
        var authorizedWarehouseIds = await _currentUserService.GetAuthorizedWarehouseIdsAsync(cancellationToken);
        query = query.Where(t => authorizedWarehouseIds.Contains(t.SourceWarehouseId) || authorizedWarehouseIds.Contains(t.DestWarehouseId));

        // 4. Lọc theo trạng thái
        if (!string.IsNullOrWhiteSpace(request.Status) && !request.Status.Equals("ALL", StringComparison.OrdinalIgnoreCase))
        {
            var statuses = request.Status.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(s => s.ToUpper())
                .ToList();

            if (statuses.Count > 0)
            {
                query = query.Where(t => t.Status != null && statuses.Contains(t.Status.ToUpper()));
            }
        }

        // 5. Lọc theo thời gian (Ngày chuyển hoặc Ngày nhận)
        var isReceivedDate = string.Equals(request.DateType, "received", StringComparison.OrdinalIgnoreCase);

        if (request.FromDate.HasValue)
        {
            var from = DateTime.SpecifyKind(request.FromDate.Value.Date, DateTimeKind.Unspecified);
            query = isReceivedDate
                ? query.Where(t => t.ReceivedDate != null && t.ReceivedDate >= from)
                : query.Where(t => t.TransferDate != null && t.TransferDate >= from);
        }

        if (request.ToDate.HasValue)
        {
            var to = DateTime.SpecifyKind(request.ToDate.Value.Date.AddDays(1).AddTicks(-1), DateTimeKind.Unspecified);
            query = isReceivedDate
                ? query.Where(t => t.ReceivedDate != null && t.ReceivedDate <= to)
                : query.Where(t => t.TransferDate != null && t.TransferDate <= to);
        }

        // 6. Lọc theo từ khóa tìm kiếm (Mã chuyển hàng)
        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var term = request.Search.Trim().ToLower();
            query = query.Where(t =>
                (t.TransferCode != null && t.TransferCode.ToLower().Contains(term)) ||
                (t.Notes != null && t.Notes.ToLower().Contains(term)));
        }

        var transfers = await query
            .OrderByDescending(t => t.TransferDate ?? DateTime.MinValue)
            .ThenByDescending(t => t.StockTransferId)
            .ToListAsync(cancellationToken);

        var dtos = transfers.Select(t =>
        {
            decimal totalQty = 0;
            decimal totalReceived = 0;
            decimal totalAmount = 0;

            foreach (var item in t.DtlStockTransferItems)
            {
                var qty = item.Quantity ?? 0;
                var rec = item.ReceivedQuantity ?? 0;
                // Giá trị chuyển theo giá chuyển trên phiếu (chưa nhập thì theo giá vốn)
                var price = item.TransferPrice ?? item.UnitCost ?? item.Product?.MovingAverageCost ?? 0;

                totalQty += qty;
                totalReceived += rec;
                totalAmount += qty * price;
            }

            return new TransferListDto(
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
                Status: t.Status ?? TransferStatus.Draft,
                TotalQuantity: totalQty,
                TotalReceivedQuantity: t.IsReceived() ? totalReceived : null,
                TotalAmount: totalAmount,
                Notes: t.Notes
            );
        }).ToList();

        return Result.Success(dtos);
    }
}
