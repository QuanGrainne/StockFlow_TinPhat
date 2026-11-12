using System;
using System.Collections.Generic;

namespace StockFlow.Domain.Entities;

public partial class DtlReturnRequestItem
{
    public int ReturnItemId { get; set; }

    public int ReturnRequestId { get; set; }

    public int ProductId { get; set; }

    public int? OrderItemId { get; set; }

    public decimal? Quantity { get; set; }

    public string? Condition { get; set; }

    public string? Notes { get; set; }

    /// <summary>Giá bán trên hóa đơn (sau giảm giá dòng)</summary>
    public decimal SalePrice { get; set; }

    /// <summary>Giá nhập lại (tiền trả khách cho 1 đơn vị)</summary>
    public decimal ReturnPrice { get; set; }

    public virtual DtlOrderItem? OrderItem { get; set; }

    public virtual MstProduct Product { get; set; } = null!;

    public virtual TrxReturnRequest ReturnRequest { get; set; } = null!;

    public virtual ICollection<TrxReturnProcessing> TrxReturnProcessings { get; set; } = new List<TrxReturnProcessing>();
}

