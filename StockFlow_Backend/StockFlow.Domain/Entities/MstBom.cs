using System;
using System.Collections.Generic;

namespace StockFlow.Domain.Entities;

public partial class MstBom
{
    public int BomId { get; set; }

    public int ProductId { get; set; }

    public string? BomName { get; set; }

    public string? Version { get; set; }

    public bool? IsActive { get; set; }

    public DateTime? CreatedAt { get; set; }

    /// <summary>Ghi chú kỹ thuật / hướng dẫn sản xuất của BOM (màn 3.2.2.6–3.2.2.8)</summary>
    public string? Description { get; set; }

    public virtual ICollection<DtlBomItem> DtlBomItems { get; set; } = new List<DtlBomItem>();

    public virtual MstProduct Product { get; set; } = null!;

    public virtual ICollection<TrxProductionOrder> TrxProductionOrders { get; set; } = new List<TrxProductionOrder>();
}

