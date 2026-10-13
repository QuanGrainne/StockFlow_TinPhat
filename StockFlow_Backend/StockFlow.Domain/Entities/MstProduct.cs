using System;
using System.Collections.Generic;

namespace StockFlow.Domain.Entities;

public partial class MstProduct
{
    public int ProductId { get; set; }

    public string? ProductCode { get; set; }

    public string? ProductName { get; set; }

    public int CategoryId { get; set; }

    public int BaseUnitId { get; set; }

    public string? ProductType { get; set; }

    public string? Description { get; set; }

    public decimal? ReorderPoint { get; set; }

    public decimal? MovingAverageCost { get; set; }

    public bool? IsActive { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual MstUnit BaseUnit { get; set; } = null!;

    public virtual MstProductCategory Category { get; set; } = null!;

    public virtual ICollection<DtlBomItem> DtlBomItems { get; set; } = new List<DtlBomItem>();

    public virtual ICollection<DtlGoodsReceiptItem> DtlGoodsReceiptItems { get; set; } = new List<DtlGoodsReceiptItem>();

    public virtual ICollection<DtlInventoryDisposalItem> DtlInventoryDisposalItems { get; set; } = new List<DtlInventoryDisposalItem>();

    public virtual ICollection<DtlOrderItem> DtlOrderItems { get; set; } = new List<DtlOrderItem>();

    public virtual ICollection<DtlReturnRequestItem> DtlReturnRequestItems { get; set; } = new List<DtlReturnRequestItem>();

    public virtual ICollection<DtlStockTransferItem> DtlStockTransferItems { get; set; } = new List<DtlStockTransferItem>();

    public virtual ICollection<DtlStocktakeItem> DtlStocktakeItems { get; set; } = new List<DtlStocktakeItem>();

    public virtual ICollection<MstBom> MstBoms { get; set; } = new List<MstBom>();

    public virtual ICollection<MstInventoryLot> MstInventoryLots { get; set; } = new List<MstInventoryLot>();

    public virtual ICollection<MstProductImage> MstProductImages { get; set; } = new List<MstProductImage>();

    public virtual ICollection<MstUnitConversion> MstUnitConversions { get; set; } = new List<MstUnitConversion>();

    public virtual ICollection<TrxFinishedGoodsReceipt> TrxFinishedGoodsReceipts { get; set; } = new List<TrxFinishedGoodsReceipt>();

    public virtual ICollection<TrxInventoryBalance> TrxInventoryBalances { get; set; } = new List<TrxInventoryBalance>();

    public virtual ICollection<TrxInventoryTransaction> TrxInventoryTransactions { get; set; } = new List<TrxInventoryTransaction>();

    public virtual ICollection<TrxProductionMaterialRequirement> TrxProductionMaterialRequirements { get; set; } = new List<TrxProductionMaterialRequirement>();

    public virtual ICollection<TrxProductionOrder> TrxProductionOrders { get; set; } = new List<TrxProductionOrder>();
}

