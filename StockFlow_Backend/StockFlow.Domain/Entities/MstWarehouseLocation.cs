using System;
using System.Collections.Generic;

namespace StockFlow.Domain.Entities;

public partial class MstWarehouseLocation
{
    public int LocationId { get; set; }

    public int WarehouseId { get; set; }

    public string? LocationCode { get; set; }

    public string? LocationName { get; set; }

    public bool? IsActive { get; set; }

    public virtual ICollection<DtlGoodsReceiptItem> DtlGoodsReceiptItems { get; set; } = new List<DtlGoodsReceiptItem>();

    public virtual ICollection<DtlInventoryDisposalItem> DtlInventoryDisposalItems { get; set; } = new List<DtlInventoryDisposalItem>();

    public virtual ICollection<DtlStockTransferItem> DtlStockTransferItemDestLocations { get; set; } = new List<DtlStockTransferItem>();

    public virtual ICollection<DtlStockTransferItem> DtlStockTransferItemSourceLocations { get; set; } = new List<DtlStockTransferItem>();

    public virtual ICollection<DtlStocktakeItem> DtlStocktakeItems { get; set; } = new List<DtlStocktakeItem>();

    public virtual ICollection<TrxFinishedGoodsReceipt> TrxFinishedGoodsReceipts { get; set; } = new List<TrxFinishedGoodsReceipt>();

    public virtual ICollection<TrxInventoryBalance> TrxInventoryBalances { get; set; } = new List<TrxInventoryBalance>();

    public virtual ICollection<TrxInventoryTransaction> TrxInventoryTransactions { get; set; } = new List<TrxInventoryTransaction>();

    public virtual MstWarehouse Warehouse { get; set; } = null!;
}

