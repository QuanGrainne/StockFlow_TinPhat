using System;

namespace StockFlow.Domain.Entities;

/// <summary>
/// Truy vết nhu cầu của một lần chạy MRP: nhu cầu một NVL vào một ngày đến từ kế hoạch / lệnh nào,
/// và được cấp bao nhiêu từ tồn + hàng về theo thứ tự ưu tiên (BR-MRP-21). Dùng để chỉ ra kế hoạch / lệnh nào bị thiếu.
/// </summary>
public partial class DtlMrpRunDemand
{
    public int MrpRunDemandId { get; set; }

    public int MrpRunId { get; set; }

    /// <summary>Nguyên vật liệu.</summary>
    public int MaterialId { get; set; }

    /// <summary>Ngày cần (đã đưa về hôm nay nếu ở quá khứ, BR-MRP-03).</summary>
    public DateOnly NeedDate { get; set; }

    /// <summary><see cref="MrpDemandSource"/>: PLAN hoặc ORDER.</summary>
    public string SourceType { get; set; } = null!;

    /// <summary>Kế hoạch sản xuất (nguồn PLAN, hoặc lệnh thuộc kế hoạch).</summary>
    public int? ProductionPlanId { get; set; }

    /// <summary>Lệnh sản xuất (nguồn ORDER).</summary>
    public int? ProductionOrderId { get; set; }

    /// <summary>Thành phẩm gây ra nhu cầu.</summary>
    public int ProductId { get; set; }

    public decimal RequiredQty { get; set; }

    public decimal AllocatedQty { get; set; }

    public decimal ShortageQty { get; set; }

    public virtual TrxMrpRun MrpRun { get; set; } = null!;

    public virtual MstProduct Material { get; set; } = null!;

    public virtual MstProduct Product { get; set; } = null!;

    public virtual TrxProductionPlan? ProductionPlan { get; set; }

    public virtual TrxProductionOrder? ProductionOrder { get; set; }
}
