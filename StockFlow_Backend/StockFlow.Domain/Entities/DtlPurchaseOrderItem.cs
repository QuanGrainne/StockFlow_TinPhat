using System;
using System.Collections.Generic;

namespace StockFlow.Domain.Entities;

public partial class DtlPurchaseOrderItem
{
    public int PoItemId { get; set; }

    public int PoId { get; set; }

    public int ProductId { get; set; }

    public decimal OrderedQty { get; set; }

    public decimal UnitPrice { get; set; }

    /// <summary>% giảm giá của dòng (0–100).</summary>
    public decimal DiscountPercent { get; set; }

    public virtual TrxPurchaseOrder Po { get; set; } = null!;

    public virtual MstProduct Product { get; set; } = null!;
}
