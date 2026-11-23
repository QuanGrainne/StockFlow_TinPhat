using StockFlow.Application.Common;
using StockFlow.Application.Features.Roles.Common;
using StockFlow.Domain.Entities;

namespace StockFlow.UnitTests.Common;

/// <summary>Dữ liệu mẫu cho sản xuất: thành phẩm FG-01 / FG-02, nguyên vật liệu RM-01, định mức (BOM), kế hoạch.</summary>
public static class ProductionData
{
    public const int Fg01 = 20;
    public const int Fg02 = 21;
    public const int Rm01 = 30;

    public const string PlanFeature = FeatureConstants.ProductionPlans;
    public const string ApprovalFeature = FeatureConstants.ProductionPlanApproval;

    public static void SeedProducts(TestStockFlowDbContext db)
    {
        db.MstProducts.AddRange(
            new MstProduct { ProductId = Fg01, ProductCode = "FG-01", ProductName = "Thành phẩm 01", CategoryId = TestData.CategoryId, BaseUnitId = TestData.UnitId, ProductType = "FINISHED", IsActive = true },
            new MstProduct { ProductId = Fg02, ProductCode = "FG-02", ProductName = "Thành phẩm 02", CategoryId = TestData.CategoryId, BaseUnitId = TestData.UnitId, ProductType = "FINISHED", IsActive = true },
            new MstProduct { ProductId = Rm01, ProductCode = "RM-01", ProductName = "Nguyên vật liệu 01", CategoryId = TestData.CategoryId, BaseUnitId = TestData.UnitId, ProductType = "MATERIAL", IsActive = true });
        TestData.SaveAndDetach(db);
    }

    /// <summary>Định mức của thành phẩm; withMaterial = true thì có 1 dòng RM-01 × 2.</summary>
    public static int AddBom(TestStockFlowDbContext db, int productId, string version, bool active, bool withMaterial = true)
    {
        var bom = new MstBom
        {
            ProductId = productId, BomName = $"BOM-{productId}-{version}", Version = version, IsActive = active, CreatedAt = VietnamTime.Now,
        };
        db.MstBoms.Add(bom);
        db.SaveChanges();
        if (withMaterial)
            db.DtlBomItems.Add(new DtlBomItem { BomId = bom.BomId, MaterialId = Rm01, Quantity = 2, UnitId = TestData.UnitId, WastageRate = 0 });
        TestData.SaveAndDetach(db);
        return bom.BomId;
    }

    /// <summary>
    /// Lệnh sản xuất FG-01 một dòng (SL kế hoạch <paramref name="planned"/>), định mức RM-01 × 2 / thành phẩm:
    /// nhu cầu RM-01 = planned × 2, đã xuất <paramref name="issued"/>. Trả về (OrderId, OrderItemId, RequirementId).
    /// </summary>
    public static (int OrderId, int ItemId, int RequirementId) AddOrder(
        TestStockFlowDbContext db, string code, string status, int bomId, decimal planned = 10, decimal issued = 0, int? planId = null)
    {
        var order = new TrxProductionOrder
        {
            ProductionOrderCode = code, ProductId = Fg01, BomId = bomId, PlannedQuantity = planned, ActualQuantity = 0,
            Status = status, CreatedBy = TestData.UserId, StartDate = VietnamTime.Now.AddDays(-1), EndDate = VietnamTime.Now.AddDays(10),
            ProductionPlanId = planId,
        };
        db.TrxProductionOrders.Add(order);
        db.SaveChanges();
        var item = new DtlProductionOrderItem { ProductionOrderId = order.ProductionOrderId, ProductId = Fg01, BomId = bomId, PlannedQuantity = planned, ActualQuantity = 0 };
        db.DtlProductionOrderItems.Add(item);
        db.SaveChanges();
        var requirement = new TrxProductionMaterialRequirement
        {
            ProductionOrderId = order.ProductionOrderId, ProductionOrderItemId = item.ProductionOrderItemId, MaterialId = Rm01,
            RequiredQty = planned * 2, IssuedQty = issued, ShortageQty = Math.Max(0, planned * 2 - issued), UnitId = TestData.UnitId,
            NormPerUnit = 2, WastageRate = 0,
        };
        db.TrxProductionMaterialRequirements.Add(requirement);
        TestData.SaveAndDetach(db);
        return (order.ProductionOrderId, item.ProductionOrderItemId, requirement.RequirementId);
    }

    /// <summary>Phân quyền kho cho người dùng (jnc_user_warehouse_access).</summary>
    public static void GrantWarehouse(TestStockFlowDbContext db, int userId, int warehouseId)
    {
        db.JncUserWarehouseAccesses.Add(new JncUserWarehouseAccess { UserId = userId, WarehouseId = warehouseId, AssignedAt = VietnamTime.Now });
        TestData.SaveAndDetach(db);
    }

    /// <summary>Kế hoạch 1 dòng (SL 100), kho xuất NVL và kho nhận thành phẩm đều là K001.</summary>
    public static int AddPlan(
        TestStockFlowDbContext db, string code, string status, int productId, DateOnly start, DateOnly end,
        string? notes = null, int createdBy = TestData.UserId)
    {
        var plan = new TrxProductionPlan
        {
            PlanCode = code, PlanName = $"Kế hoạch {code}", PlanDate = VietnamTime.Now, PeriodStart = start, PeriodEnd = end,
            Status = status, CreatedBy = createdBy, Notes = notes, WarehouseId = TestData.K001,
        };
        plan.DtlProductionPlanItems.Add(new DtlProductionPlanItem
        {
            ProductId = productId, PlannedQuantity = 100, PlannedStartDate = start, PlannedEndDate = end, WarehouseId = TestData.K001,
        });
        db.TrxProductionPlans.Add(plan);
        TestData.SaveAndDetach(db);
        return plan.ProductionPlanId;
    }
}
