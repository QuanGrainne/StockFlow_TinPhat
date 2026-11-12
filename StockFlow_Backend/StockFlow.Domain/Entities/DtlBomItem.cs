using System;
using System.Collections.Generic;

namespace StockFlow.Domain.Entities;

public partial class DtlBomItem
{
    public int BomItemId { get; set; }

    public int BomId { get; set; }

    public int MaterialId { get; set; }

    /// <summary>Định mức trên một đơn vị thành phẩm, DECIMAL(18,6), &gt; 0.</summary>
    public decimal Quantity { get; set; }

    public int UnitId { get; set; }

    /// <summary>Tỷ lệ hao hụt %, DECIMAL(7,4), từ 0 đến 100.</summary>
    public decimal WastageRate { get; set; }

    public virtual MstBom Bom { get; set; } = null!;

    public virtual MstProduct Material { get; set; } = null!;

    public virtual MstUnit Unit { get; set; } = null!;

    public virtual ICollection<TrxProductionMaterialRequirement> TrxProductionMaterialRequirements { get; set; } = new List<TrxProductionMaterialRequirement>();
}
