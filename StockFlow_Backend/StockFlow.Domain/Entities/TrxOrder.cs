using System;
using System.Collections.Generic;

namespace StockFlow.Domain.Entities;

public partial class TrxOrder
{
    public int OrderId { get; set; }

    public string? OrderCode { get; set; }

    public int PartnerId { get; set; }

    public string? Status { get; set; }

    public int? ConsolidatedIntoOrderId { get; set; }

    public decimal? TotalAmount { get; set; }

    public decimal? PaidAmount { get; set; }

    public decimal? OutstandingAmount { get; set; }

    public string? PaymentStatus { get; set; }

    public int CreatedBy { get; set; }

    public DateTime? OrderDate { get; set; }

    public string? Notes { get; set; }

    public decimal SubTotal { get; set; }

    public string DiscountType { get; set; } = "AMOUNT";

    public decimal DiscountValue { get; set; }

    public decimal DiscountAmount { get; set; }

    public string OrderType { get; set; } = "INVOICE";

    public DateTime? UpdatedAt { get; set; }

    public int? UpdatedBy { get; set; }

    public virtual TrxOrder? ConsolidatedIntoOrder { get; set; }

    public virtual SecUser CreatedByNavigation { get; set; } = null!;

    public virtual SecUser? UpdatedByNavigation { get; set; }

    public virtual ICollection<DtlOrderItem> DtlOrderItems { get; set; } = new List<DtlOrderItem>();

    public virtual ICollection<TrxOrder> InverseConsolidatedIntoOrder { get; set; } = new List<TrxOrder>();

    public virtual MstBusinessPartner Partner { get; set; } = null!;

    public virtual ICollection<TrxCreditLimitRequest> TrxCreditLimitRequests { get; set; } = new List<TrxCreditLimitRequest>();

    public virtual ICollection<TrxReturnRequest> TrxReturnRequests { get; set; } = new List<TrxReturnRequest>();

    public virtual ICollection<TrxStockIssue> TrxStockIssues { get; set; } = new List<TrxStockIssue>();
}

