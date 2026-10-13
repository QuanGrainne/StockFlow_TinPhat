using System;
using System.Collections.Generic;

namespace StockFlow.Domain.Entities;

public partial class MstProductCategory
{
    public int CategoryId { get; set; }

    public string? CategoryName { get; set; }

    public string? Description { get; set; }

    public bool? IsActive { get; set; }

    public virtual ICollection<MstProduct> MstProducts { get; set; } = new List<MstProduct>();
}

