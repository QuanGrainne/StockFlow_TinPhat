using System;
using System.Collections.Generic;

namespace StockFlow.Domain.Entities;

public partial class MstInventoryLot
{
    public int LotId { get; set; }

    public int ProductId { get; set; }

    public string? LotNumber { get; set; }

    public DateOnly? MfgDate { get; set; }

    public DateOnly? ExpiryDate { get; set; }

    public virtual ICollection<DtlGoodsReceiptItem> DtlGoodsReceiptItems { get; set; } = new List<DtlGoodsReceiptItem>();

    public virtual ICollection<DtlInventoryDisposalItem> DtlInventoryDisposalItems { get; set; } = new List<DtlInventoryDisposalItem>();

    public virtual ICollection<DtlStockIssueItem> DtlStockIssueItems { get; set; } = new List<DtlStockIssueItem>();

    public virtual ICollection<DtlStockTransferItem> DtlStockTransferItems { get; set; } = new List<DtlStockTransferItem>();

    public virtual ICollection<DtlStocktakeItem> DtlStocktakeItems { get; set; } = new List<DtlStocktakeItem>();

    public virtual MstProduct Product { get; set; } = null!;

    public virtual ICollection<TrxFinishedGoodsReceipt> TrxFinishedGoodsReceipts { get; set; } = new List<TrxFinishedGoodsReceipt>();

    public virtual ICollection<TrxInventoryBalance> TrxInventoryBalances { get; set; } = new List<TrxInventoryBalance>();

    public virtual ICollection<TrxInventoryTransaction> TrxInventoryTransactions { get; set; } = new List<TrxInventoryTransaction>();
}

