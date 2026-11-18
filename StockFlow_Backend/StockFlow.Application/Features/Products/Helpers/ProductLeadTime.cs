namespace StockFlow.Application.Features.Products.Helpers;

/// <summary>
/// Thời gian giao của hàng hóa (mst_products.lead_time_days): số ngày lịch từ lúc đặt tới lúc hàng vào kho,
/// dùng cho MRP để tính ngày phải đặt hàng (BR-MRP-23). Rỗng = chưa khai báo.
/// </summary>
public static class ProductLeadTime
{
    public const int MaxDays = 365;

    public const string RangeMessage = "Thời gian giao hàng phải là số ngày từ 0 đến 365.";
}
