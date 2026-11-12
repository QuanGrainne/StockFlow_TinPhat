using System;
using System.Collections.Generic;

namespace StockFlow.Domain.Entities;

/// <summary>Nhu cầu NVL của một dòng thành phẩm, chụp (snapshot) từ BOM khi tạo lệnh.</summary>
public partial class TrxProductionMaterialRequirement
{
    public int RequirementId { get; set; }

    public int ProductionOrderItemId { get; set; }

    public int MaterialId { get; set; }

    public int UnitId { get; set; }

    /// <summary>Null nếu dòng được thêm tay trên lệnh.</summary>
    public int? SourceBomItemId { get; set; }

    public decimal NormPerUnit { get; set; }

    public decimal WastageRate { get; set; }

    public decimal RequiredQty { get; set; }

    public decimal IssuedQty { get; set; }

    public decimal ShortageQty { get; set; }

    public bool IsAdjusted { get; set; }

    public string? AdjustReason { get; set; }

    public int? AdjustedBy { get; set; }

    public DateTime? AdjustedAt { get; set; }

    public virtual SecUser? AdjustedByNavigation { get; set; }

    public virtual ICollection<DtlStockIssueItem> DtlStockIssueItems { get; set; } = new List<DtlStockIssueItem>();

    public virtual MstProduct Material { get; set; } = null!;

    public virtual TrxProductionOrderItem ProductionOrderItem { get; set; } = null!;

    public virtual DtlBomItem? SourceBomItem { get; set; }

    public virtual MstUnit Unit { get; set; } = null!;
}
