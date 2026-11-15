using System;

namespace StockFlow.Domain.Entities;

// Luật chuyển trạng thái kế hoạch sản xuất (BR-PP-12, BR-PP-13, BR-PP-16, BR-PP-22). Chỉ kiểm tra và đổi Status;
// quyền, số đã lập lệnh, thời gian, người duyệt và DbContext do handler xử lý.
public partial class TrxProductionPlan
{
    private bool StatusIs(string status) =>
        string.Equals(Status, status, StringComparison.OrdinalIgnoreCase);

    public bool IsDraft() => StatusIs(ProductionPlanStatus.Draft);

    public bool IsPendingApproval() => StatusIs(ProductionPlanStatus.PendingApproval);

    public bool IsApproved() => StatusIs(ProductionPlanStatus.Approved);

    public bool IsRejected() => StatusIs(ProductionPlanStatus.Rejected);

    /// <summary>Sửa toàn bộ (tên, kỳ, thêm / xóa / đổi dòng) khi Nháp hoặc Bị từ chối (BR-PP-12).</summary>
    public bool CanEditAll() => IsDraft() || IsRejected();

    /// <summary>Sửa hạn chế khi Đã duyệt: số lượng, ngày, kho nhận, ghi chú, thêm dòng (BR-PP-13, Q5).</summary>
    public bool CanEditLimited() => IsApproved();

    /// <summary>Gửi duyệt từ Nháp hoặc Bị từ chối.</summary>
    public bool CanSubmit() => IsDraft() || IsRejected();

    public bool CanApprove() => IsPendingApproval();

    public bool CanReject() => IsPendingApproval();

    /// <summary>
    /// Hủy khi chưa kết thúc. Với kế hoạch Đã duyệt, handler kiểm thêm không còn lệnh nào khác Đã hủy (BR-PP-22).
    /// </summary>
    public bool CanCancel() => IsDraft() || IsRejected() || IsPendingApproval() || IsApproved();

    /// <summary>Đóng kế hoạch Đã duyệt (Manager, đóng bằng tay — Q9).</summary>
    public bool CanClose() => IsApproved();

    /// <summary>Chỉ kế hoạch Đã duyệt mới được dùng để lập lệnh (BR-PP-16).</summary>
    public bool CanCreateOrder() => IsApproved();

    // Mark*: handler đã kiểm tra Can*() trước, ở đây chỉ gán trạng thái.
    public void MarkPendingApproval() => Status = ProductionPlanStatus.PendingApproval;

    public void MarkApproved() => Status = ProductionPlanStatus.Approved;

    public void MarkRejected() => Status = ProductionPlanStatus.Rejected;

    public void MarkClosed() => Status = ProductionPlanStatus.Closed;

    public void MarkCancelled() => Status = ProductionPlanStatus.Cancelled;
}
