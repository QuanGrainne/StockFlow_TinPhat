using Microsoft.EntityFrameworkCore;
using Moq;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Common.Inventory;
using StockFlow.Application.Features.Production.Commands;
using StockFlow.Application.Features.Production.DTOs;
using StockFlow.Domain.Entities;
using StockFlow.Infrastructure.Services;
using StockFlow.UnitTests.Common;
using Xunit;

namespace StockFlow.UnitTests.Production.Orders;

/// <summary>Dựng chung: FG-01 có định mức đang áp dụng (RM-01 × 2), FG-02 không có; người dùng có quyền kho K001.</summary>
internal static class OrderSetup
{
    public static (TestStockFlowDbContext Db, int BomId) Db()
    {
        var db = TestStockFlowDbContext.Create();
        TestData.SeedMasterData(db);
        ProductionData.SeedProducts(db);
        var bomId = ProductionData.AddBom(db, ProductionData.Fg01, "1.0", active: true);
        return (db, bomId);
    }

    public static Mock<ICurrentUserService> User() => CurrentUser.WithWarehouses(TestData.UserId, TestData.K001);

    public static List<TrxInventoryTransaction> Cards(TestStockFlowDbContext db, string type) =>
        db.TrxInventoryTransactions.AsNoTracking().Where(t => t.TransactionType == type).ToList();
}

/// <summary>
/// Report 5.1 – sheet CreateOrderFromPlan (TamDM): lập lệnh sản xuất từ kế hoạch APPROVED; mỗi thành phẩm 1 dòng; theo định mức đang áp dụng.
/// Người lập có feature "feat-prod-plan". Ca 04 là luật của validator. Ca 05 kiểm theo D.1 (BOM → định mức).
/// </summary>
public class CreateOrderFromPlanTests
{
    private const string Function = "CreateOrderFromPlan";

    private static (TestStockFlowDbContext Db, CreateProductionOrderFromPlanCommandHandler Handler, int PlanId) Arrange(
        string planStatus = ProductionPlanStatus.Approved, int planProduct = ProductionData.Fg01)
    {
        var (db, _) = OrderSetup.Db();
        var today = DateOnly.FromDateTime(VietnamTime.Now);
        var planId = ProductionData.AddPlan(db, "KH0001", planStatus, planProduct, today.AddDays(5), today.AddDays(30));
        var handler = new CreateProductionOrderFromPlanCommandHandler(db, OrderSetup.User().Object,
            Permissions.WithFeatures("feat-prod-plan").Object, new TransactionCodeGenerator(db));
        return (db, handler, planId);
    }

    private static SaveProductionOrderRequest Req(params (int ProductId, decimal Qty)[] items) =>
        new(0, 0, null, null, null, items.Select(i => new SaveProductionOrderItemInput(i.ProductId, i.Qty)).ToList());

    [Fact(DisplayName = "CreateOrderFromPlan/UTCID01 – KH0001 APPROVED, FG-01 SL 40: lệnh NOT_STARTED, có dòng NVL theo định mức")]
    [Trait("Function", Function)][Trait("UTCID", "CreateOrderFromPlan/UTCID01")][Trait("Type", "N")]
    public async Task UTCID01_ApprovedPlan_CreatesOrderWithRequirements()
    {
        var (db, h, planId) = Arrange();
        var r = await h.Handle(new CreateProductionOrderFromPlanCommand(planId, Req((ProductionData.Fg01, 40))), CancellationToken.None);
        Assert.True(r.IsSuccess, r.Error);
        var order = await db.TrxProductionOrders.AsNoTracking().SingleAsync();
        Assert.Equal(ProductionOrderStatus.NotStarted, order.Status);
        Assert.StartsWith("LSX", order.ProductionOrderCode);
        var requirement = await db.TrxProductionMaterialRequirements.AsNoTracking().SingleAsync();
        Assert.Equal(ProductionData.Rm01, requirement.MaterialId);
        Assert.Equal(80m, requirement.RequiredQty); // 40 × định mức 2 × (1 + hao hụt 0%) – BR-31
    }

