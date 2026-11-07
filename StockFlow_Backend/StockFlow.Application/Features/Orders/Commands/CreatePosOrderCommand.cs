using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Orders.DTOs;
using StockFlow.Application.Features.SalesBookings.Common;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Orders.Commands;

public record CreatePosOrderCommand(CreatePosOrderRequest Request) : IRequest<Result<PosOrderResultDto>>;

public class CreatePosOrderCommandValidator : AbstractValidator<CreatePosOrderCommand>
{
    private static readonly string[] AllowedPaymentMethods = { "CASH", "VIETQR", "DEBT" };

    public CreatePosOrderCommandValidator()
    {
        // PartnerId = 0 (không chọn khách) → bán cho "Khách lẻ" (KH00000), xử lý trong handler
        RuleFor(x => x.Request.PartnerId)
            .GreaterThanOrEqualTo(0).WithMessage("Khách hàng không hợp lệ (CUS-001).");

        RuleFor(x => x.Request.WarehouseId)
            .GreaterThan(0).WithMessage("Vui lòng chọn kho xuất hàng hợp lệ (INV-001).");

        RuleFor(x => x.Request.PaymentMethod)
            .Must(m => AllowedPaymentMethods.Contains(m?.ToUpper()))
            .WithMessage("Phương thức thanh toán không hợp lệ (PAY-001). Chỉ chấp nhận: Tiền mặt, Chuyển khoản (VietQR) hoặc Ghi công nợ.");

        RuleFor(x => x.Request.Items)
            .NotEmpty().WithMessage("Đơn hàng phải có ít nhất 1 sản phẩm (AMT-001).");

        RuleForEach(x => x.Request.Items).ChildRules(item =>
        {
            item.RuleFor(i => i.ProductId)
                .GreaterThan(0).WithMessage("Mã sản phẩm không hợp lệ (POS-001).");

            item.RuleFor(i => i.Quantity)
                .GreaterThan(0).WithMessage("Số lượng sản phẩm phải lớn hơn 0 (POS-005, POS-006).")
                .LessThanOrEqualTo(100000).WithMessage("Số lượng sản phẩm vượt quá giới hạn 100.000 (POS-008).");

            item.RuleFor(i => i.UnitPrice)
                .GreaterThanOrEqualTo(0).WithMessage("Đơn giá không được âm (POS-011).");
        });

        RuleFor(x => x.Request.DiscountAmount)
            .GreaterThanOrEqualTo(0).WithMessage("Số tiền giảm giá đơn hàng không được âm (AMT-005).");

        RuleFor(x => x.Request.PaidAmount)
            .GreaterThanOrEqualTo(0).WithMessage("Số tiền thanh toán trước không được âm (PAY-005).");
    }
}

