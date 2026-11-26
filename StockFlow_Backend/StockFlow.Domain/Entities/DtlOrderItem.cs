using System;
using System.Collections.Generic;

namespace StockFlow.Domain.Entities;

public partial class DtlOrderItem
{
    public int OrderItemId { get; set; }

    public int OrderId { get; set; }

    public int ProductId { get; set; }

    public decimal? Quantity { get; set; }

    public int UnitId { get; set; }

    /// <summary>
    /// Số đơn vị cơ bản trong 1 đơn vị bán của dòng (bán theo đơn vị quy đổi: 1 túi = 10 bịch → 10).
    /// Quantity, UnitPrice, LineTotal theo đơn vị bán; tồn kho trừ Quantity × ConversionRate.
    /// </summary>
    public decimal ConversionRate { get; set; } = 1;

    public decimal? UnitPrice { get; set; }

    public decimal OriginalPrice { get; set; }

    public string DiscountType { get; set; } = "AMOUNT";

    public decimal DiscountValue { get; set; }

    public decimal DiscountAmount { get; set; }

    public decimal LineTotal { get; set; }

    public virtual ICollection<DtlReturnRequestItem> DtlReturnRequestItems { get; set; } = new List<DtlReturnRequestItem>();

    public virtual ICollection<DtlStockIssueItem> DtlStockIssueItems { get; set; } = new List<DtlStockIssueItem>();

    public virtual TrxOrder Order { get; set; } = null!;

    public virtual MstProduct Product { get; set; } = null!;

    public virtual MstUnit Unit { get; set; } = null!;
}

