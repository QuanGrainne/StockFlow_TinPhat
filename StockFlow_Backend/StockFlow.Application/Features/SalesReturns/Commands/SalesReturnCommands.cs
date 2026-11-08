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
/// Khách trả hàng theo hóa đơn (UC-23, BR-18/19/20):
/// - Phiếu trả gắn với hóa đơn gốc đã hoàn thành; SL trả ≤ SL đã mua − SL đã trả ở phiếu khác.
/// - Hàng tốt nhập lại kho chi nhánh bán (ghi thẻ kho "Khách trả hàng"); hàng lỗi không nhập kho bán.
/// - Công nợ khách giảm theo "Cần trả khách"; tiền trả khách ngay làm công nợ tăng lại (phiếu chi trả khách).
/// </summary>
public record CreateSalesReturnCommand(CreateSalesReturnRequest Request) : IRequest<Result<SalesReturnResultDto>>;

/// <summary>Hủy phiếu trả: xuất lại kho hàng đã nhập, hoàn lại công nợ, hủy phiếu chi trả khách</summary>
public record CancelSalesReturnCommand(int ReturnId) : IRequest<Result<bool>>;

/// <summary>Trả thêm tiền cho khách (phần chưa trả lúc trả hàng): tạo phiếu chi, công nợ khách tăng lại tương ứng</summary>
public record AddSalesReturnRefundCommand(int ReturnId, AddSalesReturnRefundRequest Request) : IRequest<Result<SalesReturnResultDto>>;

/// <summary>Sửa ghi chú phiếu trả</summary>
public record UpdateSalesReturnNotesCommand(int ReturnId, string? Notes) : IRequest<Result<bool>>;

