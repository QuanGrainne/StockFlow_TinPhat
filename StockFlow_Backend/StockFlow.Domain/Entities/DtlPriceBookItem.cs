using System;

namespace StockFlow.Domain.Entities;

public partial class DtlPriceBookItem
{
    public int PriceBookItemId { get; set; }

    public int PriceBookId { get; set; }

    public int ProductId { get; set; }

    public decimal Price { get; set; }

    public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;

    public virtual MstPriceBook PriceBook { get; set; } = null!;

    public virtual MstProduct Product { get; set; } = null!;
}
