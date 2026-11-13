namespace StockFlow.Domain.Entities;

/// <summary>
/// Trạng thái lệnh sản xuất (cột trx_production_orders.status) theo BR-38:
/// Not Started → In Progress (lần xuất NVL đầu tiên) → Completed (nhận đủ kế hoạch hoặc Manager đóng lệnh).
/// Chỉ huỷ được lệnh chưa xuất NVL.
/// </summary>
public static class ProductionOrderStatus
{
    /// <summary>Chưa bắt đầu: đã lập lệnh, chưa xuất NVL.</summary>
    public const string NotStarted = "NOT_STARTED";

    /// <summary>Đang sản xuất: đã có phiếu xuất NVL.</summary>
    public const string InProgress = "IN_PROGRESS";

    /// <summary>Hoàn thành: đã nhập đủ thành phẩm theo kế hoạch hoặc Manager đóng lệnh sớm.</summary>
    public const string Completed = "COMPLETED";

    /// <summary>Đã huỷ (chỉ khi chưa xuất NVL).</summary>
    public const string Cancelled = "CANCELLED";
}

/// <summary>Loại phiếu xuất kho (cột trx_stock_issues.issue_type).</summary>
public static class StockIssueType
{
    /// <summary>Xuất bán (đang dùng ở module Bán hàng).</summary>
    public const string Sales = "SALES";

    /// <summary>Xuất NVL cho lệnh sản xuất (UC-46).</summary>
    public const string Production = "PRODUCTION";
}
