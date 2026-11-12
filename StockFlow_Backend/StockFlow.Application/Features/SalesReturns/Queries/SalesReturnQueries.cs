using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Orders.Commands;
using StockFlow.Application.Features.SalesReturns.DTOs;

namespace StockFlow.Application.Features.SalesReturns.Queries;

public record GetSalesReturnsQuery(
    List<int>? WarehouseIds,
    List<string>? Statuses,
    DateTime? FromDate,
    DateTime? ToDate,
    string? Search) : IRequest<Result<List<SalesReturnListDto>>>;

public record GetSalesReturnByIdQuery(int ReturnId) : IRequest<Result<SalesReturnDetailDto>>;

/// <summary>Hàng của hóa đơn gốc kèm SL còn được trả (mở tab Trả hàng ở màn Bán hàng)</summary>
public record GetSalesReturnSourceQuery(int InvoiceId) : IRequest<Result<SalesReturnSourceDto>>;

public class SalesReturnQueryHandler :
    IRequestHandler<GetSalesReturnsQuery, Result<List<SalesReturnListDto>>>,
    IRequestHandler<GetSalesReturnByIdQuery, Result<SalesReturnDetailDto>>,
    IRequestHandler<GetSalesReturnSourceQuery, Result<SalesReturnSourceDto>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public SalesReturnQueryHandler(IStockFlowDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<List<SalesReturnListDto>>> Handle(GetSalesReturnsQuery request, CancellationToken ct)
    {
        var authorized = await _currentUser.GetAuthorizedWarehouseIdsAsync(ct);
        var query = _context.TrxReturnRequests.AsNoTracking()
            .Where(r => r.WarehouseId.HasValue && authorized.Contains(r.WarehouseId.Value));
        if (request.WarehouseIds is { Count: > 0 })
            query = query.Where(r => request.WarehouseIds.Contains(r.WarehouseId!.Value));
        if (request.Statuses is { Count: > 0 })
            query = query.Where(r => r.Status != null && request.Statuses.Contains(r.Status));
        if (request.FromDate.HasValue)
            query = query.Where(r => r.RequestDate >= request.FromDate.Value.Date);
        if (request.ToDate.HasValue)
            query = query.Where(r => r.RequestDate < request.ToDate.Value.Date.AddDays(1));
        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var s = request.Search.Trim().ToLower();
            query = query.Where(r => (r.ReturnCode != null && r.ReturnCode.ToLower().Contains(s))
                                     || (r.SalesOrder != null && r.SalesOrder.OrderCode != null && r.SalesOrder.OrderCode.ToLower().Contains(s))
                                     || (r.Partner.PartnerName != null && r.Partner.PartnerName.ToLower().Contains(s))
                                     || (r.Partner.PartnerCode != null && r.Partner.PartnerCode.ToLower().Contains(s)));
        }

        var rows = await query
            .OrderByDescending(r => r.RequestDate).ThenByDescending(r => r.ReturnRequestId)
            .Select(r => new SalesReturnListDto(
                r.ReturnRequestId,
                r.ReturnCode ?? "",
                r.RequestDate,
                r.SalesOrderId ?? 0,
                r.SalesOrder != null ? r.SalesOrder.OrderCode ?? "" : "",
                r.WarehouseId!.Value,
                r.Warehouse != null ? r.Warehouse.WarehouseName ?? "" : "",
                r.PartnerId,
                r.Partner.PartnerCode ?? "",
                r.Partner.PartnerName ?? "",
                r.CreatedByNavigation.FullName ?? r.CreatedByNavigation.Username ?? "",
                r.DtlReturnRequestItems.Sum(i => i.Quantity ?? 0),
                r.TotalGoodsAmount,
                r.TotalAmount,
                r.RefundAmount,
                r.Status ?? SalesReturnOps.Completed,
                r.Reason))
            .ToListAsync(ct);
        return Result.Success(rows);
    }

    public async Task<Result<SalesReturnDetailDto>> Handle(GetSalesReturnByIdQuery request, CancellationToken ct)
    {
        var r = await _context.TrxReturnRequests.AsNoTracking()
            .Include(x => x.Partner)
            .Include(x => x.Warehouse)
            .Include(x => x.SalesOrder)
            .Include(x => x.CreatedByNavigation)
            .Include(x => x.DtlReturnRequestItems).ThenInclude(i => i.Product).ThenInclude(p => p.BaseUnit)
            .Include(x => x.DtlReturnRequestItems).ThenInclude(i => i.OrderItem!).ThenInclude(oi => oi.Unit)
            .FirstOrDefaultAsync(x => x.ReturnRequestId == request.ReturnId, ct);
        if (r == null) return Result.Failure<SalesReturnDetailDto>("Không tìm thấy phiếu trả hàng.");
        if (!r.WarehouseId.HasValue || !await _currentUser.HasWarehouseAccessAsync(r.WarehouseId.Value, ct))
            return Result.Failure<SalesReturnDetailDto>("Bạn không có quyền xem phiếu trả hàng của chi nhánh này.");

        var items = r.DtlReturnRequestItems.OrderBy(i => i.ReturnItemId).Select(i => new SalesReturnItemDto(
            i.ReturnItemId, i.OrderItemId ?? 0, i.ProductId,
            i.Product?.ProductCode ?? $"SP{i.ProductId}", i.Product?.ProductName ?? "Sản phẩm",
            i.OrderItem?.Unit?.UnitName ?? i.Product?.BaseUnit?.UnitName ?? "Cái",
            i.Quantity ?? 0, i.SalePrice, i.ReturnPrice, Math.Round((i.Quantity ?? 0) * i.ReturnPrice, 2))).ToList();

        var refunds = await _context.TrxFinancialTransactions.AsNoTracking()
            .Where(t => t.ReferenceType == SalesReturnOps.ReferenceType && t.ReferenceId == r.ReturnRequestId && t.TxType == SalesReturnOps.RefundTxType)
            .OrderBy(t => t.TransactionDate).ThenBy(t => t.TxId)
            .Select(t => new SalesReturnRefundDto(t.TxCode ?? "", t.TransactionDate, t.PaymentMethod, t.Amount ?? 0,
                t.CreatedByNavigation.FullName ?? t.CreatedByNavigation.Username ?? "", t.Status ?? "COMPLETED", t.Description))
            .ToListAsync(ct);

        return Result.Success(new SalesReturnDetailDto(
            r.ReturnRequestId, r.ReturnCode ?? "", r.RequestDate,
            r.SalesOrderId ?? 0, r.SalesOrder?.OrderCode ?? "", r.SalesOrder?.OrderDate,
            r.WarehouseId.Value, r.Warehouse?.WarehouseName ?? "",
            r.PartnerId, r.Partner?.PartnerCode ?? "", r.Partner?.PartnerName ?? "",
            r.CreatedByNavigation?.FullName ?? r.CreatedByNavigation?.Username ?? "",
            r.Status ?? SalesReturnOps.Completed,
            r.TotalGoodsAmount, r.DiscountAmount, r.ReturnFee, r.TotalAmount, r.RefundAmount,
            r.PaymentMethod, r.Reason, items, refunds));
    }

    public async Task<Result<SalesReturnSourceDto>> Handle(GetSalesReturnSourceQuery request, CancellationToken ct)
    {
        var o = await _context.TrxOrders.AsNoTracking()
            .Include(x => x.Partner)
            .Include(x => x.Warehouse)
            .Include(x => x.CreatedByNavigation)
            .Include(x => x.TrxStockIssues)
            .Include(x => x.DtlOrderItems).ThenInclude(i => i.Product).ThenInclude(p => p.BaseUnit)
            .Include(x => x.DtlOrderItems).ThenInclude(i => i.Unit)
            .FirstOrDefaultAsync(x => x.OrderId == request.InvoiceId, ct);
        if (o == null || o.OrderType == "BOOKING") return Result.Failure<SalesReturnSourceDto>("Không tìm thấy hóa đơn.");
        if (!string.Equals(o.Status, "COMPLETED", StringComparison.OrdinalIgnoreCase))
            return Result.Failure<SalesReturnSourceDto>($"Hóa đơn {o.OrderCode} chưa hoàn thành hoặc đã hủy, không trả hàng được.");
        var warehouseId = o.WarehouseId ?? o.TrxStockIssues.Select(si => (int?)si.WarehouseId).FirstOrDefault();
        if (!warehouseId.HasValue) return Result.Failure<SalesReturnSourceDto>("Không xác định được chi nhánh bán của hóa đơn.");
        if (!await _currentUser.HasWarehouseAccessAsync(warehouseId.Value, ct))
            return Result.Failure<SalesReturnSourceDto>("Bạn không có quyền trả hàng của chi nhánh này.");
        var warehouseName = o.Warehouse?.WarehouseName
            ?? await _context.MstWarehouses.Where(w => w.WarehouseId == warehouseId.Value).Select(w => w.WarehouseName).FirstOrDefaultAsync(ct)
            ?? "";

        var returned = await SalesReturnOps.ReturnedByOrderItemAsync(_context, o.OrderId, null, ct);
        var items = o.DtlOrderItems.OrderBy(i => i.OrderItemId).Select(i =>
        {
            var sold = i.Quantity ?? 0;
            var done = returned.GetValueOrDefault(i.OrderItemId);
            return new SalesReturnSourceItemDto(
                i.OrderItemId, i.ProductId, i.Product?.ProductCode ?? $"SP{i.ProductId}", i.Product?.ProductName ?? "Sản phẩm",
                i.Unit?.UnitName ?? i.Product?.BaseUnit?.UnitName ?? "Cái", i.UnitId, i.Product?.ImageUrl,
                sold, done, Math.Max(0, sold - done), i.UnitPrice ?? 0);
        }).ToList();

        var isWalkIn = o.Partner?.PartnerCode == CreatePosOrderCommandHandler.WalkInCustomerCode;
        return Result.Success(new SalesReturnSourceDto(
            o.OrderId, o.OrderCode ?? "", o.OrderDate, warehouseId.Value, warehouseName,
            o.PartnerId, o.Partner?.PartnerCode ?? "", o.Partner?.PartnerName ?? "", o.Partner?.Phone,
            o.Partner?.CurrentDebt ?? 0, isWalkIn,
            o.CreatedByNavigation?.FullName ?? o.CreatedByNavigation?.Username ?? "", items));
    }
}
