namespace StockFlow.Application.Features.Customers.Helpers;

/// <summary>
/// Chính sách hạn mức công nợ của khách hàng (HM-01, quyết định của nhóm ngày 14/11/2026):
/// - Khách tạo mới có hạn mức mặc định 200.000.000 đ (Khách lẻ KH00000 vẫn 0, không ghi nợ).
/// - Hạn mức chỉ thay đổi khi Kế toán trưởng duyệt "nâng hạn mức" (UC-64); form khách hàng không sửa được.
/// </summary>
public static class CustomerCreditPolicy
{
    public const decimal DefaultCreditLimit = 200_000_000m;
}
