using System;

namespace StockFlow.Domain.Entities;

/// <summary>
/// Nhật ký thay đổi hạn mức công nợ của khách hàng.
/// Mọi đường đổi hạn mức (tạo khách, Manager điều chỉnh, điều chỉnh hàng loạt, duyệt yêu cầu nâng hạn mức) đều ghi một dòng.
/// </summary>
public class TrxCreditLimitHistory
{
    public long HistoryId { get; set; }

    public int PartnerId { get; set; }

    public decimal OldLimit { get; set; }

    public decimal NewLimit { get; set; }

    /// <summary>Nguồn thay đổi, xem <see cref="CreditLimitChangeSource"/>.</summary>
    public string Source { get; set; } = CreditLimitChangeSource.Manual;

    public string? Reason { get; set; }

    /// <summary>Yêu cầu nâng hạn mức đã duyệt (khi Source = REQUEST_APPROVED).</summary>
    public int? RequestId { get; set; }

    public int? ChangedBy { get; set; }

    /// <summary>Giờ Việt Nam.</summary>
    public DateTime ChangedAt { get; set; }

    public virtual MstBusinessPartner Partner { get; set; } = null!;
}

public static class CreditLimitChangeSource
{
    /// <summary>Gán hạn mức mặc định khi tạo khách.</summary>
    public const string Initial = "INITIAL";
    /// <summary>Manager điều chỉnh một khách.</summary>
    public const string Manual = "MANUAL";
    /// <summary>Manager điều chỉnh hàng loạt.</summary>
    public const string Bulk = "BULK";
    /// <summary>Duyệt yêu cầu nâng hạn mức (UC-64).</summary>
    public const string RequestApproved = "REQUEST_APPROVED";
}
