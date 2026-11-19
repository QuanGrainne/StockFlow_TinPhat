using System.Security.Cryptography;
using System.Text.Json;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Payments.DTOs;
using StockFlow.Application.Features.Payments.Helpers;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Features.Payments.Commands;

/// <summary>Tạo QR thanh toán payOS cho hóa đơn / đơn đặt hàng đang lập ở màn Bán hàng.</summary>
public record CreatePayosPaymentCommand(CreatePayosPaymentRequest Request) : IRequest<Result<PayosPaymentDto>>;

/// <summary>Hủy QR đang chờ (tạo QR mới / đóng hộp thoại). QR đã thanh toán thì giữ nguyên và trả về trạng thái mới.</summary>
public record CancelPayosPaymentCommand(long OrderCode) : IRequest<Result<PayosPaymentDto>>;

/// <summary>Webhook payOS: kiểm chữ ký rồi ghi nhận đã thanh toán (idempotent).</summary>
public record HandlePayosWebhookCommand(JsonElement Body) : IRequest<Result<bool>>;

public class CreatePayosPaymentCommandValidator : AbstractValidator<CreatePayosPaymentCommand>
{
    public CreatePayosPaymentCommandValidator()
    {
        RuleFor(x => x.Request.Amount)
            .GreaterThan(0).WithMessage("Số tiền thanh toán phải lớn hơn 0.")
            .Must(a => decimal.Truncate(a) == a).WithMessage("Số tiền chuyển khoản phải là số nguyên (đồng).")
            .LessThanOrEqualTo(10_000_000_000m).WithMessage("Số tiền vượt hạn mức tạo QR.");
        RuleFor(x => x.Request.ReferenceType)
            .Must(t => t == PayosPaymentStatus.ReferencePosInvoice || t == PayosPaymentStatus.ReferencePosBooking)
            .WithMessage("Loại chứng từ thanh toán không hợp lệ.");
        RuleFor(x => x.Request.DraftKey)
            .NotEmpty().WithMessage("Thiếu mã đơn đang lập.")
            .MaximumLength(64).WithMessage("Mã đơn đang lập tối đa 64 ký tự.");
        RuleFor(x => x.Request.ReferenceCode)
            .MaximumLength(30).WithMessage("Mã đơn hàng tối đa 30 ký tự.");
    }
}

