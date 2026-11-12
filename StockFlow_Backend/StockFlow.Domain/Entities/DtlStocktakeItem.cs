using System;
using System.Collections.Generic;

namespace StockFlow.Domain.Entities;

public partial class DtlStocktakeItem
{
    public int StocktakeItemId { get; set; }

    public int StocktakeId { get; set; }

    public int ProductId { get; set; }

    public int? LocationId { get; set; }

    public int? LotId { get; set; }

    public decimal? SystemQty { get; set; }

    public decimal? ActualQty { get; set; }

    public decimal? Discrepancy { get; set; }

    public string? DiscrepancyReason { get; set; }

    public string? AdjustmentStatus { get; set; }

    public int? RecordedBy { get; set; }

    public int? ApprovedBy { get; set; }

    public DateTime? ApprovalDate { get; set; }

    /// <summary>Giá vốn tại kho lúc kiểm (tính giá trị lệch)</summary>
    public decimal? UnitCost { get; set; }

    public virtual SecUser? ApprovedByNavigation { get; set; }

    public virtual MstWarehouseLocation? Location { get; set; }

    public virtual MstInventoryLot? Lot { get; set; }

    public virtual MstProduct Product { get; set; } = null!;

    public virtual SecUser? RecordedByNavigation { get; set; }

    public virtual TrxStocktake Stocktake { get; set; } = null!;
}

