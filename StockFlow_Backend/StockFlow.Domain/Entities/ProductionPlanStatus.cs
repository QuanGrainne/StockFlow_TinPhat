namespace StockFlow.Domain.Entities;

/// <summary>
/// Trạng thái kế hoạch sản xuất (cột trx_production_plans.status), theo BR-PP đã chốt ngày 14/11/2026:
/// DRAFT → PENDING_APPROVAL → APPROVED → CLOSED; PENDING_APPROVAL → REJECTED → (sửa) → PENDING_APPROVAL;
/// DRAFT / REJECTED / PENDING_APPROVAL / APPROVED (chưa có lệnh còn hiệu lực) → CANCELLED.
/// Tiến độ lập lệnh (chưa lập / một phần / đủ) là số liệu tính ra, không phải trạng thái lưu.
/// </summary>
public static class ProductionPlanStatus
{
    /// <summary>Nháp: đang soạn, sửa được toàn bộ.</summary>
    public const string Draft = "DRAFT";

    /// <summary>Chờ duyệt: không sửa được, chờ Manager duyệt hoặc từ chối.</summary>
    public const string PendingApproval = "PENDING_APPROVAL";

    /// <summary>Đã duyệt: được lập lệnh sản xuất; Manager sửa hạn chế.</summary>
    public const string Approved = "APPROVED";

    /// <summary>Bị từ chối: sửa rồi gửi duyệt lại.</summary>
    public const string Rejected = "REJECTED";

    /// <summary>Đã đóng: phần chưa lập lệnh bị bỏ; lệnh đã lập vẫn chạy bình thường.</summary>
    public const string Closed = "CLOSED";

    /// <summary>Đã hủy: không thực hiện.</summary>
    public const string Cancelled = "CANCELLED";

    public static readonly string[] All = { Draft, PendingApproval, Approved, Rejected, Closed, Cancelled };
}
