namespace StockFlow.Domain.Entities;

/// <summary>Trạng thái yêu cầu thanh toán payOS (cột trx_payos_payments.status).</summary>
public static class PayosPaymentStatus
{
    /// <summary>Chờ thanh toán: QR đang hiển thị cho khách quét.</summary>
    public const string Pending = "PENDING";

    /// <summary>Đã thanh toán: payOS xác nhận (webhook có chữ ký hợp lệ hoặc backend tra cứu payOS).</summary>
    public const string Paid = "PAID";

    /// <summary>Đã hủy link thanh toán (tạo QR mới / đóng hộp thoại).</summary>
    public const string Cancelled = "CANCELLED";

    /// <summary>QR hết hiệu lực mà chưa nhận được tiền.</summary>
    public const string Expired = "EXPIRED";

    public const string ReferencePosInvoice = "POS_INVOICE";
    public const string ReferencePosBooking = "POS_BOOKING";
}
