namespace StockFlow.Application.Features.Payments.DTOs;

/// <summary>
/// Tạo QR thanh toán payOS. ReferenceType: POS_INVOICE (hóa đơn) | POS_BOOKING (đặt hàng).
/// DraftKey: khóa của đơn đang lập (id tab) — chống tạo QR / thu tiền 2 lần cho cùng 1 đơn.
/// ReferenceCode: mã hiển thị của đơn (VD HH000009) → nội dung chuyển khoản "ThanhToan-HH000009".
/// </summary>
public record CreatePayosPaymentRequest(
    decimal Amount,
    string ReferenceType,
    int? WarehouseId,
    string DraftKey,
    string? ReferenceCode);

/// <summary>Thông tin QR / trạng thái thanh toán trả cho màn Bán hàng (không chứa khóa payOS).</summary>
public record PayosPaymentDto(
    long OrderCode,
    string? ReferenceCode,
    decimal Amount,
    string Description,
    string Status,
    string? CheckoutUrl,
    string? QrCode,
    string? Bin,
    string? BankName,
    string? AccountNumber,
    string? AccountName,
    DateTime? ExpiredAt,
    int SecondsLeft, // Số giây QR còn hiệu lực (tính ở server để không lệch đồng hồ máy khách)
    DateTime? PaidAt,
    decimal? PaidAmount,
    string? PayosReference);
