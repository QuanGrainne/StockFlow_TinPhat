using System;
using System.Collections.Generic;

namespace StockFlow.Domain.Entities;

public partial class DtlStockIssueItem
{
    public int SiItemId { get; set; }

    public int StockIssueId { get; set; }

    public int? OrderItemId { get; set; }

    public int? MaterialRequirementId { get; set; }

    public int? LotId { get; set; }

    public decimal? RequestedQty { get; set; }

    public decimal? ActualIssuedQty { get; set; }

    public virtual MstInventoryLot? Lot { get; set; }

    public virtual TrxProductionMaterialRequirement? MaterialRequirement { get; set; }

    public virtual DtlOrderItem? OrderItem { get; set; }

    public virtual TrxStockIssue StockIssue { get; set; } = null!;
}

