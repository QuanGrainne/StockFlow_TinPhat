using System;
using System.Collections.Generic;

namespace StockFlow.Domain.Entities;

public partial class MstUnitConversion
{
    public int ConversionId { get; set; }

    public int? ProductId { get; set; }

    public int FromUnitId { get; set; }

    public int ToUnitId { get; set; }

    public decimal? ConversionFactor { get; set; }

    public virtual MstUnit FromUnit { get; set; } = null!;

    public virtual MstProduct? Product { get; set; }

    public virtual MstUnit ToUnit { get; set; } = null!;
}

