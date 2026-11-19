namespace StockFlow.Domain.Entities;

/// <summary>Phiếu trả hàng nhập (trả hàng cho nhà cung cấp) — mã THN000001...</summary>
public partial class TrxPurchaseReturn
{
    public int PurchaseReturnId { get; set; }

    public string? ReturnCode { get; set; }

    /// <summary>Phiếu nhập gốc (null nếu trả hàng không theo phiếu nhập)</summary>
    public int? GrId { get; set; }

    public int WarehouseId { get; set; }

    public int PartnerId { get; set; }

    public DateTime? ReturnDate { get; set; }

    /// <summary>DRAFT | COMPLETED | CANCELLED</summary>
    public string? Status { get; set; }

    /// <summary>
    /// STOCK: trả hàng đã nhập kho (trừ tồn, giảm công nợ NCC).
    /// DEFECT: trả hàng lỗi ghi nhận lúc nhận hàng (hàng lỗi chưa vào kho, chưa tính tiền → không trừ tồn, không tính tiền).
    /// </summary>
    public string ReturnType { get; set; } = "STOCK";

    /// <summary>Giảm giá trên toàn phiếu (VND)</summary>
    public decimal? DiscountAmount { get; set; }

    /// <summary>Nhà cung cấp cần trả = Tổng tiền hàng − Giảm giá</summary>
    public decimal? TotalAmount { get; set; }

    /// <summary>Tiền nhà cung cấp đã trả lại ngay khi trả hàng</summary>
    public decimal? RefundAmount { get; set; }

    public string? PaymentMethod { get; set; }

    public string? Notes { get; set; }

    public int CreatedBy { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual TrxGoodsReceipt? Gr { get; set; }

    public virtual MstWarehouse Warehouse { get; set; } = null!;

    public virtual MstBusinessPartner Partner { get; set; } = null!;

    public virtual SecUser CreatedByNavigation { get; set; } = null!;

    public virtual ICollection<DtlPurchaseReturnItem> DtlPurchaseReturnItems { get; set; } = new List<DtlPurchaseReturnItem>();
}
