using System;

namespace StockFlow.Domain.Entities;

// Luật chuyển trạng thái yêu cầu duyệt hạn mức (HM-01, UC-27/UC-64, BR-13).
// Chỉ kiểm tra và gán trạng thái; người duyệt, thời gian, hạn mức của khách và DbContext do handler xử lý.
public partial class TrxCreditLimitRequest
{
    private bool StatusIs(string status) =>
        string.Equals(Status, status, StringComparison.OrdinalIgnoreCase);

    public bool IsPending() => StatusIs(CreditRequestStatus.Pending);

    /// <summary>Ngoại lệ một lần đã dùng khi đã gắn hóa đơn.</summary>
    public bool IsUsed() => SalesOrderId.HasValue;

    /// <summary>Đã được duyệt theo loại ngoại lệ một lần.</summary>
    public bool IsOneTimeApproved() =>
        StatusIs(CreditRequestStatus.Approved)
        && string.Equals(ApprovalType, CreditApprovalType.OneTime, StringComparison.OrdinalIgnoreCase);

    /// <summary>Chỉ quyết định được yêu cầu đang chờ (đã xử lý thì báo MSG57).</summary>
    public bool CanApprove() => IsPending();

    public bool CanReject() => IsPending();

    // Mark*: handler đã kiểm tra Can*() trước, ở đây chỉ gán giá trị.
    public void MarkApproved(string approvalType)
    {
        Status = CreditRequestStatus.Approved;
        ApprovalType = approvalType;
    }

    public void MarkRejected()
    {
        Status = CreditRequestStatus.Rejected;
        ApprovalType = null;
    }

    /// <summary>Đánh dấu ngoại lệ một lần đã dùng cho hóa đơn.</summary>
    public void MarkUsed(int salesOrderId) => SalesOrderId = salesOrderId;
}
