using System;

namespace StockFlow.Application.Features.Settings.DTOs;

/// <summary>Cài đặt giao dịch (nút cài đặt cạnh avatar): chỉ 2 tuỳ chọn.</summary>
public class OrderSettingDto
{
    public int SettingId { get; set; } = 1;

    /// <summary>Cho phép bán hàng vượt tồn kho (bán âm kho)</summary>
    public bool AllowNegativeStockSale { get; set; }

    /// <summary>Cho phép xuất chuyển hàng khi tồn kho xuất không đủ (kho xuất âm)</summary>
    public bool AllowNegativeStockTransfer { get; set; }

    public DateTime UpdatedAt { get; set; }
    public int? UpdatedBy { get; set; }
    public string? UpdatedByName { get; set; }
}

public class UpdateOrderSettingDto
{
    public bool AllowNegativeStockSale { get; set; } = true;
    public bool AllowNegativeStockTransfer { get; set; } = true;
}
