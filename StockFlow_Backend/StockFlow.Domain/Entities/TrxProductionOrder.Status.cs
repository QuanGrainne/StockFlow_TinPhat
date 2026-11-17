using System;

namespace StockFlow.Domain.Entities;

// Luật chuyển trạng thái lệnh sản xuất (BR-38, UC-46, UC-49, UC-58/59). Chỉ kiểm tra và đổi Status;
// tồn kho, thời gian, quyền kho và DbContext do handler xử lý.
public partial class TrxProductionOrder
{
    private bool StatusIs(string status) =>
        string.Equals(Status, status, StringComparison.OrdinalIgnoreCase);

    public bool IsNotStarted() => StatusIs(ProductionOrderStatus.NotStarted);

    public bool IsInProgress() => StatusIs(ProductionOrderStatus.InProgress);

    /// <summary>Chỉ huỷ được lệnh chưa xuất NVL (BR-38); lệnh chưa xuất NVL luôn ở trạng thái Chưa bắt đầu.</summary>
    public bool CanCancel() => IsNotStarted();

    /// <summary>Manager đóng sớm lệnh đang sản xuất, bắt buộc có lý do (A58.1 bước 6, BR-38).</summary>
    public bool CanClose() => IsInProgress();

    /// <summary>Xuất NVL (kể cả bổ sung) cho lệnh chưa bắt đầu hoặc đang sản xuất (UC-46 tiền điều kiện, E46.1).</summary>
    public bool CanIssueMaterial() => IsNotStarted() || IsInProgress();

    /// <summary>Nhập thành phẩm khi lệnh đang sản xuất (UC-49 tiền điều kiện).</summary>
    public bool CanReceiveFinishedGoods() => IsInProgress();

    /// <summary>
    /// Duyệt hoàn thành: chỉ lệnh đang sản xuất (đã xuất NVL). Duyệt → tự sinh phiếu nhập thành phẩm;
    /// lệnh chỉ chuyển Hoàn thành khi đã nhập đủ kế hoạch (handler kiểm), chưa đủ thì duyệt nhập tiếp được.
    /// </summary>
    public bool CanApproveCompletion() => IsInProgress();

    /// <summary>Điều chỉnh định mức trên lệnh khi lệnh còn hiệu lực (BR-51).</summary>
    public bool CanAdjustNorm() => IsNotStarted() || IsInProgress();

    // Mark*: handler đã kiểm tra Can*() trước, ở đây chỉ gán trạng thái.
    public void MarkInProgress() => Status = ProductionOrderStatus.InProgress;

    public void MarkCompleted() => Status = ProductionOrderStatus.Completed;

    public void MarkCancelled() => Status = ProductionOrderStatus.Cancelled;
}
