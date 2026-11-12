using System;
using System.Collections.Generic;

namespace StockFlow.Domain.Entities;

/// <summary>Đầu lệnh sản xuất. Thành phẩm nằm ở <see cref="TrxProductionOrderItem"/>.</summary>
public partial class TrxProductionOrder
{
    public int ProductionOrderId { get; set; }

    public string? ProductionOrderCode { get; set; }

    public decimal? ActualQuantity { get; set; }

    public string? Status { get; set; }

    public int CreatedBy { get; set; }

    public int? AssignedTo { get; set; }

    public DateTime? StartDate { get; set; }

    public DateTime? EndDate { get; set; }

    public string? Notes { get; set; }

    public virtual SecUser? AssignedToNavigation { get; set; }

    public virtual SecUser CreatedByNavigation { get; set; } = null!;

    public virtual ICollection<TrxFinishedGoodsReceipt> TrxFinishedGoodsReceipts { get; set; } = new List<TrxFinishedGoodsReceipt>();

    public virtual ICollection<TrxProductionOrderItem> TrxProductionOrderItems { get; set; } = new List<TrxProductionOrderItem>();

    public virtual ICollection<TrxProductionReport> TrxProductionReports { get; set; } = new List<TrxProductionReport>();

    public virtual ICollection<TrxStockIssue> TrxStockIssues { get; set; } = new List<TrxStockIssue>();
}