    [Fact(DisplayName = "CreateOrderFromPlan/UTCID02 – kế hoạch KH0002 còn PENDING_APPROVAL")]
    [Trait("Function", Function)][Trait("UTCID", "CreateOrderFromPlan/UTCID02")][Trait("Type", "A")]
    public async Task UTCID02_PlanNotApproved_ReturnsError()
    {
        var (_, h, planId) = Arrange(ProductionPlanStatus.PendingApproval);
        var r = await h.Handle(new CreateProductionOrderFromPlanCommand(planId, Req((ProductionData.Fg01, 40))), CancellationToken.None);
        Assert.False(r.IsSuccess);
        Assert.Equal("Chỉ được lập lệnh sản xuất từ kế hoạch đã duyệt.", r.Error);
    }

    [Fact(DisplayName = "CreateOrderFromPlan/UTCID03 – FG-01 chọn 2 dòng")]
    [Trait("Function", Function)][Trait("UTCID", "CreateOrderFromPlan/UTCID03")][Trait("Type", "A")]
    public async Task UTCID03_DuplicateProduct_ReturnsError()
    {
        var (_, h, planId) = Arrange();
        var r = await h.Handle(new CreateProductionOrderFromPlanCommand(planId, Req((ProductionData.Fg01, 20), (ProductionData.Fg01, 20))), CancellationToken.None);
        Assert.False(r.IsSuccess);
        Assert.Equal("Mỗi thành phẩm chỉ được chọn một dòng trong cùng một lệnh sản xuất.", r.Error);
    }

    [Fact(DisplayName = "CreateOrderFromPlan/UTCID04 – SL 0 (validator)")]
    [Trait("Function", Function)][Trait("UTCID", "CreateOrderFromPlan/UTCID04")][Trait("Type", "A")]
    public void UTCID04_ZeroQuantity_ValidatorRejects()
    {
        var request = new SaveProductionOrderRequest(ProductionData.Fg01, 0, null, null, null);
        var r = new CreateProductionOrderFromPlanCommandValidator().Validate(new CreateProductionOrderFromPlanCommand(1, request));
        Assert.Contains("Vui lòng chọn ít nhất một thành phẩm và nhập số lượng kế hoạch lớn hơn 0.", r.Errors.Select(e => e.ErrorMessage));
    }

    [Fact(DisplayName = "CreateOrderFromPlan/UTCID05 – FG-02 chưa có định mức đang áp dụng")]
    [Trait("Function", Function)][Trait("UTCID", "CreateOrderFromPlan/UTCID05")][Trait("Type", "A")]
    public async Task UTCID05_ProductWithoutActiveBom_ReturnsError()
    {
        var (db, h, planId) = Arrange(planProduct: ProductionData.Fg02);
        var r = await h.Handle(new CreateProductionOrderFromPlanCommand(planId, Req((ProductionData.Fg02, 10))), CancellationToken.None);
        // Expected D.1: "Thành phẩm chưa có định mức đang áp dụng. Vui lòng thiết lập định mức trước." – code nối thêm mã hàng "(FG-02)"
        Assert.False(r.IsSuccess);
        Assert.StartsWith("Thành phẩm chưa có định mức đang áp dụng. Vui lòng thiết lập định mức trước.", r.Error);
        Assert.Empty(db.TrxProductionOrders.AsNoTracking());
    }
}

/// <summary>
/// Report 5.1 – sheet CreateMaterialIssue (LucDT): xuất NVL cho lệnh (UC-46), trừ tồn (PRODUCTION_ISSUE); không âm, không vượt tồn,
/// luỹ kế vượt nhu cầu phải có lý do; lệnh chuyển IN_PROGRESS. Precondition: LSX0001 NOT_STARTED cần RM-01 20.
/// </summary>
public class CreateMaterialIssueTests
{
    private const string Function = "CreateMaterialIssue";

