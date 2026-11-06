using System;
using System.Collections.Generic;

namespace StockFlow.Domain.Entities;

public partial class TrxGoodsReceipt
{
    public int GrId { get; set; }

    public string? GrCode { get; set; }

    public string? ExternalPoNumber { get; set; }

    public int PartnerId { get; set; }

    public int WarehouseId { get; set; }

    public int ReceivedBy { get; set; }

    public DateTime? ReceivedDate { get; set; }

    public string? Status { get; set; }

    public string? Notes { get; set; }

    /// <summary>Giảm giá toàn phiếu (VND), đã phân bổ vào UnitLandedCost của từng dòng.</summary>
    public decimal? DiscountAmount { get; set; }

    /// <summary>Phiếu đặt hàng nhập mà phiếu nhập này nhận hàng theo (null = nhập trực tiếp).</summary>
    public int? PurchaseOrderId { get; set; }

    public virtual TrxPurchaseOrder? PurchaseOrder { get; set; }

    public virtual ICollection<DtlGoodsReceiptItem> DtlGoodsReceiptItems { get; set; } = new List<DtlGoodsReceiptItem>();

    public virtual MstBusinessPartner Partner { get; set; } = null!;

    public virtual SecUser ReceivedByNavigation { get; set; } = null!;

    public virtual ICollection<TrxInboundCost> TrxInboundCosts { get; set; } = new List<TrxInboundCost>();

    public virtual MstWarehouse Warehouse { get; set; } = null!;
}

