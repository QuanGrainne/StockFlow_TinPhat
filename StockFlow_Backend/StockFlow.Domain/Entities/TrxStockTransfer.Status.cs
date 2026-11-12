using System;

namespace StockFlow.Domain.Entities;

// Luật chuyển trạng thái phiếu chuyển kho (T20). Chỉ kiểm tra và đổi Status;
// tồn kho, thời gian, ghi chú và DbContext vẫn do handler xử lý.
// So sánh không phân biệt hoa thường, giữ y như các handler cũ.
public partial class TrxStockTransfer
{
    private bool StatusIs(string status) =>
        string.Equals(Status, status, StringComparison.OrdinalIgnoreCase);

    public bool IsInTransit() => StatusIs(TransferStatus.InTransit);

    public bool IsReceived() => StatusIs(TransferStatus.Received);

    /// <summary>Chỉ sửa được phiếu tạm.</summary>
    public bool CanEdit() => StatusIs(TransferStatus.Draft);

    /// <summary>Chỉ xuất kho được phiếu tạm.</summary>
    public bool CanIssue() => StatusIs(TransferStatus.Draft);

    /// <summary>Chỉ nhận hàng được phiếu đang chuyển.</summary>
    public bool CanReceive() => StatusIs(TransferStatus.InTransit);

    /// <summary>Huỷ được mọi phiếu chưa huỷ (tạm, đang chuyển, đã nhận).</summary>
    public bool CanCancel() => !StatusIs(TransferStatus.Cancelled);

    /// <summary>Kho nhận ghi chú được khi phiếu đang chuyển hoặc đã nhận.</summary>
    public bool CanEditReceiveNotes() => IsInTransit() || IsReceived();

    // Mark*: handler đã kiểm tra Can*() trước, ở đây chỉ gán trạng thái (không ném lỗi để giữ nguyên hành vi).
    public void MarkInTransit() => Status = TransferStatus.InTransit;

    public void MarkReceived() => Status = TransferStatus.Received;

    public void MarkCancelled() => Status = TransferStatus.Cancelled;
}