    private static (TestStockFlowDbContext Db, CreateMaterialIssueCommandHandler Handler, int OrderId, int RequirementId) Arrange(
        decimal stock = 50, string status = ProductionOrderStatus.NotStarted)
    {
        var (db, bomId) = OrderSetup.Db();
        TestData.SetStock(db, TestData.K001, ProductionData.Rm01, stock, 5_000m);
        var (orderId, _, reqId) = ProductionData.AddOrder(db, "LSX0001", status, bomId, planned: 10);
        var h = new CreateMaterialIssueCommandHandler(db, OrderSetup.User().Object, new TransactionCodeGenerator(db), new InventoryLedger(db));
        return (db, h, orderId, reqId);
    }

    private static CreateMaterialIssueRequest Req(int orderId, params (int RequirementId, decimal Qty)[] lines) =>
        new(orderId, TestData.K001, false, null, lines.Select(l => new CreateMaterialIssueItemRequest(l.RequirementId, l.Qty)).ToList());

    [Fact(DisplayName = "CreateMaterialIssue/UTCID01 – xuất RM-01 20 từ K001: tồn còn 30, PRODUCTION_ISSUE −20, lệnh IN_PROGRESS")]
    [Trait("Function", Function)][Trait("UTCID", "CreateMaterialIssue/UTCID01")][Trait("Type", "N")]
    public async Task UTCID01_IssueRequirement_DeductsStockAndStartsOrder()
    {
        var (db, h, orderId, reqId) = Arrange();
        var r = await h.Handle(new CreateMaterialIssueCommand(Req(orderId, (reqId, 20))), CancellationToken.None);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(30, TestData.StockOf(db, TestData.K001, ProductionData.Rm01));
        Assert.Equal(-20, Assert.Single(OrderSetup.Cards(db, "PRODUCTION_ISSUE")).Quantity);
        Assert.Equal(ProductionOrderStatus.InProgress, (await db.TrxProductionOrders.AsNoTracking().SingleAsync()).Status);
    }

    [Fact(DisplayName = "CreateMaterialIssue/UTCID02 – tồn 20, xuất 20: tồn 0")]
    [Trait("Function", Function)][Trait("UTCID", "CreateMaterialIssue/UTCID02")][Trait("Type", "B")]
    public async Task UTCID02_IssueAllStock_StockBecomesZero()
    {
        var (db, h, orderId, reqId) = Arrange(stock: 20);
        var r = await h.Handle(new CreateMaterialIssueCommand(Req(orderId, (reqId, 20))), CancellationToken.None);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(0, TestData.StockOf(db, TestData.K001, ProductionData.Rm01));
    }

    [Fact(DisplayName = "CreateMaterialIssue/UTCID03 – xuất 25 > nhu cầu 20, không có lý do")]
    [Trait("Function", Function)][Trait("UTCID", "CreateMaterialIssue/UTCID03")][Trait("Type", "A")]
    public async Task UTCID03_ExceedRequirementWithoutReason_ReturnsError()
    {
        var (db, h, orderId, reqId) = Arrange();
        var r = await h.Handle(new CreateMaterialIssueCommand(Req(orderId, (reqId, 25))), CancellationToken.None);
        // Expected D.1 (BOM → định mức)
        Assert.False(r.IsSuccess);
        Assert.Equal("Số lượng xuất luỹ kế vượt nhu cầu theo định mức. Vui lòng nhập lý do.", r.Error);
        Assert.Equal(50, TestData.StockOf(db, TestData.K001, ProductionData.Rm01));
    }

