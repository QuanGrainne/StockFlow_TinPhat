using System;

namespace StockFlow.Domain.Entities;

// Luật chuyển trạng thái yêu cầu thanh toán payOS. Chỉ kiểm tra và đổi Status / thời điểm thanh toán;
// gọi payOS, kiểm chữ ký và DbContext do handler xử lý (cùng kiểu TrxStockTransfer.Status.cs).
public partial class TrxPayosPayment
{
    private bool StatusIs(string status) => string.Equals(Status, status, StringComparison.OrdinalIgnoreCase);

    public bool IsPending() => StatusIs(PayosPaymentStatus.Pending);

    public bool IsPaid() => StatusIs(PayosPaymentStatus.Paid);

    /// <summary>Chỉ link đang chờ mới được hủy / chuyển hết hạn; link đã thanh toán giữ nguyên (chống xử lý trùng).</summary>
    public bool CanClose() => IsPending();

    /// <summary>
    /// Ghi nhận đã thanh toán (idempotent): gọi lại khi đã PAID thì không đổi gì và trả về false.
    /// Cho phép chuyển từ CANCELLED / EXPIRED sang PAID vì tiền thực tế đã vào tài khoản (khách chuyển sát giờ hủy).
    /// </summary>
    public bool MarkPaid(decimal paidAmount, string? reference, DateTime paidAt)
    {
        if (IsPaid()) return false;
        Status = PayosPaymentStatus.Paid;
        PaidAmount = paidAmount;
        PayosReference = reference;
        PaidAt = paidAt;
        return true;
    }

    public void MarkCancelled() => Status = PayosPaymentStatus.Cancelled;

    public void MarkExpired() => Status = PayosPaymentStatus.Expired;
}
