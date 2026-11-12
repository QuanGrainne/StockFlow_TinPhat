using System;
using System.Collections.Generic;

namespace StockFlow.Domain.Entities;

/// <summary>Một dòng thành phẩm của lệnh sản xuất (D1).</summary>
public partial class TrxProductionOrderItem
{
    public int ProductionOrderItemId { get; set; }

    public int ProductionOrderId { get; set; }

    public int ProductId { get; set; }

    /// <summary>Phiên bản BOM đã áp dụng khi tạo lệnh.</summary>
    public int BomId { get; set; }

    public decimal PlannedQty { get; set; }

    public decimal ReceivedQty { get; set; }

    /// <summary>Not Started / In Progress / Completed (BR-38).</summary>
    public string Status { get; set; } = "Not Started";

    public virtual MstBom Bom { get; set; } = null!;

    public virtual MstProduct Product { get; set; } = null!;

    public virtual TrxProductionOrder ProductionOrder { get; set; } = null!;

    public virtual ICollection<TrxProductionMaterialRequirement> TrxProductionMaterialRequirements { get; set; } = new List<TrxProductionMaterialRequirement>();
}
