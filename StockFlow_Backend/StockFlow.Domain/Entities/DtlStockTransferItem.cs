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

    public virtual MstWarehouseLocation? DestLocation { get; set; }

    public virtual MstInventoryLot? Lot { get; set; }

    public virtual MstProduct Product { get; set; } = null!;

    public virtual MstWarehouseLocation? SourceLocation { get; set; }

    public virtual TrxStockTransfer StockTransfer { get; set; } = null!;
}

