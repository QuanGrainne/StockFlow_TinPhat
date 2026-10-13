using System;
using System.Collections.Generic;

namespace StockFlow.Domain.Entities;

public partial class TrxProductionMaterialRequirement
{
    public int RequirementId { get; set; }

    public int ProductionOrderId { get; set; }

    public int MaterialId { get; set; }

    public decimal? RequiredQty { get; set; }

    public decimal? IssuedQty { get; set; }

    public decimal? ShortageQty { get; set; }

    public int UnitId { get; set; }

    public virtual ICollection<DtlStockIssueItem> DtlStockIssueItems { get; set; } = new List<DtlStockIssueItem>();

    public virtual MstProduct Material { get; set; } = null!;

    public virtual TrxProductionOrder ProductionOrder { get; set; } = null!;

    public virtual MstUnit Unit { get; set; } = null!;
}

