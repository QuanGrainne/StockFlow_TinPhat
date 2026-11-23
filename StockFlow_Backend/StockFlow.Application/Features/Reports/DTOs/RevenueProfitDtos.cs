namespace StockFlow.Application.Features.Reports.DTOs;

/// <summary>Kiểu nhóm của báo cáo doanh thu – lợi nhuận (UC-88).</summary>
public static class RevenueProfitGroupBy
{
    public const string Day = "DAY";
    public const string Product = "PRODUCT";
    public const string Customer = "CUSTOMER";

    public static readonly string[] All = { Day, Product, Customer };
}

/// <summary>Một dòng báo cáo doanh thu – lợi nhuận (một ngày / một hàng / một khách), tiền chưa VAT.</summary>
public class RevenueProfitRowDto
{
    /// <summary>Khóa dòng: yyyy-MM-dd (theo ngày) hoặc id hàng / khách</summary>
    public string Key { get; set; } = "";
    /// <summary>Ngày (theo ngày) / mã hàng / mã khách</summary>
    public string Code { get; set; } = "";
    /// <summary>Tên hàng / tên khách; rỗng khi nhóm theo ngày</summary>
    public string Name { get; set; } = "";
    /// <summary>Số lượng bán trên hóa đơn</summary>
    public decimal QuantitySold { get; set; }
    /// <summary>Doanh thu = tiền hàng trên dòng hóa đơn (sau giảm giá dòng)</summary>
    public decimal Revenue { get; set; }
    /// <summary>Giảm giá hóa đơn (phân bổ theo tiền dòng khi nhóm theo hàng / lọc nhóm hàng)</summary>
    public decimal Discount { get; set; }
    /// <summary>Giá trị hàng trả (sau giảm giá phiếu trả)</summary>
    public decimal ReturnValue { get; set; }
    /// <summary>Doanh thu thuần = doanh thu − giảm giá − hàng trả</summary>
    public decimal NetRevenue { get; set; }
    /// <summary>Giá vốn hàng bán</summary>
    public decimal CostOfGoodsSold { get; set; }
    /// <summary>Lợi nhuận gộp = doanh thu thuần − giá vốn</summary>
    public decimal GrossProfit { get; set; }
    /// <summary>Tỷ suất lợi nhuận gộp (%)</summary>
    public decimal MarginPercent { get; set; }
}

public class RevenueProfitReportDto
{
    public List<RevenueProfitRowDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    /// <summary>Dòng tổng của toàn bộ kết quả (mọi trang)</summary>
    public RevenueProfitRowDto Totals { get; set; } = new();
}