    [Fact(DisplayName = "CreateMaterialIssue/UTCID04 – tồn 10, xuất 15")]
    [Trait("Function", Function)][Trait("UTCID", "CreateMaterialIssue/UTCID04")][Trait("Type", "A")]
    public async Task UTCID04_IssueAboveStock_ReturnsError()
    {
        var (_, h, orderId, reqId) = Arrange(stock: 10);
        var r = await h.Handle(new CreateMaterialIssueCommand(Req(orderId, (reqId, 15))), CancellationToken.None);
        Assert.False(r.IsSuccess);
        Assert.Equal("Số lượng thực xuất không được âm và không được vượt tồn kho hiện có. (RM-01: tồn 10)", r.Error);
    }

    [Fact(DisplayName = "CreateMaterialIssue/UTCID05 – lệnh LSX0002 đã COMPLETED")]
    [Trait("Function", Function)][Trait("UTCID", "CreateMaterialIssue/UTCID05")][Trait("Type", "A")]
    public async Task UTCID05_CompletedOrder_ReturnsError()
    {
        var (_, h, orderId, reqId) = Arrange(status: ProductionOrderStatus.Completed);
        var r = await h.Handle(new CreateMaterialIssueCommand(Req(orderId, (reqId, 1))), CancellationToken.None);
        Assert.False(r.IsSuccess);
        Assert.Equal("Lệnh sản xuất đã hoàn thành hoặc đã huỷ nên không xuất được nguyên vật liệu.", r.Error);
    }

    [Fact(DisplayName = "CreateMaterialIssue/UTCID06 – nguyên vật liệu không thuộc lệnh")]
    [Trait("Function", Function)][Trait("UTCID", "CreateMaterialIssue/UTCID06")][Trait("Type", "A")]
    public async Task UTCID06_RequirementNotInOrder_ReturnsError()
    {
        var (_, h, orderId, _) = Arrange();
        var r = await h.Handle(new CreateMaterialIssueCommand(Req(orderId, (999_999, 5))), CancellationToken.None);
        Assert.False(r.IsSuccess);
        Assert.Equal("Nguyên vật liệu không thuộc lệnh sản xuất.", r.Error);
    }

    [Fact(DisplayName = "CreateMaterialIssue/UTCID07 – mọi SL thực xuất để trống (0)")]
    [Trait("Function", Function)][Trait("UTCID", "CreateMaterialIssue/UTCID07")][Trait("Type", "A")]
    public async Task UTCID07_AllQuantitiesEmpty_ReturnsError()
    {
        var (_, h, orderId, reqId) = Arrange();
        var r = await h.Handle(new CreateMaterialIssueCommand(Req(orderId, (reqId, 0))), CancellationToken.None);
        Assert.False(r.IsSuccess);
        Assert.Equal("Vui lòng nhập số lượng thực xuất cho ít nhất một nguyên vật liệu.", r.Error);
    }
}

/// <summary>
/// Report 5.1 – sheet ApproveProductionOrder (LucDT): duyệt hoàn thành lệnh IN_PROGRESS, ghi SL đạt / lỗi, nhập kho SL đạt (PRODUCTION_RECEIPT).
/// Precondition: LSX0001 IN_PROGRESS FG-01 SL 10, RM-01 đã xuất 20 (đủ cho 10). Ca 04, 05, 07 là luật của validator.
/// </summary>
public class ApproveProductionOrderTests
{
    private const string Function = "ApproveProductionOrder";

    private static (TestStockFlowDbContext Db, ApproveProductionOrderCommandHandler Handler, int OrderId, int ItemId) Arrange(
        string status = ProductionOrderStatus.InProgress, decimal issued = 20)
    {
        var (db, bomId) = OrderSetup.Db();
        var (orderId, itemId, _) = ProductionData.AddOrder(db, "LSX0001", status, bomId, planned: 10, issued: issued);
        var h = new ApproveProductionOrderCommandHandler(db, OrderSetup.User().Object, new TransactionCodeGenerator(db), new InventoryLedger(db));
        return (db, h, orderId, itemId);
    }

    private static ApproveProductionOrderRequest Req(int itemId, decimal accepted, decimal defect = 0, string? reason = null, int warehouseId = TestData.K001) =>
        new(warehouseId, null, null, null, null, null, new List<ApproveProductionOrderLine> { new(itemId, accepted, defect, reason) });

