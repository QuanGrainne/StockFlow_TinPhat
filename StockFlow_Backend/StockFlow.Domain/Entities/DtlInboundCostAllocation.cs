using System;
using System.Collections.Generic;

namespace StockFlow.Domain.Entities;

public partial class DtlInboundCostAllocation
{
    public int AllocationId { get; set; }

    public int InboundCostId { get; set; }

    public int GrItemId { get; set; }

    public decimal? AllocatedAmount { get; set; }

    public virtual DtlGoodsReceiptItem GrItem { get; set; } = null!;

    public virtual TrxInboundCost InboundCost { get; set; } = null!;
}