public class CreateSalesReturnCommandValidator : AbstractValidator<CreateSalesReturnCommand>
{
    public CreateSalesReturnCommandValidator()
    {
        RuleFor(x => x.Request.InvoiceId).GreaterThan(0).WithMessage("Vui lòng chọn hóa đơn trả hàng.");
        RuleFor(x => x.Request.DiscountAmount).GreaterThanOrEqualTo(0).WithMessage("Giảm giá không được âm.");
        RuleFor(x => x.Request.ReturnFee).GreaterThanOrEqualTo(0).WithMessage("Phí trả hàng không được âm.");
        RuleFor(x => x.Request.RefundAmount).GreaterThanOrEqualTo(0).WithMessage("Tiền trả khách không được âm.");
        RuleFor(x => x.Request.PaymentMethod).Must(m => m is "CASH" or "VIETQR")
            .WithMessage("Phương thức trả tiền chỉ gồm Tiền mặt hoặc Chuyển khoản.");
        RuleForEach(x => x.Request.Items).ChildRules(i =>
        {
            i.RuleFor(l => l.Quantity).GreaterThanOrEqualTo(0).WithMessage("Số lượng trả không được âm.");
            i.RuleFor(l => l.ReturnPrice).GreaterThanOrEqualTo(0).WithMessage("Giá nhập lại không được âm.");
            i.RuleFor(l => l.Condition).Must(c => c is "GOOD" or "DEFECTIVE").WithMessage("Tình trạng hàng trả không hợp lệ.");
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

        var invoice = await _context.TrxOrders
            .Include(o => o.Partner)
            .Include(o => o.TrxStockIssues)
            .Include(o => o.DtlOrderItems)
            .FirstOrDefaultAsync(o => o.OrderId == req.InvoiceId, ct);
        if (invoice == null || invoice.OrderType == "BOOKING") return Fail("Không tìm thấy hóa đơn gốc (BR-18).");
        if (!string.Equals(invoice.Status, "COMPLETED", StringComparison.OrdinalIgnoreCase))
            return Fail($"Hóa đơn {invoice.OrderCode} chưa hoàn thành hoặc đã hủy, không trả hàng được.");
        var warehouseId = invoice.WarehouseId ?? invoice.TrxStockIssues.Select(si => (int?)si.WarehouseId).FirstOrDefault();
        if (!warehouseId.HasValue) return Fail("Không xác định được chi nhánh bán của hóa đơn.");
        if (!await _currentUser.HasWarehouseAccessAsync(warehouseId.Value, ct))
            return Fail("Bạn không có quyền trả hàng của chi nhánh này.");

        var lines = req.Items.Where(i => i.Quantity > 0).ToList();
        if (lines.Count == 0) return Fail("Chọn ít nhất 1 hàng hóa với số lượng trả lớn hơn 0.");

        // BR-19: không trả vượt SL còn được trả của từng dòng hóa đơn
        var returned = await SalesReturnOps.ReturnedByOrderItemAsync(_context, invoice.OrderId, null, ct);
        var orderItems = invoice.DtlOrderItems.ToDictionary(i => i.OrderItemId);
        var productIds = invoice.DtlOrderItems.Select(i => i.ProductId).Distinct().ToList();
        var products = await _context.MstProducts.Where(p => productIds.Contains(p.ProductId)).ToDictionaryAsync(p => p.ProductId, ct);
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

        var totalGoods = lines.Sum(l => Math.Round(l.Quantity * l.ReturnPrice, 2));
        var discount = Math.Min(totalGoods, req.DiscountAmount);
        var fee = Math.Min(totalGoods - discount, req.ReturnFee);
        var total = totalGoods - discount - fee;
        if (req.RefundAmount > total) return Fail($"Tiền trả khách ({req.RefundAmount:N0}) vượt quá số cần trả khách ({total:N0}).");
        var isWalkIn = invoice.Partner?.PartnerCode == CreatePosOrderCommandHandler.WalkInCustomerCode;
        if (isWalkIn && req.RefundAmount < total)
            return Fail("Khách lẻ không có công nợ — phải trả đủ tiền cho khách.");

        var settings = await _context.MstOrderSettings.AsNoTracking().FirstOrDefaultAsync(s => s.SettingId == 1, ct) ?? new MstOrderSetting();
        var now = VietnamTime.Now;
        var returnDate = now;
        if (!settings.LockTransactionTime && req.ReturnDate.HasValue)
        {
            returnDate = VietnamTime.From(req.ReturnDate);
            if (returnDate > now.AddMinutes(1)) return Fail("Thời gian trả hàng không được ở tương lai.");
            if (invoice.OrderDate.HasValue && returnDate < invoice.OrderDate.Value)
                return Fail("Thời gian trả hàng không được trước thời gian bán.");
        }

        var dbContext = _context as DbContext;
        using var tx = dbContext != null ? await dbContext.Database.BeginTransactionAsync(ct) : null;
        try
        {
            var ret = new TrxReturnRequest
            {
                ReturnCode = await _codeGenerator.GenerateCodeAsync("RETURN", settings, ct),
                PartnerId = invoice.PartnerId,
                SalesOrderId = invoice.OrderId,
                WarehouseId = warehouseId.Value,
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
            foreach (var l in lines)
            {
                var oi = orderItems[l.OrderItemId];
                ret.DtlReturnRequestItems.Add(new DtlReturnRequestItem
                {
                    ProductId = oi.ProductId,
                    OrderItemId = oi.OrderItemId,
                    Quantity = l.Quantity,
                    Condition = l.Condition,
                    SalePrice = oi.UnitPrice ?? 0,
                    ReturnPrice = l.ReturnPrice,
                });
            }
            _context.TrxReturnRequests.Add(ret);
            await _context.SaveChangesAsync(ct);

            // Hàng tốt nhập lại kho (giá vốn hiện tại của kho); hàng lỗi để riêng, không nhập kho bán (BR-20)
            foreach (var g in lines.Where(l => l.Condition == "GOOD").GroupBy(l => orderItems[l.OrderItemId].ProductId))
            {
                var product = products[g.Key];
                var (_, cost) = await TransferStockOps.WarehouseStockAsync(_context, warehouseId.Value, product, ct);
                await TransferStockOps.InboundAsync(_context, warehouseId.Value, product, g.Sum(x => x.Quantity), cost,
                    SalesReturnOps.StockInType, ret.ReturnRequestId, userId, ct, SalesReturnOps.ReferenceType);
            }

            // Công nợ: khách được trả lại "Cần trả khách"; phần đã trả tiền ngay làm nợ tăng lại
            if (invoice.Partner != null)
                invoice.Partner.CurrentDebt = (invoice.Partner.CurrentDebt ?? 0) - total + req.RefundAmount;
            if (req.RefundAmount > 0)
            {
                _context.TrxFinancialTransactions.Add(new TrxFinancialTransaction
                {
                    PartnerId = invoice.PartnerId,
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
            .Include(r => r.DtlReturnRequestItems)
            .FirstOrDefaultAsync(r => r.ReturnRequestId == command.ReturnId, ct);
        if (ret == null) return Result.Failure<bool>("Không tìm thấy phiếu trả hàng.");
        if (ret.Status == SalesReturnOps.Cancelled) return Result.Failure<bool>($"Phiếu {ret.ReturnCode} đã hủy trước đó.");
        if (!ret.WarehouseId.HasValue || !await _currentUser.HasWarehouseAccessAsync(ret.WarehouseId.Value, ct))
            return Result.Failure<bool>("Bạn không có quyền hủy phiếu trả hàng của chi nhánh này.");

        var dbContext = _context as DbContext;
        using var tx = dbContext != null ? await dbContext.Database.BeginTransactionAsync(ct) : null;
        try
        {
            // Xuất lại kho phần hàng tốt đã nhập
            var goodByProduct = ret.DtlReturnRequestItems.Where(i => i.Condition != "DEFECTIVE")
                .GroupBy(i => i.ProductId).ToDictionary(g => g.Key, g => g.Sum(x => x.Quantity ?? 0));
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

    private static Result<SalesReturnResultDto> Fail(string message) => Result.Failure<SalesReturnResultDto>(message);
}
