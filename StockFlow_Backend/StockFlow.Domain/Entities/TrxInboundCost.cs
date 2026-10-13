using System;
using System.Collections.Generic;

namespace StockFlow.Domain.Entities;

public partial class TrxInboundCost
{
    public int InboundCostId { get; set; }

    public int GrId { get; set; }

    public string? CostType { get; set; }

    public decimal? Amount { get; set; }

    public string? Description { get; set; }

    public int AllocatedBy { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual SecUser AllocatedByNavigation { get; set; } = null!;

    public virtual ICollection<DtlInboundCostAllocation> DtlInboundCostAllocations { get; set; } = new List<DtlInboundCostAllocation>();

    public virtual TrxGoodsReceipt Gr { get; set; } = null!;
}

