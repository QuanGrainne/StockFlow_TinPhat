using System;
using System.Collections.Generic;

namespace StockFlow.Domain.Entities;

/// <summary>
/// Lưu thông tin một lần chạy tính toán hoạch định nhu cầu nguyên vật liệu (MRP).
/// </summary>
public partial class TrxMrpRun
{
    public int MrpRunId { get; set; }

    public string RunCode { get; set; } = null!;

    public DateTime RunAt { get; set; }

    public int RunBy { get; set; }

    public DateOnly PeriodStart { get; set; }

    public DateOnly PeriodEnd { get; set; }

    /// <summary>Danh sách ID kho áp dụng, cách nhau bởi dấu phẩy (VD: "1,2")</summary>
    public string WarehouseIds { get; set; } = null!;

    public bool IncludePendingPlans { get; set; }

    public int MaterialCount { get; set; }

    public int ShortageCount { get; set; }

    public int LateCount { get; set; }

    public string? Notes { get; set; }

    public virtual SecUser RunByNavigation { get; set; } = null!;

    public virtual ICollection<DtlMrpRunLine> DtlMrpRunLines { get; set; } = new List<DtlMrpRunLine>();
}
