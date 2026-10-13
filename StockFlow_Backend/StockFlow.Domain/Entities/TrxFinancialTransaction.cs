using System;
using System.Collections.Generic;

namespace StockFlow.Domain.Entities;

public partial class TrxFinancialTransaction
{
    public int TxId { get; set; }

    public int PartnerId { get; set; }

    public string? TxType { get; set; }

    public decimal? Amount { get; set; }

    public string? PaymentMethod { get; set; }

    public string? ReferenceType { get; set; }

    public int? ReferenceId { get; set; }

    public DateTime? TransactionDate { get; set; }

    public int CreatedBy { get; set; }

    public string? Status { get; set; }

    public string? Description { get; set; }

    public virtual SecUser CreatedByNavigation { get; set; } = null!;

    public virtual MstBusinessPartner Partner { get; set; } = null!;
}

