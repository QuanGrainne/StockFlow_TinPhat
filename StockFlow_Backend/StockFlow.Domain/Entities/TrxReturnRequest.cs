using System;
using System.Collections.Generic;

namespace StockFlow.Domain.Entities;

public partial class TrxReturnRequest
{
    public int ReturnRequestId { get; set; }

    public string? ReturnCode { get; set; }

    public int PartnerId { get; set; }

    public int SalesOrderId { get; set; }

    public int CreatedBy { get; set; }

    public DateTime? RequestDate { get; set; }

    public string? Reason { get; set; }

    public string? Status { get; set; }

    /// <summary>Kho nhận hàng trả (chi nhánh bán của hóa đơn)</summary>
    public int? WarehouseId { get; set; }

    /// <summary>Tổng tiền hàng trả = Σ SL trả × giá nhập lại</summary>
    public decimal TotalGoodsAmount { get; set; }

    /// <summary>Giảm giá phiếu trả</summary>
    public decimal DiscountAmount { get; set; }

    /// <summary>Phí trả hàng (khách chịu)</summary>
    public decimal ReturnFee { get; set; }

    /// <summary>Cần trả khách = tổng tiền hàng trả − giảm giá − phí trả hàng</summary>
    public decimal TotalAmount { get; set; }

    /// <summary>Đã trả khách (tiền mặt / chuyển khoản); phần còn lại trừ vào công nợ khách</summary>
    public decimal RefundAmount { get; set; }

    public string? PaymentMethod { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual MstWarehouse? Warehouse { get; set; }

    public virtual SecUser CreatedByNavigation { get; set; } = null!;

    public virtual ICollection<DtlReturnRequestItem> DtlReturnRequestItems { get; set; } = new List<DtlReturnRequestItem>();

    public virtual MstBusinessPartner Partner { get; set; } = null!;

    public virtual TrxOrder SalesOrder { get; set; } = null!;
}

