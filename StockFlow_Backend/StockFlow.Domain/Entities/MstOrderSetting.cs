using System;

namespace StockFlow.Domain.Entities;

/// <summary>
/// Cài đặt giao dịch (một dòng, setting_id = 1), mở từ nút cài đặt cạnh avatar.
/// Chỉ còn 2 tuỳ chọn: bán hàng vượt tồn kho và chuyển hàng khi âm kho (mặc định đều cho phép).
/// Các tuỳ chọn cũ (nhận đơn đặt, khoá thời gian, quy tắc mã...) đã bỏ (24/11/2026): hệ thống luôn nhận đơn đặt,
/// luôn cho chọn thời gian giao dịch (không ở tương lai), mã chứng từ luôn theo số thứ tự.
/// </summary>
public partial class MstOrderSetting
{
    public int SettingId { get; set; } = 1;

    /// <summary>Cho phép bán hàng vượt tồn kho (bán âm kho). Tắt thì POS chặn khi tồn (trừ hàng khách đã đặt) không đủ.</summary>
    public bool AllowNegativeStockSale { get; set; } = true;

    /// <summary>Cho phép xuất chuyển hàng khi tồn kho xuất không đủ (kho xuất âm). Tắt thì chặn xuất chuyển.</summary>
    public bool AllowNegativeStockTransfer { get; set; } = true;

    // Tiền tố mã chứng từ (không chỉnh trên giao diện, giữ để sinh mã theo số thứ tự)
    public string OrderCodePrefix { get; set; } = "HD";
    public string BookingCodePrefix { get; set; } = "DH";
    public string ReturnCodePrefix { get; set; } = "TH";
    public string TransferCodePrefix { get; set; } = "CK";

    // Audit
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public int? UpdatedBy { get; set; }
    public virtual SecUser? UpdatedByUser { get; set; }
}
