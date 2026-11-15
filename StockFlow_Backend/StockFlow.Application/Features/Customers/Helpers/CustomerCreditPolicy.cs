using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common.Interfaces;

namespace StockFlow.Application.Features.Customers.Helpers;

/// <summary>
/// Chính sách hạn mức công nợ của khách hàng:
/// - Khách tạo mới nhận hạn mức mặc định trong "Thiết lập công nợ" (Manager đổi được; chưa có thiết lập → 200.000.000 đ).
///   Khách lẻ KH00000 luôn 0, không ghi nợ.
/// - Form khách hàng không sửa hạn mức. Hạn mức đổi qua: Manager (Kế toán trưởng) điều chỉnh từng khách / hàng loạt,
///   hoặc duyệt yêu cầu nâng hạn mức (UC-64). Mọi lần đổi ghi vào trx_credit_limit_histories.
/// - Không được đặt hạn mức thấp hơn dư nợ hiện tại của khách.
/// </summary>
public static class CustomerCreditPolicy
{
    /// <summary>Giá trị dùng khi chưa có dòng thiết lập trong DB.</summary>
    public const decimal DefaultCreditLimit = 200_000_000m;

    public const decimal MaxCreditLimit = 999_999_999_999m;

    public const string WalkInCustomerCode = "KH00000";

    public static async Task<decimal> GetDefaultCreditLimitAsync(IStockFlowDbContext context, CancellationToken ct)
    {
        var value = await context.MstDebtWarningSettings.AsNoTracking()
            .Where(s => s.SettingId == 1)
            .Select(s => (decimal?)s.DefaultCreditLimit)
            .FirstOrDefaultAsync(ct);
        return value ?? DefaultCreditLimit;
    }
}
