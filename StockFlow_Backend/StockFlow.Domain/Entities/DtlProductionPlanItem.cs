using System;
using System.Collections.Generic;

namespace StockFlow.Domain.Entities;

/// <summary>
/// Dòng kế hoạch sản xuất: mỗi thành phẩm có số lượng kế hoạch, thời gian bắt đầu / kết thúc
/// và (tùy chọn) kho nhận thành phẩm riêng.
/// </summary>
public partial class DtlProductionPlanItem
{
    public int ProductionPlanItemId { get; set; }

    public int ProductionPlanId { get; set; }

    public int ProductId { get; set; }

    public decimal PlannedQuantity { get; set; }

    public DateOnly PlannedStartDate { get; set; }

    public DateOnly PlannedEndDate { get; set; }

    /// <summary>Kho nhận thành phẩm (có thể chưa chỉ định)</summary>
    public int? WarehouseId { get; set; }

    public string? Notes { get; set; }

    public virtual TrxProductionPlan ProductionPlan { get; set; } = null!;

    public virtual MstProduct Product { get; set; } = null!;

    public virtual MstWarehouse? Warehouse { get; set; }
}
