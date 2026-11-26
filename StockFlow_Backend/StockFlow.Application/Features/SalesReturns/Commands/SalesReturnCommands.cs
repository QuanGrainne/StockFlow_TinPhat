using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Orders.Commands;
using StockFlow.Application.Features.SalesReturns.DTOs;
using StockFlow.Application.Features.SalesReturns.Queries;
using StockFlow.Application.Features.Transfers.Helpers;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.SalesReturns.Commands;

/// <summary>
/// Khách trả hàng theo hóa đơn (UC-23, BR-18/19):
/// - Phiếu trả gắn với hóa đơn gốc đã hoàn thành; SL trả ≤ SL đã mua − SL đã trả ở phiếu khác.
/// - Hàng trả nhập lại kho chi nhánh bán (ghi thẻ kho "Khách trả hàng"): nhân viên đã kiểm tra chất lượng trước khi nhận lại.
/// - Công nợ khách giảm theo "Cần trả khách"; tiền trả khách ngay làm công nợ tăng lại (phiếu chi trả khách).
/// </summary>
public record CreateSalesReturnCommand(CreateSalesReturnRequest Request) : IRequest<Result<SalesReturnResultDto>>, IRetryOnConcurrencyConflict;

/// <summary>Hủy phiếu trả: xuất lại kho hàng đã nhập, hoàn lại công nợ, hủy phiếu chi trả khách</summary>
public record CancelSalesReturnCommand(int ReturnId) : IRequest<Result<bool>>, IRetryOnConcurrencyConflict;

/// <summary>Trả thêm tiền cho khách (phần chưa trả lúc trả hàng): tạo phiếu chi, công nợ khách tăng lại tương ứng</summary>
public record AddSalesReturnRefundCommand(int ReturnId, AddSalesReturnRefundRequest Request) : IRequest<Result<SalesReturnResultDto>>;

/// <summary>Sửa ghi chú phiếu trả</summary>
public record UpdateSalesReturnNotesCommand(int ReturnId, string? Notes) : IRequest<Result<bool>>;

public class CreateSalesReturnCommandValidator : AbstractValidator<CreateSalesReturnCommand>
{
    public CreateSalesReturnCommandValidator()
    {
        RuleFor(x => x.Request.InvoiceId).GreaterThanOrEqualTo(0).WithMessage("Hóa đơn trả hàng không hợp lệ.");
        // Trả nhanh (InvoiceId = 0): cần chi nhánh và mã hàng của từng dòng
        RuleFor(x => x.Request.WarehouseId).GreaterThan(0).When(x => x.Request.InvoiceId == 0)
            .WithMessage("Vui lòng chọn chi nhánh nhận hàng trả.");
        RuleFor(x => x.Request.Items).Must(items => items.All(i => i.ProductId > 0)).When(x => x.Request.InvoiceId == 0)
            .WithMessage("Hàng hóa trả không hợp lệ.");
        RuleFor(x => x.Request.DiscountAmount).GreaterThanOrEqualTo(0).WithMessage("Giảm giá không được âm.");
        RuleFor(x => x.Request.ReturnFee).GreaterThanOrEqualTo(0).WithMessage("Phí trả hàng không được âm.");
        RuleFor(x => x.Request.RefundAmount).GreaterThanOrEqualTo(0).WithMessage("Tiền trả khách không được âm.");
        RuleFor(x => x.Request.PaymentMethod).Must(m => m is "CASH" or "VIETQR")
            .WithMessage("Phương thức trả tiền chỉ gồm Tiền mặt hoặc Chuyển khoản.");
        RuleForEach(x => x.Request.Items).ChildRules(i =>
        {
            i.RuleFor(l => l.Quantity).GreaterThanOrEqualTo(0).WithMessage("Số lượng trả không được âm.");
            i.RuleFor(l => l.ReturnPrice).GreaterThanOrEqualTo(0).WithMessage("Giá nhập lại không được âm.");
        });
    }
}

