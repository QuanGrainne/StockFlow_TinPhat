using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.SalesBookings.Common;
using StockFlow.Application.Features.SalesBookings.DTOs;

namespace StockFlow.Application.Features.SalesBookings.Queries;

public record GetSalesBookingsQuery(
    List<int>? WarehouseIds,
    List<string>? Statuses,
    DateTime? FromDate,
    DateTime? ToDate,
    int? PartnerId,
    string? Search,
    // Tìm theo mã hàng / tên hàng trong đơn (popup Xử lý đặt hàng ở màn Bán hàng)
    string? ProductSearch = null) : IRequest<Result<List<SalesBookingListDto>>>;

public record GetSalesBookingByIdQuery(int OrderId) : IRequest<Result<SalesBookingDetailDto>>;

/// <summary>Hàng khách đặt (đơn đặt còn mở, chưa giao) tại 1 kho: productId → SL</summary>
public record GetReservedQuantitiesQuery(int WarehouseId) : IRequest<Result<Dictionary<int, decimal>>>;

public class SalesBookingQueryHandler :
    IRequestHandler<GetSalesBookingsQuery, Result<List<SalesBookingListDto>>>,
    IRequestHandler<GetSalesBookingByIdQuery, Result<SalesBookingDetailDto>>,
    IRequestHandler<GetReservedQuantitiesQuery, Result<Dictionary<int, decimal>>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public SalesBookingQueryHandler(IStockFlowDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<List<SalesBookingListDto>>> Handle(GetSalesBookingsQuery request, CancellationToken ct)
    {
        var authorized = await _currentUser.GetAuthorizedWarehouseIdsAsync(ct);
        var query = _context.TrxOrders.AsNoTracking()
            .Where(o => o.OrderType == SalesBookingOps.OrderType && o.WarehouseId.HasValue && authorized.Contains(o.WarehouseId.Value));

        if (request.WarehouseIds is { Count: > 0 })
            query = query.Where(o => request.WarehouseIds.Contains(o.WarehouseId!.Value));
        if (request.Statuses is { Count: > 0 })
            query = query.Where(o => o.Status != null && request.Statuses.Contains(o.Status));
        if (request.FromDate.HasValue)
            query = query.Where(o => o.OrderDate >= request.FromDate.Value.Date);
        if (request.ToDate.HasValue)
            query = query.Where(o => o.OrderDate < request.ToDate.Value.Date.AddDays(1));
        if (request.PartnerId is > 0)
            query = query.Where(o => o.PartnerId == request.PartnerId.Value);
        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var s = request.Search.Trim().ToLower();
            query = query.Where(o => (o.OrderCode != null && o.OrderCode.ToLower().Contains(s))
                                     || (o.Partner.PartnerName != null && o.Partner.PartnerName.ToLower().Contains(s))
                                     || (o.Partner.PartnerCode != null && o.Partner.PartnerCode.ToLower().Contains(s))
                                     || (o.Partner.Phone != null && o.Partner.Phone.Contains(s))
                                     || (o.Notes != null && o.Notes.ToLower().Contains(s)));
        }
        if (!string.IsNullOrWhiteSpace(request.ProductSearch))
        {
            var ps = request.ProductSearch.Trim().ToLower();
            query = query.Where(o => o.DtlOrderItems.Any(i =>
                (i.Product.ProductCode != null && i.Product.ProductCode.ToLower().Contains(ps)) ||
                (i.Product.ProductName != null && i.Product.ProductName.ToLower().Contains(ps))));
        }

        var rows = await query
            .OrderByDescending(o => o.OrderDate).ThenByDescending(o => o.OrderId)
            .Select(o => new
            {
                o.OrderId,
                o.OrderCode,
                o.OrderDate,
                o.DeliveryDate,
                WarehouseId = o.WarehouseId!.Value,
                WarehouseName = o.Warehouse!.WarehouseName,
                o.PartnerId,
                o.Partner.PartnerCode,
                o.Partner.PartnerName,
                o.Partner.Phone,
                o.Status,
                CreatedBy = o.CreatedByNavigation.FullName ?? o.CreatedByNavigation.Username,
                // Theo đơn vị cơ bản (cùng đơn vị với SL đã giao)
                Qty = o.DtlOrderItems.Sum(i => (i.Quantity ?? 0) * i.ConversionRate),
                Total = o.TotalAmount ?? 0,
                Paid = o.PaidAmount ?? 0,
                o.Notes,
            })
            .ToListAsync(ct);

        var delivered = await SalesBookingOps.LoadDeliveredAsync(_context, rows.Select(r => r.OrderId).ToList(), ct);
        var invoicePaid = await InvoicePaidAsync(rows.Select(r => r.OrderId).ToList(), ct);
        return Result.Success(rows.Select(r => new SalesBookingListDto(
            r.OrderId, r.OrderCode ?? "", r.OrderDate, r.DeliveryDate, r.WarehouseId, r.WarehouseName ?? "",
            r.PartnerId, r.PartnerCode ?? "", r.PartnerName ?? "", r.Phone, r.Status ?? SalesBookingOps.Draft,
            r.CreatedBy ?? "", r.Qty, delivered.GetValueOrDefault(r.OrderId)?.Values.Sum() ?? 0, r.Total, r.Paid, r.Notes,
            r.Paid + invoicePaid.GetValueOrDefault(r.OrderId))).ToList());
    }

    public async Task<Result<SalesBookingDetailDto>> Handle(GetSalesBookingByIdQuery request, CancellationToken ct)
    {
        var o = await _context.TrxOrders.AsNoTracking()
            .Include(x => x.Partner)
            .Include(x => x.Warehouse)
            .Include(x => x.CreatedByNavigation)
            .Include(x => x.ConsolidatedIntoOrder)
            .Include(x => x.DtlOrderItems).ThenInclude(i => i.Product).ThenInclude(p => p.BaseUnit)
            .Include(x => x.DtlOrderItems).ThenInclude(i => i.Unit)
            .FirstOrDefaultAsync(x => x.OrderId == request.OrderId && x.OrderType == SalesBookingOps.OrderType, ct);
        if (o == null) return Result.Failure<SalesBookingDetailDto>("Không tìm thấy đơn đặt hàng.");
        if (!o.WarehouseId.HasValue || !await _currentUser.HasWarehouseAccessAsync(o.WarehouseId.Value, ct))
            return Result.Failure<SalesBookingDetailDto>("Bạn không có quyền xem đơn đặt hàng của chi nhánh này.");

        var delivered = (await SalesBookingOps.LoadDeliveredAsync(_context, new[] { o.OrderId }, ct)).GetValueOrDefault(o.OrderId) ?? new();
        // Hàng trùng nhiều dòng: SL đã giao chia lần lượt cho từng dòng
        var left = new Dictionary<int, decimal>(delivered);
        var items = o.DtlOrderItems.OrderBy(i => i.OrderItemId).Select(i =>
        {
            var qty = i.Quantity ?? 0;
            var rate = i.ConversionRate > 0 ? i.ConversionRate : 1;
            // SL đã giao tính theo đơn vị cơ bản → chia lại theo đơn vị bán của dòng
            var doneBase = Math.Min(qty * rate, left.GetValueOrDefault(i.ProductId));
            left[i.ProductId] = left.GetValueOrDefault(i.ProductId) - doneBase;
            return new SalesBookingItemDto(
                i.OrderItemId, i.ProductId, i.Product?.ProductCode ?? $"SP{i.ProductId}", i.Product?.ProductName ?? "Sản phẩm",
                i.Unit?.UnitName ?? i.Product?.BaseUnit?.UnitName ?? "Cái", i.UnitId, qty, Math.Round(doneBase / rate, 4), i.OriginalPrice,
                i.DiscountType, i.DiscountValue, i.UnitPrice ?? 0, i.LineTotal, rate);
        }).ToList();

        var invoices = await _context.TrxOrders.AsNoTracking()
            .Where(x => x.BookingOrderId == o.OrderId)
            .OrderByDescending(x => x.OrderDate).ThenByDescending(x => x.OrderId)
            .Select(x => new SalesBookingInvoiceDto(
                x.OrderId, x.OrderCode ?? "", x.OrderDate,
                x.CreatedByNavigation.FullName ?? x.CreatedByNavigation.Username ?? "",
                x.TotalAmount ?? 0, x.DepositAmount, x.Status ?? ""))
            .ToListAsync(ct);

        // Lịch sử thanh toán: phiếu thu trả trước của đơn + phiếu thu của các hóa đơn tạo từ đơn (kể cả đã hủy)
        var paymentRefIds = invoices.Select(i => i.OrderId).Append(o.OrderId).ToList();
        var payments = await _context.TrxFinancialTransactions.AsNoTracking()
            .Where(t => t.ReferenceType == "SALES_ORDER" && t.ReferenceId.HasValue && paymentRefIds.Contains(t.ReferenceId.Value) && t.TxType == "RECEIPT")
            .OrderByDescending(t => t.TransactionDate).ThenByDescending(t => t.TxId)
            .Select(t => new SalesBookingPaymentDto(
                t.TxCode ?? "", t.TransactionDate, t.PaymentMethod, t.Amount ?? 0,
                t.CreatedByNavigation.FullName ?? t.CreatedByNavigation.Username ?? "",
                t.Status ?? "COMPLETED"))
            .ToListAsync(ct);

        var mergedFrom = await _context.TrxOrders.AsNoTracking()
            .Where(x => x.ConsolidatedIntoOrderId == o.OrderId)
            .OrderBy(x => x.OrderId)
            .Select(x => x.OrderCode ?? "")
            .ToListAsync(ct);

        var usedDeposit = invoices.Where(i => i.Status == "COMPLETED").Sum(i => i.DepositAmount);
        return Result.Success(new SalesBookingDetailDto(
            o.OrderId, o.OrderCode ?? "", o.OrderDate, o.DeliveryDate, o.WarehouseId.Value, o.Warehouse?.WarehouseName ?? "",
            o.PartnerId, o.Partner?.PartnerCode ?? "", o.Partner?.PartnerName ?? "", o.Partner?.Phone, o.Partner?.Address,
            o.Partner?.CurrentDebt ?? 0, o.Partner?.CreditLimit ?? 0,
            o.Status ?? SalesBookingOps.Draft,
            o.CreatedByNavigation?.FullName ?? o.CreatedByNavigation?.Username ?? "",
            o.SubTotal, o.DiscountType, o.DiscountValue, o.DiscountAmount, o.TotalAmount ?? 0,
            o.PaidAmount ?? 0, Math.Max(0, (o.PaidAmount ?? 0) - usedDeposit), o.Notes,
            o.ConsolidatedIntoOrderId, o.ConsolidatedIntoOrder?.OrderCode, mergedFrom,
            items, invoices, payments,
            (o.PaidAmount ?? 0) + (await InvoicePaidAsync(new[] { o.OrderId }, ct)).GetValueOrDefault(o.OrderId)));
    }

    /// <summary>Tiền khách trả thêm lúc giao (hóa đơn của đơn, không tính phần trừ tiền trả trước): bookingId → tiền</summary>
    private async Task<Dictionary<int, decimal>> InvoicePaidAsync(IReadOnlyCollection<int> bookingIds, CancellationToken ct)
    {
        if (bookingIds.Count == 0) return new();
        var rows = await _context.TrxOrders.AsNoTracking()
            .Where(o => o.BookingOrderId.HasValue && bookingIds.Contains(o.BookingOrderId.Value) && o.Status == "COMPLETED")
            .GroupBy(o => o.BookingOrderId!.Value)
            .Select(g => new { g.Key, Paid = g.Sum(o => (o.PaidAmount ?? 0) - o.DepositAmount) })
            .ToListAsync(ct);
        return rows.ToDictionary(r => r.Key, r => Math.Max(0, r.Paid));
    }

    public async Task<Result<Dictionary<int, decimal>>> Handle(GetReservedQuantitiesQuery request, CancellationToken ct)
    {
        if (!await _currentUser.HasWarehouseAccessAsync(request.WarehouseId, ct))
            return Result.Success(new Dictionary<int, decimal>());
        var map = await SalesBookingOps.ReservedQtyAsync(_context, request.WarehouseId, null, null, ct);
        return Result.Success(map.Where(kv => kv.Value > 0).ToDictionary(kv => kv.Key, kv => kv.Value));
    }
}
