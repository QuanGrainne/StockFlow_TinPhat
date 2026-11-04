namespace StockFlow.Domain.Entities;

/// <summary>Dòng hàng của phiếu trả hàng nhập</summary>
public partial class DtlPurchaseReturnItem
{
    public int PrItemId { get; set; }

    public int PurchaseReturnId { get; set; }

    public int ProductId { get; set; }

    /// <summary>Dòng phiếu nhập gốc (giới hạn số lượng được trả)</summary>
    public int? GrItemId { get; set; }

    public decimal Quantity { get; set; }

    /// <summary>Giá nhập (giá vốn thực của phiếu nhập gốc / giá vốn hiện tại)</summary>
    public decimal? ImportPrice { get; set; }

    /// <summary>Giá trả lại cho nhà cung cấp</summary>
    public decimal? ReturnPrice { get; set; }

    public int? LotId { get; set; }

    public int? LocationId { get; set; }

    public virtual TrxPurchaseReturn PurchaseReturn { get; set; } = null!;

    public virtual MstProduct Product { get; set; } = null!;

    public virtual DtlGoodsReceiptItem? GrItem { get; set; }
}
