using System;
using System.Collections.Generic;

namespace StockFlow.Domain.Entities;

public partial class DtlStockTransferItem
{
    public int TransferItemId { get; set; }

    public int StockTransferId { get; set; }

    public int ProductId { get; set; }

    public int? LotId { get; set; }

    public int? SourceLocationId { get; set; }

    public int? DestLocationId { get; set; }

    public decimal? Quantity { get; set; }

    public decimal? IssuedQuantity { get; set; }

    public decimal? ReceivedQuantity { get; set; }

    /// <summary>Giá vốn kho xuất tại thời điểm xuất chuyển (giá trị chuyển / giá nhập vào kho nhận)</summary>
    public decimal? UnitCost { get; set; }

    /// <summary>Ghi chú dòng hàng của chi nhánh chuyển</summary>
    public string? Notes { get; set; }

    /// <summary>Ghi chú dòng hàng của chi nhánh nhận (VD: "thiếu 1", "vỡ")</summary>
    public string? ReceiveNotes { get; set; }

    public virtual MstWarehouseLocation? DestLocation { get; set; }

    public virtual MstInventoryLot? Lot { get; set; }

    public virtual MstProduct Product { get; set; } = null!;

    public virtual MstWarehouseLocation? SourceLocation { get; set; }

    public virtual TrxStockTransfer StockTransfer { get; set; } = null!;
}

