using System;

namespace StockFlow.Application.Features.Settings.DTOs;

/// <summary>Thiết lập cảnh báo công nợ khách hàng.</summary>
public class DebtWarningSettingDto
{
    public bool EnableDebtAmountWarning { get; set; }
    public decimal DebtAmountThreshold { get; set; }
    public bool EnableDebtDaysWarning { get; set; }
    public int DebtDaysThreshold { get; set; }
    /// <summary>FIRST_DEBT | LAST_TRANSACTION</summary>
    public string DebtDaysFrom { get; set; } = "FIRST_DEBT";
    public bool AllowDebtOverLimit { get; set; }
    /// <summary>Hạn mức công nợ mặc định cho khách tạo mới.</summary>
    public decimal DefaultCreditLimit { get; set; }
    /// <summary>Khách lẻ luôn phải thanh toán đủ (PAY-009) — chỉ để hiển thị, không đổi được.</summary>
    public bool NoDebtForWalkIn { get; set; } = true;

    public DateTime UpdatedAt { get; set; }
    public string? UpdatedByName { get; set; }
}

public class UpdateDebtWarningSettingDto
{
    public bool EnableDebtAmountWarning { get; set; }
    public decimal DebtAmountThreshold { get; set; }
    public bool EnableDebtDaysWarning { get; set; }
    public int DebtDaysThreshold { get; set; }
    public string DebtDaysFrom { get; set; } = "FIRST_DEBT";
    public bool AllowDebtOverLimit { get; set; }
    /// <summary>Bỏ trống (client cũ) = giữ nguyên hạn mức mặc định đang lưu.</summary>
    public decimal? DefaultCreditLimit { get; set; }
}
