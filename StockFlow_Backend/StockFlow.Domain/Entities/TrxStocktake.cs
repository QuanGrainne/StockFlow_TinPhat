using System;
using System.Collections.Generic;

namespace StockFlow.Domain.Entities;

public partial class TrxStocktake
{
    public int StocktakeId { get; set; }

    public string? StocktakeCode { get; set; }

    public int WarehouseId { get; set; }

    public int ConductedBy { get; set; }

    public DateTime? StocktakeDate { get; set; }

    public string? Status { get; set; }

    public string? Notes { get; set; }

    public virtual SecUser ConductedByNavigation { get; set; } = null!;

    public virtual ICollection<DtlStocktakeItem> DtlStocktakeItems { get; set; } = new List<DtlStocktakeItem>();

    public virtual MstWarehouse Warehouse { get; set; } = null!;
}

