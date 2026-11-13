using System;
using System.Collections.Generic;

namespace StockFlow.Domain.Entities;

public partial class TrxProductionOrder
{
    public int ProductionOrderId { get; set; }

    public string? ProductionOrderCode { get; set; }

    public int ProductId { get; set; }

    public int BomId { get; set; }

    public decimal? PlannedQuantity { get; set; }

    public decimal? ActualQuantity { get; set; }

    public string? Status { get; set; }

    public int CreatedBy { get; set; }

    public int? AssignedTo { get; set; }

    public DateTime? StartDate { get; set; }

    public DateTime? EndDate { get; set; }

    public string? Notes { get; set; }

    /// <summary>Xưởng phụ trách sản xuất (UC-58 A58.1)</summary>
    public string? Workshop { get; set; }

    public virtual SecUser? AssignedToNavigation { get; set; }

    public virtual MstBom Bom { get; set; } = null!;

    public virtual SecUser CreatedByNavigation { get; set; } = null!;

    public virtual MstProduct Product { get; set; } = null!;

    public virtual ICollection<TrxFinishedGoodsReceipt> TrxFinishedGoodsReceipts { get; set; } = new List<TrxFinishedGoodsReceipt>();

    public virtual ICollection<TrxProductionMaterialRequirement> TrxProductionMaterialRequirements { get; set; } = new List<TrxProductionMaterialRequirement>();

    public virtual ICollection<TrxProductionReport> TrxProductionReports { get; set; } = new List<TrxProductionReport>();

    public virtual ICollection<TrxStockIssue> TrxStockIssues { get; set; } = new List<TrxStockIssue>();
}

