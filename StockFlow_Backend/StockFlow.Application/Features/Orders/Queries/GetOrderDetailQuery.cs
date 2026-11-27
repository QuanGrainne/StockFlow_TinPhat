using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Orders.DTOs;
using StockFlow.Application.Features.Orders.Helpers;

namespace StockFlow.Application.Features.Orders.Queries;

public record GetOrderDetailQuery(int? OrderId = null, string? OrderCode = null) 
    : IRequest<Result<OrderDetailDto>>;

public class GetOrderDetailQueryHandler : IRequestHandler<GetOrderDetailQuery, Result<OrderDetailDto>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IUserPermissionService _permissionService;

    public GetOrderDetailQueryHandler(
        IStockFlowDbContext context,
        ICurrentUserService currentUserService,
        IUserPermissionService permissionService)
    {
        _context = context;
        _currentUserService = currentUserService;
        _permissionService = permissionService;
    }

    public async Task<Result<OrderDetailDto>> Handle(GetOrderDetailQuery request, CancellationToken cancellationToken)
    {
        if (!request.OrderId.HasValue && string.IsNullOrWhiteSpace(request.OrderCode))
        {
            return Result<OrderDetailDto>.Failure("Vui lòng cung cấp ID hoặc Mã đơn hàng.");
        }

        var query = _context.TrxOrders
            .Include(o => o.Partner)
            .Include(o => o.CreatedByNavigation)
            .Include(o => o.UpdatedByNavigation)
            .Include(o => o.DtlOrderItems).ThenInclude(i => i.Product).ThenInclude(p => p.BaseUnit)
            .Include(o => o.DtlOrderItems).ThenInclude(i => i.Unit)
            .Include(o => o.Warehouse)
            .Include(o => o.TrxStockIssues).ThenInclude(si => si.Warehouse)
            .Include(o => o.TrxStockIssues).ThenInclude(si => si.ProcessedByNavigation)
            .Include(o => o.TrxStockIssues).ThenInclude(si => si.RequestedByNavigation)
            .Include(o => o.TrxStockIssues).ThenInclude(si => si.DtlStockIssueItems).ThenInclude(sii => sii.Lot)
            .Include(o => o.TrxReturnRequests).ThenInclude(rr => rr.CreatedByNavigation)
            .Include(o => o.TrxReturnRequests).ThenInclude(rr => rr.DtlReturnRequestItems).ThenInclude(rri => rri.Product)
            .AsNoTracking();

        var order = await (request.OrderId.HasValue
            ? query.FirstOrDefaultAsync(o => o.OrderId == request.OrderId.Value, cancellationToken)
            : query.FirstOrDefaultAsync(o => o.OrderCode != null && o.OrderCode.ToUpper() == request.OrderCode!.ToUpper().Trim(), cancellationToken));

        if (order == null)
        {
            return Result<OrderDetailDto>.Failure($"Không tìm thấy đơn hàng #{request.OrderId ?? (object?)request.OrderCode}.");
        }

        // Phân quyền kho (BR-04): chỉ xem được chứng từ thuộc kho mình được phân quyền.
        // Kiểm tra cả người chưa được gán kho nào và chứng từ chưa có phiếu xuất.
        if (!await OrderWarehouseAccess.CanAccessAsync(_context, _currentUserService, _permissionService, order, cancellationToken))
        {
            return Result<OrderDetailDto>.Failure("Bạn không có quyền truy cập dữ liệu của chi nhánh/kho này.");
        }

        // Kho hiển thị trên hóa đơn: kho của phiếu xuất; chưa có phiếu xuất (đơn đặt / phiếu tạm) thì kho bán của đơn.
        // Không gán cứng kho mặc định (id / tên kho mỗi hệ thống khác nhau).
        var primaryWarehouse = order.TrxStockIssues.Select(si => si.Warehouse).FirstOrDefault() ?? order.Warehouse;

        // Lấy lịch sử giao dịch thanh toán
        var financialTxs = await _context.TrxFinancialTransactions
            .Include(ft => ft.CreatedByNavigation)
            .Where(ft => ft.ReferenceType == "SALES_ORDER" && ft.ReferenceId == order.OrderId)
            .OrderBy(ft => ft.TransactionDate)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        // Tiền khách trả thừa "Tính vào công nợ" (CreatePosOrderCommand → CustomerDebtPaymentOps): phiếu thu trả nợ cũ được
        // ghi ĐÚNG THỜI ĐIỂM của hóa đơn (finalOrderDate, đến micro-giây) nhưng gắn vào hóa đơn cũ. Bảng phiếu thu không có
        // cột trỏ về hóa đơn sinh ra tiền thừa nên ghép theo thời điểm đó (áp dụng được cả cho phiếu tạo trước khi có ghi chú):
        //  (a) phiếu thu của hóa đơn này trùng thời điểm một hóa đơn khác của khách → tiền thừa từ hóa đơn đó;
        //  (b) phiếu thu của khách trùng thời điểm hóa đơn này mà không gắn hóa đơn này → tiền thừa của hóa đơn này đi trả nợ cũ.
        var receiptDates = financialTxs
            .Where(ft => ft.TransactionDate.HasValue && ft.TransactionDate != order.OrderDate)
            .Select(ft => ft.TransactionDate!.Value)
            .Distinct()
            .ToList();
        var sourceOrderByDate = receiptDates.Count == 0
            ? new Dictionary<DateTime, (int OrderId, string Code, DateTime Date)>()
            : (await _context.TrxOrders.AsNoTracking()
                .Where(o => o.PartnerId == order.PartnerId && o.OrderId != order.OrderId
                            && o.Status != null && o.Status.ToUpper() == "COMPLETED"
                            && o.OrderDate != null && receiptDates.Contains(o.OrderDate.Value))
                .Select(o => new { o.OrderId, o.OrderCode, OrderDate = o.OrderDate!.Value })
                .ToListAsync(cancellationToken))
                .GroupBy(o => o.OrderDate)
                .ToDictionary(g => g.Key, g =>
                {
                    var o = g.OrderBy(x => x.OrderId).First();
                    return (o.OrderId, Code: o.OrderCode ?? $"HD{o.OrderId:D5}", Date: o.OrderDate);
                });

        var excessDebtPayments = new List<OrderExcessDebtPaymentDto>();
        if (order.OrderDate.HasValue && string.Equals(order.Status, "COMPLETED", StringComparison.OrdinalIgnoreCase))
        {
            var checkoutAt = order.OrderDate.Value;
            var excessTxs = await _context.TrxFinancialTransactions.AsNoTracking()
                .Where(ft => ft.PartnerId == order.PartnerId && ft.TxType == "RECEIPT" && ft.TransactionDate == checkoutAt
                             && (ft.Status == null || ft.Status != "CANCELLED")
                             && !(ft.ReferenceType == "SALES_ORDER" && ft.ReferenceId == order.OrderId))
                .OrderBy(ft => ft.TxId)
                .ToListAsync(cancellationToken);
            var targetIds = excessTxs
                .Where(ft => ft.ReferenceType == "SALES_ORDER" && ft.ReferenceId.HasValue)
                .Select(ft => ft.ReferenceId!.Value)
                .Distinct()
                .ToList();
            var targets = targetIds.Count == 0
                ? new Dictionary<int, (string? Code, DateTime? Date)>()
                : await _context.TrxOrders.AsNoTracking()
                    .Where(o => targetIds.Contains(o.OrderId))
                    .ToDictionaryAsync(o => o.OrderId, o => (Code: o.OrderCode, Date: o.OrderDate), cancellationToken);
            excessDebtPayments = excessTxs.Select(ft =>
            {
                var hasTarget = ft.ReferenceType == "SALES_ORDER" && ft.ReferenceId.HasValue && targets.ContainsKey(ft.ReferenceId.Value);
                var target = hasTarget ? targets[ft.ReferenceId!.Value] : default;
                return new OrderExcessDebtPaymentDto
                {
                    TxId = ft.TxId,
                    TxCode = ft.TxCode ?? $"PT{ft.TxId:D6}",
                    Amount = ft.Amount ?? 0,
                    TargetOrderId = hasTarget ? ft.ReferenceId : null,
                    TargetOrderCode = hasTarget ? target.Code ?? $"HD{ft.ReferenceId:D5}" : null,
                    TargetOrderDate = hasTarget ? target.Date : null,
                };
            }).ToList();
        }

        // Trích xuất tên bảng giá & người bán từ Notes nếu có dạng [Bảng giá: ...] hoặc [Người bán: ...]
        string? priceBookName = null;
        string salesRepName = order.CreatedByNavigation?.FullName ?? "Trần Minh Tuấn";
        if (!string.IsNullOrWhiteSpace(order.Notes))
        {
            var matchBg = Regex.Match(order.Notes, @"\[Bảng giá:\s*([^\]]+)\]", RegexOptions.IgnoreCase);
            if (matchBg.Success)
            {
                priceBookName = matchBg.Groups[1].Value.Trim();
            }

            var matchSeller = Regex.Match(order.Notes, @"\[Người bán:\s*([^\]]+)\]", RegexOptions.IgnoreCase);
            if (matchSeller.Success)
            {
                salesRepName = matchSeller.Groups[1].Value.Trim();
            }
        }

        // Mapped Customer
        var partner = order.Partner;
        string partnerGroup = "Bán lẻ";
        if (partner != null)
        {
            if (partner.PartnerName?.Contains("Nam Á", StringComparison.OrdinalIgnoreCase) == true) partnerGroup = "VIP 1";
            else if (partner.PartnerName?.Contains("Song Long", StringComparison.OrdinalIgnoreCase) == true || partner.PartnerName?.Contains("Á Âu", StringComparison.OrdinalIgnoreCase) == true) partnerGroup = "Đại lý 1";
            else if (partner.PartnerName?.Contains("Viettel", StringComparison.OrdinalIgnoreCase) == true) partnerGroup = "Dự án";
            else if (partner.PartnerName?.Contains("Hưng Thịnh", StringComparison.OrdinalIgnoreCase) == true || partner.PartnerName?.Contains("Ninh Ha", StringComparison.OrdinalIgnoreCase) == true) partnerGroup = "Bán buôn";
        }

        var customerDto = new OrderCustomerDto
        {
            PartnerId = order.PartnerId,
            PartnerCode = partner?.PartnerCode ?? $"KH{order.PartnerId:D5}",
            PartnerName = partner?.PartnerName ?? "Khách lẻ tại quầy",
            Phone = partner?.Phone ?? "",
            Email = partner?.Email ?? "",
            Address = partner?.Address ?? "Không có địa chỉ",
            TaxCode = "",
            PartnerGroup = partnerGroup,
            CurrentDebt = partner?.CurrentDebt ?? 0,
            CreditLimit = partner?.CreditLimit ?? 0
        };

        // Mapped Items
        var itemsDto = new List<OrderItemDetailDto>();
        decimal totalQty = 0;
        decimal itemsTotalGross = 0;
        decimal itemsTotalDiscount = 0;

        foreach (var item in order.DtlOrderItems)
        {
            var prod = item.Product;
            var unit = item.Unit ?? prod?.BaseUnit;
            var qty = item.Quantity ?? 0;
            var origPrice = item.OriginalPrice > 0 ? item.OriginalPrice : (item.UnitPrice ?? 0);
            var lineGross = origPrice * qty;
            var discAmt = item.DiscountAmount;
            var lineTot = item.LineTotal > 0 ? item.LineTotal : ((item.UnitPrice ?? origPrice) * qty);

            totalQty += qty;
            itemsTotalGross += lineGross;
            itemsTotalDiscount += discAmt;

            // Tìm lô / HSD nếu có từ phiếu xuất kho tương ứng
            string? lotNumber = null;
            string? expiryDate = null;
            var stockIssueItem = order.TrxStockIssues
                .SelectMany(si => si.DtlStockIssueItems)
                .FirstOrDefault(sii => sii.OrderItemId == item.OrderItemId);

            if (stockIssueItem?.Lot != null)
            {
                lotNumber = stockIssueItem.Lot.LotNumber;
                if (stockIssueItem.Lot.ExpiryDate.HasValue)
                {
                    expiryDate = stockIssueItem.Lot.ExpiryDate.Value.ToString("dd/MM/yyyy");
                }
            }

            itemsDto.Add(new OrderItemDetailDto
            {
                OrderItemId = item.OrderItemId,
                ProductId = item.ProductId,
                ProductCode = prod?.ProductCode ?? $"SP{item.ProductId:D4}",
                ProductName = prod?.ProductName ?? "Sản phẩm",
                ImageUrl = prod?.ImageUrl,
                Barcode = prod?.Barcode,
                UnitId = item.UnitId,
                UnitName = unit?.UnitName ?? "Cái",
                Quantity = qty,
                OriginalPrice = origPrice,
                DiscountType = item.DiscountType ?? "AMOUNT",
                DiscountValue = item.DiscountValue,
                DiscountAmount = discAmt,
                UnitPrice = item.UnitPrice ?? origPrice,
                LineTotal = lineTot,
                WarehouseName = primaryWarehouse?.WarehouseName ?? string.Empty,
                LotNumber = lotNumber,
                ExpiryDate = expiryDate
            });
        }

        // Mapped Payment Transactions
        // Lịch sử thanh toán: phiếu mới nhất lên đầu
        var paymentTxsDto = financialTxs.OrderByDescending(ft => ft.TransactionDate).ThenByDescending(ft => ft.TxId).Select(ft =>
        {
            var fromOther = ft.TransactionDate.HasValue && sourceOrderByDate.TryGetValue(ft.TransactionDate.Value, out var src)
                ? src
                : ((int OrderId, string Code, DateTime Date)?)null;
            return new OrderPaymentTransactionDto
            {
                TxId = ft.TxId,
                TxCode = ft.TxCode ?? $"TT{order.OrderCode}",
                TransactionDate = ft.TransactionDate,
                PaymentMethod = ft.PaymentMethod ?? "CASH",
                Amount = ft.Amount ?? 0,
                CreatedByName = ft.CreatedByNavigation?.FullName ?? "Quản trị viên",
                Status = ft.Status ?? "COMPLETED",
                Description = ft.Description ?? $"Thanh toán cho đơn hàng {order.OrderCode}",
                SourceOrderId = fromOther?.OrderId,
                SourceOrderCode = fromOther?.Code,
                SourceOrderDate = fromOther?.Date,
            };
        }).ToList();

        // Mapped Stock Issues
        var stockIssuesDto = order.TrxStockIssues.Select(si => new OrderStockIssueDto
        {
            StockIssueId = si.StockIssueId,
            IssueCode = si.IssueCode ?? $"XK{si.StockIssueId:D5}",
            Status = si.Status ?? "COMPLETED",
            IssueDate = si.ProcessedDate ?? si.RequestedDate,
            WarehouseName = si.Warehouse?.WarehouseName ?? "Kho xuất",
            ProcessedByName = si.ProcessedByNavigation?.FullName ?? si.RequestedByNavigation?.FullName ?? "Thủ kho",
            Items = si.DtlStockIssueItems.Select(sii =>
            {
                var ordItem = sii.OrderItem;
                var pr = ordItem?.Product;
                return new OrderStockIssueItemDto
                {
                    ProductId = pr?.ProductId ?? 0,
                    ProductCode = pr?.ProductCode ?? "",
                    ProductName = pr?.ProductName ?? "Sản phẩm xuất kho",
                    UnitName = ordItem?.Unit?.UnitName ?? pr?.BaseUnit?.UnitName ?? "Cái",
                    RequestedQty = sii.RequestedQty ?? 0,
                    ActualIssuedQty = sii.ActualIssuedQty ?? sii.RequestedQty ?? 0,
                    LotNumber = sii.Lot?.LotNumber,
                    ExpiryDate = sii.Lot?.ExpiryDate?.ToString("dd/MM/yyyy")
                };
            }).ToList()
        }).ToList();

        // Mapped Return Requests
        var returnRequestsDto = order.TrxReturnRequests.Select(rr => new OrderReturnRequestDto
        {
            ReturnRequestId = rr.ReturnRequestId,
            ReturnCode = rr.ReturnCode ?? $"TH{rr.ReturnRequestId:D5}",
            RequestDate = rr.RequestDate,
            Status = rr.Status ?? "PENDING",
            Reason = rr.Reason ?? "Khách yêu cầu đổi trả",
            CreatedByName = rr.CreatedByNavigation?.FullName ?? "Nhân viên",
            Items = rr.DtlReturnRequestItems.Select(rri => new OrderReturnItemDto
            {
                ProductId = rri.ProductId,
                ProductCode = rri.Product?.ProductCode ?? "",
                ProductName = rri.Product?.ProductName ?? "Sản phẩm trả",
                Quantity = rri.Quantity ?? 0,
                Condition = rri.Condition ?? "Tốt",
                Notes = rri.Notes
            }).ToList()
        }).ToList();

        // Xây dựng Timeline sự kiện
        var timeline = new List<OrderTimelineEventDto>();
        var baseDate = order.OrderDate ?? VietnamTime.Now;

        timeline.Add(new OrderTimelineEventDto
        {
            Timestamp = baseDate,
            Title = $"Tạo đơn hàng #{order.OrderCode}",
            Description = $"Đơn hàng được khởi tạo với tổng giá trị {order.TotalAmount:N0} đ",
            Actor = order.CreatedByNavigation?.FullName ?? "Quản trị viên",
            EventType = "CREATED"
        });

        foreach (var si in stockIssuesDto)
        {
            timeline.Add(new OrderTimelineEventDto
            {
                Timestamp = si.IssueDate ?? baseDate,
                Title = $"Xuất kho thành công #{si.IssueCode}",
                Description = $"Đã xuất {si.Items.Sum(i => i.ActualIssuedQty)} sản phẩm từ {si.WarehouseName}",
                Actor = si.ProcessedByName,
                EventType = "ISSUE"
            });
        }

        foreach (var tx in paymentTxsDto)
        {
            timeline.Add(new OrderTimelineEventDto
            {
                Timestamp = tx.TransactionDate ?? baseDate,
                Title = $"Ghi nhận thanh toán #{tx.TxCode}",
                Description = $"Đã thu {tx.Amount:N0} đ bằng phương thức {tx.PaymentMethod}",
                Actor = tx.CreatedByName,
                EventType = "PAYMENT"
            });
        }

        foreach (var rr in returnRequestsDto)
        {
            timeline.Add(new OrderTimelineEventDto
            {
                Timestamp = rr.RequestDate ?? baseDate,
                Title = $"Phát sinh phiếu trả hàng #{rr.ReturnCode}",
                Description = $"Lý do: {rr.Reason} (Trạng thái: {rr.Status})",
                Actor = rr.CreatedByName,
                EventType = "RETURN"
            });
        }

        if (string.Equals(order.Status, "COMPLETED", StringComparison.OrdinalIgnoreCase))
        {
            timeline.Add(new OrderTimelineEventDto
            {
                Timestamp = baseDate.AddSeconds(5),
                Title = "Đơn hàng hoàn thành",
                Description = "Giao dịch bán hàng và trừ tồn kho hoàn tất thành công",
                Actor = "Hệ thống StockFlow",
                EventType = "STATUS"
            });
        }

        timeline = timeline.OrderBy(t => t.Timestamp).ToList();

        // Tính toán các giá trị tổng kết
        decimal subTotalGross = itemsTotalGross > 0 ? itemsTotalGross : order.SubTotal;
        decimal subTotalAfterItemDisc = subTotalGross - itemsTotalDiscount;
        decimal orderDiscount = order.DiscountAmount;

        var bookingCode = order.BookingOrderId.HasValue
            ? await _context.TrxOrders.AsNoTracking().Where(o => o.OrderId == order.BookingOrderId.Value).Select(o => o.OrderCode).FirstOrDefaultAsync(cancellationToken)
            : null;
        var dto = new OrderDetailDto
        {
            OrderId = order.OrderId,
            OrderCode = order.OrderCode ?? $"HD{order.OrderId:D5}",
            BookingOrderId = order.BookingOrderId,
            BookingOrderCode = bookingCode,
            DepositAmount = order.DepositAmount,
            OrderType = order.OrderType ?? (order.OrderCode?.StartsWith("HD") == true ? "INVOICE" : "BOOKING"),
            DocumentType = (order.OrderType == "BOOKING" || string.Equals(order.Status, "DRAFT", StringComparison.OrdinalIgnoreCase) || string.Equals(order.Status, "PENDING", StringComparison.OrdinalIgnoreCase)) ? "SALES_ORDER" : "SALES_INVOICE",
            Status = order.Status ?? "COMPLETED",
            PaymentStatus = order.PaymentStatus ?? "PAID",
            OrderDate = order.OrderDate,
            UpdatedAt = order.UpdatedAt,
            CreatedById = order.CreatedBy,
            CreatedByName = order.CreatedByNavigation?.FullName ?? "Quản trị viên Hệ thống",
            CreatedByUsername = order.CreatedByNavigation?.Username ?? "admin",
            UpdatedById = order.UpdatedBy,
            UpdatedByName = order.UpdatedByNavigation?.FullName,
            WarehouseId = primaryWarehouse?.WarehouseId ?? order.WarehouseId,
            WarehouseName = primaryWarehouse?.WarehouseName ?? string.Empty,
            WarehouseCode = primaryWarehouse?.WarehouseCode ?? string.Empty,
            SalesRepName = salesRepName,
            Notes = order.Notes,
            PriceBookName = priceBookName ?? "Bảng giá chung",

            Customer = customerDto,
            Items = itemsDto,
            TotalQuantity = totalQty,
            ItemsTotalAmount = subTotalGross,
            ItemsDiscountAmount = itemsTotalDiscount,

            SubTotal = subTotalGross,
            ItemDiscountTotal = itemsTotalDiscount,
            SubTotalAfterItemDiscount = subTotalAfterItemDisc,
            OrderDiscountType = order.DiscountType ?? "AMOUNT",
            OrderDiscountValue = order.DiscountValue,
            OrderDiscountAmount = orderDiscount,
            DeliveryFee = 0,
            VatAmount = 0,
            TotalAmount = order.TotalAmount ?? 0,
            PaidAmount = order.PaidAmount ?? 0,
            OutstandingAmount = order.OutstandingAmount ?? 0,

            PaymentTransactions = paymentTxsDto,
            ExcessDebtPayments = excessDebtPayments,
            StockIssues = stockIssuesDto,
            ReturnRequests = returnRequestsDto,
            TimelineEvents = timeline
        };

        return Result<OrderDetailDto>.Success(dto);
    }
}

