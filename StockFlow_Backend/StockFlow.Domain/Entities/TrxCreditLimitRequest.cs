using System;
using System.Collections.Generic;

namespace StockFlow.Domain.Entities;

public partial class TrxCreditLimitRequest
{
    public int RequestId { get; set; }

    public int PartnerId { get; set; }

    public int? SalesOrderId { get; set; }

    public int RequestedBy { get; set; }

    public decimal? CurrentLimit { get; set; }

    public decimal? RequestedLimit { get; set; }

    public string? Reason { get; set; }

    public string? Status { get; set; }

    public int? ApprovedBy { get; set; }

    public DateTime? RequestDate { get; set; }

    public DateTime? ApprovalDate { get; set; }

    public string? ApprovalNotes { get; set; }

    public virtual SecUser? ApprovedByNavigation { get; set; }

    public virtual MstBusinessPartner Partner { get; set; } = null!;

    public virtual SecUser RequestedByNavigation { get; set; } = null!;

    public virtual TrxOrder? SalesOrder { get; set; }
}

