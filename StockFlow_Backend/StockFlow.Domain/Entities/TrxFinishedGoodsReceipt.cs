using System;
using System.Collections.Generic;

namespace StockFlow.Domain.Entities;

public partial class TrxFinishedGoodsReceipt
{
    public int FgrId { get; set; }

    public string? FgrCode { get; set; }

    public int ProductionOrderId { get; set; }

    public int ReportId { get; set; }

    public int WarehouseId { get; set; }

    public int? LocationId { get; set; }

    public int ProductId { get; set; }

    public int? LotId { get; set; }

    public decimal? Quantity { get; set; }

    public int ReceivedBy { get; set; }

    public DateTime? ReceivedDate { get; set; }

    public string? Status { get; set; }

    public string? Notes { get; set; }

    public virtual MstWarehouseLocation? Location { get; set; }

    public virtual MstInventoryLot? Lot { get; set; }

    public virtual MstProduct Product { get; set; } = null!;

    public virtual TrxProductionOrder ProductionOrder { get; set; } = null!;

    public virtual SecUser ReceivedByNavigation { get; set; } = null!;

    public virtual TrxProductionReport Report { get; set; } = null!;

    public virtual MstWarehouse Warehouse { get; set; } = null!;
}

