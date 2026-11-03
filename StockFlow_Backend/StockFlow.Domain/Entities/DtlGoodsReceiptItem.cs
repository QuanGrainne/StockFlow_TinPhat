using System;
using System.Collections.Generic;

namespace StockFlow.Domain.Entities;

public partial class DtlGoodsReceiptItem
{
    public int GrItemId { get; set; }

    public int GrId { get; set; }

    public int ProductId { get; set; }

    public decimal? OrderedQty { get; set; }

    public decimal? ReceivedQty { get; set; }

    public decimal? AcceptedQty { get; set; }

    public decimal? DefectiveQty { get; set; }

    public decimal? DamagedQty { get; set; }

    public decimal? ShortageQty { get; set; }

    public decimal? UnitLandedCost { get; set; }

    /// <summary>Đơn giá nhập gốc (trước giảm giá dòng và giảm giá phiếu). Null với dữ liệu cũ.</summary>
    public decimal? UnitPrice { get; set; }

    /// <summary>% giảm giá của dòng (0–100). Null với dữ liệu cũ.</summary>
    public decimal? DiscountPercent { get; set; }

    public int? LocationId { get; set; }

    public int? LotId { get; set; }

    public virtual ICollection<DtlInboundCostAllocation> DtlInboundCostAllocations { get; set; } = new List<DtlInboundCostAllocation>();

    public virtual TrxGoodsReceipt Gr { get; set; } = null!;

    public virtual MstWarehouseLocation? Location { get; set; }

    public virtual MstInventoryLot? Lot { get; set; }

    public virtual MstProduct Product { get; set; } = null!;
}

