using System;
using System.Collections.Generic;

namespace StockFlow.Domain.Entities;

public partial class TrxReturnRequest
{
    public int ReturnRequestId { get; set; }

    public string? ReturnCode { get; set; }

    public int PartnerId { get; set; }

    public int SalesOrderId { get; set; }

    public int CreatedBy { get; set; }

    public DateTime? RequestDate { get; set; }

    public string? Reason { get; set; }

    public string? Status { get; set; }

    public virtual SecUser CreatedByNavigation { get; set; } = null!;

    public virtual ICollection<DtlReturnRequestItem> DtlReturnRequestItems { get; set; } = new List<DtlReturnRequestItem>();

    public virtual MstBusinessPartner Partner { get; set; } = null!;

    public virtual TrxOrder SalesOrder { get; set; } = null!;
}

