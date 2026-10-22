using System;
using System.Collections.Generic;

namespace StockFlow.Domain.Entities;

public partial class SecUser
{
    public int UserId { get; set; }

    public string? Username { get; set; }

    public string? PasswordHash { get; set; }

    public string? FullName { get; set; }

    public string? Email { get; set; }

    public string? Phone { get; set; }

    public string? Avatar { get; set; }

    public bool? IsActive { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual ICollection<DtlStocktakeItem> DtlStocktakeItemApprovedByNavigations { get; set; } = new List<DtlStocktakeItem>();

    public virtual ICollection<DtlStocktakeItem> DtlStocktakeItemRecordedByNavigations { get; set; } = new List<DtlStocktakeItem>();

    public virtual ICollection<JncUserRole> JncUserRoles { get; set; } = new List<JncUserRole>();

    public virtual ICollection<JncUserWarehouseAccess> JncUserWarehouseAccesses { get; set; } = new List<JncUserWarehouseAccess>();

    public virtual ICollection<TrxCreditLimitRequest> TrxCreditLimitRequestApprovedByNavigations { get; set; } = new List<TrxCreditLimitRequest>();

    public virtual ICollection<TrxCreditLimitRequest> TrxCreditLimitRequestRequestedByNavigations { get; set; } = new List<TrxCreditLimitRequest>();

    public virtual ICollection<TrxFinancialTransaction> TrxFinancialTransactions { get; set; } = new List<TrxFinancialTransaction>();

    public virtual ICollection<TrxFinishedGoodsReceipt> TrxFinishedGoodsReceipts { get; set; } = new List<TrxFinishedGoodsReceipt>();

    public virtual ICollection<TrxGoodsReceipt> TrxGoodsReceipts { get; set; } = new List<TrxGoodsReceipt>();

    public virtual ICollection<TrxInboundCost> TrxInboundCosts { get; set; } = new List<TrxInboundCost>();

    public virtual ICollection<TrxInventoryDisposal> TrxInventoryDisposals { get; set; } = new List<TrxInventoryDisposal>();

    public virtual ICollection<TrxInventoryTransaction> TrxInventoryTransactions { get; set; } = new List<TrxInventoryTransaction>();

    public virtual ICollection<TrxOrder> TrxOrders { get; set; } = new List<TrxOrder>();

    public virtual ICollection<TrxProductionOrder> TrxProductionOrderAssignedToNavigations { get; set; } = new List<TrxProductionOrder>();

    public virtual ICollection<TrxProductionOrder> TrxProductionOrderCreatedByNavigations { get; set; } = new List<TrxProductionOrder>();

    public virtual ICollection<TrxProductionReport> TrxProductionReports { get; set; } = new List<TrxProductionReport>();

    public virtual ICollection<TrxReturnProcessing> TrxReturnProcessings { get; set; } = new List<TrxReturnProcessing>();

    public virtual ICollection<TrxReturnRequest> TrxReturnRequests { get; set; } = new List<TrxReturnRequest>();

    public virtual ICollection<TrxStockIssue> TrxStockIssueProcessedByNavigations { get; set; } = new List<TrxStockIssue>();

    public virtual ICollection<TrxStockIssue> TrxStockIssueRequestedByNavigations { get; set; } = new List<TrxStockIssue>();

    public virtual ICollection<TrxStockTransfer> TrxStockTransfers { get; set; } = new List<TrxStockTransfer>();

    public virtual ICollection<TrxStocktake> TrxStocktakes { get; set; } = new List<TrxStocktake>();
}

