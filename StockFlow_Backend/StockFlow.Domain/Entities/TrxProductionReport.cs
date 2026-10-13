using System;
using System.Collections.Generic;

namespace StockFlow.Domain.Entities;

public partial class TrxProductionReport
{
    public int ReportId { get; set; }

    public int ProductionOrderId { get; set; }

    public int ReportedBy { get; set; }

    public string? BatchNo { get; set; }

    public decimal? ProducedQty { get; set; }

    public decimal? DefectQty { get; set; }

    public decimal? WastageQty { get; set; }

    public DateTime? ReportDate { get; set; }

    public string? Notes { get; set; }

    public virtual TrxProductionOrder ProductionOrder { get; set; } = null!;

    public virtual SecUser ReportedByNavigation { get; set; } = null!;

    public virtual TrxFinishedGoodsReceipt? TrxFinishedGoodsReceipt { get; set; }
}

