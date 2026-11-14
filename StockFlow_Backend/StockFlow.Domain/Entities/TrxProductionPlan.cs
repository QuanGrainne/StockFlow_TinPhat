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

    public virtual SecUser CreatedByNavigation { get; set; } = null!;

    public virtual SecUser? ApprovedByNavigation { get; set; }

    public virtual ICollection<DtlProductionPlanItem> DtlProductionPlanItems { get; set; } = new List<DtlProductionPlanItem>();

    public virtual ICollection<TrxProductionOrder> TrxProductionOrders { get; set; } = new List<TrxProductionOrder>();
}
