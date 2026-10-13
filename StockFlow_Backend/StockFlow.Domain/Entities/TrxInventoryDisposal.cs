using System;
using System.Collections.Generic;

namespace StockFlow.Domain.Entities;

public partial class TrxInventoryDisposal
{
    public int DisposalId { get; set; }

    public string? DisposalCode { get; set; }

    public int WarehouseId { get; set; }

    public int ProcessedBy { get; set; }

    public DateTime? DisposalDate { get; set; }

    public string? Reason { get; set; }

    public string? Status { get; set; }

    public virtual ICollection<DtlInventoryDisposalItem> DtlInventoryDisposalItems { get; set; } = new List<DtlInventoryDisposalItem>();

    public virtual SecUser ProcessedByNavigation { get; set; } = null!;

    public virtual MstWarehouse Warehouse { get; set; } = null!;
}