public class SalesReturnCommandHandler :
    IRequestHandler<CreateSalesReturnCommand, Result<SalesReturnResultDto>>,
    IRequestHandler<CancelSalesReturnCommand, Result<bool>>,
    IRequestHandler<UpdateSalesReturnNotesCommand, Result<bool>>,
    IRequestHandler<AddSalesReturnRefundCommand, Result<SalesReturnResultDto>>
{
    private readonly IStockFlowDbContext _context;
    private readonly ITransactionCodeGenerator _codeGenerator;
    private readonly ICurrentUserService _currentUser;

    public SalesReturnCommandHandler(IStockFlowDbContext context, ITransactionCodeGenerator codeGenerator, ICurrentUserService currentUser)
    {
        _context = context;
        _codeGenerator = codeGenerator;
        _currentUser = currentUser;
    }

    public async Task<Result<SalesReturnResultDto>> Handle(CreateSalesReturnCommand command, CancellationToken ct)
    {
        if (!_currentUser.UserId.HasValue) return Fail("Không xác định được người dùng đăng nhập.");
        var userId = _currentUser.UserId.Value;
        var req = command.Request;

        var lines = req.Items.Where(i => i.Quantity > 0).ToList();
        if (lines.Count == 0) return Fail("Chọn ít nhất 1 hàng hóa với số lượng trả lớn hơn 0.");

        var isQuick = req.InvoiceId == 0;
        TrxOrder? invoice = null;
        MstBusinessPartner? partner;
        int warehouseId;
        // (ProductId, OrderItemId, giá bán, hệ số quy đổi của đơn vị bán) của từng dòng trả.
        // SL trả theo đơn vị đã bán trên hóa đơn; nhập lại kho theo đơn vị cơ bản = SL × hệ số.
        var resolved = new List<(SalesReturnLineRequest Line, int ProductId, int? OrderItemId, decimal SalePrice, decimal Rate)>();
        Dictionary<int, MstProduct> products;

        if (isQuick)
        {
            // Trả nhanh: khách quên hóa đơn → không có hóa đơn gốc, không giới hạn theo SL đã mua
            var warehouse = await _context.MstWarehouses.AsNoTracking().FirstOrDefaultAsync(w => w.WarehouseId == req.WarehouseId, ct);
            if (warehouse == null || warehouse.IsActive == false) return Fail("Chi nhánh nhận hàng trả không tồn tại hoặc đã ngừng hoạt động.");
            if (!await _currentUser.HasWarehouseAccessAsync(req.WarehouseId, ct)) return Fail("Bạn không có quyền trả hàng của chi nhánh này.");
            warehouseId = req.WarehouseId;

            partner = req.PartnerId > 0
                ? await _context.MstBusinessPartners.FirstOrDefaultAsync(p => p.PartnerId == req.PartnerId, ct)
                : await GetOrCreateWalkInAsync(ct);
            if (partner == null || !(partner.PartnerType?.ToUpper() is "CUSTOMER" or "BOTH")) return Fail("Không tìm thấy khách hàng.");

            var ids = lines.Select(l => l.ProductId).Distinct().ToList();
            products = await _context.MstProducts.Where(p => ids.Contains(p.ProductId)).ToDictionaryAsync(p => p.ProductId, ct);
            if (lines.Any(l => !products.ContainsKey(l.ProductId))) return Fail("Có hàng hóa trả không tồn tại.");
            resolved.AddRange(lines.Select(l => (l, l.ProductId, (int?)null, l.ReturnPrice, 1m)));
        }
        else
        {
            invoice = await _context.TrxOrders
                .Include(o => o.Partner)
                .Include(o => o.TrxStockIssues)
                .Include(o => o.DtlOrderItems)
                .FirstOrDefaultAsync(o => o.OrderId == req.InvoiceId, ct);
            if (invoice == null || invoice.OrderType == "BOOKING") return Fail("Không tìm thấy hóa đơn gốc (BR-18).");
            if (!string.Equals(invoice.Status, "COMPLETED", StringComparison.OrdinalIgnoreCase))
                return Fail($"Hóa đơn {invoice.OrderCode} chưa hoàn thành hoặc đã hủy, không trả hàng được.");
            var invoiceWarehouse = invoice.WarehouseId ?? invoice.TrxStockIssues.Select(si => (int?)si.WarehouseId).FirstOrDefault();
            if (!invoiceWarehouse.HasValue) return Fail("Không xác định được chi nhánh bán của hóa đơn.");
            if (!await _currentUser.HasWarehouseAccessAsync(invoiceWarehouse.Value, ct))
                return Fail("Bạn không có quyền trả hàng của chi nhánh này.");
            warehouseId = invoiceWarehouse.Value;
            partner = invoice.Partner;

            // BR-19: không trả vượt SL còn được trả của từng dòng hóa đơn
            var returned = await SalesReturnOps.ReturnedByOrderItemAsync(_context, invoice.OrderId, null, ct);
            var orderItems = invoice.DtlOrderItems.ToDictionary(i => i.OrderItemId);
            var productIds = invoice.DtlOrderItems.Select(i => i.ProductId).Distinct().ToList();
            products = await _context.MstProducts.Where(p => productIds.Contains(p.ProductId)).ToDictionaryAsync(p => p.ProductId, ct);
            foreach (var g in lines.GroupBy(l => l.OrderItemId))
            {
                if (!orderItems.TryGetValue(g.Key, out var oi)) return Fail("Hàng trả không thuộc hóa đơn gốc (BR-18).");
                var remaining = (oi.Quantity ?? 0) - returned.GetValueOrDefault(g.Key);
                if (g.Sum(x => x.Quantity) > remaining)
                {
                    var name = products.GetValueOrDefault(oi.ProductId)?.ProductName ?? $"SP{oi.ProductId}";
                    return Fail($"\"{name}\" chỉ còn được trả {remaining:N0} (đã mua {oi.Quantity:N0}, đã trả {returned.GetValueOrDefault(g.Key):N0}) (BR-19).");
                }
            }
            resolved.AddRange(lines.Select(l => (l, orderItems[l.OrderItemId].ProductId, (int?)l.OrderItemId, orderItems[l.OrderItemId].UnitPrice ?? 0,
                orderItems[l.OrderItemId].ConversionRate > 0 ? orderItems[l.OrderItemId].ConversionRate : 1m)));
        }

        var totalGoods = lines.Sum(l => Math.Round(l.Quantity * l.ReturnPrice, 2));
        var discount = Math.Min(totalGoods, req.DiscountAmount);

        // Hóa đơn có giảm giá tổng: hàng trả phải chịu phần giảm giá phân bổ,
        // để không trả khách nhiều hơn số tiền khách đã thực trả cho hàng đó.
        if (invoice != null && invoice.DiscountAmount > 0)
        {
            var goodsAtSalePrice = resolved.Sum(r => Math.Round(r.Line.Quantity * r.SalePrice, 2));
            var allocated = SalesReturnOps.AllocateInvoiceDiscount(
                SalesReturnOps.InvoiceSubTotal(invoice), invoice.DiscountAmount, goodsAtSalePrice);
            var minDiscount = Math.Min(allocated, totalGoods);
            if (discount < minDiscount)
                return Fail($"Hóa đơn {invoice.OrderCode} được giảm giá {invoice.DiscountAmount:N0}: hàng trả phải trừ giảm giá tối thiểu " +
                            $"{minDiscount:N0} (phân bổ theo giá trị hàng trả), không trả khách nhiều hơn số đã thanh toán.");
        }
        var fee = Math.Min(totalGoods - discount, req.ReturnFee);
        var total = totalGoods - discount - fee;
        if (req.RefundAmount > total) return Fail($"Tiền trả khách ({req.RefundAmount:N0}) vượt quá số cần trả khách ({total:N0}).");
        var isWalkIn = partner?.PartnerCode == CreatePosOrderCommandHandler.WalkInCustomerCode;
        if (isWalkIn && req.RefundAmount < total)
            return Fail("Khách lẻ không có công nợ — phải trả đủ tiền cho khách.");

        var settings = await _context.MstOrderSettings.AsNoTracking().FirstOrDefaultAsync(s => s.SettingId == 1, ct) ?? new MstOrderSetting();
        var now = VietnamTime.Now;
        var returnDate = now;
        // Thời gian trả hàng: luôn cho chọn (bỏ tuỳ chọn khoá thời gian), không ở tương lai, không trước lúc bán
        if (req.ReturnDate.HasValue)
        {
            returnDate = VietnamTime.From(req.ReturnDate);
            if (returnDate > now.AddMinutes(1)) return Fail("Thời gian trả hàng không được ở tương lai.");
            if (invoice?.OrderDate != null && returnDate < invoice.OrderDate.Value)
                return Fail("Thời gian trả hàng không được trước thời gian bán.");
        }

        using var tx = await _context.BeginTransactionAsync(ct);
        try
        {
            var ret = new TrxReturnRequest
            {
                ReturnCode = await _codeGenerator.GenerateCodeAsync("RETURN", settings, ct),
                PartnerId = partner!.PartnerId,
                SalesOrderId = invoice?.OrderId,
                WarehouseId = warehouseId,
                CreatedBy = userId,
                RequestDate = returnDate,
                Reason = string.IsNullOrWhiteSpace(req.Notes) ? null : req.Notes.Trim(),
                Status = SalesReturnOps.Completed,
                TotalGoodsAmount = totalGoods,
                DiscountAmount = discount,
                ReturnFee = fee,
                TotalAmount = total,
                RefundAmount = req.RefundAmount,
                PaymentMethod = req.RefundAmount > 0 ? req.PaymentMethod : null,
            };
            foreach (var r in resolved)
            {
                ret.DtlReturnRequestItems.Add(new DtlReturnRequestItem
                {
                    ProductId = r.ProductId,
                    OrderItemId = r.OrderItemId,
                    Quantity = r.Line.Quantity,
                    Condition = "GOOD",
                    SalePrice = r.SalePrice,
                    ReturnPrice = r.Line.ReturnPrice,
                });
            }
            _context.TrxReturnRequests.Add(ret);
            await _context.SaveChangesAsync(ct);

            // Hàng trả nhập lại kho theo giá vốn hiện tại của kho
            foreach (var g in resolved.GroupBy(r => r.ProductId))
            {
                var product = products[g.Key];
                var (_, cost) = await TransferStockOps.WarehouseStockAsync(_context, warehouseId, product, ct);
                await TransferStockOps.InboundAsync(_context, warehouseId, product, g.Sum(x => x.Line.Quantity * x.Rate), cost,
                    SalesReturnOps.StockInType, ret.ReturnRequestId, userId, ct, SalesReturnOps.ReferenceType);
            }

            // Công nợ: khách được trả lại "Cần trả khách"; phần đã trả tiền ngay làm nợ tăng lại
            partner.CurrentDebt = (partner.CurrentDebt ?? 0) - total + req.RefundAmount;
            if (req.RefundAmount > 0)
            {
                _context.TrxFinancialTransactions.Add(new TrxFinancialTransaction
                {
                    PartnerId = partner.PartnerId,
                    TxType = SalesReturnOps.RefundTxType,
                    TxCode = $"TT{ret.ReturnCode}",
                    Amount = req.RefundAmount,
                    PaymentMethod = req.PaymentMethod,
                    ReferenceType = SalesReturnOps.ReferenceType,
                    ReferenceId = ret.ReturnRequestId,
                    TransactionDate = returnDate,
                    CreatedBy = userId,
                    Status = "COMPLETED",
                });
            }

            await _context.SaveChangesAsync(ct);
            if (tx != null) await tx.CommitAsync(ct);
            return Result.Success(new SalesReturnResultDto(ret.ReturnRequestId, ret.ReturnCode ?? "", total, req.RefundAmount));
        }
        catch
        {
            if (tx != null) await tx.RollbackAsync(ct);
            throw;
        }
    }

    public async Task<Result<bool>> Handle(CancelSalesReturnCommand command, CancellationToken ct)
    {
        if (!_currentUser.UserId.HasValue) return Result.Failure<bool>("Không xác định được người dùng đăng nhập.");
        var userId = _currentUser.UserId.Value;
        var ret = await _context.TrxReturnRequests
            .Include(r => r.Partner)
            .Include(r => r.DtlReturnRequestItems).ThenInclude(i => i.OrderItem)
            .FirstOrDefaultAsync(r => r.ReturnRequestId == command.ReturnId, ct);
        if (ret == null) return Result.Failure<bool>("Không tìm thấy phiếu trả hàng.");
        if (ret.Status == SalesReturnOps.Cancelled) return Result.Failure<bool>($"Phiếu {ret.ReturnCode} đã hủy trước đó.");
        if (!ret.WarehouseId.HasValue || !await _currentUser.HasWarehouseAccessAsync(ret.WarehouseId.Value, ct))
            return Result.Failure<bool>("Bạn không có quyền hủy phiếu trả hàng của chi nhánh này.");

        using var tx = await _context.BeginTransactionAsync(ct);
        try
        {
            // Xuất lại kho phần hàng đã nhập (dòng DEFECTIVE cũ nếu có thì chưa từng nhập kho)
            var goodByProduct = ret.DtlReturnRequestItems.Where(i => i.Condition != "DEFECTIVE")
                // Quy về đơn vị cơ bản theo hệ số của dòng hóa đơn gốc (trả nhanh: 1)
                .GroupBy(i => i.ProductId).ToDictionary(g => g.Key, g => g.Sum(x => (x.Quantity ?? 0) * (x.OrderItem?.ConversionRate > 0 ? x.OrderItem.ConversionRate : 1m)));
            var products = await _context.MstProducts.Where(p => goodByProduct.Keys.Contains(p.ProductId)).ToDictionaryAsync(p => p.ProductId, ct);
            foreach (var (productId, qty) in goodByProduct)
            {
                await TransferStockOps.OutboundAsync(_context, ret.WarehouseId.Value, products[productId], qty,
                    SalesReturnOps.StockCancelType, ret.ReturnRequestId, userId, ct, SalesReturnOps.ReferenceType);
            }

            // Hoàn công nợ + hủy phiếu chi trả khách
            if (ret.Partner != null)
                ret.Partner.CurrentDebt = (ret.Partner.CurrentDebt ?? 0) + ret.TotalAmount - ret.RefundAmount;
            var refunds = await _context.TrxFinancialTransactions
                .Where(t => t.ReferenceType == SalesReturnOps.ReferenceType && t.ReferenceId == ret.ReturnRequestId && t.Status != "CANCELLED")
                .ToListAsync(ct);
            foreach (var r in refunds) r.Status = "CANCELLED";

            ret.Status = SalesReturnOps.Cancelled;
            ret.UpdatedAt = VietnamTime.Now;
            await _context.SaveChangesAsync(ct);
            if (tx != null) await tx.CommitAsync(ct);
            return Result.Success(true);
        }
        catch
        {
            if (tx != null) await tx.RollbackAsync(ct);
            throw;
        }
    }

    public async Task<Result<bool>> Handle(UpdateSalesReturnNotesCommand command, CancellationToken ct)
    {
        var ret = await _context.TrxReturnRequests.FirstOrDefaultAsync(r => r.ReturnRequestId == command.ReturnId, ct);
        if (ret == null) return Result.Failure<bool>("Không tìm thấy phiếu trả hàng.");
        if (!ret.WarehouseId.HasValue || !await _currentUser.HasWarehouseAccessAsync(ret.WarehouseId.Value, ct))
            return Result.Failure<bool>("Bạn không có quyền sửa phiếu trả hàng của chi nhánh này.");
        ret.Reason = string.IsNullOrWhiteSpace(command.Notes) ? null : command.Notes.Trim();
        ret.UpdatedAt = VietnamTime.Now;
        await _context.SaveChangesAsync(ct);
        return Result.Success(true);
    }

    public async Task<Result<SalesReturnResultDto>> Handle(AddSalesReturnRefundCommand command, CancellationToken ct)
    {
        if (!_currentUser.UserId.HasValue) return Fail("Không xác định được người dùng đăng nhập.");
        var req = command.Request;
        if (req.Amount <= 0) return Fail("Số tiền trả khách phải lớn hơn 0.");
        if (req.PaymentMethod is not ("CASH" or "VIETQR")) return Fail("Phương thức trả tiền chỉ gồm Tiền mặt hoặc Chuyển khoản.");

        var ret = await _context.TrxReturnRequests.Include(r => r.Partner)
            .FirstOrDefaultAsync(r => r.ReturnRequestId == command.ReturnId, ct);
        if (ret == null) return Fail("Không tìm thấy phiếu trả hàng.");
        if (ret.Status != SalesReturnOps.Completed) return Fail($"Phiếu {ret.ReturnCode} đã hủy.");
        if (!ret.WarehouseId.HasValue || !await _currentUser.HasWarehouseAccessAsync(ret.WarehouseId.Value, ct))
            return Fail("Bạn không có quyền trả tiền cho phiếu trả hàng của chi nhánh này.");
        var remaining = ret.TotalAmount - ret.RefundAmount;
        if (remaining <= 0) return Fail($"Phiếu {ret.ReturnCode} đã trả đủ tiền cho khách.");
        if (req.Amount > remaining) return Fail($"Chỉ còn {remaining:N0} chưa trả cho khách.");

        var now = VietnamTime.Now;
        var date = req.RefundDate.HasValue ? VietnamTime.From(req.RefundDate) : now;
        if (date > now.AddMinutes(1)) return Fail("Thời gian trả tiền không được ở tương lai.");
        if (ret.RequestDate.HasValue && date < ret.RequestDate.Value) return Fail("Thời gian trả tiền không được trước thời gian trả hàng.");

        // Mã phiếu chi: TTTH00001 (lúc trả hàng), lần trả thêm: TTTH00001-1, -2...
        var count = await _context.TrxFinancialTransactions
            .CountAsync(t => t.ReferenceType == SalesReturnOps.ReferenceType && t.ReferenceId == ret.ReturnRequestId && t.TxType == SalesReturnOps.RefundTxType, ct);
        _context.TrxFinancialTransactions.Add(new TrxFinancialTransaction
        {
            PartnerId = ret.PartnerId,
            TxType = SalesReturnOps.RefundTxType,
            TxCode = count == 0 ? $"TT{ret.ReturnCode}" : $"TT{ret.ReturnCode}-{count}",
            Amount = req.Amount,
            PaymentMethod = req.PaymentMethod,
            ReferenceType = SalesReturnOps.ReferenceType,
            ReferenceId = ret.ReturnRequestId,
            TransactionDate = date,
            CreatedBy = _currentUser.UserId.Value,
            Status = "COMPLETED",
            Description = string.IsNullOrWhiteSpace(req.Notes) ? null : req.Notes.Trim(),
        });
        ret.RefundAmount += req.Amount;
        ret.PaymentMethod ??= req.PaymentMethod;
        ret.UpdatedAt = now;
        if (ret.Partner != null) ret.Partner.CurrentDebt = (ret.Partner.CurrentDebt ?? 0) + req.Amount;
        await _context.SaveChangesAsync(ct);
        return Result.Success(new SalesReturnResultDto(ret.ReturnRequestId, ret.ReturnCode ?? "", ret.TotalAmount, ret.RefundAmount));
    }

    /// <summary>Hồ sơ "Khách lẻ" (KH00000) cho phiếu Trả nhanh không chọn khách</summary>
    private async Task<MstBusinessPartner> GetOrCreateWalkInAsync(CancellationToken ct)
    {
        var walkIn = await _context.MstBusinessPartners
            .FirstOrDefaultAsync(p => p.PartnerCode == CreatePosOrderCommandHandler.WalkInCustomerCode, ct);
        if (walkIn != null) return walkIn;
        walkIn = new MstBusinessPartner
        {
            PartnerCode = CreatePosOrderCommandHandler.WalkInCustomerCode,
            PartnerName = "Khách lẻ",
            PartnerType = "CUSTOMER",
            CreditLimit = 0,
            CurrentDebt = 0,
            CurrentPayable = 0,
            IsActive = true,
            CreatedAt = VietnamTime.Now,
            CreatedBy = _currentUser.UserId,
        };
        _context.MstBusinessPartners.Add(walkIn);
        await _context.SaveChangesAsync(ct);
        return walkIn;
    }

    private static Result<SalesReturnResultDto> Fail(string message) => Result.Failure<SalesReturnResultDto>(message);
}
