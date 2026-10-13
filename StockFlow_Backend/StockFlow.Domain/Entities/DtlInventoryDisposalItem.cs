using System;
using System.Collections.Generic;

namespace StockFlow.Domain.Entities;

public partial class DtlInventoryDisposalItem
{
    public int DisposalItemId { get; set; }

    public int DisposalId { get; set; }

    public int ProductId { get; set; }

    public int? LocationId { get; set; }

    public int? LotId { get; set; }

    public decimal? Quantity { get; set; }

    public string? Reason { get; set; }

    public virtual TrxInventoryDisposal Disposal { get; set; } = null!;

    public virtual MstWarehouseLocation? Location { get; set; }

    public virtual MstInventoryLot? Lot { get; set; }

    public virtual MstProduct Product { get; set; } = null!;
}

