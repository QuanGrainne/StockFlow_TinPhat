using System;
using System.Collections.Generic;

namespace StockFlow.Domain.Entities;

public partial class TrxOrder
{
    public int OrderId { get; set; }

    public string? OrderCode { get; set; }

    public int PartnerId { get; set; }

    public string? Status { get; set; }

    public int? ConsolidatedIntoOrderId { get; set; }

    public decimal? TotalAmount { get; set; }

    public decimal? PaidAmount { get; set; }

    public decimal? OutstandingAmount { get; set; }

    public string? PaymentStatus { get; set; }

    public int CreatedBy { get; set; }

    public DateTime? OrderDate { get; set; }

    public string? Notes { get; set; }

    public decimal SubTotal { get; set; }

    public string DiscountType { get; set; } = "AMOUNT";

    public decimal DiscountValue { get; set; }

    public decimal DiscountAmount { get; set; }

    public string OrderType { get; set; } = "INVOICE";

    public DateTime? UpdatedAt { get; set; }

    public int? UpdatedBy { get; set; }

    /// <summary>Chi nhánh xử lý (đơn đặt hàng) / chi nhánh bán (hóa đơn)</summary>
    public int? WarehouseId { get; set; }

    /// <summary>Thời gian giao hàng dự kiến (đơn đặt hàng)</summary>
    public DateTime? DeliveryDate { get; set; }

    /// <summary>Hóa đơn được tạo từ đơn đặt hàng nào (order_type = BOOKING)</summary>
    public int? BookingOrderId { get; set; }

    /// <summary>Tiền khách đã trả trước ở đơn đặt hàng được trừ vào hóa đơn này</summary>
    public decimal DepositAmount { get; set; }

    public virtual MstWarehouse? Warehouse { get; set; }

    public virtual TrxOrder? BookingOrder { get; set; }

    /// <summary>Các hóa đơn tạo từ đơn đặt hàng này</summary>
    public virtual ICollection<TrxOrder> BookingInvoices { get; set; } = new List<TrxOrder>();

    public virtual TrxOrder? ConsolidatedIntoOrder { get; set; }

    public virtual SecUser CreatedByNavigation { get; set; } = null!;

    public virtual SecUser? UpdatedByNavigation { get; set; }

    public virtual ICollection<DtlOrderItem> DtlOrderItems { get; set; } = new List<DtlOrderItem>();

    public virtual ICollection<TrxOrder> InverseConsolidatedIntoOrder { get; set; } = new List<TrxOrder>();

    public virtual MstBusinessPartner Partner { get; set; } = null!;

    public virtual ICollection<TrxCreditLimitRequest> TrxCreditLimitRequests { get; set; } = new List<TrxCreditLimitRequest>();

    public virtual ICollection<TrxReturnRequest> TrxReturnRequests { get; set; } = new List<TrxReturnRequest>();

    public virtual ICollection<TrxStockIssue> TrxStockIssues { get; set; } = new List<TrxStockIssue>();
}

