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

    public bool IsCancelled() => StatusIs(DisposalStatus.Cancelled);

    /// <summary>Chỉ sửa hàng hóa / hoàn thành được phiếu tạm (phiếu đã hoàn thành đã trừ tồn kho).</summary>
    public bool CanEdit() => IsDraft();

    /// <summary>Đổi ngày xuất hủy chỉ khi còn là phiếu tạm (phiếu hoàn thành đã ghi thẻ kho theo ngày đó).</summary>
    public bool CanChangeDate() => IsDraft();

    /// <summary>Sửa người xuất hủy / ghi chú được khi phiếu chưa hủy.</summary>
    public bool CanEditInfo() => !IsCancelled();

    /// <summary>Hủy được phiếu tạm hoặc phiếu đã hoàn thành (hoàn lại tồn kho); phiếu đã hủy thì thôi.</summary>
    public bool CanCancel() => !IsCancelled();

    public void MarkDraft() => Status = DisposalStatus.Draft;

    public void MarkCompleted() => Status = DisposalStatus.Completed;

    public void MarkCancelled() => Status = DisposalStatus.Cancelled;
}