public class PayosPaymentCommandHandler :
    IRequestHandler<CreatePayosPaymentCommand, Result<PayosPaymentDto>>,
    IRequestHandler<CancelPayosPaymentCommand, Result<PayosPaymentDto>>,
    IRequestHandler<HandlePayosWebhookCommand, Result<bool>>
{
    private const long MaxOrderCode = 9_007_199_254_740_991; // Number.MAX_SAFE_INTEGER — giới hạn orderCode của payOS

    private readonly IStockFlowDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IPayosGateway _payos;
    private readonly ILogger<PayosPaymentCommandHandler> _logger;

    public PayosPaymentCommandHandler(
        IStockFlowDbContext context, ICurrentUserService currentUser, IPayosGateway payos, ILogger<PayosPaymentCommandHandler> logger)
    {
        _context = context;
        _currentUser = currentUser;
        _payos = payos;
        _logger = logger;
    }

    public async Task<Result<PayosPaymentDto>> Handle(CreatePayosPaymentCommand command, CancellationToken ct)
    {
        var req = command.Request;
        if (_currentUser.UserId is not int userId)
            return Result.Failure<PayosPaymentDto>("Không xác định được người dùng đăng nhập.");
        if (!_payos.IsConfigured)
            return Result.Failure<PayosPaymentDto>("Chưa cấu hình tài khoản payOS. Liên hệ quản trị viên.");
        if (req.WarehouseId is int warehouseId && !await _currentUser.HasWarehouseAccessAsync(warehouseId, ct))
            return Result.Failure<PayosPaymentDto>("Bạn không có quyền bán hàng tại kho này.");

        // Chống thu tiền 2 lần cho cùng 1 đơn: đơn đã có QR thanh toán thành công thì không tạo thêm;
        // QR cũ còn chờ thì hủy trước (hỏi payOS trước — khách có thể vừa chuyển xong)
        var draftKey = req.DraftKey.Trim();
        var previous = await _context.TrxPayosPayments
            .Where(p => p.DraftKey == draftKey && p.CreatedBy == userId
                        && (p.Status == PayosPaymentStatus.Pending || p.Status == PayosPaymentStatus.Paid))
            .ToListAsync(ct);
        foreach (var old in previous.Where(p => p.IsPending()))
        {
            await PayosPaymentSync.SyncAsync(_payos, old, ct);
            if (old.CanClose())
            {
                await _payos.CancelPaymentLinkAsync(old.OrderCode, "Thu ngân tạo QR mới cho đơn", ct);
                await PayosPaymentSync.SyncAsync(_payos, old, ct);
                if (old.CanClose()) old.MarkCancelled();
                old.UpdatedAt = VietnamTime.Now;
            }
        }
        if (previous.Count > 0) await _context.SaveChangesAsync(ct);
        var paid = previous.FirstOrDefault(p => p.IsPaid());
        if (paid != null)
            return Result.Failure<PayosPaymentDto>(
                $"[PAYOS_ALREADY_PAID] Đơn {paid.ReferenceCode ?? ""} đã thanh toán qua payOS {paid.PaidAmount ?? paid.Amount:N0}đ " +
                $"(mã GD {paid.OrderCode}). Không tạo thêm QR cho đơn này.");

        // orderCode duy nhất: mili-giây hiện tại × 1000 + 3 số ngẫu nhiên (≈ 1,8·10^15 < giới hạn payOS)
        long orderCode;
        do
        {
            orderCode = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() * 1000 + RandomNumberGenerator.GetInt32(1000);
        } while (orderCode > MaxOrderCode || await _context.TrxPayosPayments.AnyAsync(p => p.OrderCode == orderCode, ct));

        // Nội dung CK: "ThanhToan-{mã đơn}" (VD ThanhToan-HH000009), tối đa 25 ký tự theo payOS
        var referenceCode = string.IsNullOrWhiteSpace(req.ReferenceCode) ? null : req.ReferenceCode.Trim();
        var description = PayosPaymentSync.BuildDescription(referenceCode, orderCode);
        var amount = (long)req.Amount;

        var link = await _payos.CreatePaymentLinkAsync(
            new PayosCreateLinkRequest(orderCode, amount, description, DateTime.UtcNow.Add(PayosPaymentSync.QrLifetime)), ct);
        if (!link.IsSuccess || link.Value == null)
            return Result.Failure<PayosPaymentDto>(link.Error ?? "Không tạo được QR thanh toán.");

        var now = VietnamTime.Now;
        var payment = new TrxPayosPayment
        {
            OrderCode = orderCode,
            PaymentLinkId = link.Value.PaymentLinkId,
            ReferenceType = req.ReferenceType,
            WarehouseId = req.WarehouseId,
            DraftKey = draftKey,
            ReferenceCode = referenceCode,
            Amount = amount,
            Description = description,
            Status = PayosPaymentStatus.Pending,
            CheckoutUrl = link.Value.CheckoutUrl,
            QrCode = link.Value.QrCode,
            Bin = link.Value.Bin,
            AccountNumber = link.Value.AccountNumber,
            AccountName = link.Value.AccountName,
            ExpiredAt = now.Add(PayosPaymentSync.QrLifetime),
            CreatedBy = userId,
            CreatedAt = now,
        };
        _context.TrxPayosPayments.Add(payment);
        await _context.SaveChangesAsync(ct);

        return Result.Success(PayosPaymentSync.ToDto(payment, _payos));
    }

    public async Task<Result<PayosPaymentDto>> Handle(CancelPayosPaymentCommand command, CancellationToken ct)
    {
        var payment = await _context.TrxPayosPayments.FirstOrDefaultAsync(p => p.OrderCode == command.OrderCode, ct);
        if (payment == null) return Result.Failure<PayosPaymentDto>("Không tìm thấy giao dịch thanh toán.");
        if (payment.CreatedBy != _currentUser.UserId && !await IsAccessibleAsync(payment, ct))
            return Result.Failure<PayosPaymentDto>("Bạn không có quyền với giao dịch thanh toán này.");

        // Hỏi payOS trước: khách có thể vừa chuyển tiền xong → giữ trạng thái Đã thanh toán, không hủy
        var changed = await PayosPaymentSync.SyncAsync(_payos, payment, ct);
        if (payment.CanClose())
        {
            var cancel = await _payos.CancelPaymentLinkAsync(payment.OrderCode, "Thu ngân tạo QR mới / đóng QR", ct);
            if (!cancel.IsSuccess)
            {
                // payOS từ chối hủy (VD vừa thanh toán) → đồng bộ lại lần nữa
                changed |= await PayosPaymentSync.SyncAsync(_payos, payment, ct);
            }
            if (payment.CanClose())
            {
                payment.MarkCancelled();
                payment.UpdatedAt = VietnamTime.Now;
                changed = true;
            }
        }
        if (changed) await _context.SaveChangesAsync(ct);
        return Result.Success(PayosPaymentSync.ToDto(payment, _payos));
    }

    public async Task<Result<bool>> Handle(HandlePayosWebhookCommand command, CancellationToken ct)
    {
        var data = _payos.VerifyWebhook(command.Body);
        if (data == null)
        {
            _logger.LogWarning("Webhook payOS bị từ chối: chữ ký không hợp lệ.");
            return Result.Failure<bool>("Chữ ký webhook không hợp lệ.");
        }

        // Chỉ giao dịch thành công (code "00") mới ghi nhận; orderCode lạ (VD webhook thử khi đăng ký) thì bỏ qua
        if (data.Code != "00") return Result.Success(false);
        var payment = await _context.TrxPayosPayments.FirstOrDefaultAsync(p => p.OrderCode == data.OrderCode, ct);
        if (payment == null) return Result.Success(false);

        // Idempotent: payOS gửi lại webhook nhiều lần → lần sau không đổi gì
        if (!payment.MarkPaid(data.Amount, data.Reference, VietnamTime.Now)) return Result.Success(false);
        payment.UpdatedAt = VietnamTime.Now;
        if (data.Amount < payment.Amount)
            _logger.LogWarning("payOS {OrderCode}: nhận {Paid} < cần {Amount}", payment.OrderCode, data.Amount, payment.Amount);

        await _context.SaveChangesAsync(ct);
        return Result.Success(true);
    }

    private async Task<bool> IsAccessibleAsync(TrxPayosPayment payment, CancellationToken ct) =>
        payment.WarehouseId is int wid && await _currentUser.HasWarehouseAccessAsync(wid, ct);
}
