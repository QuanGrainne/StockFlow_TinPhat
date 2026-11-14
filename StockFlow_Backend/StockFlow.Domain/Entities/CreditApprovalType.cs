namespace StockFlow.Domain.Entities;

/// <summary>
/// Loại duyệt của Manager (cột trx_credit_limit_requests.approval_type) – BR-13.
/// Null khi yêu cầu còn chờ hoặc bị từ chối.
/// </summary>
public static class CreditApprovalType
{
    /// <summary>Ngoại lệ một lần: cho đúng một hóa đơn ghi nợ, không đổi hạn mức của khách.</summary>
    public const string OneTime = "ONE_TIME";

    /// <summary>Nâng hạn mức: hạn mức của khách được cập nhật bằng hạn mức đề xuất.</summary>
    public const string NewLimit = "NEW_LIMIT";

    public static bool IsValid(string? value) =>
        value == OneTime || value == NewLimit;
}
