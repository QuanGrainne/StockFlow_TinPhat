namespace StockFlow.Application.Features.Reports.DTOs;

/// <summary>Loại báo cáo công nợ (UC-86).</summary>
public static class DebtReportType
{
    /// <summary>Phải thu khách hàng</summary>
    public const string Receivable = "RECEIVABLE";
    /// <summary>Phải trả nhà cung cấp</summary>
    public const string Payable = "PAYABLE";

    public static readonly string[] All = { Receivable, Payable };
}

/// <summary>Nhóm tuổi nợ theo số ngày nợ.</summary>
public static class DebtAgingBucket
{
    public const string Days0To30 = "0-30";
    public const string Days31To60 = "31-60";
    public const string Days61To90 = "61-90";
    public const string Over90 = "90+";

    public static readonly string[] All = { Days0To30, Days31To60, Days61To90, Over90 };

    public static string Of(int days) => days <= 30 ? Days0To30 : days <= 60 ? Days31To60 : days <= 90 ? Days61To90 : Over90;
}

/// <summary>Một dòng báo cáo công nợ của một đối tác trong kỳ (tiền chưa VAT).</summary>
public class DebtReportRowDto
{
    public int PartnerId { get; set; }
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
    public string? Phone { get; set; }
    /// <summary>Nợ đầu kỳ = nợ cuối kỳ − phát sinh tăng + phát sinh giảm</summary>
    public decimal Opening { get; set; }
    /// <summary>Tổng các dòng sổ nợ làm tăng nợ trong kỳ</summary>
    public decimal Increase { get; set; }
    /// <summary>Tổng các dòng sổ nợ làm giảm nợ trong kỳ (số dương)</summary>
    public decimal Decrease { get; set; }
    /// <summary>Nợ cuối kỳ = dư nợ hiện tại − phát sinh sau kỳ</summary>
    public decimal Closing { get; set; }
    /// <summary>Hạn mức công nợ (chỉ khách hàng)</summary>
    public decimal? CreditLimit { get; set; }
    /// <summary>Số ngày nợ tính đến hôm nay (chỉ khách đang còn nợ; theo thiết lập cảnh báo công nợ)</summary>
    public int? DebtDays { get; set; }
    /// <summary>Nhóm tuổi nợ: 0-30 / 31-60 / 61-90 / 90+</summary>
    public string? AgingBucket { get; set; }
}

public class DebtAgingSummaryDto
{
    public string Bucket { get; set; } = "";
    public int Count { get; set; }
    /// <summary>Tổng nợ cuối kỳ của các đối tác trong nhóm</summary>
    public decimal Amount { get; set; }
}

public class DebtReportDto
{
    public string Type { get; set; } = DebtReportType.Receivable;
    public List<DebtReportRowDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    /// <summary>Dòng tổng của toàn bộ kết quả (mọi trang)</summary>
    public DebtReportRowDto Totals { get; set; } = new();
    /// <summary>Mốc đếm số ngày nợ đang thiết lập: FIRST_DEBT / LAST_TRANSACTION; null với phải trả (chưa có hàm số ngày nợ NCC)</summary>
    public string? DebtDaysFrom { get; set; }
    /// <summary>Tổng hợp theo nhóm tuổi nợ (chỉ phải thu)</summary>
    public List<DebtAgingSummaryDto> Aging { get; set; } = new();
}
