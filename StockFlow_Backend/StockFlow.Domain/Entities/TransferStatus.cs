namespace StockFlow.Domain.Entities;

/// <summary>
/// Trạng thái phiếu chuyển kho (cột trx_stock_transfers.status), đúng giá trị đang lưu trong DB.
/// SRS gọi tương ứng: PENDING_ISSUE / IN_TRANSIT / COMPLETED (UC-33, BR-39/BR-40).
/// </summary>
public static class TransferStatus
{
    /// <summary>Phiếu tạm, chưa xuất kho.</summary>
    public const string Draft = "DRAFT";

    /// <summary>Kho xuất đã xuất hàng, đang chờ kho nhận xác nhận.</summary>
    public const string InTransit = "IN_TRANSIT";

    /// <summary>Kho nhận đã xác nhận nhận hàng.</summary>
    public const string Received = "RECEIVED";

    /// <summary>Đã huỷ (tồn kho được hoàn lại nếu đã xuất/nhận).</summary>
    public const string Cancelled = "CANCELLED";
}
