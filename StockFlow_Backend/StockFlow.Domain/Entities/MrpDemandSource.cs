namespace StockFlow.Domain.Entities;

/// <summary>
/// Nguồn của một nhu cầu NVL trong lần chạy MRP (cột dtl_mrp_run_demands.source_type).
/// </summary>
public static class MrpDemandSource
{
    /// <summary>Phần chưa lập lệnh của dòng kế hoạch sản xuất đã duyệt (BR-MRP-02a).</summary>
    public const string Plan = "PLAN";

    /// <summary>Phần NVL còn phải xuất của lệnh sản xuất đang mở (BR-MRP-02b).</summary>
    public const string Order = "ORDER";
}
