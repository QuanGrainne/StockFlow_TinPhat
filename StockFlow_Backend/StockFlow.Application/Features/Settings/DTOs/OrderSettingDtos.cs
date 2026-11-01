using System;

namespace StockFlow.Application.Features.Settings.DTOs;

public class OrderSettingDto
{
    public int SettingId { get; set; } = 1;

    // Group A: Đặt hàng
    public bool EnableOrderPlacement { get; set; }
    public bool AllowOrderWhenOutOfStock { get; set; }
    public bool AllowSellingReservedStock { get; set; }
    public bool AllowTransferringOrderBranch { get; set; }

    // Group B: Bán hàng & POS
    public bool AllowNegativeStockSale { get; set; }
    public bool EnablePrintQuotation { get; set; }
    public bool ConfirmBeforeCompleteOrder { get; set; }

    // Group C: Trả hàng
    public bool EnableReturnTimeLimit { get; set; }
    public int ReturnTimeLimitDays { get; set; }

    // Group D: Thời gian giao dịch
    public bool LockTransactionTime { get; set; }

    // Group E: Quy tắc sinh mã
    public string OrderCodeRule { get; set; } = "SEQUENTIAL";
    public string OrderCodePrefix { get; set; } = "HD";
    public string BookingCodePrefix { get; set; } = "DH";
    public string ReturnCodePrefix { get; set; } = "TH";
    public string TransferCodePrefix { get; set; } = "CK";

    public DateTime UpdatedAt { get; set; }
    public int? UpdatedBy { get; set; }
    public string? UpdatedByName { get; set; }
}

public class UpdateOrderSettingDto
{
    // Group A: Đặt hàng
    public bool EnableOrderPlacement { get; set; } = true;
    public bool AllowOrderWhenOutOfStock { get; set; } = true;
    public bool AllowSellingReservedStock { get; set; } = false;
    public bool AllowTransferringOrderBranch { get; set; } = true;

    // Group B: Bán hàng & POS
    public bool AllowNegativeStockSale { get; set; } = false;
    public bool EnablePrintQuotation { get; set; } = true;
    public bool ConfirmBeforeCompleteOrder { get; set; } = false;

    // Group C: Trả hàng
    public bool EnableReturnTimeLimit { get; set; } = true;
    public int ReturnTimeLimitDays { get; set; } = 30;

    // Group D: Thời gian giao dịch
    public bool LockTransactionTime { get; set; } = true;

    // Group E: Quy tắc sinh mã
    public string OrderCodeRule { get; set; } = "SEQUENTIAL";
    public string OrderCodePrefix { get; set; } = "HD";
    public string BookingCodePrefix { get; set; } = "DH";
    public string ReturnCodePrefix { get; set; } = "TH";
    public string TransferCodePrefix { get; set; } = "CK";
}

