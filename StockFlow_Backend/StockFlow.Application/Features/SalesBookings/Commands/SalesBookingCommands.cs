using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.SalesBookings.Common;
using StockFlow.Application.Features.SalesBookings.DTOs;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.SalesBookings.Commands;

/// <summary>Tạo (OrderId = null) hoặc sửa đơn đặt hàng. Không trừ tồn kho (BR-08).</summary>
public record SaveSalesBookingCommand(int? OrderId, SaveSalesBookingRequest Request) : IRequest<Result<SalesBookingSaveResultDto>>;

/// <summary>
/// Thao tác trạng thái: CONFIRM (xác nhận), CANCEL (hủy), FINISH (kết thúc, không giao phần còn lại).
/// Hủy đơn có tiền trả trước: KeepDeposit = false → hủy phiếu thu (hoàn tiền cho khách);
/// true → giữ phiếu thu thành khoản khách trả trước chung (không gắn đơn), công nợ khách giữ nguyên.
/// </summary>
public record SalesBookingActionCommand(int OrderId, string Action, bool KeepDeposit = false) : IRequest<Result<bool>>;

/// <summary>Gộp nhiều đơn đặt hàng cùng khách, cùng chi nhánh, chưa giao (BR-09)</summary>
public record MergeSalesBookingsCommand(List<int> OrderIds) : IRequest<Result<SalesBookingSaveResultDto>>;

public class SaveSalesBookingCommandValidator : AbstractValidator<SaveSalesBookingCommand>
{
    public SaveSalesBookingCommandValidator()
    {
        RuleFor(x => x.Request.PartnerId).GreaterThan(0).WithMessage("Vui lòng chọn khách hàng đặt hàng.");
        RuleFor(x => x.Request.WarehouseId).GreaterThan(0).WithMessage("Vui lòng chọn chi nhánh xử lý đơn.");
        RuleFor(x => x.Request.Items).NotEmpty().WithMessage("Đơn đặt hàng phải có ít nhất 1 hàng hóa.");
        RuleForEach(x => x.Request.Items).ChildRules(i =>
        {
            i.RuleFor(l => l.ProductId).GreaterThan(0).WithMessage("Hàng hóa không hợp lệ.");
            i.RuleFor(l => l.Quantity).GreaterThan(0).WithMessage("Số lượng đặt phải lớn hơn 0.")
                .LessThanOrEqualTo(100000).WithMessage("Số lượng đặt vượt quá giới hạn 100.000.");
            i.RuleFor(l => l.OriginalPrice).GreaterThanOrEqualTo(0).WithMessage("Đơn giá không được âm.");
            i.RuleFor(l => l.DiscountValue).GreaterThanOrEqualTo(0).WithMessage("Giảm giá không được âm.");
        });
        RuleFor(x => x.Request.DiscountValue).GreaterThanOrEqualTo(0).WithMessage("Giảm giá đơn không được âm.");
        RuleFor(x => x.Request.PaidAmount).GreaterThanOrEqualTo(0).WithMessage("Tiền khách trả trước không được âm.");
        RuleFor(x => x.Request.PaymentMethod)
            .Must(m => m is "CASH" or "VIETQR").WithMessage("Phương thức thanh toán chỉ gồm Tiền mặt hoặc Chuyển khoản.");
    }
}

