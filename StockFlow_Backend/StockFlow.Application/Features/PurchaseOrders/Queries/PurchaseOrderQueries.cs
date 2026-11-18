using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.PurchaseOrders.DTOs;
using StockFlow.Application.Features.PurchaseOrders.Helpers;
using StockFlow.Application.Features.Purchases.Helpers;

namespace StockFlow.Application.Features.PurchaseOrders.Queries;

public record GetPurchaseOrdersQuery(
    List<int>? WarehouseIds = null,
    List<string>? Statuses = null,
    DateTime? FromDate = null,
    DateTime? ToDate = null,
    int? PartnerId = null,
    string? Search = null
) : IRequest<Result<List<PurchaseOrderListDto>>>;

/// <summary>Chi tiết phiếu theo id, hoặc theo mã PDN khi PoId = 0 (link từ phiếu nhập / phiếu gộp chỉ có mã)</summary>
public record GetPurchaseOrderByIdQuery(int PoId, string? PoCode = null) : IRequest<Result<PurchaseOrderDetailDto>>;

public class PurchaseOrderQueryHandler :
    IRequestHandler<GetPurchaseOrdersQuery, Result<List<PurchaseOrderListDto>>>,
    IRequestHandler<GetPurchaseOrderByIdQuery, Result<PurchaseOrderDetailDto>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public PurchaseOrderQueryHandler(IStockFlowDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<List<PurchaseOrderListDto>>> Handle(GetPurchaseOrdersQuery request, CancellationToken ct)
    {
        var query = _context.TrxPurchaseOrders.AsNoTracking()
            .Include(p => p.Warehouse)
            .Include(p => p.Partner)
            .Include(p => p.CreatedByNavigation)
            .Include(p => p.DtlPurchaseOrderItems)
            .AsQueryable();

        // Cô lập dữ liệu kho
        var authorized = await _currentUser.GetAuthorizedWarehouseIdsAsync(ct);
        query = query.Where(p => authorized.Contains(p.WarehouseId));

        if (request.WarehouseIds is { Count: > 0 })
            query = query.Where(p => request.WarehouseIds.Contains(p.WarehouseId));
        if (request.Statuses is { Count: > 0 })
            query = query.Where(p => p.Status != null && request.Statuses.Contains(p.Status));
        if (request.FromDate.HasValue)
            query = query.Where(p => p.OrderDate >= request.FromDate.Value);
        if (request.ToDate.HasValue)
        {
            var to = request.ToDate.Value.TimeOfDay == TimeSpan.Zero
                ? request.ToDate.Value.Date.AddDays(1).AddTicks(-1)
                : request.ToDate.Value;
            query = query.Where(p => p.OrderDate <= to);
        }
        if (request.PartnerId is > 0)
            query = query.Where(p => p.PartnerId == request.PartnerId.Value);
        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var s = request.Search.Trim().ToLower();
            query = query.Where(p => (p.PoCode != null && p.PoCode.ToLower().Contains(s)) ||
                                     (p.Partner.PartnerName != null && p.Partner.PartnerName.ToLower().Contains(s)) ||
                                     (p.Partner.PartnerCode != null && p.Partner.PartnerCode.ToLower().Contains(s)));
        }

        var orders = await query.OrderByDescending(p => p.OrderDate).ThenByDescending(p => p.PoId).ToListAsync(ct);

        // Tổng SL thực nhập theo phiếu đặt (các phiếu nhập đã hoàn thành)
        var poIds = orders.Select(o => o.PoId).ToList();
        var receipts = await _context.TrxGoodsReceipts.AsNoTracking()
            .Include(r => r.DtlGoodsReceiptItems)
            .Where(r => r.PurchaseOrderId != null && poIds.Contains(r.PurchaseOrderId.Value) && r.Status == "COMPLETED")
            .ToListAsync(ct);
        var receivedByPo = receipts.GroupBy(r => r.PurchaseOrderId!.Value)
            .ToDictionary(g => g.Key, g => g.SelectMany(r => r.DtlGoodsReceiptItems).Sum(PurchaseStockOps.Quantity));

        var result = orders.Select(p => new PurchaseOrderListDto(
            p.PoId,
            p.PoCode ?? $"PDN{p.PoId:D6}",
            p.WarehouseId,
            p.Warehouse?.WarehouseName ?? $"Kho #{p.WarehouseId}",
            p.PartnerId,
            p.Partner?.PartnerCode ?? "",
            p.Partner?.PartnerName ?? "",
            p.OrderDate,
            p.Status ?? PurchaseOrderHelper.Draft,
            p.CreatedByNavigation?.FullName ?? p.CreatedByNavigation?.Username ?? "",
            p.DtlPurchaseOrderItems.Sum(i => i.OrderedQty),
            receivedByPo.GetValueOrDefault(p.PoId),
            p.TotalAmount,
            p.Notes,
            p.ExpectedDate)).ToList();

        return Result.Success(result);
    }

    public async Task<Result<PurchaseOrderDetailDto>> Handle(GetPurchaseOrderByIdQuery request, CancellationToken ct)
    {
        var po = await _context.TrxPurchaseOrders.AsNoTracking()
            .Include(p => p.Warehouse)
            .Include(p => p.Partner)
            .Include(p => p.CreatedByNavigation)
            .Include(p => p.MergedIntoPo)
            .Include(p => p.MergedFromPos)
            .Include(p => p.DtlPurchaseOrderItems).ThenInclude(i => i.Product).ThenInclude(p => p.BaseUnit)
            .FirstOrDefaultAsync(p => request.PoId > 0 ? p.PoId == request.PoId : p.PoCode == request.PoCode, ct);
        if (po == null) return Result.Failure<PurchaseOrderDetailDto>("Không tìm thấy phiếu đặt hàng nhập.");
        if (!await _currentUser.HasWarehouseAccessAsync(po.WarehouseId, ct))
            return Result.Failure<PurchaseOrderDetailDto>("Bạn không có quyền xem phiếu của kho này.");

        var receipts = await _context.TrxGoodsReceipts.AsNoTracking()
            .Include(r => r.ReceivedByNavigation)
            .Include(r => r.DtlGoodsReceiptItems).ThenInclude(i => i.Product).ThenInclude(p => p.BaseUnit)
            .Where(r => r.PurchaseOrderId == po.PoId)
            .OrderByDescending(r => r.ReceivedDate).ThenByDescending(r => r.GrId)
            .ToListAsync(ct);

        var completedLines = receipts.Where(r => r.Status == "COMPLETED").SelectMany(r => r.DtlGoodsReceiptItems).ToList();
        var received = completedLines.GroupBy(i => i.ProductId)
            .ToDictionary(g => g.Key, g => g.Sum(PurchaseStockOps.Quantity));

        var items = po.DtlPurchaseOrderItems.OrderBy(i => i.PoItemId).Select(i => new PurchaseOrderItemDto(
            i.ProductId,
            i.Product?.ProductCode ?? $"SP{i.ProductId}",
            i.Product?.ProductName ?? "Sản phẩm",
            i.Product?.BaseUnit?.UnitName ?? "Cái",
            i.OrderedQty,
            received.GetValueOrDefault(i.ProductId),
            i.UnitPrice,
            i.DiscountPercent,
            PurchaseOrderHelper.LineTotal(i.OrderedQty, i.UnitPrice, i.DiscountPercent))).ToList();

        // Hàng thực nhập nhưng không có trong phiếu đặt
        var orderedIds = po.DtlPurchaseOrderItems.Select(i => i.ProductId).ToHashSet();
        items.AddRange(completedLines.Where(l => !orderedIds.Contains(l.ProductId)).GroupBy(l => l.ProductId).Select(g =>
        {
            var p = g.First().Product;
            return new PurchaseOrderItemDto(g.Key, p?.ProductCode ?? $"SP{g.Key}", p?.ProductName ?? "Sản phẩm",
                p?.BaseUnit?.UnitName ?? "Cái", 0, received[g.Key], 0, 0, 0);
        }));

        // Tiền đã trả NCC của phiếu đặt = tổng đã trả cho các phiếu nhập theo phiếu đặt (khớp Lịch sử thanh toán
        // của phiếu nhập): trả lúc nhập hàng + phần phiếu chi PC... trả thêm sau ở Nhà cung cấp phân bổ vào các phiếu nhập đó.
        var completedIds = receipts.Where(r => r.Status == "COMPLETED").Select(r => r.GrId).ToList();
        var paidAmount = await _context.TrxFinancialTransactions.AsNoTracking()
            .Where(t => t.TxType == "SUPPLIER_PAYMENT" && t.Status != "CANCELLED" &&
                        t.ReferenceType == "GOODS_RECEIPT" && t.ReferenceId != null && completedIds.Contains(t.ReferenceId.Value))
            .SumAsync(t => t.Amount ?? 0, ct);

        var receiptDtos = receipts.Select(r => new PurchaseOrderReceiptDto(
            r.GrId,
            r.GrCode ?? $"PN{r.GrId:D6}",
            r.ReceivedDate,
            r.ReceivedByNavigation?.FullName ?? r.ReceivedByNavigation?.Username ?? "",
            r.DtlGoodsReceiptItems.Sum(PurchaseStockOps.Quantity),
            r.Status ?? "DRAFT")).ToList();

        return Result.Success(new PurchaseOrderDetailDto(
            po.PoId,
            po.PoCode ?? $"PDN{po.PoId:D6}",
            po.WarehouseId,
            po.Warehouse?.WarehouseName ?? $"Kho #{po.WarehouseId}",
            po.PartnerId,
            po.Partner?.PartnerCode ?? "",
            po.Partner?.PartnerName ?? "",
            po.Partner?.Phone,
            po.OrderDate,
            po.Status ?? PurchaseOrderHelper.Draft,
            po.CreatedByNavigation?.FullName ?? po.CreatedByNavigation?.Username ?? "",
            po.TotalAmount + po.DiscountAmount,
            po.DiscountAmount,
            po.TotalAmount,
            po.Notes,
            items,
            receiptDtos,
            po.Partner?.Address,
            po.MergedIntoPoId,
            po.MergedIntoPo?.PoCode,
            po.MergedFromPos.OrderBy(m => m.PoId).Select(m => m.PoCode ?? "").ToList(),
            paidAmount,
            po.ExpectedDate));
    }
}
