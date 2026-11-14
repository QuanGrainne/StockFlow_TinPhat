namespace StockFlow.Domain.Entities;

/// <summary>
/// Trạng thái phiếu xuất hủy (cột trx_inventory_disposals.status).
/// </summary>
public static class DisposalStatus
{
    /// <summary>Phiếu tạm: đã lưu danh sách hàng hủy, chưa trừ tồn kho.</summary>
    public const string Draft = "DRAFT";

    /// <summary>Hoàn thành: đã trừ tồn kho và ghi thẻ kho theo giá vốn lúc hủy.</summary>
    public const string Completed = "COMPLETED";

    /// <summary>Đã hủy phiếu: phiếu tạm chỉ đổi trạng thái; phiếu đã hoàn thành được hoàn lại tồn kho.</summary>
    public const string Cancelled = "CANCELLED";
}
