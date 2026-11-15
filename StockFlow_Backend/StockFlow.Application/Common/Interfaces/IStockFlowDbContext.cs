using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
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
    DbSet<TrxPurchaseOrder> TrxPurchaseOrders { get; }
    DbSet<DtlPurchaseOrderItem> DtlPurchaseOrderItems { get; }
    DbSet<TrxPurchaseReturn> TrxPurchaseReturns { get; }
    DbSet<TrxStocktake> TrxStocktakes { get; }
    DbSet<DtlStocktakeItem> DtlStocktakeItems { get; }
    // Xuất hủy hàng hóa (bảng có từ InitialDatabase)
    DbSet<TrxInventoryDisposal> TrxInventoryDisposals { get; }
    DbSet<DtlInventoryDisposalItem> DtlInventoryDisposalItems { get; }
    DbSet<DtlPurchaseReturnItem> DtlPurchaseReturnItems { get; }
    DbSet<TrxFinancialTransaction> TrxFinancialTransactions { get; }
    // Yêu cầu duyệt vượt hạn mức công nợ (UC-27, UC-64)
    DbSet<TrxCreditLimitRequest> TrxCreditLimitRequests { get; }
    DbSet<MstPriceBook> MstPriceBooks { get; }
    DbSet<DtlPriceBookItem> DtlPriceBookItems { get; }

    DbSet<MstOrderSetting> MstOrderSettings { get; }
    DbSet<TrxOrder> TrxOrders { get; }
    DbSet<TrxReturnRequest> TrxReturnRequests { get; }
    DbSet<DtlReturnRequestItem> DtlReturnRequestItems { get; }
    DbSet<DtlOrderItem> DtlOrderItems { get; }
    DbSet<TrxStockTransfer> TrxStockTransfers { get; }
    DbSet<DtlStockTransferItem> DtlStockTransferItems { get; }
    DbSet<TrxStockIssue> TrxStockIssues { get; }
    DbSet<DtlStockIssueItem> DtlStockIssueItems { get; }

    // Sản xuất: BOM, lệnh sản xuất, nhu cầu NVL, nhập thành phẩm (UC-44–50, UC-57–61)
    DbSet<MstBom> MstBoms { get; }
    DbSet<DtlBomItem> DtlBomItems { get; }
    DbSet<TrxProductionOrder> TrxProductionOrders { get; }
    DbSet<DtlProductionOrderItem> DtlProductionOrderItems { get; }
    DbSet<TrxProductionMaterialRequirement> TrxProductionMaterialRequirements { get; }
    DbSet<TrxProductionReport> TrxProductionReports { get; }
    DbSet<TrxProductionPlan> TrxProductionPlans { get; }
    DbSet<DtlProductionPlanItem> DtlProductionPlanItems { get; }
    DbSet<TrxFinishedGoodsReceipt> TrxFinishedGoodsReceipts { get; }
    DbSet<MstInventoryLot> MstInventoryLots { get; }
    DbSet<MstWarehouseLocation> MstWarehouseLocations { get; }

    Task<long> GetNextSequenceValueAsync(string sequenceName, CancellationToken cancellationToken = default);
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);

    /// <summary>Mở transaction trên DbContext; handler dùng hàm này thay cho việc ép kiểu về DbContext.</summary>
    Task<IDbContextTransaction> BeginTransactionAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Khóa theo khóa chuỗi trong phạm vi transaction đang mở (PostgreSQL pg_advisory_xact_lock):
    /// request khác cùng khóa phải chờ tới khi transaction này commit / rollback.
    /// Dùng để chạy tuần tự các thao tác ghi lên cùng một chứng từ (VD lập lệnh từ cùng một kế hoạch sản xuất).
    /// Bắt buộc gọi sau BeginTransactionAsync.
    /// </summary>
    Task AcquireTransactionLockAsync(string lockKey, CancellationToken cancellationToken = default);
}
