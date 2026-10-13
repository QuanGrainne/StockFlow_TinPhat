using System;
using System.Collections.Generic;

namespace StockFlow.Domain.Entities;

public partial class TrxReturnProcessing
{
    public int ProcessingId { get; set; }

    public int ReturnItemId { get; set; }

    public string? Category { get; set; }

    public decimal? Quantity { get; set; }

    public int? WarehouseId { get; set; }

    public string? Status { get; set; }

    public int ProcessedBy { get; set; }

    public DateTime? ProcessDate { get; set; }

    public string? Notes { get; set; }

    public virtual SecUser ProcessedByNavigation { get; set; } = null!;

    public virtual DtlReturnRequestItem ReturnItem { get; set; } = null!;

    public virtual MstWarehouse? Warehouse { get; set; }
}

