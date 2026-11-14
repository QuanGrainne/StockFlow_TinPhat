using System;

namespace StockFlow.Domain.Entities;

/// <summary>
/// Thiết lập cảnh báo công nợ khách hàng (một dòng duy nhất, SettingId = 1).
/// - Số tiền nợ / số ngày nợ: chỉ là ngưỡng CẢNH BÁO chung, không thay hạn mức riêng của từng khách.
/// - AllowDebtOverLimit: bật → POS chỉ cảnh báo, vẫn cho ghi nợ vượt hạn mức (không cần gửi yêu cầu duyệt).
/// </summary>
public class MstDebtWarningSetting
{
    public const string FromFirstDebt = "FIRST_DEBT";
    public const string FromLastTransaction = "LAST_TRANSACTION";

    public int SettingId { get; set; } = 1;

    public bool EnableDebtAmountWarning { get; set; } = true;
    public decimal DebtAmountThreshold { get; set; } = 10_000_000m;

    public bool EnableDebtDaysWarning { get; set; } = false;
    public int DebtDaysThreshold { get; set; } = 15;
    /// <summary>FIRST_DEBT = tính từ giao dịch nợ đầu tiên chưa trả hết; LAST_TRANSACTION = từ giao dịch cuối cùng</summary>
    public string DebtDaysFrom { get; set; } = FromFirstDebt;

    public bool AllowDebtOverLimit { get; set; } = false;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public int? UpdatedBy { get; set; }
}
