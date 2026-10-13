using System;
using System.Collections.Generic;

namespace StockFlow.Domain.Entities;

public partial class MstUnit
{
    public int UnitId { get; set; }

    public string? UnitName { get; set; }

    public string? Abbreviation { get; set; }

    public virtual ICollection<DtlBomItem> DtlBomItems { get; set; } = new List<DtlBomItem>();

    public virtual ICollection<DtlOrderItem> DtlOrderItems { get; set; } = new List<DtlOrderItem>();

    public virtual ICollection<MstProduct> MstProducts { get; set; } = new List<MstProduct>();

    public virtual ICollection<MstUnitConversion> MstUnitConversionFromUnits { get; set; } = new List<MstUnitConversion>();

    public virtual ICollection<MstUnitConversion> MstUnitConversionToUnits { get; set; } = new List<MstUnitConversion>();

    public virtual ICollection<TrxProductionMaterialRequirement> TrxProductionMaterialRequirements { get; set; } = new List<TrxProductionMaterialRequirement>();
}