public class CreatePosOrderCommandHandler : IRequestHandler<CreatePosOrderCommand, Result<PosOrderResultDto>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ITransactionCodeGenerator _codeGenerator;
    private readonly ICurrentUserService _currentUserService;

    public CreatePosOrderCommandHandler(
        IStockFlowDbContext context,
        ITransactionCodeGenerator codeGenerator,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _codeGenerator = codeGenerator;
        _currentUserService = currentUserService;
    }

    public async Task<Result<PosOrderResultDto>> Handle(CreatePosOrderCommand request, CancellationToken cancellationToken)
    {
        var req = request.Request;

        // Tải cấu hình thiết lập đơn hàng & quy tắc giao dịch (Singleton ID = 1)
        var settings = await _context.MstOrderSettings
            .FirstOrDefaultAsync(s => s.SettingId == 1, cancellationToken)
            ?? new MstOrderSetting();

        // Kiểm tra Group A1: Bật/tắt tiếp nhận đơn đặt hàng mới (áp dụng cho đơn PENDING/đặt trước)
        if (string.Equals(req.Status, "PENDING", StringComparison.OrdinalIgnoreCase) && !settings.EnableOrderPlacement)
        {
            return Result<PosOrderResultDto>.Failure("Hệ thống hiện đang tạm ngừng tiếp nhận đơn đặt hàng mới theo chính sách cài đặt (A1).");
        }

        // Thời gian bán người dùng chọn không được ở tương lai (kiểm tra trước khi sinh mã để không bỏ số hóa đơn)
        if (!settings.LockTransactionTime && req.OrderDate.HasValue)
        {
            // DB lưu giờ Việt Nam (timestamp without time zone) — so sánh theo giờ Việt Nam
            var requested = VietnamTime.From(req.OrderDate);
            if (requested > VietnamTime.Now.AddMinutes(1))
                return Result<PosOrderResultDto>.Failure("Không được bán hàng với thời gian trong tương lai.");
        }

        // 1. Chống gửi trùng đơn (Idempotency - AMT-015, PAY-016)
        if (!string.IsNullOrWhiteSpace(req.ClientRequestId))
        {
            var existingWithReq = await _context.TrxOrders
                .Include(o => o.Partner)
                .Where(o => o.Notes != null && o.Notes.Contains($"[REQ:{req.ClientRequestId}]"))
                .FirstOrDefaultAsync(cancellationToken);

            if (existingWithReq != null)
            {
                return Result<PosOrderResultDto>.Success(new PosOrderResultDto
                {
                    OrderId = existingWithReq.OrderId,
                    OrderCode = existingWithReq.OrderCode ?? "",
                    PartnerId = existingWithReq.PartnerId,
                    PartnerName = existingWithReq.Partner?.PartnerName ?? "",
                    SubTotal = existingWithReq.SubTotal,
                    DiscountType = existingWithReq.DiscountType ?? "AMOUNT",
                    DiscountValue = existingWithReq.DiscountValue,
                    DiscountAmount = existingWithReq.DiscountAmount,
                    TotalAmount = existingWithReq.TotalAmount ?? 0,
                    PaidAmount = existingWithReq.PaidAmount ?? 0,
                    ChangeAmount = 0,
                    OutstandingAmount = existingWithReq.OutstandingAmount ?? 0,
                    PaymentStatus = existingWithReq.PaymentStatus ?? "",
                    Status = existingWithReq.Status ?? "",
                    OrderDate = existingWithReq.OrderDate ?? VietnamTime.Now,
                    Message = "Đơn hàng đã được ghi nhận trước đó (Idempotent response)."
                });
            }
        }

        // Chống nhấp đúp tạo đơn trùng trong vòng 3 giây
        var duplicateRecent = await _context.TrxOrders
            .Where(o => (req.PartnerId <= 0 || o.PartnerId == req.PartnerId)
                     && o.TotalAmount == req.TotalAmount
                     && o.OrderDate >= VietnamTime.Now.AddSeconds(-3))
            .FirstOrDefaultAsync(cancellationToken);

        if (duplicateRecent != null)
        {
            return Result<PosOrderResultDto>.Failure("Giao dịch đang được xử lý, vui lòng không nhấn thanh toán nhiều lần liên tiếp (PAY-016).");
        }

        // 2. Kiểm tra kho xuất hàng (INV-001 -> INV-004)
        var warehouse = await _context.MstWarehouses
            .FirstOrDefaultAsync(w => w.WarehouseId == req.WarehouseId, cancellationToken);

        if (warehouse == null)
        {
            return Result<PosOrderResultDto>.Failure($"Kho xuất hàng (ID: {req.WarehouseId}) không tồn tại trong hệ thống (INV-002).");
        }

        if (warehouse.IsActive == false)
        {
            return Result<PosOrderResultDto>.Failure($"Kho xuất '{warehouse.WarehouseName}' đang tạm ngừng hoạt động, không thể xuất hàng (INV-003).");
        }

        // Cô lập dữ liệu kho: chỉ được bán/xuất hàng từ kho mình được phân quyền
        if (!await _currentUserService.HasWarehouseAccessAsync(req.WarehouseId, cancellationToken))
        {
            return Result<PosOrderResultDto>.Failure($"Bạn không có quyền xuất hàng từ kho '{warehouse.WarehouseName}' (AUTH-WH).");
        }

        if (!_currentUserService.UserId.HasValue)
        {
            return Result<PosOrderResultDto>.Failure("Không xác định được người dùng đăng nhập.");
        }
        var currentUserId = _currentUserService.UserId.Value;

        // 3. Kiểm tra khách hàng (CUS-001 -> CUS-003)
        // Không chọn khách → dùng hồ sơ "Khách lẻ" (KH00000), tự tạo nếu chưa có
        var customer = req.PartnerId > 0
            ? await _context.MstBusinessPartners.FirstOrDefaultAsync(p => p.PartnerId == req.PartnerId, cancellationToken)
            : await GetOrCreateWalkInCustomerAsync(cancellationToken);

        if (customer == null)
        {
            return Result<PosOrderResultDto>.Failure("Không tìm thấy thông tin khách hàng trong hệ thống (CUS-002).");
        }

        if (customer.IsActive == false)
        {
            return Result<PosOrderResultDto>.Failure($"Khách hàng '{customer.PartnerName}' đang trong trạng thái ngừng hoạt động, từ chối giao dịch (CUS-003).");
        }

        // 3b. Tạo hóa đơn từ đơn đặt hàng: cùng khách, cùng chi nhánh, đơn còn đang giao
        TrxOrder? booking = null;
        if (req.BookingOrderId is > 0)
        {
            booking = await _context.TrxOrders
                .FirstOrDefaultAsync(o => o.OrderId == req.BookingOrderId.Value && o.OrderType == SalesBookingOps.OrderType, cancellationToken);
            if (booking == null)
                return Result<PosOrderResultDto>.Failure("Không tìm thấy đơn đặt hàng để tạo hóa đơn.");
            if (!SalesBookingOps.IsOpen(booking.Status))
                return Result<PosOrderResultDto>.Failure($"Đơn đặt hàng {booking.OrderCode} đã hoàn thành hoặc đã hủy.");
            if (booking.PartnerId != customer.PartnerId)
                return Result<PosOrderResultDto>.Failure($"Hóa đơn phải cùng khách hàng với đơn đặt hàng {booking.OrderCode}.");
            if (booking.WarehouseId.HasValue && booking.WarehouseId.Value != req.WarehouseId)
                return Result<PosOrderResultDto>.Failure($"Đơn đặt hàng {booking.OrderCode} thuộc chi nhánh khác — hóa đơn phải xuất từ chi nhánh xử lý của đơn.");
        }

        // 4. Kiểm tra sản phẩm và trạng thái kinh doanh (POS-001 -> POS-008, POS-011)
        var productIds = req.Items.Select(i => i.ProductId).Distinct().ToList();
        var products = await _context.MstProducts
            .Where(p => productIds.Contains(p.ProductId))
            .ToDictionaryAsync(p => p.ProductId, cancellationToken);

        foreach (var item in req.Items)
        {
            if (!products.TryGetValue(item.ProductId, out var prod))
            {
                return Result<PosOrderResultDto>.Failure($"Sản phẩm với ID {item.ProductId} không tồn tại trên hệ thống (POS-002).");
            }

            if (prod.IsActive == false)
            {
                return Result<PosOrderResultDto>.Failure($"Sản phẩm '{prod.ProductName}' ({prod.ProductCode}) đã ngừng kinh doanh/ngừng hoạt động (POS-003).");
            }
        }

        // 5. Tính toán giảm giá từng mặt hàng (Cấp dòng) và tổng tiền hàng SubTotal
        // Tham khảo chuẩn KiotViet: hỗ trợ chiết khấu từng mặt hàng theo % hoặc VNĐ
        var calculatedItems = new List<(
            PosOrderItemRequest RequestItem,
            MstProduct Product,
            decimal OriginalPrice,
            string DiscountType,
            decimal DiscountValue,
            decimal DiscountAmount,
            decimal UnitPrice,
            decimal LineTotal
        )>();

        foreach (var item in req.Items)
        {
            var prod = products[item.ProductId];
            decimal origPrice = item.OriginalPrice > 0 ? item.OriginalPrice : (item.UnitPrice > 0 ? item.UnitPrice : (prod.StandardPrice ?? 0));
            string itemDiscType = string.Equals(item.DiscountType, "PERCENT", StringComparison.OrdinalIgnoreCase) ? "PERCENT" : "AMOUNT";
            decimal itemDiscValue = Math.Max(0, item.DiscountValue > 0 ? item.DiscountValue : item.DiscountPercent);

            decimal discPerUnit = 0;
            if (itemDiscType == "PERCENT")
            {
                discPerUnit = Math.Min(origPrice, Math.Round(origPrice * (itemDiscValue / 100m), 2));
            }
            else
            {
                discPerUnit = Math.Min(origPrice, itemDiscValue);
            }

            decimal itemTotalDiscount = discPerUnit * item.Quantity;
            if (itemDiscValue == 0 && item.DiscountAmount > 0)
            {
                itemTotalDiscount = Math.Min(origPrice * item.Quantity, item.DiscountAmount);
                discPerUnit = item.Quantity > 0 ? itemTotalDiscount / item.Quantity : 0;
            }

            decimal unitPrice = Math.Max(0, origPrice - discPerUnit);
            decimal lineTotal = Math.Round(unitPrice * item.Quantity, 2);

            calculatedItems.Add((item, prod, origPrice, itemDiscType, itemDiscValue, itemTotalDiscount, unitPrice, lineTotal));
        }

        decimal serverSubTotal = calculatedItems.Sum(c => c.LineTotal);

        // Tính toán giảm giá toàn bộ hóa đơn (Cấp đơn hàng theo % hoặc VNĐ)
        string orderDiscountType = string.Equals(req.DiscountType, "PERCENT", StringComparison.OrdinalIgnoreCase) ? "PERCENT" : "AMOUNT";
        decimal orderDiscountValue = Math.Max(0, req.DiscountValue);
        decimal orderDiscountAmount = 0;

        if (orderDiscountType == "PERCENT")
        {
            orderDiscountAmount = Math.Round(serverSubTotal * (orderDiscountValue / 100m), 2);
        }
        else
        {
            orderDiscountAmount = orderDiscountValue > 0 ? orderDiscountValue : Math.Max(0, req.DiscountAmount);
        }

        orderDiscountAmount = Math.Min(serverSubTotal, orderDiscountAmount);

        decimal vatAmount = Math.Max(0, req.VatAmount);
        decimal deliveryFee = Math.Max(0, req.DeliveryFee);
        decimal finalTotal = Math.Max(0, serverSubTotal - orderDiscountAmount + vatAmount + deliveryFee);

        if (finalTotal == 0 && req.Status.ToUpper() != "DRAFT" && serverSubTotal > 0 && orderDiscountAmount == 0)
        {
            return Result<PosOrderResultDto>.Failure("Tổng giá trị đơn hàng không hợp lệ (AMT-013).");
        }

        // 6. Kiểm tra tồn kho thực tế tại kho xuất (POS-014, POS-017, INV-005 -> INV-010)
        bool isCompleted = string.Equals(req.Status, "COMPLETED", StringComparison.OrdinalIgnoreCase) ||
                           (!string.Equals(req.Status, "DRAFT", StringComparison.OrdinalIgnoreCase) &&
                            !string.Equals(req.Status, "PENDING", StringComparison.OrdinalIgnoreCase));
        bool isPendingBooking = string.Equals(req.Status, "PENDING", StringComparison.OrdinalIgnoreCase);

        Dictionary<int, TrxInventoryBalance> balanceMap = new();

        var balances = await _context.TrxInventoryBalances
            .Where(b => productIds.Contains(b.ProductId) && b.WarehouseId == req.WarehouseId)
            .ToListAsync(cancellationToken);

        // Một hàng có thể có nhiều dòng tồn (vị trí / lô) → dùng dòng tồn chung (không vị trí, không lô) nếu có
        balanceMap = balances
            .GroupBy(b => b.ProductId)
            .ToDictionary(g => g.Key, g => g.FirstOrDefault(b => b.LocationId == null && b.LotId == null) ?? g.First());

        // Gom số lượng yêu cầu theo từng sản phẩm (xử lý tình huống quét nhiều dòng cùng mã - POS-004)
        var productQuantitySummary = req.Items
            .GroupBy(i => i.ProductId)
            .ToDictionary(g => g.Key, g => g.Sum(x => x.Quantity));

        // Group A2: Nếu là đơn đặt hàng (PENDING) mà không cho phép đặt khi hết hàng
        if (isPendingBooking && !settings.AllowOrderWhenOutOfStock)
        {
            foreach (var (pId, requestedQty) in productQuantitySummary)
            {
                var prod = products[pId];
                balanceMap.TryGetValue(pId, out var currentBalance);
                decimal currentStock = currentBalance?.Quantity ?? 0;
                if (currentStock <= 0)
                {
                    return Result<PosOrderResultDto>.Failure(
                        $"Sản phẩm '{prod.ProductName}' (Mã: {prod.ProductCode}) hiện đã hết hàng tồn kho. Chính sách hệ thống không cho phép nhận đặt hàng khi hết tồn kho (A2).");
                }
            }
        }

        // Group A3: Tính toán lượng hàng đang tạm giữ cho các đơn đặt hàng khác
        // (hàng khách đặt ở các đơn đặt hàng còn mở của chi nhánh, trừ chính đơn đang giao)
        Dictionary<int, decimal> reservedMap = new();
        if (!settings.AllowSellingReservedStock && req.IssueStockNow && isCompleted)
        {
            reservedMap = await SalesBookingOps.ReservedQtyAsync(_context, req.WarehouseId, productIds, booking?.OrderId, cancellationToken);
        }

        // Group B1 & A3: Kiểm tra khi xuất kho ngay
        if (req.IssueStockNow && isCompleted)
        {
            foreach (var (pId, requestedQty) in productQuantitySummary)
            {
                var prod = products[pId];
                balanceMap.TryGetValue(pId, out var currentBalance);
                decimal currentStock = currentBalance?.Quantity ?? 0;
                decimal reservedStock = reservedMap.TryGetValue(pId, out var rQty) ? rQty : 0;
                decimal availableStock = currentStock - reservedStock;

                // Nếu không cho phép bán âm (B1 = false)
                if (!settings.AllowNegativeStockSale)
                {
                    if (currentStock < requestedQty)
                    {
                        return Result<PosOrderResultDto>.Failure(
                            $"Sản phẩm '{prod.ProductName}' (Mã: {prod.ProductCode}) không đủ tồn kho tại {warehouse.WarehouseName}. Tồn hiện tại: {currentStock:N0} {prod.BaseUnit?.UnitName ?? "Cái"}, Số lượng yêu cầu xuất: {requestedQty:N0}. Không thể xuất âm kho (B1, POS-014, INV-006).");
                    }

                    // Không cho phép bán hàng đang tạm giữ cho đơn khác (A3 = false)
                    if (!settings.AllowSellingReservedStock && availableStock < requestedQty)
                    {
                        return Result<PosOrderResultDto>.Failure(
                            $"Sản phẩm '{prod.ProductName}' (Mã: {prod.ProductCode}) có tồn kho {currentStock:N0} nhưng đang tạm giữ {reservedStock:N0} cho các đơn đặt hàng khác. Tồn khả dụng: {availableStock:N0}, Yêu cầu xuất: {requestedQty:N0}. Chính sách hệ thống không cho phép bán hàng đang tạm giữ (A3).");
                    }
                }
            }
        }

        // 7. Tính toán thanh toán, tiền thừa và công nợ (PAY-001 -> PAY-020, CUS-006 -> CUS-010)
        bool isWalkIn = customer.PartnerCode == "KH00000"
                     || (customer.PartnerName != null && customer.PartnerName.Contains("Khách lẻ"));

        // Hóa đơn từ đơn đặt hàng: tiền khách đã trả trước (còn dư) được trừ vào hóa đơn
        decimal depositApplied = booking != null
            ? Math.Min(finalTotal, await SalesBookingOps.RemainingDepositAsync(_context, booking, cancellationToken))
            : 0;
        decimal dueNow = finalTotal - depositApplied;

        bool isRecordDebtExcess = !isWalkIn && string.Equals(req.ExcessAction, "RECORD_DEBT", StringComparison.OrdinalIgnoreCase);
        decimal rawChangeAmount = Math.Max(0, req.PaidAmount - dueNow);
        decimal actualReceived;
        decimal changeAmount;
        decimal outstanding;

        if (req.PaidAmount >= dueNow)
        {
            if (isRecordDebtExcess && rawChangeAmount > 0)
            {
                actualReceived = req.PaidAmount; // Thu ngân thực nhận toàn bộ tiền khách đưa để trừ công nợ
                changeAmount = 0; // Không thối lại tiền mặt
                outstanding = 0;
            }
            else
            {
                actualReceived = dueNow;
                changeAmount = rawChangeAmount; // Thối tiền thừa cho khách tại quầy
                outstanding = 0;
            }
        }
        else
        {
            actualReceived = req.PaidAmount;
            changeAmount = 0;
            outstanding = dueNow - actualReceived;
        }

        if (isWalkIn && outstanding > 0)
        {
            return Result<PosOrderResultDto>.Failure(
                "Khách lẻ tại quầy bắt buộc phải thanh toán đủ 100% (Tiền mặt, VietQR, Thẻ POS). Không áp dụng hình thức ghi nợ cho khách lẻ (PAY-009).");
        }

        // Kiểm tra hạn mức tín dụng nếu có phát sinh công nợ
        if (outstanding > 0 && isCompleted)
        {
            decimal currentDebt = customer.CurrentDebt ?? 0;
            decimal creditLimit = customer.CreditLimit ?? 0;

            if (creditLimit <= 0)
            {
                return Result<PosOrderResultDto>.Failure(
                    $"Khách hàng '{customer.PartnerName}' không có hạn mức tín dụng (Hạn mức: 0 đ). Không thể thực hiện ghi công nợ (CUS-007).");
            }

            // Tiền trả trước của đơn đặt đã giảm dư nợ từ trước → cộng lại khi so hạn mức (BR-10)
            currentDebt += depositApplied;
            decimal remainingCredit = Math.Max(0, creditLimit - currentDebt);

            if (currentDebt >= creditLimit)
            {
                return Result<PosOrderResultDto>.Failure(
                    $"Khách hàng '{customer.PartnerName}' đã sử dụng hết hạn mức tín dụng (Hạn mức: {creditLimit:N0} đ, Dư nợ hiện tại: {currentDebt:N0} đ). Không thể phát sinh thêm nợ {outstanding:N0} đ (CUS-008).");
            }

            if (currentDebt + outstanding > creditLimit)
            {
                decimal excess = (currentDebt + outstanding) - creditLimit;
                return Result<PosOrderResultDto>.Failure(
                    $"Khoản nợ {outstanding:N0} đ vượt quá hạn mức tín dụng còn lại của khách hàng {excess:N0} đ. (Hạn mức tín dụng: {creditLimit:N0} đ, Dư nợ hiện tại: {currentDebt:N0} đ, Còn được nợ: {remainingCredit:N0} đ) (CUS-009).");
            }
        }

        // 8. Sinh mã chứng từ theo cấu hình hệ thống (Group E1)
        string docType = isPendingBooking ? "BOOKING" : "ORDER";
        string orderCode = await _codeGenerator.GenerateCodeAsync(docType, settings, cancellationToken);

        // Group D1: Khóa ngày giao dịch theo cấu hình hệ thống
        DateTime finalOrderDate;
        if (settings.LockTransactionTime || !req.OrderDate.HasValue)
        {
            finalOrderDate = VietnamTime.Now;
        }
        else
        {
            // Giờ người dùng chọn (ISO UTC từ trình duyệt) → giờ Việt Nam để lưu DB
            finalOrderDate = VietnamTime.From(req.OrderDate);

            // Không cho bán với thời gian trong tương lai (cho lệch 1 phút do đồng hồ máy khách)
            if (finalOrderDate > VietnamTime.Now.AddMinutes(1))
            {
                return Result<PosOrderResultDto>.Failure("Không được bán hàng với thời gian trong tương lai.");
            }
        }

        decimal totalPaid = actualReceived + depositApplied;
        string paymentStatus = finalTotal == 0
            ? "PAID"
            : (totalPaid >= finalTotal ? "PAID" : (totalPaid > 0 ? "PARTIAL" : "DEBT"));

        string clientReqTag = !string.IsNullOrWhiteSpace(req.ClientRequestId) ? $" [REQ:{req.ClientRequestId}]" : "";
        string finalNotes = $"{req.Notes ?? ""}{clientReqTag}".Trim();

var dbContext = _context as DbContext;
        using var transaction = dbContext != null ? await dbContext.Database.BeginTransactionAsync(cancellationToken) : null;

        try
        {
            var order = new TrxOrder
            {
                OrderCode = orderCode,
                PartnerId = customer.PartnerId,
                Status = isCompleted ? "COMPLETED" : (isPendingBooking ? SalesBookingOps.Draft : "DRAFT"),
                SubTotal = serverSubTotal,
                DiscountType = orderDiscountType,
                DiscountValue = orderDiscountValue,
                DiscountAmount = orderDiscountAmount,
                TotalAmount = finalTotal,
                PaidAmount = totalPaid,
                OutstandingAmount = outstanding,
                PaymentStatus = paymentStatus,
                CreatedBy = currentUserId,
                OrderDate = finalOrderDate,
                Notes = string.IsNullOrWhiteSpace(finalNotes) ? null : finalNotes,
                OrderType = isPendingBooking ? SalesBookingOps.OrderType : SalesBookingOps.InvoiceType,
                WarehouseId = req.WarehouseId,
                BookingOrderId = booking?.OrderId,
                DepositAmount = depositApplied,
            };

            _context.TrxOrders.Add(order);
            await _context.SaveChangesAsync(cancellationToken);

            // 9. Thêm chi tiết đơn hàng DtlOrderItems kèm chiết khấu cấp dòng
            var addedOrderItems = new List<(DtlOrderItem OrderItem, PosOrderItemRequest RequestItem, MstProduct Product)>();
            foreach (var c in calculatedItems)
            {
                var item = c.RequestItem;
                var prod = c.Product;
                var orderItem = new DtlOrderItem
                {
                    OrderId = order.OrderId,
                    ProductId = item.ProductId,
                    Quantity = item.Quantity,
                    UnitId = item.UnitId > 0 ? item.UnitId : prod.BaseUnitId,
                    OriginalPrice = c.OriginalPrice,
                    DiscountType = c.DiscountType,
                    DiscountValue = c.DiscountValue,
                    DiscountAmount = c.DiscountAmount,
                    UnitPrice = c.UnitPrice,
                    LineTotal = c.LineTotal
                };
                _context.DtlOrderItems.Add(orderItem);
                addedOrderItems.Add((orderItem, item, prod));
            }

            await _context.SaveChangesAsync(cancellationToken);

            // 10. Tạo Phiếu xuất kho chính thức (TrxStockIssue) và chi tiết xuất kho (DtlStockIssueItem)
            TrxStockIssue? stockIssue = null;
            if (req.IssueStockNow && isCompleted)
            {
                string stockIssueCode = await _codeGenerator.GenerateCodeAsync("STOCK_ISSUE", settings, cancellationToken);
                stockIssue = new TrxStockIssue
                {
                    IssueCode = stockIssueCode,
                    IssueType = "SALES",
                    SalesOrderId = order.OrderId,
                    WarehouseId = req.WarehouseId,
                    RequestedBy = currentUserId,
                    ProcessedBy = currentUserId,
                    RequestedDate = finalOrderDate,
                    ProcessedDate = finalOrderDate,
                    Status = "COMPLETED"
                };
                _context.TrxStockIssues.Add(stockIssue);
                await _context.SaveChangesAsync(cancellationToken);

                foreach (var (orderItem, item, prod) in addedOrderItems)
                {
                    var stockIssueItem = new DtlStockIssueItem
                    {
                        StockIssueId = stockIssue.StockIssueId,
                        OrderItemId = orderItem.OrderItemId,
                        RequestedQty = item.Quantity,
                        ActualIssuedQty = item.Quantity
                    };
                    _context.DtlStockIssueItems.Add(stockIssueItem);

                    // Trừ tồn kho tại kho xuất
                    if (balanceMap.TryGetValue(item.ProductId, out var balance))
                    {
                        balance.Quantity = (balance.Quantity ?? 0) - item.Quantity;
                        balance.LastUpdated = finalOrderDate;
                    }
                    else
                    {
                        var newBalance = new TrxInventoryBalance
                        {
                            WarehouseId = req.WarehouseId,
                            ProductId = item.ProductId,
                            Quantity = -item.Quantity,
                            LastUpdated = finalOrderDate
                        };
                        _context.TrxInventoryBalances.Add(newBalance);
                        balanceMap[item.ProductId] = newBalance;
                    }

                    // Ghi lịch sử biến động thẻ kho trỏ tới phiếu xuất kho
                    // (thời gian thẻ kho theo giờ Việt Nam như các nghiệp vụ kho khác; bán hàng không đổi giá vốn)
                    var issuedBalance = balanceMap[item.ProductId];
                    _context.TrxInventoryTransactions.Add(new TrxInventoryTransaction
                    {
                        WarehouseId = req.WarehouseId,
                        ProductId = item.ProductId,
                        TransactionType = "ISSUE_SALE",
                        Quantity = -item.Quantity,
                        ReferenceType = "STOCK_ISSUE",
                        ReferenceId = stockIssue.StockIssueId,
                        TransactionDate = VietnamTime.From(finalOrderDate),
                        CreatedBy = currentUserId,
                        TransactionPrice = orderItem.UnitPrice,
                        UnitCost = issuedBalance.UnitCost ?? prod.MovingAverageCost,
                        BalanceAfter = issuedBalance.Quantity
                    });
                }
            }

            // 11. Cập nhật dư nợ khách hàng
            if (isCompleted)
            {
                // Tiền trả trước của đơn đặt đã giảm nợ lúc thu → nay trừ vào hóa đơn thì cộng lại phần đó
                decimal debtDelta = depositApplied;
                if (outstanding > 0)
                {
                    // Khách trả thiếu -> Ghi nợ phát sinh
                    debtDelta += outstanding;
                }
                else if (isRecordDebtExcess && rawChangeAmount > 0)
                {
                    // Khách trả thừa và chọn "Tính vào công nợ" -> Ghi có giảm nợ cũ hoặc cọc đơn sau
                    debtDelta -= rawChangeAmount;
                }
                if (debtDelta != 0) customer.CurrentDebt = (customer.CurrentDebt ?? 0) + debtDelta;
            }

            // 12. Ghi nhận giao dịch tài chính (Phiếu thu)
            if (actualReceived > 0 && isCompleted)
            {
                _context.TrxFinancialTransactions.Add(new TrxFinancialTransaction
                {
                    PartnerId = customer.PartnerId,
                    TxType = "RECEIPT",
                    // Mã phiếu thu theo hóa đơn: TTHD000085 (lần thu sau: TTHD000085-1, -2...)
                    TxCode = $"TT{order.OrderCode}",
                    Amount = actualReceived,
                    PaymentMethod = req.PaymentMethod,
                    ReferenceType = "SALES_ORDER",
                    ReferenceId = order.OrderId,
                    TransactionDate = finalOrderDate,
CreatedBy = currentUserId,
                    Status = "COMPLETED",
                    // Ghi chú phiếu thu để trống: người dùng tự nhập khi sửa phiếu thu
                    Description = null
                });
            }

            await _context.SaveChangesAsync(cancellationToken);

            // Đơn đặt hàng: cập nhật SL đã giao → Đang giao hàng / Hoàn thành
            if (booking != null && isCompleted)
            {
                await SalesBookingOps.RecomputeStatusAsync(_context, booking.OrderId, currentUserId, cancellationToken);
                await _context.SaveChangesAsync(cancellationToken);
            }

            if (transaction != null)
            {
                await transaction.CommitAsync(cancellationToken);
            }

            string excessNote = isRecordDebtExcess && rawChangeAmount > 0
                ? $" (Đã giảm {rawChangeAmount:N0} đ nợ cho khách, dư nợ mới: {customer.CurrentDebt:N0} đ)"
                : (outstanding > 0 ? $" (Ghi nợ {outstanding:N0} đ, dư nợ mới: {customer.CurrentDebt:N0} đ)" : "");
            string stockIssueMsg = stockIssue != null ? $" kèm phiếu xuất kho {stockIssue.IssueCode}" : "";

            return Result<PosOrderResultDto>.Success(new PosOrderResultDto
            {
                OrderId = order.OrderId,
                OrderCode = order.OrderCode,
                PartnerId = customer.PartnerId,
                PartnerName = customer.PartnerName ?? "",
                SubTotal = serverSubTotal,
                DiscountType = orderDiscountType,
                DiscountValue = orderDiscountValue,
                DiscountAmount = orderDiscountAmount,
                TotalAmount = finalTotal,
                PaidAmount = totalPaid,
                DepositAmount = depositApplied,
                ChangeAmount = changeAmount,
                OutstandingAmount = outstanding,
                PaymentStatus = paymentStatus,
                Status = order.Status,
                OrderDate = order.OrderDate ?? VietnamTime.Now,
                StockIssueId = stockIssue?.StockIssueId,
                StockIssueCode = stockIssue?.IssueCode,
                CustomerCurrentDebt = customer.CurrentDebt ?? 0,
                Message = $"Tạo đơn hàng POS thành công{stockIssueMsg}!{excessNote}"
            });
        }
        catch
        {
            if (transaction != null)
            {
                await transaction.RollbackAsync(cancellationToken);
            }
            throw;
        }
    }

    /// <summary>Hồ sơ "Khách lẻ" dùng cho đơn POS không chọn khách (mã KH00000, chỉ thanh toán đủ, không ghi nợ).</summary>
    private async Task<MstBusinessPartner> GetOrCreateWalkInCustomerAsync(CancellationToken ct)
    {
        var walkIn = await _context.MstBusinessPartners.FirstOrDefaultAsync(p => p.PartnerCode == WalkInCustomerCode, ct);
        if (walkIn != null) return walkIn;
        walkIn = new MstBusinessPartner
        {
            PartnerCode = WalkInCustomerCode,
            PartnerName = "Khách lẻ",
            PartnerType = "CUSTOMER",
            CreditLimit = 0,
            CurrentDebt = 0,
            CurrentPayable = 0,
            IsActive = true,
            CreatedAt = VietnamTime.Now,
            CreatedBy = _currentUserService.UserId,
        };
        _context.MstBusinessPartners.Add(walkIn);
        await _context.SaveChangesAsync(ct);
        return walkIn;
    }

    public const string WalkInCustomerCode = "KH00000";
}
