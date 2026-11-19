using System.Text.Json;

namespace StockFlow.Application.Common.Interfaces;

/// <summary>Yêu cầu tạo link thanh toán payOS (POST /v2/payment-requests).</summary>
public sealed record PayosCreateLinkRequest(long OrderCode, long Amount, string Description, DateTime ExpiredAtUtc);

/// <summary>Kết quả tạo link: chuỗi VietQR, link checkout và tài khoản nhận tiền.</summary>
public sealed record PayosPaymentLink(
    string PaymentLinkId,
    string CheckoutUrl,
    string QrCode,
    string Bin,
    string AccountNumber,
    string AccountName,
    string Status);

/// <summary>Thông tin link khi tra cứu (GET /v2/payment-requests/{orderCode}).</summary>
public sealed record PayosPaymentInfo(string Status, long Amount, long AmountPaid, string? Reference);

/// <summary>Dữ liệu webhook payOS sau khi đã kiểm chữ ký.</summary>
public sealed record PayosWebhookData(long OrderCode, long Amount, string Code, string? Reference);

/// <summary>
/// Cổng gọi payOS (Infrastructure cài đặt bằng HttpClient). Client ID / API Key / Checksum Key đọc từ cấu hình
/// (biến môi trường PayOS__*), không bao giờ gửi xuống frontend.
/// </summary>
public interface IPayosGateway
{
    /// <summary>Đã cấu hình đủ Client ID, API Key, Checksum Key chưa.</summary>
    bool IsConfigured { get; }

    /// <summary>Ngân hàng / số tài khoản cố định hiển thị ở mục chuyển khoản thủ công (cấu hình PayOS:BankName / BankAccountNumber); null = dùng của payOS.</summary>
    string? DisplayBankName { get; }

    string? DisplayAccountNumber { get; }

    Task<Result<PayosPaymentLink>> CreatePaymentLinkAsync(PayosCreateLinkRequest request, CancellationToken ct);

    Task<Result<PayosPaymentInfo>> GetPaymentInfoAsync(long orderCode, CancellationToken ct);

    Task<Result<bool>> CancelPaymentLinkAsync(long orderCode, string reason, CancellationToken ct);

    /// <summary>
    /// Kiểm chữ ký webhook: HMAC-SHA256(checksumKey, các trường của "data" sắp xếp theo tên, nối key=value bằng "&amp;").
    /// Trả về dữ liệu đã kiểm, hoặc null nếu chữ ký sai / thiếu.
    /// </summary>
    PayosWebhookData? VerifyWebhook(JsonElement body);
}
