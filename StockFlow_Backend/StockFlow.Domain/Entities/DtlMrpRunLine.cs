using System;

namespace StockFlow.Domain.Entities;

/// <summary>
/// Dòng chi tiết kết quả tính toán MRP theo từng nguyên vật liệu và từng mốc ngày.
/// </summary>
public partial class DtlMrpRunLine
{
    public int MrpRunLineId { get; set; }

    public int MrpRunId { get; set; }

    public int MaterialId { get; set; }

    public DateOnly BucketDate { get; set; }

    public decimal GrossRequirement { get; set; }

    public decimal ScheduledReceipt { get; set; }

    public decimal ProjectedBalance { get; set; }

    public decimal NetRequirement { get; set; }

    public decimal PlannedReceipt { get; set; }

    public DateOnly? PlannedReleaseDate { get; set; }

    public bool IsLate { get; set; }

    public virtual TrxMrpRun MrpRun { get; set; } = null!;

    public virtual MstProduct Material { get; set; } = null!;
}
