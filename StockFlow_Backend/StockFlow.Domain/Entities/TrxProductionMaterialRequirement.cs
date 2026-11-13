using System;
using System.Collections.Generic;

namespace StockFlow.Domain.Entities;

public partial class TrxProductionMaterialRequirement
{
    public int RequirementId { get; set; }

    public int ProductionOrderId { get; set; }

    public int MaterialId { get; set; }

    public decimal? RequiredQty { get; set; }

    public decimal? IssuedQty { get; set; }

    public decimal? ShortageQty { get; set; }

    public int UnitId { get; set; }

    /// <summary>Dòng BOM gốc của nhu cầu (null nếu Manager thêm tay khi điều chỉnh, BR-51)</summary>
    public int? SourceBomItemId { get; set; }

    /// <summary>Định mức NVL cho 1 đơn vị thành phẩm, chụp từ BOM khi lập lệnh (đơn vị cơ sở của NVL)</summary>
    public decimal? NormPerUnit { get; set; }

    /// <summary>Tỷ lệ hao hụt (%) chụp từ BOM khi lập lệnh</summary>
    public decimal? WastageRate { get; set; }

    /// <summary>Đã được Manager điều chỉnh trên lệnh (BR-51)</summary>
    public bool IsAdjusted { get; set; }

    /// <summary>Lý do điều chỉnh định mức gần nhất (BR-51)</summary>
    public string? AdjustReason { get; set; }

    public int? AdjustedBy { get; set; }

    public DateTime? AdjustedAt { get; set; }

    public virtual ICollection<DtlStockIssueItem> DtlStockIssueItems { get; set; } = new List<DtlStockIssueItem>();

    public virtual MstProduct Material { get; set; } = null!;

    public virtual TrxProductionOrder ProductionOrder { get; set; } = null!;

    public virtual MstUnit Unit { get; set; } = null!;
}

