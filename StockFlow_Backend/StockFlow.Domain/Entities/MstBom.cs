using System;
using System.Collections.Generic;

namespace StockFlow.Domain.Entities;

public partial class MstBom
{
    public int BomId { get; set; }

    public int ProductId { get; set; }

    public string? BomName { get; set; }

    public string? Version { get; set; }

    /// <summary>Cờ cũ, giữ để mã hiện hành không vỡ; nguồn sự thật mới là <see cref="Status"/>.</summary>
    public bool? IsActive { get; set; }

    public DateTime? CreatedAt { get; set; }

    /// <summary>Draft / Active / Inactive. Tối đa một bản Active cho mỗi thành phẩm (BR-30).</summary>
    public string Status { get; set; } = "Draft";

    public DateOnly? EffectiveDate { get; set; }

    public string? Description { get; set; }

    public virtual ICollection<DtlBomItem> DtlBomItems { get; set; } = new List<DtlBomItem>();

    public virtual MstProduct Product { get; set; } = null!;

    public virtual ICollection<TrxProductionOrderItem> TrxProductionOrderItems { get; set; } = new List<TrxProductionOrderItem>();
}
