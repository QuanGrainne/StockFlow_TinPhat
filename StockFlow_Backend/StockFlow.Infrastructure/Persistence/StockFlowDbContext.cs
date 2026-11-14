using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Domain.Entities;

namespace StockFlow.Infrastructure.Persistence;

public partial class StockFlowDbContext : DbContext, IStockFlowDbContext
{
    public StockFlowDbContext(DbContextOptions<StockFlowDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<DtlBomItem> DtlBomItems { get; set; }

    public virtual DbSet<DtlGoodsReceiptItem> DtlGoodsReceiptItems { get; set; }

    public virtual DbSet<DtlInboundCostAllocation> DtlInboundCostAllocations { get; set; }

    public virtual DbSet<DtlInventoryDisposalItem> DtlInventoryDisposalItems { get; set; }

    public virtual DbSet<DtlOrderItem> DtlOrderItems { get; set; }

    public virtual DbSet<DtlReturnRequestItem> DtlReturnRequestItems { get; set; }

    public virtual DbSet<DtlStockIssueItem> DtlStockIssueItems { get; set; }

    public virtual DbSet<DtlStockTransferItem> DtlStockTransferItems { get; set; }

    public virtual DbSet<DtlStocktakeItem> DtlStocktakeItems { get; set; }

    public virtual DbSet<JncUserRole> JncUserRoles { get; set; }

    public virtual DbSet<JncUserWarehouseAccess> JncUserWarehouseAccesses { get; set; }

    public virtual DbSet<MstBom> MstBoms { get; set; }

    public virtual DbSet<MstBusinessPartner> MstBusinessPartners { get; set; }

    public virtual DbSet<MstInventoryLot> MstInventoryLots { get; set; }

    public virtual DbSet<MstProduct> MstProducts { get; set; }

    public virtual DbSet<MstProductCategory> MstProductCategories { get; set; }

    public virtual DbSet<MstProductImage> MstProductImages { get; set; }

    public virtual DbSet<MstUnit> MstUnits { get; set; }

    public virtual DbSet<MstUnitConversion> MstUnitConversions { get; set; }

    public virtual DbSet<MstWarehouse> MstWarehouses { get; set; }

    public virtual DbSet<MstWarehouseLocation> MstWarehouseLocations { get; set; }

    public virtual DbSet<SecPermission> SecPermissions { get; set; }

    public virtual DbSet<SecRole> SecRoles { get; set; }

    public virtual DbSet<SecUser> SecUsers { get; set; }

    public virtual DbSet<TrxCreditLimitRequest> TrxCreditLimitRequests { get; set; }

    public virtual DbSet<TrxFinancialTransaction> TrxFinancialTransactions { get; set; }

    public virtual DbSet<TrxFinishedGoodsReceipt> TrxFinishedGoodsReceipts { get; set; }

    public virtual DbSet<TrxGoodsReceipt> TrxGoodsReceipts { get; set; }

    public virtual DbSet<TrxPurchaseOrder> TrxPurchaseOrders { get; set; }

    public virtual DbSet<DtlPurchaseOrderItem> DtlPurchaseOrderItems { get; set; }

    public virtual DbSet<TrxPurchaseReturn> TrxPurchaseReturns { get; set; }

    public virtual DbSet<DtlPurchaseReturnItem> DtlPurchaseReturnItems { get; set; }

    public virtual DbSet<TrxInboundCost> TrxInboundCosts { get; set; }

    public virtual DbSet<TrxInventoryBalance> TrxInventoryBalances { get; set; }

    public virtual DbSet<TrxInventoryDisposal> TrxInventoryDisposals { get; set; }

    public virtual DbSet<TrxInventoryTransaction> TrxInventoryTransactions { get; set; }

    public virtual DbSet<TrxOrder> TrxOrders { get; set; }

    public virtual DbSet<TrxProductionMaterialRequirement> TrxProductionMaterialRequirements { get; set; }

    public virtual DbSet<TrxProductionOrder> TrxProductionOrders { get; set; }

    public virtual DbSet<DtlProductionOrderItem> DtlProductionOrderItems { get; set; }

    public virtual DbSet<TrxProductionReport> TrxProductionReports { get; set; }

    public virtual DbSet<TrxProductionPlan> TrxProductionPlans { get; set; }

    public virtual DbSet<DtlProductionPlanItem> DtlProductionPlanItems { get; set; }

    public virtual DbSet<TrxReturnProcessing> TrxReturnProcessings { get; set; }

    public virtual DbSet<TrxReturnRequest> TrxReturnRequests { get; set; }

    public virtual DbSet<TrxStockIssue> TrxStockIssues { get; set; }

    public virtual DbSet<TrxStockTransfer> TrxStockTransfers { get; set; }

    public virtual DbSet<TrxStocktake> TrxStocktakes { get; set; }

    public virtual DbSet<MstPriceBook> MstPriceBooks { get; set; }

    public virtual DbSet<DtlPriceBookItem> DtlPriceBookItems { get; set; }

    public virtual DbSet<MstOrderSetting> MstOrderSettings { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("stockflow");
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(StockFlowDbContext).Assembly);
        modelBuilder.Entity<DtlBomItem>(entity =>
        {
            entity.HasKey(e => e.BomItemId).HasName("dtl_bom_items_pkey");

            entity.ToTable("dtl_bom_items", "stockflow");

            entity.Property(e => e.BomItemId).HasColumnName("bom_item_id");
            entity.Property(e => e.BomId).HasColumnName("bom_id");
            entity.Property(e => e.MaterialId).HasColumnName("material_id");
            entity.Property(e => e.Quantity)
                .HasPrecision(18, 4)
                .HasColumnName("quantity");
            entity.Property(e => e.UnitId).HasColumnName("unit_id");
            entity.Property(e => e.WastageRate)
                .HasPrecision(5, 2)
                .HasColumnName("wastage_rate");

            entity.HasOne(d => d.Bom).WithMany(p => p.DtlBomItems)
                .HasForeignKey(d => d.BomId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_dtl_bom_items_bom_id");

            entity.HasOne(d => d.Material).WithMany(p => p.DtlBomItems)
                .HasForeignKey(d => d.MaterialId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_dtl_bom_items_material_id");

            entity.HasOne(d => d.Unit).WithMany(p => p.DtlBomItems)
                .HasForeignKey(d => d.UnitId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_dtl_bom_items_unit_id");
        });

        modelBuilder.Entity<DtlGoodsReceiptItem>(entity =>
        {
            entity.HasKey(e => e.GrItemId).HasName("dtl_goods_receipt_items_pkey");

            entity.ToTable("dtl_goods_receipt_items", "stockflow");

            entity.Property(e => e.GrItemId).HasColumnName("gr_item_id");
            entity.Property(e => e.AcceptedQty)
                .HasPrecision(18, 2)
                .HasColumnName("accepted_qty");
            entity.Property(e => e.DamagedQty)
                .HasPrecision(18, 2)
                .HasColumnName("damaged_qty");
            entity.Property(e => e.DefectiveQty)
                .HasPrecision(18, 2)
                .HasColumnName("defective_qty");
            entity.Property(e => e.GrId).HasColumnName("gr_id");
            entity.Property(e => e.LocationId).HasColumnName("location_id");
            entity.Property(e => e.LotId).HasColumnName("lot_id");
            entity.Property(e => e.OrderedQty)
                .HasPrecision(18, 2)
                .HasColumnName("ordered_qty");
            entity.Property(e => e.ProductId).HasColumnName("product_id");
            entity.Property(e => e.ReceivedQty)
                .HasPrecision(18, 2)
                .HasColumnName("received_qty");
            entity.Property(e => e.ShortageQty)
                .HasPrecision(18, 2)
                .HasColumnName("shortage_qty");
            entity.Property(e => e.UnitLandedCost)
                .HasPrecision(18, 4)
                .HasColumnName("unit_landed_cost");
            entity.Property(e => e.UnitPrice)
                .HasPrecision(18, 4)
                .HasColumnName("unit_price");
            entity.Property(e => e.DiscountPercent)
                .HasPrecision(9, 4)
                .HasColumnName("discount_percent");

            entity.HasOne(d => d.Gr).WithMany(p => p.DtlGoodsReceiptItems)
                .HasForeignKey(d => d.GrId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_dtl_goods_receipt_items_gr_id");

            entity.HasOne(d => d.Location).WithMany(p => p.DtlGoodsReceiptItems)
                .HasForeignKey(d => d.LocationId)
                .HasConstraintName("fk_dtl_goods_receipt_items_location_id");

            entity.HasOne(d => d.Lot).WithMany(p => p.DtlGoodsReceiptItems)
                .HasForeignKey(d => d.LotId)
                .HasConstraintName("fk_dtl_goods_receipt_items_lot_id");

            entity.HasOne(d => d.Product).WithMany(p => p.DtlGoodsReceiptItems)
                .HasForeignKey(d => d.ProductId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_dtl_goods_receipt_items_product_id");
        });

        modelBuilder.Entity<DtlInboundCostAllocation>(entity =>
        {
            entity.HasKey(e => e.AllocationId).HasName("dtl_inbound_cost_allocations_pkey");

            entity.ToTable("dtl_inbound_cost_allocations", "stockflow");

            entity.Property(e => e.AllocationId).HasColumnName("allocation_id");
            entity.Property(e => e.AllocatedAmount)
                .HasPrecision(18, 4)
                .HasColumnName("allocated_amount");
            entity.Property(e => e.GrItemId).HasColumnName("gr_item_id");
            entity.Property(e => e.InboundCostId).HasColumnName("inbound_cost_id");

            entity.HasOne(d => d.GrItem).WithMany(p => p.DtlInboundCostAllocations)
                .HasForeignKey(d => d.GrItemId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_dtl_inbound_cost_allocations_gr_item_id");

            entity.HasOne(d => d.InboundCost).WithMany(p => p.DtlInboundCostAllocations)
                .HasForeignKey(d => d.InboundCostId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_dtl_inbound_cost_allocations_inbound_cost_id");
        });

        modelBuilder.Entity<DtlInventoryDisposalItem>(entity =>
        {
            entity.HasKey(e => e.DisposalItemId).HasName("dtl_inventory_disposal_items_pkey");

            entity.ToTable("dtl_inventory_disposal_items", "stockflow");

            entity.Property(e => e.DisposalItemId).HasColumnName("disposal_item_id");
            entity.Property(e => e.DisposalId).HasColumnName("disposal_id");
            entity.Property(e => e.LocationId).HasColumnName("location_id");
            entity.Property(e => e.LotId).HasColumnName("lot_id");
            entity.Property(e => e.ProductId).HasColumnName("product_id");
            entity.Property(e => e.Quantity)
                .HasPrecision(18, 2)
                .HasColumnName("quantity");
            entity.Property(e => e.Reason)
                .HasMaxLength(255)
                .HasColumnName("reason");

            entity.HasOne(d => d.Disposal).WithMany(p => p.DtlInventoryDisposalItems)
                .HasForeignKey(d => d.DisposalId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_dtl_inventory_disposal_items_disposal_id");

            entity.HasOne(d => d.Location).WithMany(p => p.DtlInventoryDisposalItems)
                .HasForeignKey(d => d.LocationId)
                .HasConstraintName("fk_dtl_inventory_disposal_items_location_id");

            entity.HasOne(d => d.Lot).WithMany(p => p.DtlInventoryDisposalItems)
                .HasForeignKey(d => d.LotId)
                .HasConstraintName("fk_dtl_inventory_disposal_items_lot_id");

            entity.HasOne(d => d.Product).WithMany(p => p.DtlInventoryDisposalItems)
                .HasForeignKey(d => d.ProductId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_dtl_inventory_disposal_items_product_id");
        });

        modelBuilder.Entity<DtlOrderItem>(entity =>
        {
            entity.HasKey(e => e.OrderItemId).HasName("dtl_order_items_pkey");

            entity.ToTable("dtl_order_items", "stockflow");

            entity.Property(e => e.OrderItemId).HasColumnName("order_item_id");
            entity.Property(e => e.OrderId).HasColumnName("order_id");
            entity.Property(e => e.ProductId).HasColumnName("product_id");
            entity.Property(e => e.Quantity)
                .HasPrecision(18, 2)
                .HasColumnName("quantity");
            entity.Property(e => e.UnitId).HasColumnName("unit_id");
            entity.Property(e => e.UnitPrice)
                .HasPrecision(18, 2)
                .HasColumnName("unit_price");
            entity.Property(e => e.OriginalPrice)
                .HasPrecision(18, 2)
                .HasColumnName("original_price");
            entity.Property(e => e.DiscountType)
                .HasMaxLength(20)
                .HasColumnName("discount_type");
            entity.Property(e => e.DiscountValue)
                .HasPrecision(18, 2)
                .HasColumnName("discount_value");
            entity.Property(e => e.DiscountAmount)
                .HasPrecision(18, 2)
                .HasColumnName("discount_amount");
            entity.Property(e => e.LineTotal)
                .HasPrecision(18, 2)
                .HasColumnName("line_total");

            entity.HasOne(d => d.Order).WithMany(p => p.DtlOrderItems)
                .HasForeignKey(d => d.OrderId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_dtl_order_items_order_id");

            entity.HasOne(d => d.Product).WithMany(p => p.DtlOrderItems)
                .HasForeignKey(d => d.ProductId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_dtl_order_items_product_id");

            entity.HasOne(d => d.Unit).WithMany(p => p.DtlOrderItems)
                .HasForeignKey(d => d.UnitId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_dtl_order_items_unit_id");
        });

        modelBuilder.Entity<DtlReturnRequestItem>(entity =>
        {
            entity.HasKey(e => e.ReturnItemId).HasName("dtl_return_request_items_pkey");

            entity.ToTable("dtl_return_request_items", "stockflow");

            entity.Property(e => e.ReturnItemId).HasColumnName("return_item_id");
            entity.Property(e => e.Condition)
                .HasMaxLength(50)
                .HasColumnName("condition");
            entity.Property(e => e.Notes)
                .HasMaxLength(255)
                .HasColumnName("notes");
            entity.Property(e => e.OrderItemId).HasColumnName("order_item_id");
            entity.Property(e => e.ProductId).HasColumnName("product_id");
            entity.Property(e => e.Quantity)
                .HasPrecision(18, 2)
                .HasColumnName("quantity");
            entity.Property(e => e.ReturnRequestId).HasColumnName("return_request_id");
            entity.Property(e => e.SalePrice).HasPrecision(18, 2).HasDefaultValue(0m).HasColumnName("sale_price");
            entity.Property(e => e.ReturnPrice).HasPrecision(18, 2).HasDefaultValue(0m).HasColumnName("return_price");

            entity.HasOne(d => d.OrderItem).WithMany(p => p.DtlReturnRequestItems)
                .HasForeignKey(d => d.OrderItemId)
                .HasConstraintName("fk_dtl_return_request_items_order_item_id");

            entity.HasOne(d => d.Product).WithMany(p => p.DtlReturnRequestItems)
                .HasForeignKey(d => d.ProductId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_dtl_return_request_items_product_id");

            entity.HasOne(d => d.ReturnRequest).WithMany(p => p.DtlReturnRequestItems)
                .HasForeignKey(d => d.ReturnRequestId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_dtl_return_request_items_return_request_id");
        });

        modelBuilder.Entity<DtlStockIssueItem>(entity =>
        {
            entity.HasKey(e => e.SiItemId).HasName("dtl_stock_issue_items_pkey");

            entity.ToTable("dtl_stock_issue_items", "stockflow");

            entity.Property(e => e.SiItemId).HasColumnName("si_item_id");
            entity.Property(e => e.ActualIssuedQty)
                .HasPrecision(18, 2)
                .HasColumnName("actual_issued_qty");
            entity.Property(e => e.LotId).HasColumnName("lot_id");
            entity.Property(e => e.MaterialRequirementId).HasColumnName("material_requirement_id");
            entity.Property(e => e.OrderItemId).HasColumnName("order_item_id");
            entity.Property(e => e.RequestedQty)
                .HasPrecision(18, 2)
                .HasColumnName("requested_qty");
            entity.Property(e => e.StockIssueId).HasColumnName("stock_issue_id");

            entity.HasOne(d => d.Lot).WithMany(p => p.DtlStockIssueItems)
                .HasForeignKey(d => d.LotId)
                .HasConstraintName("fk_dtl_stock_issue_items_lot_id");

            entity.HasOne(d => d.MaterialRequirement).WithMany(p => p.DtlStockIssueItems)
                .HasForeignKey(d => d.MaterialRequirementId)
                .HasConstraintName("fk_dtl_stock_issue_items_material_requirement_id");

            entity.HasOne(d => d.OrderItem).WithMany(p => p.DtlStockIssueItems)
                .HasForeignKey(d => d.OrderItemId)
                .HasConstraintName("fk_dtl_stock_issue_items_order_item_id");

            entity.HasOne(d => d.StockIssue).WithMany(p => p.DtlStockIssueItems)
                .HasForeignKey(d => d.StockIssueId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_dtl_stock_issue_items_stock_issue_id");
        });

        modelBuilder.Entity<DtlStockTransferItem>(entity =>
        {
            entity.HasKey(e => e.TransferItemId).HasName("dtl_stock_transfer_items_pkey");

            entity.ToTable("dtl_stock_transfer_items", "stockflow");

            entity.Property(e => e.TransferItemId).HasColumnName("transfer_item_id");
            entity.Property(e => e.DestLocationId).HasColumnName("dest_location_id");
            entity.Property(e => e.IssuedQuantity)
                .HasPrecision(18, 2)
                .HasColumnName("issued_quantity");
            entity.Property(e => e.UnitCost)
                .HasPrecision(18, 4)
                .HasColumnName("unit_cost");
            entity.Property(e => e.Notes)
                .HasMaxLength(500)
                .HasColumnName("notes");
            entity.Property(e => e.ReceiveNotes)
                .HasMaxLength(500)
                .HasColumnName("receive_notes");
            entity.Property(e => e.LotId).HasColumnName("lot_id");
            entity.Property(e => e.ProductId).HasColumnName("product_id");
            entity.Property(e => e.Quantity)
                .HasPrecision(18, 2)
                .HasColumnName("quantity");
            entity.Property(e => e.ReceivedQuantity)
                .HasPrecision(18, 2)
                .HasColumnName("received_quantity");
            entity.Property(e => e.SourceLocationId).HasColumnName("source_location_id");
            entity.Property(e => e.StockTransferId).HasColumnName("stock_transfer_id");

            entity.HasOne(d => d.DestLocation).WithMany(p => p.DtlStockTransferItemDestLocations)
                .HasForeignKey(d => d.DestLocationId)
                .HasConstraintName("fk_dtl_stock_transfer_items_dest_location_id");

            entity.HasOne(d => d.Lot).WithMany(p => p.DtlStockTransferItems)
                .HasForeignKey(d => d.LotId)
                .HasConstraintName("fk_dtl_stock_transfer_items_lot_id");

            entity.HasOne(d => d.Product).WithMany(p => p.DtlStockTransferItems)
                .HasForeignKey(d => d.ProductId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_dtl_stock_transfer_items_product_id");

            entity.HasOne(d => d.SourceLocation).WithMany(p => p.DtlStockTransferItemSourceLocations)
                .HasForeignKey(d => d.SourceLocationId)
                .HasConstraintName("fk_dtl_stock_transfer_items_source_location_id");

            entity.HasOne(d => d.StockTransfer).WithMany(p => p.DtlStockTransferItems)
                .HasForeignKey(d => d.StockTransferId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_dtl_stock_transfer_items_stock_transfer_id");
        });

        modelBuilder.Entity<DtlStocktakeItem>(entity =>
        {
            entity.HasKey(e => e.StocktakeItemId).HasName("dtl_stocktake_items_pkey");

            entity.ToTable("dtl_stocktake_items", "stockflow");

            entity.Property(e => e.StocktakeItemId).HasColumnName("stocktake_item_id");
            entity.Property(e => e.ActualQty)
                .HasPrecision(18, 2)
                .HasColumnName("actual_qty");
            entity.Property(e => e.AdjustmentStatus)
                .HasMaxLength(20)
                .HasColumnName("adjustment_status");
            entity.Property(e => e.ApprovalDate)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("approval_date");
            entity.Property(e => e.ApprovedBy).HasColumnName("approved_by");
            entity.Property(e => e.Discrepancy)
                .HasPrecision(18, 2)
                .HasColumnName("discrepancy");
            entity.Property(e => e.DiscrepancyReason)
                .HasMaxLength(500)
                .HasColumnName("discrepancy_reason");
            entity.Property(e => e.LocationId).HasColumnName("location_id");
            entity.Property(e => e.LotId).HasColumnName("lot_id");
            entity.Property(e => e.ProductId).HasColumnName("product_id");
            entity.Property(e => e.RecordedBy).HasColumnName("recorded_by");
            entity.Property(e => e.StocktakeId).HasColumnName("stocktake_id");
            entity.Property(e => e.SystemQty)
                .HasPrecision(18, 2)
                .HasColumnName("system_qty");
            entity.Property(e => e.UnitCost)
                .HasPrecision(18, 4)
                .HasColumnName("unit_cost");

            entity.HasOne(d => d.ApprovedByNavigation).WithMany(p => p.DtlStocktakeItemApprovedByNavigations)
                .HasForeignKey(d => d.ApprovedBy)
                .HasConstraintName("fk_dtl_stocktake_items_approved_by");

            entity.HasOne(d => d.Location).WithMany(p => p.DtlStocktakeItems)
                .HasForeignKey(d => d.LocationId)
                .HasConstraintName("fk_dtl_stocktake_items_location_id");

            entity.HasOne(d => d.Lot).WithMany(p => p.DtlStocktakeItems)
                .HasForeignKey(d => d.LotId)
                .HasConstraintName("fk_dtl_stocktake_items_lot_id");

            entity.HasOne(d => d.Product).WithMany(p => p.DtlStocktakeItems)
                .HasForeignKey(d => d.ProductId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_dtl_stocktake_items_product_id");

            entity.HasOne(d => d.RecordedByNavigation).WithMany(p => p.DtlStocktakeItemRecordedByNavigations)
                .HasForeignKey(d => d.RecordedBy)
                .HasConstraintName("fk_dtl_stocktake_items_recorded_by");

            entity.HasOne(d => d.Stocktake).WithMany(p => p.DtlStocktakeItems)
                .HasForeignKey(d => d.StocktakeId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_dtl_stocktake_items_stocktake_id");
        });

        modelBuilder.Entity<JncUserRole>(entity =>
        {
            entity.HasKey(e => new { e.UserId, e.RoleId }).HasName("jnc_user_roles_pkey");

            entity.ToTable("jnc_user_roles", "stockflow");

            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.RoleId).HasColumnName("role_id");
            entity.Property(e => e.AssignedAt)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("assigned_at");

            entity.HasOne(d => d.Role).WithMany(p => p.JncUserRoles)
                .HasForeignKey(d => d.RoleId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_jnc_user_roles_role_id");

            entity.HasOne(d => d.User).WithMany(p => p.JncUserRoles)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_jnc_user_roles_user_id");
        });

        modelBuilder.Entity<JncUserWarehouseAccess>(entity =>
        {
            entity.HasKey(e => new { e.UserId, e.WarehouseId }).HasName("jnc_user_warehouse_access_pkey");

            entity.ToTable("jnc_user_warehouse_access", "stockflow");

            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.WarehouseId).HasColumnName("warehouse_id");
            entity.Property(e => e.AssignedAt)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("assigned_at");

            entity.HasOne(d => d.User).WithMany(p => p.JncUserWarehouseAccesses)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_jnc_user_warehouse_access_user_id");

            entity.HasOne(d => d.Warehouse).WithMany(p => p.JncUserWarehouseAccesses)
                .HasForeignKey(d => d.WarehouseId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_jnc_user_warehouse_access_warehouse_id");
        });

        modelBuilder.Entity<MstBom>(entity =>
        {
            entity.HasKey(e => e.BomId).HasName("mst_boms_pkey");

            entity.ToTable("mst_boms", "stockflow");

            entity.Property(e => e.BomId).HasColumnName("bom_id");
            // Ghi chú kỹ thuật của BOM (UC-57, màn 3.2.2.6–3.2.2.8)
            entity.Property(e => e.Description)
                .HasMaxLength(500)
                .HasColumnName("description");
            // BR-30: mỗi thành phẩm tối đa một BOM đang áp dụng
            entity.HasIndex(e => e.ProductId, "uq_mst_boms_active_product")
                .IsUnique()
                .HasFilter("is_active");
            entity.Property(e => e.BomName)
                .HasMaxLength(100)
                .HasColumnName("bom_name");
            entity.Property(e => e.CreatedAt)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("created_at");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.ProductId).HasColumnName("product_id");
            entity.Property(e => e.Version)
                .HasMaxLength(20)
                .HasColumnName("version");

            entity.HasOne(d => d.Product).WithMany(p => p.MstBoms)
                .HasForeignKey(d => d.ProductId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_mst_boms_product_id");
        });

        modelBuilder.Entity<MstBusinessPartner>(entity =>
        {
            entity.HasKey(e => e.PartnerId).HasName("mst_business_partners_pkey");

            entity.ToTable("mst_business_partners", "stockflow");

            entity.HasIndex(e => e.PartnerCode, "uq_mst_business_partners_1").IsUnique();

            entity.Property(e => e.PartnerId).HasColumnName("partner_id");
            entity.Property(e => e.Address)
                .HasMaxLength(255)
                .HasColumnName("address");
            entity.Property(e => e.CreditLimit)
                .HasPrecision(18, 2)
                .HasColumnName("credit_limit");
            entity.Property(e => e.CurrentDebt)
                .HasPrecision(18, 2)
                .HasColumnName("current_debt");
            entity.Property(e => e.CurrentPayable)
                .HasPrecision(18, 2)
                .HasColumnName("current_payable");
            entity.Property(e => e.Email)
                .HasMaxLength(100)
                .HasColumnName("email");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.Property(e => e.Phone2).HasMaxLength(20).HasColumnName("phone2");
            entity.Property(e => e.Gender).HasMaxLength(10).HasColumnName("gender");
            entity.Property(e => e.BirthDate).HasColumnType("timestamp without time zone").HasColumnName("birth_date");
            entity.Property(e => e.Facebook).HasMaxLength(255).HasColumnName("facebook");
            entity.Property(e => e.Notes).HasMaxLength(500).HasColumnName("notes");
            entity.Property(e => e.CreatedWarehouseId).HasColumnName("created_warehouse_id");
            entity.Property(e => e.PartnerCode)
                .HasMaxLength(30)
                .HasColumnName("partner_code");
            entity.Property(e => e.PartnerName)
                .HasMaxLength(150)
                .HasColumnName("partner_name");
            entity.Property(e => e.PartnerType)
                .HasMaxLength(20)
                .HasColumnName("partner_type");
            entity.Property(e => e.Phone)
                .HasMaxLength(20)
                .HasColumnName("phone");
        });

        modelBuilder.Entity<MstInventoryLot>(entity =>
        {
            entity.HasKey(e => e.LotId).HasName("mst_inventory_lots_pkey");

            entity.ToTable("mst_inventory_lots", "stockflow");

            entity.Property(e => e.LotId).HasColumnName("lot_id");
            entity.Property(e => e.ExpiryDate).HasColumnName("expiry_date");
            entity.Property(e => e.LotNumber)
                .HasMaxLength(50)
                .HasColumnName("lot_number");
            entity.Property(e => e.MfgDate).HasColumnName("mfg_date");
            entity.Property(e => e.ProductId).HasColumnName("product_id");

            entity.HasOne(d => d.Product).WithMany(p => p.MstInventoryLots)
                .HasForeignKey(d => d.ProductId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_mst_inventory_lots_product_id");
        });

        modelBuilder.Entity<MstProduct>(entity =>
        {
            entity.HasKey(e => e.ProductId).HasName("mst_products_pkey");

            entity.ToTable("mst_products", "stockflow");

            entity.HasIndex(e => e.ProductCode, "uq_mst_products_1").IsUnique();

            entity.Property(e => e.ProductId).HasColumnName("product_id");
            entity.Property(e => e.BaseUnitId).HasColumnName("base_unit_id");
            entity.Property(e => e.CategoryId).HasColumnName("category_id");
            entity.Property(e => e.CreatedAt)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("created_at");
            entity.Property(e => e.Description)
                .HasMaxLength(500)
                .HasColumnName("description");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.MovingAverageCost)
                .HasPrecision(18, 4)
                .HasColumnName("moving_average_cost");
            entity.Property(e => e.ProductCode)
                .HasMaxLength(30)
                .HasColumnName("product_code");
            entity.Property(e => e.ProductName)
                .HasMaxLength(150)
                .HasColumnName("product_name");
            entity.Property(e => e.ProductType)
                .HasMaxLength(20)
                .HasColumnName("product_type");
            entity.Property(e => e.ReorderPoint)
                .HasPrecision(18, 2)
                .HasColumnName("reorder_point");
            entity.Property(e => e.Barcode)
                .HasMaxLength(50)
                .HasColumnName("barcode");
            entity.Property(e => e.Brand)
                .HasMaxLength(100)
                .HasColumnName("brand");
            entity.Property(e => e.StandardPrice)
                .HasPrecision(18, 2)
                .HasColumnName("standard_price");
            entity.Property(e => e.MinSafeStock)
                .HasPrecision(18, 2)
                .HasColumnName("min_safe_stock");
            entity.Property(e => e.MaxSafeStock)
                .HasPrecision(18, 2)
                .HasColumnName("max_safe_stock");
            entity.Property(e => e.Weight)
                .HasPrecision(18, 2)
                .HasColumnName("weight");
            entity.Property(e => e.Dimensions)
                .HasMaxLength(100)
                .HasColumnName("dimensions");
            entity.Property(e => e.LocationName)
                .HasMaxLength(100)
                .HasColumnName("location_name");
            entity.Property(e => e.IsDirectSale)
                .HasColumnName("is_direct_sale");
            entity.Property(e => e.HasRewardPoints)
                .HasColumnName("has_reward_points");
            entity.Property(e => e.ImageUrl)
                .HasColumnName("image_url");
            entity.Property(e => e.VariantsJson)
                .HasColumnName("variants_json");

            entity.HasOne(d => d.BaseUnit).WithMany(p => p.MstProducts)
                .HasForeignKey(d => d.BaseUnitId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_mst_products_base_unit_id");

            entity.HasOne(d => d.Category).WithMany(p => p.MstProducts)
                .HasForeignKey(d => d.CategoryId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_mst_products_category_id");
        });

        modelBuilder.Entity<MstProductCategory>(entity =>
        {
            entity.HasKey(e => e.CategoryId).HasName("mst_product_categories_pkey");

            entity.ToTable("mst_product_categories", "stockflow");

            entity.Property(e => e.CategoryId).HasColumnName("category_id");
            entity.Property(e => e.CategoryName)
                .HasMaxLength(100)
                .HasColumnName("category_name");
            entity.Property(e => e.Description)
                .HasMaxLength(255)
                .HasColumnName("description");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
        });

        modelBuilder.Entity<MstProductImage>(entity =>
        {
            entity.HasKey(e => e.ImageId).HasName("mst_product_images_pkey");

            entity.ToTable("mst_product_images", "stockflow");

            entity.Property(e => e.ImageId).HasColumnName("image_id");
            entity.Property(e => e.CreatedAt)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("created_at");
            entity.Property(e => e.DisplayOrder).HasColumnName("display_order");
            entity.Property(e => e.ImageUrl)
                .HasMaxLength(500)
                .HasColumnName("image_url");
            entity.Property(e => e.IsPrimary).HasColumnName("is_primary");
            entity.Property(e => e.ProductId).HasColumnName("product_id");

            entity.HasOne(d => d.Product).WithMany(p => p.MstProductImages)
                .HasForeignKey(d => d.ProductId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_mst_product_images_product_id");
        });

        modelBuilder.Entity<MstUnit>(entity =>
        {
            entity.HasKey(e => e.UnitId).HasName("mst_units_pkey");

            entity.ToTable("mst_units", "stockflow");

            entity.Property(e => e.UnitId).HasColumnName("unit_id");
            entity.Property(e => e.Abbreviation)
                .HasMaxLength(10)
                .HasColumnName("abbreviation");
            entity.Property(e => e.UnitName)
                .HasMaxLength(50)
                .HasColumnName("unit_name");
        });

        modelBuilder.Entity<MstUnitConversion>(entity =>
        {
            entity.HasKey(e => e.ConversionId).HasName("mst_unit_conversions_pkey");

            entity.ToTable("mst_unit_conversions", "stockflow");

            entity.Property(e => e.ConversionId).HasColumnName("conversion_id");
            entity.Property(e => e.ConversionFactor)
                .HasPrecision(18, 6)
                .HasColumnName("conversion_factor");
            entity.Property(e => e.FromUnitId).HasColumnName("from_unit_id");
            entity.Property(e => e.ProductId).HasColumnName("product_id");
            entity.Property(e => e.ToUnitId).HasColumnName("to_unit_id");

            entity.HasOne(d => d.FromUnit).WithMany(p => p.MstUnitConversionFromUnits)
                .HasForeignKey(d => d.FromUnitId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_mst_unit_conversions_from_unit_id");

            entity.HasOne(d => d.Product).WithMany(p => p.MstUnitConversions)
                .HasForeignKey(d => d.ProductId)
                .HasConstraintName("fk_mst_unit_conversions_product_id");

            entity.HasOne(d => d.ToUnit).WithMany(p => p.MstUnitConversionToUnits)
                .HasForeignKey(d => d.ToUnitId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_mst_unit_conversions_to_unit_id");
        });

        modelBuilder.Entity<MstWarehouse>(entity =>
        {
            entity.HasKey(e => e.WarehouseId).HasName("mst_warehouses_pkey");

            entity.ToTable("mst_warehouses", "stockflow");

            entity.HasIndex(e => e.WarehouseCode, "uq_mst_warehouses_1").IsUnique();

            entity.Property(e => e.WarehouseId).HasColumnName("warehouse_id");
            entity.Property(e => e.Address)
                .HasMaxLength(255)
                .HasColumnName("address");
            entity.Property(e => e.Description)
                .HasMaxLength(255)
                .HasColumnName("description");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.WarehouseCode)
                .HasMaxLength(20)
                .HasColumnName("warehouse_code");
            entity.Property(e => e.WarehouseName)
                .HasMaxLength(100)
                .HasColumnName("warehouse_name");
        });

        modelBuilder.Entity<MstWarehouseLocation>(entity =>
        {
            entity.HasKey(e => e.LocationId).HasName("mst_warehouse_locations_pkey");

            entity.ToTable("mst_warehouse_locations", "stockflow");

            entity.Property(e => e.LocationId).HasColumnName("location_id");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.LocationCode)
                .HasMaxLength(30)
                .HasColumnName("location_code");
            entity.Property(e => e.LocationName)
                .HasMaxLength(100)
                .HasColumnName("location_name");
            entity.Property(e => e.WarehouseId).HasColumnName("warehouse_id");

            entity.HasOne(d => d.Warehouse).WithMany(p => p.MstWarehouseLocations)
                .HasForeignKey(d => d.WarehouseId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_mst_warehouse_locations_warehouse_id");
        });

        modelBuilder.Entity<SecPermission>(entity =>
        {
            entity.HasKey(e => e.PermissionId).HasName("sec_permissions_pkey");

            entity.ToTable("sec_permissions", "stockflow");

            entity.HasIndex(e => e.PermissionCode, "uq_sec_permissions_1").IsUnique();

            entity.Property(e => e.PermissionId).HasColumnName("permission_id");
            entity.Property(e => e.Description)
                .HasMaxLength(255)
                .HasColumnName("description");
            entity.Property(e => e.Module)
                .HasMaxLength(50)
                .HasColumnName("module");
            entity.Property(e => e.PermissionCode)
                .HasMaxLength(50)
                .HasColumnName("permission_code");
            entity.Property(e => e.PermissionName)
                .HasMaxLength(100)
                .HasColumnName("permission_name");
        });

        modelBuilder.Entity<SecRole>(entity =>
        {
            entity.HasKey(e => e.RoleId).HasName("sec_roles_pkey");

            entity.ToTable("sec_roles", "stockflow");

            entity.HasIndex(e => e.RoleName, "uq_sec_roles_1").IsUnique();

            entity.Property(e => e.RoleId).HasColumnName("role_id");
            entity.Property(e => e.Description)
                .HasMaxLength(255)
                .HasColumnName("description");
            entity.Property(e => e.RoleName)
                .HasMaxLength(50)
                .HasColumnName("role_name");

            entity.HasMany(d => d.Permissions).WithMany(p => p.Roles)
                .UsingEntity<Dictionary<string, object>>(
                    "JncRolePermission",
                    r => r.HasOne<SecPermission>().WithMany()
                        .HasForeignKey("PermissionId")
                        .OnDelete(DeleteBehavior.ClientSetNull)
                        .HasConstraintName("fk_jnc_role_permissions_permission_id"),
                    l => l.HasOne<SecRole>().WithMany()
                        .HasForeignKey("RoleId")
                        .OnDelete(DeleteBehavior.ClientSetNull)
                        .HasConstraintName("fk_jnc_role_permissions_role_id"),
                    j =>
                    {
                        j.HasKey("RoleId", "PermissionId").HasName("jnc_role_permissions_pkey");
                        j.ToTable("jnc_role_permissions", "stockflow");
                        j.IndexerProperty<int>("RoleId").HasColumnName("role_id");
                        j.IndexerProperty<int>("PermissionId").HasColumnName("permission_id");
                    });
        });

        modelBuilder.Entity<SecUser>(entity =>
        {
            entity.HasKey(e => e.UserId).HasName("sec_users_pkey");

            entity.ToTable("sec_users", "stockflow");

            entity.HasIndex(e => e.Username, "uq_sec_users_1").IsUnique();

            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.CreatedAt)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("created_at");
            entity.Property(e => e.Email)
                .HasMaxLength(100)
                .HasColumnName("email");
            entity.Property(e => e.FullName)
                .HasMaxLength(100)
                .HasColumnName("full_name");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.PasswordHash)
                .HasMaxLength(255)
                .HasColumnName("password_hash");
            entity.Property(e => e.Phone)
                .HasMaxLength(20)
                .HasColumnName("phone");
            entity.Property(e => e.Avatar)
                .HasColumnName("avatar");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("updated_at");
            entity.Property(e => e.Username)
                .HasMaxLength(50)
                .HasColumnName("username");
        });

        modelBuilder.Entity<TrxCreditLimitRequest>(entity =>
        {
            entity.HasKey(e => e.RequestId).HasName("trx_credit_limit_requests_pkey");

            entity.ToTable("trx_credit_limit_requests", "stockflow");

            entity.Property(e => e.RequestId).HasColumnName("request_id");
            entity.Property(e => e.ApprovalDate)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("approval_date");
            entity.Property(e => e.ApprovalNotes)
                .HasMaxLength(500)
                .HasColumnName("approval_notes");
            entity.Property(e => e.ApprovedBy).HasColumnName("approved_by");
            entity.Property(e => e.CurrentLimit)
                .HasPrecision(18, 2)
                .HasColumnName("current_limit");
            entity.Property(e => e.PartnerId).HasColumnName("partner_id");
            entity.Property(e => e.Reason)
                .HasMaxLength(500)
                .HasColumnName("reason");
            entity.Property(e => e.RequestDate)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("request_date");
            entity.Property(e => e.RequestedBy).HasColumnName("requested_by");
            entity.Property(e => e.RequestedLimit)
                .HasPrecision(18, 2)
                .HasColumnName("requested_limit");
            entity.Property(e => e.SalesOrderId).HasColumnName("sales_order_id");
            // Concurrency token (chỉ cấu hình EF, không đổi DB): UPDATE kèm điều kiện giá trị cũ,
            // nên hai Manager cùng duyệt / hai hóa đơn cùng dùng một ngoại lệ thì chỉ một bên thành công.
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .HasColumnName("status")
                .IsConcurrencyToken();
            entity.Property(e => e.SalesOrderId).IsConcurrencyToken();
            entity.Property(e => e.RequestCode)
                .HasMaxLength(30)
                .HasColumnName("request_code");
            entity.Property(e => e.ApprovalType)
                .HasMaxLength(20)
                .HasColumnName("approval_type");
            entity.Property(e => e.ApprovedLimit)
                .HasPrecision(18, 2)
                .HasColumnName("approved_limit");
            entity.HasIndex(e => e.RequestCode, "uq_trx_credit_limit_requests_request_code").IsUnique();

            entity.HasOne(d => d.ApprovedByNavigation).WithMany(p => p.TrxCreditLimitRequestApprovedByNavigations)
                .HasForeignKey(d => d.ApprovedBy)
                .HasConstraintName("fk_trx_credit_limit_requests_approved_by");

            entity.HasOne(d => d.Partner).WithMany(p => p.TrxCreditLimitRequests)
                .HasForeignKey(d => d.PartnerId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_trx_credit_limit_requests_partner_id");

            entity.HasOne(d => d.RequestedByNavigation).WithMany(p => p.TrxCreditLimitRequestRequestedByNavigations)
                .HasForeignKey(d => d.RequestedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_trx_credit_limit_requests_requested_by");

            entity.HasOne(d => d.SalesOrder).WithMany(p => p.TrxCreditLimitRequests)
                .HasForeignKey(d => d.SalesOrderId)
                .HasConstraintName("fk_trx_credit_limit_requests_sales_order_id");
        });

        modelBuilder.Entity<TrxFinancialTransaction>(entity =>
        {
            entity.HasKey(e => e.TxId).HasName("trx_financial_transactions_pkey");

            entity.ToTable("trx_financial_transactions", "stockflow");

            entity.Property(e => e.TxId).HasColumnName("tx_id");
            entity.Property(e => e.Amount)
                .HasPrecision(18, 2)
                .HasColumnName("amount");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.Property(e => e.Description)
                .HasMaxLength(500)
                .HasColumnName("description");
            entity.Property(e => e.PartnerId).HasColumnName("partner_id");
            entity.Property(e => e.PaymentMethod)
                .HasMaxLength(50)
                .HasColumnName("payment_method");
            entity.Property(e => e.ReferenceId).HasColumnName("reference_id");
            entity.Property(e => e.ReferenceType)
                .HasMaxLength(50)
                .HasColumnName("reference_type");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .HasColumnName("status");
            entity.Property(e => e.TransactionDate)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("transaction_date");
            entity.Property(e => e.TxType)
                .HasMaxLength(20)
                .HasColumnName("tx_type");
            entity.Property(e => e.TxCode)
                .HasMaxLength(30)
                .HasColumnName("tx_code");

            entity.HasOne(d => d.CreatedByNavigation).WithMany(p => p.TrxFinancialTransactions)
                .HasForeignKey(d => d.CreatedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_trx_financial_transactions_created_by");

            entity.HasOne(d => d.Partner).WithMany(p => p.TrxFinancialTransactions)
                .HasForeignKey(d => d.PartnerId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_trx_financial_transactions_partner_id");
        });

        modelBuilder.Entity<TrxFinishedGoodsReceipt>(entity =>
        {
            entity.HasKey(e => e.FgrId).HasName("trx_finished_goods_receipts_pkey");

            entity.ToTable("trx_finished_goods_receipts", "stockflow");

            entity.HasIndex(e => e.FgrCode, "uq_trx_finished_goods_receipts_1").IsUnique();

            entity.HasIndex(e => e.ReportId, "uq_trx_finished_goods_receipts_2").IsUnique();

            entity.Property(e => e.FgrId).HasColumnName("fgr_id");
            // Cảnh báo dùng NVL cần Manager xem xét (BR-37)
            entity.Property(e => e.NeedsReview)
                .HasColumnName("needs_review");
            entity.Property(e => e.ReviewNote)
                .HasMaxLength(500)
                .HasColumnName("review_note");
            entity.Property(e => e.FgrCode)
                .HasMaxLength(30)
                .HasColumnName("fgr_code");
            entity.Property(e => e.LocationId).HasColumnName("location_id");
            entity.Property(e => e.LotId).HasColumnName("lot_id");
            entity.Property(e => e.Notes)
                .HasMaxLength(500)
                .HasColumnName("notes");
            entity.Property(e => e.ProductId).HasColumnName("product_id");
            entity.Property(e => e.ProductionOrderId).HasColumnName("production_order_id");
            entity.Property(e => e.ProductionOrderItemId).HasColumnName("production_order_item_id");
            entity.Property(e => e.Quantity)
                .HasPrecision(18, 2)
                .HasColumnName("quantity");
            entity.Property(e => e.ReceivedBy).HasColumnName("received_by");
            entity.Property(e => e.ReceivedDate)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("received_date");
            entity.Property(e => e.ReportId).HasColumnName("report_id");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .HasColumnName("status");
            entity.Property(e => e.WarehouseId).HasColumnName("warehouse_id");

            entity.HasOne(d => d.Location).WithMany(p => p.TrxFinishedGoodsReceipts)
                .HasForeignKey(d => d.LocationId)
                .HasConstraintName("fk_trx_finished_goods_receipts_location_id");

            entity.HasOne(d => d.Lot).WithMany(p => p.TrxFinishedGoodsReceipts)
                .HasForeignKey(d => d.LotId)
                .HasConstraintName("fk_trx_finished_goods_receipts_lot_id");

            entity.HasOne(d => d.Product).WithMany(p => p.TrxFinishedGoodsReceipts)
                .HasForeignKey(d => d.ProductId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_trx_finished_goods_receipts_product_id");

            entity.HasOne(d => d.ProductionOrder).WithMany(p => p.TrxFinishedGoodsReceipts)
                .HasForeignKey(d => d.ProductionOrderId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_trx_finished_goods_receipts_production_order_id");

            entity.HasOne(d => d.ProductionOrderItem).WithMany(p => p.TrxFinishedGoodsReceipts)
                .HasForeignKey(d => d.ProductionOrderItemId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_trx_finished_goods_receipts_production_order_item_id");

            entity.HasOne(d => d.ReceivedByNavigation).WithMany(p => p.TrxFinishedGoodsReceipts)
                .HasForeignKey(d => d.ReceivedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_trx_finished_goods_receipts_received_by");

            entity.HasOne(d => d.Report).WithOne(p => p.TrxFinishedGoodsReceipt)
                .HasForeignKey<TrxFinishedGoodsReceipt>(d => d.ReportId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_trx_finished_goods_receipts_report_id");

            entity.HasOne(d => d.Warehouse).WithMany(p => p.TrxFinishedGoodsReceipts)
                .HasForeignKey(d => d.WarehouseId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_trx_finished_goods_receipts_warehouse_id");
        });

        modelBuilder.Entity<TrxGoodsReceipt>(entity =>
        {
            entity.HasKey(e => e.GrId).HasName("trx_goods_receipts_pkey");

            entity.ToTable("trx_goods_receipts", "stockflow");

            entity.HasIndex(e => e.GrCode, "uq_trx_goods_receipts_1").IsUnique();

            entity.Property(e => e.GrId).HasColumnName("gr_id");
            entity.Property(e => e.ExternalPoNumber)
                .HasMaxLength(50)
                .HasColumnName("external_po_number");
            entity.Property(e => e.GrCode)
                .HasMaxLength(30)
                .HasColumnName("gr_code");
            entity.Property(e => e.Notes)
                .HasMaxLength(500)
                .HasColumnName("notes");
            entity.Property(e => e.PartnerId).HasColumnName("partner_id");
            entity.Property(e => e.ReceivedBy).HasColumnName("received_by");
            entity.Property(e => e.ReceivedDate)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("received_date");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .HasColumnName("status");
            entity.Property(e => e.WarehouseId).HasColumnName("warehouse_id");
            entity.Property(e => e.DiscountAmount)
                .HasPrecision(18, 2)
                .HasColumnName("discount_amount");

            entity.Property(e => e.PurchaseOrderId).HasColumnName("purchase_order_id");

            entity.HasOne(d => d.PurchaseOrder).WithMany(p => p.TrxGoodsReceipts)
                .HasForeignKey(d => d.PurchaseOrderId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_trx_goods_receipts_purchase_order_id");

            entity.HasOne(d => d.Partner).WithMany(p => p.TrxGoodsReceipts)
                .HasForeignKey(d => d.PartnerId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_trx_goods_receipts_partner_id");

            entity.HasOne(d => d.ReceivedByNavigation).WithMany(p => p.TrxGoodsReceipts)
                .HasForeignKey(d => d.ReceivedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_trx_goods_receipts_received_by");

            entity.HasOne(d => d.Warehouse).WithMany(p => p.TrxGoodsReceipts)
                .HasForeignKey(d => d.WarehouseId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_trx_goods_receipts_warehouse_id");
        });

        modelBuilder.Entity<TrxPurchaseOrder>(entity =>
        {
            entity.HasKey(e => e.PoId).HasName("trx_purchase_orders_pkey");

            entity.ToTable("trx_purchase_orders", "stockflow");

            entity.HasIndex(e => e.PoCode, "uq_trx_purchase_orders_code").IsUnique();

            entity.Property(e => e.PoId).HasColumnName("po_id");
            entity.Property(e => e.PoCode)
                .HasMaxLength(30)
                .HasColumnName("po_code");
            entity.Property(e => e.PartnerId).HasColumnName("partner_id");
            entity.Property(e => e.WarehouseId).HasColumnName("warehouse_id");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .HasColumnName("status");
            entity.Property(e => e.OrderDate)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("order_date");
            entity.Property(e => e.DiscountAmount)
                .HasPrecision(18, 2)
                .HasColumnName("discount_amount");
            entity.Property(e => e.TotalAmount)
                .HasPrecision(18, 2)
                .HasColumnName("total_amount");
            entity.Property(e => e.Notes)
                .HasMaxLength(500)
                .HasColumnName("notes");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("updated_at");
            entity.Property(e => e.UpdatedBy).HasColumnName("updated_by");
            entity.Property(e => e.MergedIntoPoId).HasColumnName("merged_into_po_id");

            entity.HasOne(d => d.MergedIntoPo).WithMany(p => p.MergedFromPos)
                .HasForeignKey(d => d.MergedIntoPoId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_trx_purchase_orders_merged_into_po_id");

            entity.HasOne(d => d.Partner).WithMany()
                .HasForeignKey(d => d.PartnerId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_trx_purchase_orders_partner_id");

            entity.HasOne(d => d.Warehouse).WithMany()
                .HasForeignKey(d => d.WarehouseId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_trx_purchase_orders_warehouse_id");

            entity.HasOne(d => d.CreatedByNavigation).WithMany()
                .HasForeignKey(d => d.CreatedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_trx_purchase_orders_created_by");
        });

        modelBuilder.Entity<DtlPurchaseOrderItem>(entity =>
        {
            entity.HasKey(e => e.PoItemId).HasName("dtl_purchase_order_items_pkey");

            entity.ToTable("dtl_purchase_order_items", "stockflow");

            entity.Property(e => e.PoItemId).HasColumnName("po_item_id");
            entity.Property(e => e.PoId).HasColumnName("po_id");
            entity.Property(e => e.ProductId).HasColumnName("product_id");
            entity.Property(e => e.OrderedQty)
                .HasPrecision(18, 2)
                .HasColumnName("ordered_qty");
            entity.Property(e => e.UnitPrice)
                .HasPrecision(18, 4)
                .HasColumnName("unit_price");
            entity.Property(e => e.DiscountPercent)
                .HasPrecision(9, 4)
                .HasColumnName("discount_percent");

            entity.HasOne(d => d.Po).WithMany(p => p.DtlPurchaseOrderItems)
                .HasForeignKey(d => d.PoId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_dtl_purchase_order_items_po_id");

            entity.HasOne(d => d.Product).WithMany()
                .HasForeignKey(d => d.ProductId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_dtl_purchase_order_items_product_id");
        });

        modelBuilder.Entity<TrxInboundCost>(entity =>
        {
            entity.HasKey(e => e.InboundCostId).HasName("trx_inbound_costs_pkey");

            entity.ToTable("trx_inbound_costs", "stockflow");

            entity.Property(e => e.InboundCostId).HasColumnName("inbound_cost_id");
            entity.Property(e => e.AllocatedBy).HasColumnName("allocated_by");
            entity.Property(e => e.Amount)
                .HasPrecision(18, 2)
                .HasColumnName("amount");
            entity.Property(e => e.CostType)
                .HasMaxLength(50)
                .HasColumnName("cost_type");
            entity.Property(e => e.CreatedAt)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("created_at");
            entity.Property(e => e.Description)
                .HasMaxLength(255)
                .HasColumnName("description");
            entity.Property(e => e.GrId).HasColumnName("gr_id");

            entity.HasOne(d => d.AllocatedByNavigation).WithMany(p => p.TrxInboundCosts)
                .HasForeignKey(d => d.AllocatedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_trx_inbound_costs_allocated_by");

            entity.HasOne(d => d.Gr).WithMany(p => p.TrxInboundCosts)
                .HasForeignKey(d => d.GrId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_trx_inbound_costs_gr_id");
        });

        modelBuilder.Entity<TrxInventoryBalance>(entity =>
        {
            entity.HasKey(e => e.InventoryId).HasName("trx_inventory_balances_pkey");

            entity.ToTable("trx_inventory_balances", "stockflow");

            entity.HasIndex(e => new { e.WarehouseId, e.LocationId, e.ProductId, e.LotId }, "uq_trx_inventory_balances_location_product_lot").IsUnique();

            entity.Property(e => e.InventoryId).HasColumnName("inventory_id");
            entity.Property(e => e.LastUpdated)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("last_updated");
            entity.Property(e => e.LocationId).HasColumnName("location_id");
            entity.Property(e => e.LotId).HasColumnName("lot_id");
            entity.Property(e => e.ProductId).HasColumnName("product_id");
            entity.Property(e => e.Quantity)
                .HasPrecision(18, 2)
                .HasColumnName("quantity");
            entity.Property(e => e.UnitCost)
                .HasPrecision(18, 4)
                .HasColumnName("unit_cost");
            entity.Property(e => e.WarehouseId).HasColumnName("warehouse_id");

            entity.HasOne(d => d.Location).WithMany(p => p.TrxInventoryBalances)
                .HasForeignKey(d => d.LocationId)
                .HasConstraintName("fk_trx_inventory_balances_location_id");

            entity.HasOne(d => d.Lot).WithMany(p => p.TrxInventoryBalances)
                .HasForeignKey(d => d.LotId)
                .HasConstraintName("fk_trx_inventory_balances_lot_id");

            entity.HasOne(d => d.Product).WithMany(p => p.TrxInventoryBalances)
                .HasForeignKey(d => d.ProductId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_trx_inventory_balances_product_id");

            entity.HasOne(d => d.Warehouse).WithMany(p => p.TrxInventoryBalances)
                .HasForeignKey(d => d.WarehouseId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_trx_inventory_balances_warehouse_id");
        });

        modelBuilder.Entity<TrxInventoryDisposal>(entity =>
        {
            entity.HasKey(e => e.DisposalId).HasName("trx_inventory_disposals_pkey");

            entity.ToTable("trx_inventory_disposals", "stockflow");

            entity.HasIndex(e => e.DisposalCode, "uq_trx_inventory_disposals_1").IsUnique();

            entity.Property(e => e.DisposalId).HasColumnName("disposal_id");
            entity.Property(e => e.DisposalCode)
                .HasMaxLength(30)
                .HasColumnName("disposal_code");
            entity.Property(e => e.DisposalDate)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("disposal_date");
            entity.Property(e => e.ProcessedBy).HasColumnName("processed_by");
            entity.Property(e => e.Reason)
                .HasMaxLength(500)
                .HasColumnName("reason");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .HasColumnName("status");
            entity.Property(e => e.WarehouseId).HasColumnName("warehouse_id");

            entity.HasOne(d => d.ProcessedByNavigation).WithMany(p => p.TrxInventoryDisposals)
                .HasForeignKey(d => d.ProcessedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_trx_inventory_disposals_processed_by");

            // Người tạo phiếu xuất hủy (người xuất hủy = processed_by)
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.HasOne(d => d.CreatedByNavigation).WithMany()
                .HasForeignKey(d => d.CreatedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_trx_inventory_disposals_created_by");

            entity.HasOne(d => d.Warehouse).WithMany(p => p.TrxInventoryDisposals)
                .HasForeignKey(d => d.WarehouseId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_trx_inventory_disposals_warehouse_id");
        });

        modelBuilder.Entity<TrxInventoryTransaction>(entity =>
        {
            entity.HasKey(e => e.TransactionId).HasName("trx_inventory_transactions_pkey");

            entity.ToTable("trx_inventory_transactions", "stockflow");

            entity.Property(e => e.TransactionId).HasColumnName("transaction_id");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.Property(e => e.LocationId).HasColumnName("location_id");
            entity.Property(e => e.LotId).HasColumnName("lot_id");
            entity.Property(e => e.ProductId).HasColumnName("product_id");
            entity.Property(e => e.Quantity)
                .HasPrecision(18, 2)
                .HasColumnName("quantity");
            entity.Property(e => e.ReferenceId).HasColumnName("reference_id");
            entity.Property(e => e.ReferenceType)
                .HasMaxLength(50)
                .HasColumnName("reference_type");
            entity.Property(e => e.TransactionDate)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("transaction_date");
            entity.Property(e => e.TransactionType)
                .HasMaxLength(30)
                .HasColumnName("transaction_type");
            entity.Property(e => e.WarehouseId).HasColumnName("warehouse_id");
            entity.Property(e => e.TransactionPrice)
                .HasPrecision(18, 2)
                .HasColumnName("transaction_price");
            entity.Property(e => e.UnitCost)
                .HasPrecision(18, 2)
                .HasColumnName("unit_cost");
            entity.Property(e => e.BalanceAfter)
                .HasPrecision(18, 2)
                .HasColumnName("balance_after");

            entity.HasOne(d => d.CreatedByNavigation).WithMany(p => p.TrxInventoryTransactions)
                .HasForeignKey(d => d.CreatedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_trx_inventory_transactions_created_by");

            entity.HasOne(d => d.Location).WithMany(p => p.TrxInventoryTransactions)
                .HasForeignKey(d => d.LocationId)
                .HasConstraintName("fk_trx_inventory_transactions_location_id");

            entity.HasOne(d => d.Lot).WithMany(p => p.TrxInventoryTransactions)
                .HasForeignKey(d => d.LotId)
                .HasConstraintName("fk_trx_inventory_transactions_lot_id");

            entity.HasOne(d => d.Product).WithMany(p => p.TrxInventoryTransactions)
                .HasForeignKey(d => d.ProductId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_trx_inventory_transactions_product_id");

            entity.HasOne(d => d.Warehouse).WithMany(p => p.TrxInventoryTransactions)
                .HasForeignKey(d => d.WarehouseId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_trx_inventory_transactions_warehouse_id");
        });

        modelBuilder.Entity<TrxOrder>(entity =>
        {
            entity.HasKey(e => e.OrderId).HasName("trx_orders_pkey");

            entity.ToTable("trx_orders", "stockflow");

            entity.HasIndex(e => e.OrderCode, "uq_trx_orders_1").IsUnique();

            entity.Property(e => e.OrderId).HasColumnName("order_id");
            entity.Property(e => e.ConsolidatedIntoOrderId).HasColumnName("consolidated_into_order_id");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.Property(e => e.Notes)
                .HasMaxLength(500)
                .HasColumnName("notes");
            entity.Property(e => e.OrderCode)
                .HasMaxLength(30)
                .HasColumnName("order_code");
            entity.Property(e => e.OrderDate)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("order_date");
            entity.Property(e => e.OutstandingAmount)
                .HasPrecision(18, 2)
                .HasColumnName("outstanding_amount");
            entity.Property(e => e.PaidAmount)
                .HasPrecision(18, 2)
                .HasColumnName("paid_amount");
            entity.Property(e => e.PartnerId).HasColumnName("partner_id");
            entity.Property(e => e.PaymentStatus)
                .HasMaxLength(20)
                .HasColumnName("payment_status");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .HasColumnName("status");
            entity.Property(e => e.TotalAmount)
                .HasPrecision(18, 2)
                .HasColumnName("total_amount");
            entity.Property(e => e.SubTotal)
                .HasPrecision(18, 2)
                .HasColumnName("sub_total");
            entity.Property(e => e.DiscountType)
                .HasMaxLength(20)
                .HasColumnName("discount_type");
            entity.Property(e => e.DiscountValue)
                .HasPrecision(18, 2)
                .HasColumnName("discount_value");
            entity.Property(e => e.DiscountAmount)
                .HasPrecision(18, 2)
                .HasColumnName("discount_amount");
            entity.Property(e => e.OrderType)
                .HasMaxLength(20)
                .HasDefaultValue("INVOICE")
                .HasColumnName("order_type");
            entity.Property(e => e.WarehouseId).HasColumnName("warehouse_id");
            entity.Property(e => e.DeliveryDate)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("delivery_date");
            entity.Property(e => e.BookingOrderId).HasColumnName("booking_order_id");
            entity.Property(e => e.DepositAmount)
                .HasPrecision(18, 2)
                .HasDefaultValue(0m)
                .HasColumnName("deposit_amount");
            entity.HasOne(d => d.Warehouse).WithMany()
                .HasForeignKey(d => d.WarehouseId)
                .HasConstraintName("fk_trx_orders_warehouse_id");
            entity.HasOne(d => d.BookingOrder).WithMany(p => p.BookingInvoices)
                .HasForeignKey(d => d.BookingOrderId)
                .HasConstraintName("fk_trx_orders_booking_order_id");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("updated_at");
            entity.Property(e => e.UpdatedBy)
                .HasColumnName("updated_by");

            entity.HasOne(d => d.UpdatedByNavigation).WithMany()
                .HasForeignKey(d => d.UpdatedBy)
                .HasConstraintName("fk_trx_orders_updated_by");

            entity.HasOne(d => d.ConsolidatedIntoOrder).WithMany(p => p.InverseConsolidatedIntoOrder)
                .HasForeignKey(d => d.ConsolidatedIntoOrderId)
                .HasConstraintName("fk_trx_orders_consolidated_into_order_id");

            entity.HasOne(d => d.CreatedByNavigation).WithMany(p => p.TrxOrders)
                .HasForeignKey(d => d.CreatedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_trx_orders_created_by");

            entity.HasOne(d => d.Partner).WithMany(p => p.TrxOrders)
                .HasForeignKey(d => d.PartnerId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_trx_orders_partner_id");
        });

        modelBuilder.Entity<TrxProductionMaterialRequirement>(entity =>
        {
            entity.HasKey(e => e.RequirementId).HasName("trx_production_material_requirements_pkey");

            entity.ToTable("trx_production_material_requirements", "stockflow");

            entity.Property(e => e.RequirementId).HasColumnName("requirement_id");
            // Snapshot định mức khi lập lệnh và điều chỉnh định mức trên lệnh (BR-31, BR-51)
            entity.Property(e => e.SourceBomItemId).HasColumnName("source_bom_item_id");
            entity.Property(e => e.NormPerUnit)
                .HasPrecision(18, 4)
                .HasColumnName("norm_per_unit");
            entity.Property(e => e.WastageRate)
                .HasPrecision(5, 2)
                .HasColumnName("wastage_rate");
            entity.Property(e => e.IsAdjusted)
                .HasColumnName("is_adjusted");
            entity.Property(e => e.AdjustReason)
                .HasMaxLength(500)
                .HasColumnName("adjust_reason");
            entity.Property(e => e.AdjustedBy).HasColumnName("adjusted_by");
            entity.Property(e => e.AdjustedAt)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("adjusted_at");
            entity.Property(e => e.IssuedQty)
                .HasPrecision(18, 2)
                .HasColumnName("issued_qty");
            entity.Property(e => e.MaterialId).HasColumnName("material_id");
            entity.Property(e => e.ProductionOrderId).HasColumnName("production_order_id");
            entity.Property(e => e.ProductionOrderItemId).HasColumnName("production_order_item_id");
            entity.Property(e => e.RequiredQty)
                .HasPrecision(18, 2)
                .HasColumnName("required_qty");
            entity.Property(e => e.ShortageQty)
                .HasPrecision(18, 2)
                .HasColumnName("shortage_qty");
            entity.Property(e => e.UnitId).HasColumnName("unit_id");

            entity.HasOne(d => d.Material).WithMany(p => p.TrxProductionMaterialRequirements)
                .HasForeignKey(d => d.MaterialId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_trx_production_material_requirements_material_id");

            entity.HasOne(d => d.ProductionOrder).WithMany(p => p.TrxProductionMaterialRequirements)
                .HasForeignKey(d => d.ProductionOrderId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_trx_production_material_requirements_production_order_id");

            entity.HasOne(d => d.ProductionOrderItem).WithMany(p => p.TrxProductionMaterialRequirements)
                .HasForeignKey(d => d.ProductionOrderItemId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_trx_production_material_requirements_order_item_id");

            entity.HasOne(d => d.Unit).WithMany(p => p.TrxProductionMaterialRequirements)
                .HasForeignKey(d => d.UnitId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_trx_production_material_requirements_unit_id");
        });

        modelBuilder.Entity<TrxProductionOrder>(entity =>
        {
            entity.HasKey(e => e.ProductionOrderId).HasName("trx_production_orders_pkey");

            entity.ToTable("trx_production_orders", "stockflow");

            entity.HasIndex(e => e.ProductionOrderCode, "uq_trx_production_orders_1").IsUnique();

            entity.Property(e => e.ProductionOrderId).HasColumnName("production_order_id");
            // Xưởng phụ trách (UC-58 A58.1)
            entity.Property(e => e.Workshop)
                .HasMaxLength(200)
                .HasColumnName("workshop");
            entity.Property(e => e.ActualQuantity)
                .HasPrecision(18, 2)
                .HasColumnName("actual_quantity");
            entity.Property(e => e.AssignedTo).HasColumnName("assigned_to");
            entity.Property(e => e.BomId).HasColumnName("bom_id");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.Property(e => e.EndDate)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("end_date");
            entity.Property(e => e.Notes)
                .HasMaxLength(500)
                .HasColumnName("notes");
            entity.Property(e => e.PlannedQuantity)
                .HasPrecision(18, 2)
                .HasColumnName("planned_quantity");
            entity.Property(e => e.ProductId).HasColumnName("product_id");
            entity.Property(e => e.ProductionOrderCode)
                .HasMaxLength(30)
                .HasColumnName("production_order_code");
            entity.Property(e => e.StartDate)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("start_date");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .HasColumnName("status");

            entity.HasOne(d => d.AssignedToNavigation).WithMany(p => p.TrxProductionOrderAssignedToNavigations)
                .HasForeignKey(d => d.AssignedTo)
                .HasConstraintName("fk_trx_production_orders_assigned_to");

            entity.HasOne(d => d.Bom).WithMany(p => p.TrxProductionOrders)
                .HasForeignKey(d => d.BomId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_trx_production_orders_bom_id");

            entity.HasOne(d => d.CreatedByNavigation).WithMany(p => p.TrxProductionOrderCreatedByNavigations)
                .HasForeignKey(d => d.CreatedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_trx_production_orders_created_by");

            entity.HasOne(d => d.Product).WithMany(p => p.TrxProductionOrders)
                .HasForeignKey(d => d.ProductId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_trx_production_orders_product_id");

            // Kế hoạch sản xuất sinh ra lệnh (tùy chọn). Không cho xóa kế hoạch còn lệnh liên kết.
            entity.Property(e => e.ProductionPlanId).HasColumnName("production_plan_id");
            entity.HasOne(d => d.ProductionPlan).WithMany(p => p.TrxProductionOrders)
                .HasForeignKey(d => d.ProductionPlanId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_trx_production_orders_production_plan_id");
        });

        modelBuilder.Entity<TrxProductionPlan>(entity =>
        {
            entity.HasKey(e => e.ProductionPlanId).HasName("trx_production_plans_pkey");

            entity.ToTable("trx_production_plans", "stockflow");

            entity.HasIndex(e => e.PlanCode, "uq_trx_production_plans_code").IsUnique();

            entity.Property(e => e.ProductionPlanId).HasColumnName("production_plan_id");
            entity.Property(e => e.PlanCode)
                .HasMaxLength(30)
                .HasColumnName("plan_code");
            entity.Property(e => e.PlanName)
                .HasMaxLength(150)
                .HasColumnName("plan_name");
            entity.Property(e => e.PlanDate)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("plan_date");
            entity.Property(e => e.PeriodStart).HasColumnName("period_start");
            entity.Property(e => e.PeriodEnd).HasColumnName("period_end");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .HasColumnName("status");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.Property(e => e.ApprovedBy).HasColumnName("approved_by");
            entity.Property(e => e.ApprovalDate)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("approval_date");
            entity.Property(e => e.Notes)
                .HasMaxLength(500)
                .HasColumnName("notes");

            entity.HasOne(d => d.CreatedByNavigation).WithMany()
                .HasForeignKey(d => d.CreatedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_trx_production_plans_created_by");

            entity.HasOne(d => d.ApprovedByNavigation).WithMany()
                .HasForeignKey(d => d.ApprovedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_trx_production_plans_approved_by");
        });

        modelBuilder.Entity<DtlProductionPlanItem>(entity =>
        {
            entity.HasKey(e => e.ProductionPlanItemId).HasName("dtl_production_plan_items_pkey");

            entity.ToTable("dtl_production_plan_items", "stockflow");

            entity.Property(e => e.ProductionPlanItemId).HasColumnName("production_plan_item_id");
            entity.Property(e => e.ProductionPlanId).HasColumnName("production_plan_id");
            entity.Property(e => e.ProductId).HasColumnName("product_id");
            entity.Property(e => e.PlannedQuantity)
                .HasPrecision(18, 2)
                .HasColumnName("planned_quantity");
            entity.Property(e => e.PlannedStartDate).HasColumnName("planned_start_date");
            entity.Property(e => e.PlannedEndDate).HasColumnName("planned_end_date");
            entity.Property(e => e.WarehouseId).HasColumnName("warehouse_id");
            entity.Property(e => e.Notes)
                .HasMaxLength(500)
                .HasColumnName("notes");

            entity.HasOne(d => d.ProductionPlan).WithMany(p => p.DtlProductionPlanItems)
                .HasForeignKey(d => d.ProductionPlanId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_dtl_production_plan_items_production_plan_id");

            entity.HasOne(d => d.Product).WithMany()
                .HasForeignKey(d => d.ProductId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_dtl_production_plan_items_product_id");

            entity.HasOne(d => d.Warehouse).WithMany()
                .HasForeignKey(d => d.WarehouseId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_dtl_production_plan_items_warehouse_id");
        });

        modelBuilder.Entity<DtlProductionOrderItem>(entity =>
        {
            entity.HasKey(e => e.ProductionOrderItemId).HasName("dtl_production_order_items_pkey");

            entity.ToTable("dtl_production_order_items", "stockflow");

            entity.HasIndex(e => e.ProductionOrderId, "ix_dtl_production_order_items_order_id");

            entity.Property(e => e.ProductionOrderItemId).HasColumnName("production_order_item_id");
            entity.Property(e => e.ProductionOrderId).HasColumnName("production_order_id");
            entity.Property(e => e.ProductId).HasColumnName("product_id");
            entity.Property(e => e.BomId).HasColumnName("bom_id");
            entity.Property(e => e.PlannedQuantity)
                .HasPrecision(18, 2)
                .HasColumnName("planned_quantity");
            entity.Property(e => e.ActualQuantity)
                .HasPrecision(18, 2)
                .HasColumnName("actual_quantity");
            entity.Property(e => e.Notes)
                .HasMaxLength(500)
                .HasColumnName("notes");

            entity.HasOne(d => d.ProductionOrder).WithMany(p => p.DtlProductionOrderItems)
                .HasForeignKey(d => d.ProductionOrderId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_dtl_production_order_items_production_order_id");

            entity.HasOne(d => d.Product).WithMany(p => p.DtlProductionOrderItems)
                .HasForeignKey(d => d.ProductId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_dtl_production_order_items_product_id");

            entity.HasOne(d => d.Bom).WithMany(p => p.DtlProductionOrderItems)
                .HasForeignKey(d => d.BomId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_dtl_production_order_items_bom_id");
        });

        modelBuilder.Entity<TrxProductionReport>(entity =>
        {
            entity.HasKey(e => e.ReportId).HasName("trx_production_reports_pkey");

            entity.ToTable("trx_production_reports", "stockflow");

            entity.Property(e => e.ReportId).HasColumnName("report_id");
            entity.Property(e => e.BatchNo)
                .HasMaxLength(50)
                .HasColumnName("batch_no");
            entity.Property(e => e.DefectQty)
                .HasPrecision(18, 2)
                .HasColumnName("defect_qty");
            entity.Property(e => e.Notes)
                .HasMaxLength(500)
                .HasColumnName("notes");
            entity.Property(e => e.ProducedQty)
                .HasPrecision(18, 2)
                .HasColumnName("produced_qty");
            entity.Property(e => e.ProductionOrderId).HasColumnName("production_order_id");
            entity.Property(e => e.ReportDate)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("report_date");
            entity.Property(e => e.ReportedBy).HasColumnName("reported_by");
            entity.Property(e => e.WastageQty)
                .HasPrecision(18, 2)
                .HasColumnName("wastage_qty");

            entity.HasOne(d => d.ProductionOrder).WithMany(p => p.TrxProductionReports)
                .HasForeignKey(d => d.ProductionOrderId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_trx_production_reports_production_order_id");

            entity.HasOne(d => d.ReportedByNavigation).WithMany(p => p.TrxProductionReports)
                .HasForeignKey(d => d.ReportedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_trx_production_reports_reported_by");
        });

        modelBuilder.Entity<TrxReturnProcessing>(entity =>
        {
            entity.HasKey(e => e.ProcessingId).HasName("trx_return_processing_pkey");

            entity.ToTable("trx_return_processing", "stockflow");

            entity.Property(e => e.ProcessingId).HasColumnName("processing_id");
            entity.Property(e => e.Category)
                .HasMaxLength(20)
                .HasColumnName("category");
            entity.Property(e => e.Notes)
                .HasMaxLength(500)
                .HasColumnName("notes");
            entity.Property(e => e.ProcessDate)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("process_date");
            entity.Property(e => e.ProcessedBy).HasColumnName("processed_by");
            entity.Property(e => e.Quantity)
                .HasPrecision(18, 2)
                .HasColumnName("quantity");
            entity.Property(e => e.ReturnItemId).HasColumnName("return_item_id");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .HasColumnName("status");
            entity.Property(e => e.WarehouseId).HasColumnName("warehouse_id");

            entity.HasOne(d => d.ProcessedByNavigation).WithMany(p => p.TrxReturnProcessings)
                .HasForeignKey(d => d.ProcessedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_trx_return_processing_processed_by");

            entity.HasOne(d => d.ReturnItem).WithMany(p => p.TrxReturnProcessings)
                .HasForeignKey(d => d.ReturnItemId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_trx_return_processing_return_item_id");

            entity.HasOne(d => d.Warehouse).WithMany(p => p.TrxReturnProcessings)
                .HasForeignKey(d => d.WarehouseId)
                .HasConstraintName("fk_trx_return_processing_warehouse_id");
        });

        modelBuilder.Entity<TrxReturnRequest>(entity =>
        {
            entity.HasKey(e => e.ReturnRequestId).HasName("trx_return_requests_pkey");

            entity.ToTable("trx_return_requests", "stockflow");

            entity.HasIndex(e => e.ReturnCode, "uq_trx_return_requests_1").IsUnique();

            entity.Property(e => e.ReturnRequestId).HasColumnName("return_request_id");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.Property(e => e.PartnerId).HasColumnName("partner_id");
            entity.Property(e => e.Reason)
                .HasMaxLength(500)
                .HasColumnName("reason");
            entity.Property(e => e.RequestDate)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("request_date");
            entity.Property(e => e.ReturnCode)
                .HasMaxLength(30)
                .HasColumnName("return_code");
            entity.Property(e => e.SalesOrderId).HasColumnName("sales_order_id");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .HasColumnName("status");
            entity.Property(e => e.WarehouseId).HasColumnName("warehouse_id");
            entity.Property(e => e.TotalGoodsAmount).HasPrecision(18, 2).HasDefaultValue(0m).HasColumnName("total_goods_amount");
            entity.Property(e => e.DiscountAmount).HasPrecision(18, 2).HasDefaultValue(0m).HasColumnName("discount_amount");
            entity.Property(e => e.ReturnFee).HasPrecision(18, 2).HasDefaultValue(0m).HasColumnName("return_fee");
            entity.Property(e => e.TotalAmount).HasPrecision(18, 2).HasDefaultValue(0m).HasColumnName("total_amount");
            entity.Property(e => e.RefundAmount).HasPrecision(18, 2).HasDefaultValue(0m).HasColumnName("refund_amount");
            entity.Property(e => e.PaymentMethod).HasMaxLength(20).HasColumnName("payment_method");
            entity.Property(e => e.UpdatedAt).HasColumnType("timestamp without time zone").HasColumnName("updated_at");
            entity.HasOne(d => d.Warehouse).WithMany()
                .HasForeignKey(d => d.WarehouseId)
                .HasConstraintName("fk_trx_return_requests_warehouse_id");

            entity.HasOne(d => d.CreatedByNavigation).WithMany(p => p.TrxReturnRequests)
                .HasForeignKey(d => d.CreatedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_trx_return_requests_created_by");

            entity.HasOne(d => d.Partner).WithMany(p => p.TrxReturnRequests)
                .HasForeignKey(d => d.PartnerId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_trx_return_requests_partner_id");

            entity.HasOne(d => d.SalesOrder).WithMany(p => p.TrxReturnRequests)
                .HasForeignKey(d => d.SalesOrderId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_trx_return_requests_sales_order_id");
        });

        modelBuilder.Entity<TrxStockIssue>(entity =>
        {
            entity.HasKey(e => e.StockIssueId).HasName("trx_stock_issues_pkey");

            entity.ToTable("trx_stock_issues", "stockflow");

            entity.HasIndex(e => e.IssueCode, "uq_trx_stock_issues_1").IsUnique();

            entity.Property(e => e.StockIssueId).HasColumnName("stock_issue_id");
            // Lý do xuất bổ sung vượt nhu cầu (BR-34)
            entity.Property(e => e.Reason)
                .HasMaxLength(500)
                .HasColumnName("reason");
            entity.Property(e => e.IsSupplementary).HasColumnName("is_supplementary");
            entity.Property(e => e.IssueCode)
                .HasMaxLength(30)
                .HasColumnName("issue_code");
            entity.Property(e => e.IssueType)
                .HasMaxLength(20)
                .HasColumnName("issue_type");
            entity.Property(e => e.ProcessedBy).HasColumnName("processed_by");
            entity.Property(e => e.ProcessedDate)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("processed_date");
            entity.Property(e => e.ProductionOrderId).HasColumnName("production_order_id");
            entity.Property(e => e.RequestedBy).HasColumnName("requested_by");
            entity.Property(e => e.RequestedDate)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("requested_date");
            entity.Property(e => e.SalesOrderId).HasColumnName("sales_order_id");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .HasColumnName("status");
            entity.Property(e => e.WarehouseId).HasColumnName("warehouse_id");

            entity.HasOne(d => d.ProcessedByNavigation).WithMany(p => p.TrxStockIssueProcessedByNavigations)
                .HasForeignKey(d => d.ProcessedBy)
                .HasConstraintName("fk_trx_stock_issues_processed_by");

            entity.HasOne(d => d.ProductionOrder).WithMany(p => p.TrxStockIssues)
                .HasForeignKey(d => d.ProductionOrderId)
                .HasConstraintName("fk_trx_stock_issues_production_order_id");

            entity.HasOne(d => d.RequestedByNavigation).WithMany(p => p.TrxStockIssueRequestedByNavigations)
                .HasForeignKey(d => d.RequestedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_trx_stock_issues_requested_by");

            entity.HasOne(d => d.SalesOrder).WithMany(p => p.TrxStockIssues)
                .HasForeignKey(d => d.SalesOrderId)
                .HasConstraintName("fk_trx_stock_issues_sales_order_id");

            entity.HasOne(d => d.Warehouse).WithMany(p => p.TrxStockIssues)
                .HasForeignKey(d => d.WarehouseId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_trx_stock_issues_warehouse_id");
        });

        modelBuilder.Entity<TrxStockTransfer>(entity =>
        {
            entity.HasKey(e => e.StockTransferId).HasName("trx_stock_transfers_pkey");

            entity.ToTable("trx_stock_transfers", "stockflow");

            entity.HasIndex(e => e.TransferCode, "uq_trx_stock_transfers_1").IsUnique();

            entity.Property(e => e.StockTransferId).HasColumnName("stock_transfer_id");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.Property(e => e.DestWarehouseId).HasColumnName("dest_warehouse_id");
            entity.Property(e => e.Notes)
                .HasMaxLength(500)
                .HasColumnName("notes");
            entity.Property(e => e.ReceiveNotes)
                .HasMaxLength(500)
                .HasColumnName("receive_notes");
            entity.Property(e => e.SourceWarehouseId).HasColumnName("source_warehouse_id");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .HasColumnName("status");
            entity.Property(e => e.TransferCode)
                .HasMaxLength(30)
                .HasColumnName("transfer_code");
            entity.Property(e => e.TransferDate)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("transfer_date");
            entity.Property(e => e.ReceivedDate)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("received_date");

            entity.HasOne(d => d.CreatedByNavigation).WithMany(p => p.TrxStockTransfers)
                .HasForeignKey(d => d.CreatedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_trx_stock_transfers_created_by");

            entity.HasOne(d => d.DestWarehouse).WithMany(p => p.TrxStockTransferDestWarehouses)
                .HasForeignKey(d => d.DestWarehouseId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_trx_stock_transfers_dest_warehouse_id");

            entity.HasOne(d => d.SourceWarehouse).WithMany(p => p.TrxStockTransferSourceWarehouses)
                .HasForeignKey(d => d.SourceWarehouseId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_trx_stock_transfers_source_warehouse_id");
        });

        modelBuilder.Entity<TrxStocktake>(entity =>
        {
            entity.HasKey(e => e.StocktakeId).HasName("trx_stocktakes_pkey");

            entity.ToTable("trx_stocktakes", "stockflow");

            entity.HasIndex(e => e.StocktakeCode, "uq_trx_stocktakes_1").IsUnique();

            entity.Property(e => e.StocktakeId).HasColumnName("stocktake_id");
            entity.Property(e => e.ConductedBy).HasColumnName("conducted_by");
            entity.Property(e => e.Notes)
                .HasMaxLength(500)
                .HasColumnName("notes");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .HasColumnName("status");
            entity.Property(e => e.StocktakeCode)
                .HasMaxLength(30)
                .HasColumnName("stocktake_code");
            entity.Property(e => e.StocktakeDate)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("stocktake_date");
            entity.Property(e => e.BalancedDate)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("balanced_date");
            entity.Property(e => e.BalancedBy).HasColumnName("balanced_by");
            entity.Property(e => e.WarehouseId).HasColumnName("warehouse_id");

            entity.HasOne(d => d.ConductedByNavigation).WithMany(p => p.TrxStocktakes)
                .HasForeignKey(d => d.ConductedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_trx_stocktakes_conducted_by");

            entity.HasOne(d => d.Warehouse).WithMany(p => p.TrxStocktakes)
                .HasForeignKey(d => d.WarehouseId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_trx_stocktakes_warehouse_id");
        });

        modelBuilder.Entity<SecUser>(entity =>
        {
            entity.HasKey(e => e.UserId).HasName("sec_users_pkey");
            entity.ToTable("sec_users", "stockflow");
            entity.HasIndex(e => e.Username, "uq_sec_users_1").IsUnique();

            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.Username).HasMaxLength(50).HasColumnName("username");
            entity.Property(e => e.PasswordHash).HasMaxLength(255).HasColumnName("password_hash");
            entity.Property(e => e.FullName).HasMaxLength(100).HasColumnName("full_name");
            entity.Property(e => e.Email).HasMaxLength(100).HasColumnName("email");
            entity.Property(e => e.Phone).HasMaxLength(20).HasColumnName("phone");
            entity.Property(e => e.Avatar).HasColumnName("avatar");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.CreatedAt).HasColumnType("timestamp without time zone").HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnType("timestamp without time zone").HasColumnName("updated_at");
        });

        modelBuilder.Entity<SecRole>(entity =>
        {
            entity.HasKey(e => e.RoleId).HasName("sec_roles_pkey");
            entity.ToTable("sec_roles", "stockflow");
            entity.HasIndex(e => e.RoleName, "uq_sec_roles_1").IsUnique();

            entity.Property(e => e.RoleId).HasColumnName("role_id");
            entity.Property(e => e.RoleName).HasMaxLength(50).HasColumnName("role_name");
            entity.Property(e => e.Description).HasMaxLength(255).HasColumnName("description");
        });

        modelBuilder.Entity<JncUserRole>(entity =>
        {
            entity.HasKey(e => new { e.UserId, e.RoleId }).HasName("jnc_user_roles_pkey");
            entity.ToTable("jnc_user_roles", "stockflow");

            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.RoleId).HasColumnName("role_id");
            entity.Property(e => e.AssignedAt).HasColumnType("timestamp without time zone").HasColumnName("assigned_at");

            entity.HasOne(d => d.Role).WithMany(p => p.JncUserRoles)
                .HasForeignKey(d => d.RoleId)
                .HasConstraintName("fk_jnc_user_roles_role_id");

            entity.HasOne(d => d.User).WithMany(p => p.JncUserRoles)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("fk_jnc_user_roles_user_id");
        });

        modelBuilder.Entity<JncUserWarehouseAccess>(entity =>
        {
            entity.HasKey(e => new { e.UserId, e.WarehouseId }).HasName("jnc_user_warehouse_access_pkey");
            entity.ToTable("jnc_user_warehouse_access", "stockflow");

            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.WarehouseId).HasColumnName("warehouse_id");
            entity.Property(e => e.AssignedAt).HasColumnType("timestamp without time zone").HasColumnName("assigned_at");

            entity.HasOne(d => d.Warehouse).WithMany(p => p.JncUserWarehouseAccesses)
                .HasForeignKey(d => d.WarehouseId)
                .HasConstraintName("fk_jnc_user_warehouse_access_warehouse_id");

            entity.HasOne(d => d.User).WithMany(p => p.JncUserWarehouseAccesses)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("fk_jnc_user_warehouse_access_user_id");
        });

        modelBuilder.Entity<MstPriceBook>(entity =>
        {
            entity.HasKey(e => e.PriceBookId).HasName("mst_price_books_pkey");

            entity.ToTable("mst_price_books", "stockflow");

            entity.Property(e => e.PriceBookId).HasColumnName("price_book_id");
            entity.Property(e => e.PriceBookCode)
                .HasMaxLength(50)
                .HasColumnName("price_book_code");
            entity.Property(e => e.PriceBookName)
                .HasMaxLength(255)
                .HasColumnName("price_book_name");
            entity.Property(e => e.EffectiveFrom)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("effective_from");
            entity.Property(e => e.EffectiveTo)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("effective_to");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.IsDefault).HasColumnName("is_default");
            entity.Property(e => e.FormulaBaseType)
                .HasMaxLength(50)
                .HasColumnName("formula_base_type");
            entity.Property(e => e.FormulaBasePriceBookId).HasColumnName("formula_base_price_book_id");
            entity.Property(e => e.FormulaOperator)
                .HasMaxLength(10)
                .HasColumnName("formula_operator");
            entity.Property(e => e.FormulaValue)
                .HasPrecision(18, 2)
                .HasColumnName("formula_value");
            entity.Property(e => e.FormulaUnit)
                .HasMaxLength(20)
                .HasColumnName("formula_unit");
            entity.Property(e => e.AllowUnlistedProducts).HasColumnName("allow_unlisted_products");
            entity.Property(e => e.WarnUnlistedProducts).HasColumnName("warn_unlisted_products");
            entity.Property(e => e.ScopeBranchType)
                .HasMaxLength(20)
                .HasColumnName("scope_branch_type");
            entity.Property(e => e.ScopeWarehouseIds).HasColumnName("scope_warehouse_ids");
            entity.Property(e => e.ScopeCustomerType)
                .HasMaxLength(20)
                .HasColumnName("scope_customer_type");
            entity.Property(e => e.ScopeCustomerGroupCodes).HasColumnName("scope_customer_group_codes");
            entity.Property(e => e.ScopeUserType)
                .HasMaxLength(20)
                .HasColumnName("scope_user_type");
            entity.Property(e => e.ScopeUserIds).HasColumnName("scope_user_ids");
            entity.Property(e => e.ScopeCustomerIds).HasColumnName("scope_customer_ids");
            entity.Property(e => e.CreatedAt)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.FormulaBasePriceBook)
                .WithMany()
                .HasForeignKey(d => d.FormulaBasePriceBookId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_mst_price_books_base_price_book_id");
        });

        modelBuilder.Entity<DtlPriceBookItem>(entity =>
        {
            entity.HasKey(e => e.PriceBookItemId).HasName("dtl_price_book_items_pkey");

            entity.ToTable("dtl_price_book_items", "stockflow");

            entity.HasIndex(e => new { e.PriceBookId, e.ProductId }, "uq_dtl_price_book_items_book_product").IsUnique();

            entity.Property(e => e.PriceBookItemId).HasColumnName("price_book_item_id");
            entity.Property(e => e.PriceBookId).HasColumnName("price_book_id");
            entity.Property(e => e.ProductId).HasColumnName("product_id");
            entity.Property(e => e.Price)
                .HasPrecision(18, 2)
                .HasColumnName("price");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.PriceBook)
                .WithMany(p => p.DtlPriceBookItems)
                .HasForeignKey(d => d.PriceBookId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_dtl_price_book_items_price_book_id");

            entity.HasOne(d => d.Product)
                .WithMany(p => p.DtlPriceBookItems)
                .HasForeignKey(d => d.ProductId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_dtl_price_book_items_product_id");
        });

        modelBuilder.Entity<MstOrderSetting>(entity =>
        {
            entity.HasKey(e => e.SettingId).HasName("mst_order_settings_pkey");

            entity.ToTable("mst_order_settings", "stockflow");

            entity.Property(e => e.SettingId).HasColumnName("setting_id");
            entity.Property(e => e.EnableOrderPlacement).HasColumnName("enable_order_placement");
            entity.Property(e => e.AllowOrderWhenOutOfStock).HasColumnName("allow_order_when_out_of_stock");
            entity.Property(e => e.AllowSellingReservedStock).HasColumnName("allow_selling_reserved_stock");
            entity.Property(e => e.AllowTransferringOrderBranch).HasColumnName("allow_transferring_order_branch");

            entity.Property(e => e.AllowNegativeStockSale).HasColumnName("allow_negative_stock_sale");
            entity.Property(e => e.EnablePrintQuotation).HasColumnName("enable_print_quotation");
            entity.Property(e => e.ConfirmBeforeCompleteOrder).HasColumnName("confirm_before_complete_order");

            entity.Property(e => e.EnableReturnTimeLimit).HasColumnName("enable_return_time_limit");
            entity.Property(e => e.ReturnTimeLimitDays).HasColumnName("return_time_limit_days");

            entity.Property(e => e.LockTransactionTime).HasColumnName("lock_transaction_time");

            entity.Property(e => e.OrderCodeRule).HasMaxLength(20).HasColumnName("order_code_rule");
            entity.Property(e => e.OrderCodePrefix).HasMaxLength(10).HasColumnName("order_code_prefix");
            entity.Property(e => e.BookingCodePrefix).HasMaxLength(10).HasColumnName("booking_code_prefix");
            entity.Property(e => e.ReturnCodePrefix).HasMaxLength(10).HasColumnName("return_code_prefix");
            entity.Property(e => e.TransferCodePrefix).HasMaxLength(10).HasColumnName("transfer_code_prefix");

            entity.Property(e => e.UpdatedAt).HasColumnType("timestamp with time zone").HasColumnName("updated_at");
            entity.Property(e => e.UpdatedBy).HasColumnName("updated_by");

            entity.HasOne(d => d.UpdatedByUser)
                .WithMany()
                .HasForeignKey(d => d.UpdatedBy)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_mst_order_settings_updated_by");
        });

        // Trả hàng nhập (trả hàng cho nhà cung cấp)
        modelBuilder.Entity<TrxPurchaseReturn>(entity =>
        {
            entity.HasKey(e => e.PurchaseReturnId).HasName("trx_purchase_returns_pkey");
            entity.ToTable("trx_purchase_returns", "stockflow");
            entity.HasIndex(e => e.ReturnCode, "uq_trx_purchase_returns_code").IsUnique();
            entity.HasIndex(e => e.GrId, "ix_trx_purchase_returns_gr_id");

            entity.Property(e => e.PurchaseReturnId).HasColumnName("purchase_return_id");
            entity.Property(e => e.ReturnCode).HasMaxLength(30).HasColumnName("return_code");
            entity.Property(e => e.GrId).HasColumnName("gr_id");
            entity.Property(e => e.WarehouseId).HasColumnName("warehouse_id");
            entity.Property(e => e.PartnerId).HasColumnName("partner_id");
            entity.Property(e => e.ReturnDate).HasColumnType("timestamp without time zone").HasColumnName("return_date");
            entity.Property(e => e.Status).HasMaxLength(20).HasColumnName("status");
            entity.Property(e => e.DiscountAmount).HasPrecision(18, 2).HasColumnName("discount_amount");
            entity.Property(e => e.TotalAmount).HasPrecision(18, 2).HasColumnName("total_amount");
            entity.Property(e => e.RefundAmount).HasPrecision(18, 2).HasColumnName("refund_amount");
            entity.Property(e => e.PaymentMethod).HasMaxLength(20).HasColumnName("payment_method");
            entity.Property(e => e.Notes).HasMaxLength(500).HasColumnName("notes");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.Property(e => e.CreatedAt).HasColumnType("timestamp without time zone").HasColumnName("created_at");

            entity.HasOne(d => d.Gr).WithMany()
                .HasForeignKey(d => d.GrId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_trx_purchase_returns_gr_id");
            entity.HasOne(d => d.Warehouse).WithMany()
                .HasForeignKey(d => d.WarehouseId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_trx_purchase_returns_warehouse_id");
            entity.HasOne(d => d.Partner).WithMany()
                .HasForeignKey(d => d.PartnerId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_trx_purchase_returns_partner_id");
            entity.HasOne(d => d.CreatedByNavigation).WithMany()
                .HasForeignKey(d => d.CreatedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_trx_purchase_returns_created_by");
        });

        modelBuilder.Entity<DtlPurchaseReturnItem>(entity =>
        {
            entity.HasKey(e => e.PrItemId).HasName("dtl_purchase_return_items_pkey");
            entity.ToTable("dtl_purchase_return_items", "stockflow");
            entity.HasIndex(e => e.PurchaseReturnId, "ix_dtl_purchase_return_items_return_id");
            entity.HasIndex(e => e.GrItemId, "ix_dtl_purchase_return_items_gr_item_id");

            entity.Property(e => e.PrItemId).HasColumnName("pr_item_id");
            entity.Property(e => e.PurchaseReturnId).HasColumnName("purchase_return_id");
            entity.Property(e => e.ProductId).HasColumnName("product_id");
            entity.Property(e => e.GrItemId).HasColumnName("gr_item_id");
            entity.Property(e => e.Quantity).HasPrecision(18, 4).HasColumnName("quantity");
            entity.Property(e => e.ImportPrice).HasPrecision(18, 4).HasColumnName("import_price");
            entity.Property(e => e.ReturnPrice).HasPrecision(18, 4).HasColumnName("return_price");
            entity.Property(e => e.LotId).HasColumnName("lot_id");
            entity.Property(e => e.LocationId).HasColumnName("location_id");

            entity.HasOne(d => d.PurchaseReturn).WithMany(p => p.DtlPurchaseReturnItems)
                .HasForeignKey(d => d.PurchaseReturnId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("fk_dtl_purchase_return_items_return_id");
            entity.HasOne(d => d.Product).WithMany()
                .HasForeignKey(d => d.ProductId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_dtl_purchase_return_items_product_id");
            entity.HasOne(d => d.GrItem).WithMany()
                .HasForeignKey(d => d.GrItemId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_dtl_purchase_return_items_gr_item_id");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    public async Task<long> GetNextSequenceValueAsync(string sequenceName, CancellationToken cancellationToken = default)
    {
        await using var cmd = Database.GetDbConnection().CreateCommand();
        cmd.CommandText = $"SELECT nextval('{sequenceName}')";
        if (cmd.Connection!.State != System.Data.ConnectionState.Open)
        {
            await cmd.Connection.OpenAsync(cancellationToken);
        }
        var result = await cmd.ExecuteScalarAsync(cancellationToken);
        return Convert.ToInt64(result);
    }

    public Task<Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction> BeginTransactionAsync(CancellationToken cancellationToken = default)
        => Database.BeginTransactionAsync(cancellationToken);

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}