    [Fact(DisplayName = "ApproveProductionOrder/UTCID01 – K001, FG-01 đạt 10, lỗi 0: lệnh COMPLETED, FG-01 +10, PRODUCTION_RECEIPT")]
    [Trait("Function", Function)][Trait("UTCID", "ApproveProductionOrder/UTCID01")][Trait("Type", "N")]
    public async Task UTCID01_ApproveFullQuantity_CompletesOrder()
    {
        var (db, h, orderId, itemId) = Arrange();
        var r = await h.Handle(new ApproveProductionOrderCommand(orderId, Req(itemId, 10)), CancellationToken.None);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(ProductionOrderStatus.Completed, (await db.TrxProductionOrders.AsNoTracking().SingleAsync()).Status);
        Assert.Equal(10, TestData.StockOf(db, TestData.K001, ProductionData.Fg01));
        Assert.Equal(10, Assert.Single(OrderSetup.Cards(db, "PRODUCTION_RECEIPT")).Quantity);
    }

    [Fact(DisplayName = "ApproveProductionOrder/UTCID02 – đạt 9, lỗi 1, lý do \"Lỗi sơn\": COMPLETED, FG-01 +9, ghi nhận 1 lỗi")]
    [Trait("Function", Function)][Trait("UTCID", "ApproveProductionOrder/UTCID02")][Trait("Type", "N")]
    public async Task UTCID02_ApproveWithDefect_CompletesOrder()
    {
        var (db, h, orderId, itemId) = Arrange();
        var r = await h.Handle(new ApproveProductionOrderCommand(orderId, Req(itemId, 9, 1, "Lỗi sơn")), CancellationToken.None);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(9, TestData.StockOf(db, TestData.K001, ProductionData.Fg01));
        Assert.Equal(1, (await db.TrxProductionReports.AsNoTracking().SingleAsync()).DefectQty);
        // Expected workbook: lệnh COMPLETED. Code chỉ hoàn thành khi SL ĐẠT đủ kế hoạch (9 < 10) → lệnh còn IN_PROGRESS (xem báo cáo)
        Assert.Equal(ProductionOrderStatus.Completed, (await db.TrxProductionOrders.AsNoTracking().SingleAsync()).Status);
    }

    [Fact(DisplayName = "ApproveProductionOrder/UTCID03 – đạt 11 (> kế hoạch 10), chưa xác nhận")]
    [Trait("Function", Function)][Trait("UTCID", "ApproveProductionOrder/UTCID03")][Trait("Type", "B")]
    public async Task UTCID03_AboveOrderWithoutConfirm_AsksConfirmation()
    {
        var (_, h, orderId, itemId) = Arrange();
        var r = await h.Handle(new ApproveProductionOrderCommand(orderId, Req(itemId, 11)), CancellationToken.None);
        Assert.False(r.IsSuccess);
        Assert.StartsWith("[CONFIRM_EXCEED_PLAN] Số lượng thành phẩm nhập kho lớn hơn số lượng trên lệnh sản xuất: FG-01, lệnh sản xuất LSX0001.", r.Error);
    }

    [Fact(DisplayName = "ApproveProductionOrder/UTCID04 – đạt 0, lỗi 0 (validator)")]
    [Trait("Function", Function)][Trait("UTCID", "ApproveProductionOrder/UTCID04")][Trait("Type", "A")]
    public void UTCID04_ZeroTotal_ValidatorRejects()
    {
        var r = new ApproveProductionOrderCommandValidator().Validate(new ApproveProductionOrderCommand(1, Req(1, 0)));
        Assert.Contains("Tổng số lượng thành phẩm (đạt + lỗi) phải lớn hơn 0.", r.Errors.Select(e => e.ErrorMessage));
    }