public class SalesBookingCommandHandler :
    IRequestHandler<SaveSalesBookingCommand, Result<SalesBookingSaveResultDto>>,
    IRequestHandler<SalesBookingActionCommand, Result<bool>>,
    IRequestHandler<MergeSalesBookingsCommand, Result<SalesBookingSaveResultDto>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ITransactionCodeGenerator _codeGenerator;
    private readonly ICurrentUserService _currentUser;

    public SalesBookingCommandHandler(IStockFlowDbContext context, ITransactionCodeGenerator codeGenerator, ICurrentUserService currentUser)
    {
        _context = context;
        _codeGenerator = codeGenerator;
        _currentUser = currentUser;
    }

    // ───────────────────────── Tạo / sửa ─────────────────────────
    public async Task<Result<SalesBookingSaveResultDto>> Handle(SaveSalesBookingCommand command, CancellationToken ct)
    {
        if (!_currentUser.UserId.HasValue) return Fail("Không xác định được người dùng đăng nhập.");
        var userId = _currentUser.UserId.Value;
        var req = command.Request;

        var settings = await _context.MstOrderSettings.AsNoTracking().FirstOrDefaultAsync(s => s.SettingId == 1, ct) ?? new MstOrderSetting();
        if (command.OrderId == null && !settings.EnableOrderPlacement)
            return Fail("Hệ thống đang tạm ngừng nhận đơn đặt hàng mới (Thiết lập đơn hàng).");

        TrxOrder? booking = null;
        if (command.OrderId.HasValue)
        {
            booking = await _context.TrxOrders.Include(o => o.DtlOrderItems)
                .FirstOrDefaultAsync(o => o.OrderId == command.OrderId.Value && o.OrderType == SalesBookingOps.OrderType, ct);
            if (booking == null) return Fail("Không tìm thấy đơn đặt hàng.");
            if (booking.Status is not (SalesBookingOps.Draft or SalesBookingOps.Confirmed))
                return Fail($"Đơn {booking.OrderCode} đang ở trạng thái không cho phép sửa.");
            if (await _context.TrxOrders.AnyAsync(o => o.BookingOrderId == booking.OrderId && o.Status == "COMPLETED", ct))
                return Fail($"Đơn {booking.OrderCode} đã tạo hóa đơn giao hàng, không sửa được.");
            if (booking.WarehouseId.HasValue && !await _currentUser.HasWarehouseAccessAsync(booking.WarehouseId.Value, ct))
                return Fail("Bạn không có quyền sửa đơn đặt hàng của chi nhánh này.");
            if (booking.PartnerId != req.PartnerId && (booking.PaidAmount ?? 0) > 0)
                return Fail("Đơn đã có tiền khách trả trước, không đổi được khách hàng.");
        }

        var warehouse = await _context.MstWarehouses.AsNoTracking().FirstOrDefaultAsync(w => w.WarehouseId == req.WarehouseId, ct);
        if (warehouse == null || warehouse.IsActive == false) return Fail("Chi nhánh xử lý không tồn tại hoặc đã ngừng hoạt động.");
        if (!await _currentUser.HasWarehouseAccessAsync(req.WarehouseId, ct))
            return Fail($"Bạn không có quyền tạo đơn cho chi nhánh '{warehouse.WarehouseName}'.");

        var customer = await _context.MstBusinessPartners.FirstOrDefaultAsync(p => p.PartnerId == req.PartnerId, ct);
        if (customer == null || !(customer.PartnerType?.ToUpper() is "CUSTOMER" or "BOTH"))
            return Fail("Không tìm thấy khách hàng.");
        if (customer.IsActive == false) return Fail($"Khách hàng '{customer.PartnerName}' đang ngừng hoạt động.");

        var productIds = req.Items.Select(i => i.ProductId).Distinct().ToList();
        var products = await _context.MstProducts.AsNoTracking().Where(p => productIds.Contains(p.ProductId)).ToDictionaryAsync(p => p.ProductId, ct);
        foreach (var id in productIds)
        {
            if (!products.TryGetValue(id, out var p)) return Fail($"Hàng hóa ID {id} không tồn tại.");
            if (p.IsActive == false) return Fail($"Hàng '{p.ProductName}' ({p.ProductCode}) đã ngừng kinh doanh.");
        }

        // A2: không cho đặt hàng đã hết tồn
        if (!settings.AllowOrderWhenOutOfStock)
        {
            var stock = await _context.TrxInventoryBalances.AsNoTracking()
                .Where(b => b.WarehouseId == req.WarehouseId && productIds.Contains(b.ProductId))
                .GroupBy(b => b.ProductId).Select(g => new { g.Key, Qty = g.Sum(x => x.Quantity ?? 0) })
                .ToDictionaryAsync(x => x.Key, x => x.Qty, ct);
            var empty = productIds.FirstOrDefault(id => stock.GetValueOrDefault(id) <= 0);
            if (empty > 0)
                return Fail($"Hàng '{products[empty].ProductName}' đã hết tồn tại {warehouse.WarehouseName}. Thiết lập hiện không cho đặt hàng khi hết tồn.");
        }

        // Tiền: giảm giá dòng theo VNĐ / % trên 1 đơn vị, rồi giảm giá đơn
        var lines = req.Items.Select(i =>
        {
            var type = string.Equals(i.DiscountType, "PERCENT", StringComparison.OrdinalIgnoreCase) ? "PERCENT" : "AMOUNT";
            var perUnit = type == "PERCENT"
                ? Math.Min(i.OriginalPrice, Math.Round(i.OriginalPrice * Math.Min(i.DiscountValue, 100) / 100m, 0))
                : Math.Min(i.OriginalPrice, i.DiscountValue);
            var unitPrice = i.OriginalPrice - perUnit;
            return new DtlOrderItem
            {
                ProductId = i.ProductId,
                UnitId = i.UnitId > 0 ? i.UnitId : products[i.ProductId].BaseUnitId,
                Quantity = i.Quantity,
                OriginalPrice = i.OriginalPrice,
                DiscountType = type,
                DiscountValue = type == "PERCENT" ? Math.Min(i.DiscountValue, 100) : perUnit,
                DiscountAmount = perUnit * i.Quantity,
                UnitPrice = unitPrice,
                LineTotal = Math.Round(unitPrice * i.Quantity, 2),
            };
        }).ToList();
        var subTotal = lines.Sum(l => l.LineTotal);
        var orderDiscType = string.Equals(req.DiscountType, "PERCENT", StringComparison.OrdinalIgnoreCase) ? "PERCENT" : "AMOUNT";
        var orderDisc = Math.Min(subTotal, orderDiscType == "PERCENT"
            ? Math.Round(subTotal * Math.Min(req.DiscountValue, 100) / 100m, 0)
            : req.DiscountValue);
        var total = subTotal - orderDisc;

        var alreadyPaid = booking?.PaidAmount ?? 0;
        if (alreadyPaid + req.PaidAmount > total)
            return Fail(req.PaidAmount > 0
                ? $"Tiền khách trả trước ({alreadyPaid + req.PaidAmount:N0}) vượt quá giá trị đơn ({total:N0})."
                : $"Giá trị đơn ({total:N0}) nhỏ hơn tiền khách đã trả trước ({alreadyPaid:N0}).");

        var now = VietnamTime.Now;
        var orderDate = now;
        if (booking != null) orderDate = booking.OrderDate ?? now;
        else if (!settings.LockTransactionTime && req.OrderDate.HasValue)
        {
            orderDate = VietnamTime.From(req.OrderDate);
            if (orderDate > now.AddMinutes(1)) return Fail("Không được đặt hàng với thời gian trong tương lai.");
        }
        DateTime? deliveryDate = req.DeliveryDate.HasValue ? VietnamTime.From(req.DeliveryDate) : null;

        var dbContext = _context as DbContext;
        using var tx = dbContext != null ? await dbContext.Database.BeginTransactionAsync(ct) : null;
        try
        {
            if (booking == null)
            {
                booking = new TrxOrder
                {
                    OrderCode = await _codeGenerator.GenerateCodeAsync("BOOKING", settings, ct),
                    OrderType = SalesBookingOps.OrderType,
                    Status = SalesBookingOps.Draft,
                    CreatedBy = userId,
                    OrderDate = orderDate,
                    PaidAmount = 0,
                };
                _context.TrxOrders.Add(booking);
            }
            else
            {
                _context.DtlOrderItems.RemoveRange(booking.DtlOrderItems);
                booking.DtlOrderItems.Clear();
                booking.UpdatedAt = now;
                booking.UpdatedBy = userId;
            }

            booking.PartnerId = customer.PartnerId;
            booking.WarehouseId = req.WarehouseId;
            booking.DeliveryDate = deliveryDate;
            booking.SubTotal = subTotal;
            booking.DiscountType = orderDiscType;
            booking.DiscountValue = orderDiscType == "PERCENT" ? Math.Min(req.DiscountValue, 100) : orderDisc;
            booking.DiscountAmount = orderDisc;
            booking.TotalAmount = total;
            booking.Notes = string.IsNullOrWhiteSpace(req.Notes) ? null : req.Notes.Trim();
            foreach (var l in lines) booking.DtlOrderItems.Add(l);
            await _context.SaveChangesAsync(ct);

            if (req.PaidAmount > 0)
                await AddDepositAsync(booking, customer, req.PaidAmount, req.PaymentMethod, userId, ct);

            // Đơn đặt không có công nợ phải thu; tiền trả trước nằm ở PaidAmount
            booking.OutstandingAmount = 0;
            booking.PaymentStatus = (booking.PaidAmount ?? 0) <= 0 ? "UNPAID" : (booking.PaidAmount >= total ? "PAID" : "PARTIAL");
            await _context.SaveChangesAsync(ct);
            if (tx != null) await tx.CommitAsync(ct);

            return Result.Success(new SalesBookingSaveResultDto(booking.OrderId, booking.OrderCode ?? "", booking.Status ?? "", total, booking.PaidAmount ?? 0));
        }
        catch
        {
            if (tx != null) await tx.RollbackAsync(ct);
            throw;
        }
    }

    /// <summary>Phiếu thu tiền khách trả trước: giảm công nợ khách ngay (khách đang trả trước cho đơn)</summary>
    private async Task AddDepositAsync(TrxOrder booking, MstBusinessPartner customer, decimal amount, string method, int userId, CancellationToken ct)
    {
        var count = await _context.TrxFinancialTransactions
            .CountAsync(t => t.ReferenceType == "SALES_ORDER" && t.ReferenceId == booking.OrderId && t.TxType == "RECEIPT", ct);
        _context.TrxFinancialTransactions.Add(new TrxFinancialTransaction
        {
            PartnerId = customer.PartnerId,
            TxType = "RECEIPT",
            TxCode = count == 0 ? $"TT{booking.OrderCode}" : $"TT{booking.OrderCode}-{count}",
            Amount = amount,
            PaymentMethod = method,
            ReferenceType = "SALES_ORDER",
            ReferenceId = booking.OrderId,
            TransactionDate = VietnamTime.Now,
            CreatedBy = userId,
            Status = "COMPLETED",
        });
        booking.PaidAmount = (booking.PaidAmount ?? 0) + amount;
        customer.CurrentDebt = (customer.CurrentDebt ?? 0) - amount;
    }

    // ───────────────────────── Xác nhận / hủy / kết thúc ─────────────────────────
    public async Task<Result<bool>> Handle(SalesBookingActionCommand command, CancellationToken ct)
    {
        if (!_currentUser.UserId.HasValue) return Result.Failure<bool>("Không xác định được người dùng đăng nhập.");
        var userId = _currentUser.UserId.Value;

        var booking = await _context.TrxOrders.Include(o => o.Partner)
            .FirstOrDefaultAsync(o => o.OrderId == command.OrderId && o.OrderType == SalesBookingOps.OrderType, ct);
        if (booking == null) return Result.Failure<bool>("Không tìm thấy đơn đặt hàng.");
        if (booking.WarehouseId.HasValue && !await _currentUser.HasWarehouseAccessAsync(booking.WarehouseId.Value, ct))
            return Result.Failure<bool>("Bạn không có quyền thao tác đơn đặt hàng của chi nhánh này.");

        var hasInvoice = await _context.TrxOrders.AnyAsync(o => o.BookingOrderId == booking.OrderId && o.Status == "COMPLETED", ct);
        switch (command.Action.ToUpperInvariant())
        {
            case "CONFIRM":
                if (booking.Status != SalesBookingOps.Draft) return Result.Failure<bool>("Chỉ xác nhận được đơn ở trạng thái Phiếu tạm.");
                booking.Status = SalesBookingOps.Confirmed;
                break;

            case "CANCEL":
                if (!SalesBookingOps.IsOpen(booking.Status)) return Result.Failure<bool>($"Đơn {booking.OrderCode} đã hoàn thành hoặc đã hủy.");
                if (hasInvoice)
                    return Result.Failure<bool>($"Đơn {booking.OrderCode} đã tạo hóa đơn giao hàng. Dùng \"Kết thúc\" để dừng giao phần còn lại.");
                var deposits = await _context.TrxFinancialTransactions
                    .Where(t => t.ReferenceType == "SALES_ORDER" && t.ReferenceId == booking.OrderId && t.Status != "CANCELLED")
                    .ToListAsync(ct);
                if (command.KeepDeposit)
                {
                    // Giữ tiền: phiếu thu thành khoản khách trả trước chung (giống phiếu thu không gắn hóa đơn),
                    // công nợ khách giữ nguyên (đang âm = khách trả trước), trừ dần vào hóa đơn sau
                    foreach (var d in deposits)
                    {
                        d.ReferenceType = null;
                        d.ReferenceId = null;
                        d.Description = string.IsNullOrWhiteSpace(d.Description)
                            ? $"Tiền trả trước của đơn {booking.OrderCode} (đơn đã hủy)"
                            : d.Description;
                    }
                }
                else
                {
                    // Hoàn tiền cho khách: hủy phiếu thu, công nợ tăng lại
                    foreach (var d in deposits) d.Status = "CANCELLED";
                    if (booking.Partner != null) booking.Partner.CurrentDebt = (booking.Partner.CurrentDebt ?? 0) + deposits.Sum(d => d.Amount ?? 0);
                }
                booking.PaidAmount = 0;
                booking.PaymentStatus = "UNPAID";
                booking.Status = SalesBookingOps.Cancelled;
                break;

            case "FINISH":
                if (booking.Status != SalesBookingOps.Delivering)
                    return Result.Failure<bool>("Chỉ kết thúc được đơn đang giao hàng (đã giao 1 phần).");
                // Tiền trả trước còn dư (nếu có) giữ lại thành tiền khách trả trước trong công nợ
                booking.Status = SalesBookingOps.Finished;
                break;

            default:
                return Result.Failure<bool>("Thao tác không hợp lệ.");
        }

        booking.UpdatedAt = VietnamTime.Now;
        booking.UpdatedBy = userId;
        await _context.SaveChangesAsync(ct);
        return Result.Success(true);
    }

    // ───────────────────────── Gộp đơn ─────────────────────────
    public async Task<Result<SalesBookingSaveResultDto>> Handle(MergeSalesBookingsCommand command, CancellationToken ct)
    {
        if (!_currentUser.UserId.HasValue) return Fail("Không xác định được người dùng đăng nhập.");
        var userId = _currentUser.UserId.Value;
        var ids = command.OrderIds.Distinct().ToList();
        if (ids.Count < 2) return Fail("Cần chọn ít nhất 2 đơn đặt hàng để gộp.");

        var sources = await _context.TrxOrders.Include(o => o.DtlOrderItems)
            .Where(o => ids.Contains(o.OrderId) && o.OrderType == SalesBookingOps.OrderType)
            .OrderBy(o => o.OrderDate).ThenBy(o => o.OrderId)
            .ToListAsync(ct);
        if (sources.Count != ids.Count) return Fail("Có đơn đặt hàng không tồn tại.");
        var bad = sources.FirstOrDefault(o => o.Status is not (SalesBookingOps.Draft or SalesBookingOps.Confirmed));
        if (bad != null) return Fail($"Đơn {bad.OrderCode} không gộp được: chỉ gộp đơn Phiếu tạm hoặc Đã xác nhận, chưa giao hàng.");
        if (sources.Select(o => o.PartnerId).Distinct().Count() > 1) return Fail("Chỉ gộp được các đơn của cùng 1 khách hàng (BR-09).");
        if (sources.Select(o => o.WarehouseId).Distinct().Count() > 1) return Fail("Chỉ gộp được các đơn cùng chi nhánh xử lý.");
        var warehouseId = sources[0].WarehouseId!.Value;
        if (!await _currentUser.HasWarehouseAccessAsync(warehouseId, ct)) return Fail("Bạn không có quyền gộp đơn của chi nhánh này.");
        if (await _context.TrxOrders.AnyAsync(o => o.BookingOrderId.HasValue && ids.Contains(o.BookingOrderId.Value) && o.Status == "COMPLETED", ct))
            return Fail("Có đơn đã tạo hóa đơn giao hàng, không gộp được.");

        var settings = await _context.MstOrderSettings.AsNoTracking().FirstOrDefaultAsync(s => s.SettingId == 1, ct) ?? new MstOrderSetting();
        var now = VietnamTime.Now;

        var dbContext = _context as DbContext;
        using var tx = dbContext != null ? await dbContext.Database.BeginTransactionAsync(ct) : null;
        try
        {
            // Hàng trùng (cùng mã, cùng giá bán) cộng dồn số lượng
            var items = sources.SelectMany(o => o.DtlOrderItems)
                .GroupBy(i => new { i.ProductId, i.UnitId, i.OriginalPrice, Price = i.UnitPrice ?? 0, i.DiscountType, i.DiscountValue })
                .Select(g => new DtlOrderItem
                {
                    ProductId = g.Key.ProductId,
                    UnitId = g.Key.UnitId,
                    OriginalPrice = g.Key.OriginalPrice,
                    DiscountType = g.Key.DiscountType,
                    DiscountValue = g.Key.DiscountValue,
                    Quantity = g.Sum(x => x.Quantity ?? 0),
                    DiscountAmount = g.Sum(x => x.DiscountAmount),
                    UnitPrice = g.Key.Price,
                    LineTotal = g.Sum(x => x.LineTotal),
                }).ToList();
            var subTotal = items.Sum(i => i.LineTotal);
            var discount = Math.Min(subTotal, sources.Sum(o => o.DiscountAmount));
            var paid = sources.Sum(o => o.PaidAmount ?? 0);

            var merged = new TrxOrder
            {
                OrderCode = await _codeGenerator.GenerateCodeAsync("BOOKING", settings, ct),
                OrderType = SalesBookingOps.OrderType,
                Status = sources.Any(o => o.Status == SalesBookingOps.Confirmed) ? SalesBookingOps.Confirmed : SalesBookingOps.Draft,
                PartnerId = sources[0].PartnerId,
                WarehouseId = warehouseId,
                OrderDate = now,
                DeliveryDate = sources.Where(o => o.DeliveryDate.HasValue).Select(o => o.DeliveryDate).Min(),
                CreatedBy = userId,
                SubTotal = subTotal,
                DiscountType = "AMOUNT",
                DiscountValue = discount,
                DiscountAmount = discount,
                TotalAmount = subTotal - discount,
                PaidAmount = paid,
                OutstandingAmount = 0,
                PaymentStatus = paid <= 0 ? "UNPAID" : (paid >= subTotal - discount ? "PAID" : "PARTIAL"),
                Notes = string.Join(" | ", sources.Select(o => o.Notes).Where(n => !string.IsNullOrWhiteSpace(n))) is { Length: > 0 } n ? n : null,
            };
            foreach (var i in items) merged.DtlOrderItems.Add(i);
            _context.TrxOrders.Add(merged);
            await _context.SaveChangesAsync(ct);

            // Phiếu thu trả trước của các đơn gốc chuyển sang đơn mới (mã phiếu thu giữ nguyên)
            var deposits = await _context.TrxFinancialTransactions
                .Where(t => t.ReferenceType == "SALES_ORDER" && t.ReferenceId.HasValue && ids.Contains(t.ReferenceId.Value))
                .ToListAsync(ct);
            foreach (var d in deposits) d.ReferenceId = merged.OrderId;

            foreach (var o in sources)
            {
                o.Status = SalesBookingOps.Cancelled;
                o.ConsolidatedIntoOrderId = merged.OrderId;
                o.PaidAmount = 0;
                o.PaymentStatus = "UNPAID";
                o.UpdatedAt = now;
                o.UpdatedBy = userId;
            }

            await _context.SaveChangesAsync(ct);
            if (tx != null) await tx.CommitAsync(ct);
            return Result.Success(new SalesBookingSaveResultDto(merged.OrderId, merged.OrderCode ?? "", merged.Status ?? "", merged.TotalAmount ?? 0, paid));
        }
        catch
        {
            if (tx != null) await tx.RollbackAsync(ct);
            throw;
        }
    }

    private static Result<SalesBookingSaveResultDto> Fail(string message) => Result.Failure<SalesBookingSaveResultDto>(message);
}
