using System;

namespace StockFlow.Domain.Entities;

public partial class MstOrderSetting
{
    public int SettingId { get; set; } = 1;

    // Group A: Order placement & reservation
    public bool EnableOrderPlacement { get; set; } = true;
    public bool AllowOrderWhenOutOfStock { get; set; } = true;
    public bool AllowSellingReservedStock { get; set; } = false;
    public bool AllowTransferringOrderBranch { get; set; } = true;

    // Group B: Sales & POS execution
    public bool AllowNegativeStockSale { get; set; } = false;
    public bool EnablePrintQuotation { get; set; } = true;
    public bool ConfirmBeforeCompleteOrder { get; set; } = false;

    // Group C: Return policy
    public bool EnableReturnTimeLimit { get; set; } = true;
    public int ReturnTimeLimitDays { get; set; } = 30;

    // Group D: Transaction timing
    public bool LockTransactionTime { get; set; } = true;

    // Group E: Code generation rules
    public string OrderCodeRule { get; set; } = "SEQUENTIAL";
    public string OrderCodePrefix { get; set; } = "HD";
    public string BookingCodePrefix { get; set; } = "DH";
    public string ReturnCodePrefix { get; set; } = "TH";
    public string TransferCodePrefix { get; set; } = "CK";

    // Audit
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public int? UpdatedBy { get; set; }
    public virtual SecUser? UpdatedByUser { get; set; }
}

