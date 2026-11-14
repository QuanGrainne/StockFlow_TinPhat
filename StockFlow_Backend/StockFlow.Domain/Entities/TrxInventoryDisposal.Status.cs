using System;

namespace StockFlow.Domain.Entities;

// Luật chuyển trạng thái phiếu xuất hủy. Chỉ kiểm tra và đổi Status;
// tồn kho, thời gian và DbContext do handler xử lý (cùng kiểu TrxStockTransfer.Status.cs).
public partial class TrxInventoryDisposal
{
    private bool StatusIs(string status) =>
        string.Equals(Status, status, StringComparison.OrdinalIgnoreCase);

    public bool IsDraft() => StatusIs(DisposalStatus.Draft);

    public bool IsCompleted() => StatusIs(DisposalStatus.Completed);

    /// <summary>Chỉ sửa / hoàn thành được phiếu tạm (phiếu đã hoàn thành đã trừ tồn kho).</summary>
    public bool CanEdit() => IsDraft();

    public void MarkDraft() => Status = DisposalStatus.Draft;

    public void MarkCompleted() => Status = DisposalStatus.Completed;
}
