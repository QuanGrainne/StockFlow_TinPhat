using System;
using System.Collections.Generic;

namespace StockFlow.Domain.Entities;

public partial class MstProductImage
{
    public int ImageId { get; set; }

    public int ProductId { get; set; }

    public string? ImageUrl { get; set; }

    public bool? IsPrimary { get; set; }

    public int? DisplayOrder { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual MstProduct Product { get; set; } = null!;
}

