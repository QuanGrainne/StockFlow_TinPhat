using System;
using System.Collections.Generic;

namespace StockFlow.Domain.Entities;

public partial class MstWarehouse
{
    public int WarehouseId { get; set; }

    public string? WarehouseCode { get; set; }

    public string? WarehouseName { get; set; }

    public string? Address { get; set; }

    public string? Description { get; set; }

    public bool? IsActive { get; set; }

    public virtual ICollection<JncUserWarehouseAccess> JncUserWarehouseAccesses { get; set; } = new List<JncUserWarehouseAccess>();

    public virtual ICollection<MstWarehouseLocation> MstWarehouseLocations { get; set; } = new List<MstWarehouseLocation>();

    public virtual ICollection<TrxFinishedGoodsReceipt> TrxFinishedGoodsReceipts { get; set; } = new List<TrxFinishedGoodsReceipt>();

    public virtual ICollection<TrxGoodsReceipt> TrxGoodsReceipts { get; set; } = new List<TrxGoodsReceipt>();

    public virtual ICollection<TrxInventoryBalance> TrxInventoryBalances { get; set; } = new List<TrxInventoryBalance>();

    public virtual ICollection<TrxInventoryDisposal> TrxInventoryDisposals { get; set; } = new List<TrxInventoryDisposal>();

    public virtual ICollection<TrxInventoryTransaction> TrxInventoryTransactions { get; set; } = new List<TrxInventoryTransaction>();

    public virtual ICollection<TrxReturnProcessing> TrxReturnProcessings { get; set; } = new List<TrxReturnProcessing>();

    public virtual ICollection<TrxStockIssue> TrxStockIssues { get; set; } = new List<TrxStockIssue>();

    public virtual ICollection<TrxStockTransfer> TrxStockTransferDestWarehouses { get; set; } = new List<TrxStockTransfer>();

    public virtual ICollection<TrxStockTransfer> TrxStockTransferSourceWarehouses { get; set; } = new List<TrxStockTransfer>();

    public virtual ICollection<TrxStocktake> TrxStocktakes { get; set; } = new List<TrxStocktake>();
}

