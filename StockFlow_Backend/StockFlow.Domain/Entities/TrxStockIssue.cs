using System;
using System.Collections.Generic;

namespace StockFlow.Domain.Entities;

public partial class TrxStockIssue
{
    public int StockIssueId { get; set; }

    public string? IssueCode { get; set; }

    public string? IssueType { get; set; }

    public int? SalesOrderId { get; set; }

    public int? ProductionOrderId { get; set; }

    public int WarehouseId { get; set; }

    public int RequestedBy { get; set; }

    public int? ProcessedBy { get; set; }

    public DateTime? RequestedDate { get; set; }

    public DateTime? ProcessedDate { get; set; }

    public string? Status { get; set; }

    public bool? IsSupplementary { get; set; }

    public virtual ICollection<DtlStockIssueItem> DtlStockIssueItems { get; set; } = new List<DtlStockIssueItem>();

    public virtual SecUser? ProcessedByNavigation { get; set; }

    public virtual TrxProductionOrder? ProductionOrder { get; set; }

    public virtual SecUser RequestedByNavigation { get; set; } = null!;

    public virtual TrxOrder? SalesOrder { get; set; }

    public virtual MstWarehouse Warehouse { get; set; } = null!;
}

