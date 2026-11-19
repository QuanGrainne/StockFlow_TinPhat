using System;

namespace StockFlow.Domain.Entities;

/// <summary>
/// Yêu cầu thanh toán chuyển khoản qua payOS (QR VietQR) phát sinh từ màn Bán hàng (hóa đơn / đặt hàng).
/// Trạng thái chỉ được đổi ở backend: theo webhook payOS (đã kiểm chữ ký) hoặc khi backend tự hỏi lại payOS.
/// </summary>
public partial class TrxPayosPayment
{
    public int PayosPaymentId { get; set; }

    /// <summary>Mã đơn gửi payOS (orderCode, duy nhất, số nguyên dương ≤ 9007199254740991).</summary>
    public long OrderCode { get; set; }

    public string? PaymentLinkId { get; set; }

    /// <summary>Ngữ cảnh tạo QR: POS_INVOICE (hóa đơn) | POS_BOOKING (đặt hàng).</summary>
    public string ReferenceType { get; set; } = null!;

    public int? WarehouseId { get; set; }

    /// <summary>
    /// Khóa của đơn đang lập ở màn Bán hàng (id tab hóa đơn / đặt hàng). Một khóa chỉ có tối đa 1 QR đang chờ
    /// và đã có QR thanh toán thành công thì không tạo thêm QR (chống thu tiền 2 lần cho cùng 1 đơn).
    /// </summary>
    public string? DraftKey { get; set; }

    /// <summary>Mã hiển thị của đơn trên QR / nội dung chuyển khoản (VD HH000009).</summary>
    public string? ReferenceCode { get; set; }

    public decimal Amount { get; set; }

    /// <summary>Nội dung chuyển khoản gửi payOS.</summary>
    public string Description { get; set; } = null!;

    /// <summary>PENDING | PAID | CANCELLED | EXPIRED (xem PayosPaymentStatus).</summary>
    public string Status { get; set; } = null!;

    public string? CheckoutUrl { get; set; }

    /// <summary>Chuỗi VietQR (EMV) do payOS trả về — frontend vẽ thành mã QR.</summary>
    public string? QrCode { get; set; }

    /// <summary>Mã BIN ngân hàng nhận tiền (VD 970418 = BIDV).</summary>
    public string? Bin { get; set; }

    public string? AccountNumber { get; set; }

    public string? AccountName { get; set; }

    public DateTime? ExpiredAt { get; set; }

    public DateTime? PaidAt { get; set; }

    /// <summary>Số tiền payOS báo đã nhận (webhook / tra cứu).</summary>
    public decimal? PaidAmount { get; set; }

    /// <summary>Mã tham chiếu giao dịch ngân hàng từ webhook payOS.</summary>
    public string? PayosReference { get; set; }

    public int CreatedBy { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual SecUser CreatedByNavigation { get; set; } = null!;

    public virtual MstWarehouse? Warehouse { get; set; }
}
