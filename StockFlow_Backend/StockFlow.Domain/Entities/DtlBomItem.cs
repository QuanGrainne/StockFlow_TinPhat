using System;
using System.Collections.Generic;

namespace StockFlow.Domain.Entities;

public partial class DtlBomItem
{
    public int BomItemId { get; set; }

    public int BomId { get; set; }

    public int MaterialId { get; set; }

    public decimal? Quantity { get; set; }

    public int UnitId { get; set; }

    public decimal? WastageRate { get; set; }

    public virtual MstBom Bom { get; set; } = null!;

    public virtual MstProduct Material { get; set; } = null!;

    public virtual MstUnit Unit { get; set; } = null!;
}

