using System.Collections.Generic;

namespace StockFlow.Domain.Entities;

/// <summary>
/// Dòng thành phẩm trong lệnh sản xuất (hỗ trợ 1 lệnh sản xuất chứa nhiều thành phẩm).
/// </summary>
public partial class DtlProductionOrderItem
{
    public int ProductionOrderItemId { get; set; }

    public int ProductionOrderId { get; set; }

    public int ProductId { get; set; }

    public int BomId { get; set; }

    public decimal PlannedQuantity { get; set; }

    public decimal ActualQuantity { get; set; }

    public string? Notes { get; set; }

    public virtual TrxProductionOrder ProductionOrder { get; set; } = null!;

    public virtual MstProduct Product { get; set; } = null!;

    public virtual MstBom Bom { get; set; } = null!;

    public virtual ICollection<TrxProductionMaterialRequirement> TrxProductionMaterialRequirements { get; set; } = new List<TrxProductionMaterialRequirement>();

    public virtual ICollection<TrxFinishedGoodsReceipt> TrxFinishedGoodsReceipts { get; set; } = new List<TrxFinishedGoodsReceipt>();
}
