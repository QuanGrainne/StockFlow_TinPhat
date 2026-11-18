using System;
using System.Collections.Generic;

namespace StockFlow.Domain.Entities;

/// <summary>
/// Kế hoạch sản xuất (đầu phiếu): một kế hoạch gồm nhiều dòng thành phẩm và có thể sinh nhiều lệnh sản xuất.
/// Tạo kế hoạch không tự tạo lệnh sản xuất.
/// </summary>
public partial class TrxProductionPlan
{
    public int ProductionPlanId { get; set; }

    public string PlanCode { get; set; } = null!;

    public string PlanName { get; set; } = null!;

    public DateTime PlanDate { get; set; }

    public DateOnly PeriodStart { get; set; }

    public DateOnly PeriodEnd { get; set; }

    public string Status { get; set; } = null!;

    public int CreatedBy { get; set; }

    public int? ApprovedBy { get; set; }

    public DateTime? ApprovalDate { get; set; }

    public string? Notes { get; set; }

    /// <summary>Lần ghi gần nhất (lập, sửa, đổi trạng thái); dùng làm mã phiên bản để phát hiện sửa đồng thời (Q-V5)</summary>
    public DateTime? UpdatedAt { get; set; }

    public int? UpdatedBy { get; set; }

    /// <summary>Kho xuất nguyên vật liệu của cả kế hoạch (mặc định kho làm việc của người lập). Mọi người xem kế hoạch đều so tồn nguyên vật liệu theo kho này. Null với kế hoạch cũ.</summary>
    public int? WarehouseId { get; set; }

    public virtual MstWarehouse? Warehouse { get; set; }

    public virtual SecUser CreatedByNavigation { get; set; } = null!;

    public virtual SecUser? ApprovedByNavigation { get; set; }

    public virtual SecUser? UpdatedByNavigation { get; set; }

    public virtual ICollection<DtlProductionPlanItem> DtlProductionPlanItems { get; set; } = new List<DtlProductionPlanItem>();

    public virtual ICollection<TrxProductionOrder> TrxProductionOrders { get; set; } = new List<TrxProductionOrder>();
}