    [Fact(DisplayName = "ApproveProductionOrder/UTCID05 – lỗi 1, không ghi lý do (validator)")]
    [Trait("Function", Function)][Trait("UTCID", "ApproveProductionOrder/UTCID05")][Trait("Type", "A")]
    public void UTCID05_DefectWithoutReason_ValidatorRejects()
    {
        var r = new ApproveProductionOrderCommandValidator().Validate(new ApproveProductionOrderCommand(1, Req(1, 9, 1)));
        Assert.Contains("Vui lòng nhập lý do lỗi.", r.Errors.Select(e => e.ErrorMessage));
    }

    [Fact(DisplayName = "ApproveProductionOrder/UTCID06 – lệnh LSX0003 NOT_STARTED (chưa xuất NVL)")]
    [Trait("Function", Function)][Trait("UTCID", "ApproveProductionOrder/UTCID06")][Trait("Type", "A")]
    public async Task UTCID06_NotStartedOrder_ReturnsError()
    {
        var (_, h, orderId, itemId) = Arrange(ProductionOrderStatus.NotStarted, issued: 0);
        var r = await h.Handle(new ApproveProductionOrderCommand(orderId, Req(itemId, 10)), CancellationToken.None);
        Assert.False(r.IsSuccess);
        Assert.Equal("Chỉ duyệt hoàn thành lệnh đang sản xuất (đã xuất nguyên vật liệu).", r.Error);
    }

    [Fact(DisplayName = "ApproveProductionOrder/UTCID07 – không chọn kho nhận (validator)")]
    [Trait("Function", Function)][Trait("UTCID", "ApproveProductionOrder/UTCID07")][Trait("Type", "A")]
    public void UTCID07_NoWarehouse_ValidatorRejects()
    {
        var r = new ApproveProductionOrderCommandValidator().Validate(new ApproveProductionOrderCommand(1, Req(1, 10, warehouseId: 0)));
        Assert.Contains("Vui lòng chọn kho nhận thành phẩm.", r.Errors.Select(e => e.ErrorMessage));
    }
}

/// <summary>
/// Report 5.1 – sheet CreateFinishedGoodsReceipt (TamDM): nhập thành phẩm (UC-49/50) cho lệnh IN_PROGRESS; bắt buộc số lô, SL đạt vào kho,
/// SL lỗi cần lý do. Ca 02, 03, 04 là luật của validator.
/// </summary>
public class CreateFinishedGoodsReceiptTests
{
    private const string Function = "CreateFinishedGoodsReceipt";

    private static (TestStockFlowDbContext Db, CreateFinishedGoodsReceiptCommandHandler Handler, int OrderId) Arrange(
        string status = ProductionOrderStatus.InProgress)
    {
        var (db, bomId) = OrderSetup.Db();
        var (orderId, _, _) = ProductionData.AddOrder(db, "LSX0001", status, bomId, planned: 10, issued: status == ProductionOrderStatus.InProgress ? 20 : 0);
        var h = new CreateFinishedGoodsReceiptCommandHandler(db, OrderSetup.User().Object, new TransactionCodeGenerator(db), new InventoryLedger(db));
        return (db, h, orderId);
    }

    private static CreateFinishedGoodsReceiptRequest Req(int orderId, decimal accepted, decimal defect = 0, string? reason = null, string? lot = "L001") =>
        new(orderId, TestData.K001, null, accepted, defect, reason, lot, null, null, null);

    [Fact(DisplayName = "CreateFinishedGoodsReceipt/UTCID01 – K001, FG-01 đạt 5, lô L001: tạo phiếu, FG-01 +5, PRODUCTION_RECEIPT")]
    [Trait("Function", Function)][Trait("UTCID", "CreateFinishedGoodsReceipt/UTCID01")][Trait("Type", "N")]
    public async Task UTCID01_ReceiveFinishedGoods_AddsStock()
    {
        var (db, h, orderId) = Arrange();
        var r = await h.Handle(new CreateFinishedGoodsReceiptCommand(Req(orderId, 5)), CancellationToken.None);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Single(db.TrxFinishedGoodsReceipts.AsNoTracking());
        Assert.Equal(5, TestData.StockOf(db, TestData.K001, ProductionData.Fg01));
        Assert.Equal(5, Assert.Single(OrderSetup.Cards(db, "PRODUCTION_RECEIPT")).Quantity);
    }

