namespace StockFlow.Domain.Entities;

/// <summary>
/// Trạng thái yêu cầu duyệt hạn mức công nợ (cột trx_credit_limit_requests.status) – UC-27, UC-64, BR-13.
/// "Đã dùng" của ngoại lệ một lần KHÔNG là trạng thái riêng: suy ra từ sales_order_id đã gắn hóa đơn.
/// </summary>
public static class CreditRequestStatus
{
    /// <summary>Sales Accountant đã gửi, chờ Manager quyết định.</summary>
    public const string Pending = "PENDING";

    /// <summary>Manager đã duyệt (loại duyệt xem cột approval_type).</summary>
    public const string Approved = "APPROVED";

    /// <summary>Manager đã từ chối (lý do ở cột approval_notes).</summary>
    public const string Rejected = "REJECTED";
}
