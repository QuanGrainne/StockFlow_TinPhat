using Microsoft.EntityFrameworkCore;
using StockFlow.Domain.Entities;

namespace StockFlow.Application.Common.Interfaces;

public interface IStockFlowDbContext
{
    DbSet<SecUser> SecUsers { get; }
    DbSet<SecRole> SecRoles { get; }
    DbSet<JncUserRole> JncUserRoles { get; }
    DbSet<MstWarehouse> MstWarehouses { get; }
    DbSet<JncUserWarehouseAccess> JncUserWarehouseAccesses { get; }
    DbSet<MstBusinessPartner> MstBusinessPartners { get; }
    DbSet<SecPermission> SecPermissions { get; }
    DbSet<MstProduct> MstProducts { get; }
    DbSet<MstProductCategory> MstProductCategories { get; }
    DbSet<MstUnit> MstUnits { get; }
    DbSet<TrxInventoryBalance> TrxInventoryBalances { get; }
    DbSet<TrxInventoryTransaction> TrxInventoryTransactions { get; }
    DbSet<TrxGoodsReceipt> TrxGoodsReceipts { get; }
    DbSet<DtlGoodsReceiptItem> DtlGoodsReceiptItems { get; }
    DbSet<TrxFinancialTransaction> TrxFinancialTransactions { get; }
    DbSet<MstPriceBook> MstPriceBooks { get; }
    DbSet<DtlPriceBookItem> DtlPriceBookItems { get; }

    DbSet<MstOrderSetting> MstOrderSettings { get; }
    DbSet<TrxOrder> TrxOrders { get; }
    DbSet<DtlOrderItem> DtlOrderItems { get; }
    DbSet<TrxStockTransfer> TrxStockTransfers { get; }
    DbSet<DtlStockTransferItem> DtlStockTransferItems { get; }
    DbSet<TrxStockIssue> TrxStockIssues { get; }
    DbSet<DtlStockIssueItem> DtlStockIssueItems { get; }

    Task<long> GetNextSequenceValueAsync(string sequenceName, CancellationToken cancellationToken = default);
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