    [Fact(DisplayName = "CreateFinishedGoodsReceipt/UTCID02 – SL đạt 0 (validator)")]
    [Trait("Function", Function)][Trait("UTCID", "CreateFinishedGoodsReceipt/UTCID02")][Trait("Type", "A")]
    public void UTCID02_ZeroAccepted_ValidatorRejects()
    {
        var r = new CreateFinishedGoodsReceiptCommandValidator().Validate(new CreateFinishedGoodsReceiptCommand(Req(1, 0)));
        Assert.Contains("Số lượng đạt phải lớn hơn 0.", r.Errors.Select(e => e.ErrorMessage));
    }

    [Fact(DisplayName = "CreateFinishedGoodsReceipt/UTCID03 – không nhập số lô (validator)")]
    [Trait("Function", Function)][Trait("UTCID", "CreateFinishedGoodsReceipt/UTCID03")][Trait("Type", "A")]
    public void UTCID03_NoLot_ValidatorRejects()
    {
        var r = new CreateFinishedGoodsReceiptCommandValidator().Validate(new CreateFinishedGoodsReceiptCommand(Req(1, 5, lot: null)));
        Assert.Contains("Vui lòng nhập số lô thành phẩm.", r.Errors.Select(e => e.ErrorMessage));
    }

    [Fact(DisplayName = "CreateFinishedGoodsReceipt/UTCID04 – lỗi 1, không ghi lý do (validator)")]
    [Trait("Function", Function)][Trait("UTCID", "CreateFinishedGoodsReceipt/UTCID04")][Trait("Type", "A")]
    public void UTCID04_DefectWithoutReason_ValidatorRejects()
    {
        var r = new CreateFinishedGoodsReceiptCommandValidator().Validate(new CreateFinishedGoodsReceiptCommand(Req(1, 5, 1)));
        Assert.Contains("Vui lòng nhập lý do lỗi.", r.Errors.Select(e => e.ErrorMessage));
    }

    [Fact(DisplayName = "CreateFinishedGoodsReceipt/UTCID05 – đạt 11 (lệnh 10), chưa xác nhận")]
    [Trait("Function", Function)][Trait("UTCID", "CreateFinishedGoodsReceipt/UTCID05")][Trait("Type", "B")]
    public async Task UTCID05_AboveOrderWithoutConfirm_AsksConfirmation()
    {
        var (_, h, orderId) = Arrange();
        var r = await h.Handle(new CreateFinishedGoodsReceiptCommand(Req(orderId, 11)), CancellationToken.None);
        Assert.False(r.IsSuccess);
        Assert.StartsWith("[CONFIRM_EXCEED_PLAN] Số lượng thành phẩm sản xuất nhập kho lớn hơn số lượng trên lệnh sản xuất: FG-01,", r.Error);
    }

    [Fact(DisplayName = "CreateFinishedGoodsReceipt/UTCID06 – lệnh LSX0003 NOT_STARTED")]
    [Trait("Function", Function)][Trait("UTCID", "CreateFinishedGoodsReceipt/UTCID06")][Trait("Type", "A")]
    public async Task UTCID06_NotStartedOrder_ReturnsError()
    {
        var (_, h, orderId) = Arrange(ProductionOrderStatus.NotStarted);
        var r = await h.Handle(new CreateFinishedGoodsReceiptCommand(Req(orderId, 5)), CancellationToken.None);
        Assert.False(r.IsSuccess);
        Assert.Equal("Chỉ nhập thành phẩm cho lệnh đang sản xuất (đã xuất nguyên vật liệu, chưa hoàn thành).", r.Error);
    }
}
