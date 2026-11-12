using System;
using System.Collections.Generic;

namespace StockFlow.Domain.Entities;

/// <summary>Phiếu đặt hàng nhập (PDN000001...): số lượng định đặt của NCC, để đối chiếu với số thực nhập.</summary>
public partial class TrxPurchaseOrder
{
    public int PoId { get; set; }

    public string? PoCode { get; set; }

    public int PartnerId { get; set; }

    public int WarehouseId { get; set; }

    /// <summary>DRAFT | ORDERED | PARTIAL | COMPLETED | CANCELLED</summary>
    public string? Status { get; set; }

    public DateTime? OrderDate { get; set; }

    public decimal DiscountAmount { get; set; }

    public decimal TotalAmount { get; set; }

    public string? Notes { get; set; }

    public int CreatedBy { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public int? UpdatedBy { get; set; }

    /// <summary>Phiếu mới mà phiếu này đã được gộp vào (phiếu gốc khi đó ở trạng thái CANCELLED).</summary>
    public int? MergedIntoPoId { get; set; }

    public virtual TrxPurchaseOrder? MergedIntoPo { get; set; }

    public virtual ICollection<TrxPurchaseOrder> MergedFromPos { get; set; } = new List<TrxPurchaseOrder>();

    public virtual ICollection<DtlPurchaseOrderItem> DtlPurchaseOrderItems { get; set; } = new List<DtlPurchaseOrderItem>();

    public virtual ICollection<TrxGoodsReceipt> TrxGoodsReceipts { get; set; } = new List<TrxGoodsReceipt>();

    public virtual MstBusinessPartner Partner { get; set; } = null!;

    public virtual MstWarehouse Warehouse { get; set; } = null!;

    public virtual SecUser CreatedByNavigation { get; set; } = null!;
}
