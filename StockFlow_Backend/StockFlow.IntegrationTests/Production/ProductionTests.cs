using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Features.Production.DTOs;
using StockFlow.Domain.Entities;
using StockFlow.IntegrationTests.Infrastructure;
using StockFlow.IntegrationTests.Inventory;
using Xunit;
using Xunit.Abstractions;

namespace StockFlow.IntegrationTests.Production;

/// <summary>
/// Report 5.2 – sheet "BOM Lifecycle" (chức năng 33, UC-57, BR-06, BR-30), "Production Plan Approval" (34, UC-58, UC-59),
/// "Production Order and Material" (35, UC-44..48, BR-32, BR-35), "Finished Goods Receipt" (36, UC-49, UC-50, UC-61).
/// User T / Approver M = it.ops.k001 (đủ BOM_*, PROD_*, chức năng sản xuất, kho K001); Planner P = it.planner (lập / gửi duyệt kế hoạch).
/// Lệnh sản xuất chỉ lập được từ kế hoạch đã duyệt (POST /api/production/plans/{id}/orders) nên Arrange đi đủ luồng
/// BOM → kế hoạch → gửi duyệt → duyệt → lập lệnh bằng API thật.
/// </summary>
public sealed class ProductionTests : InventoryTestBase
{
    public ProductionTests(IntegrationTestFixture fixture, ITestOutputHelper output) : base(fixture, output) { }

    private static DateOnly Today => DateOnly.FromDateTime(VietnamTime.Now);

    // ───────────── Arrange qua API ─────────────

    private async Task<int> CreateBomAsync(HttpClient t, int productId, string version, bool activate, params (int MaterialId, decimal Qty, decimal Wastage)[] items)
    {
        var res = await PostAsync(t, "/api/production/boms",
            new SaveBomRequest(productId, null, version, null, items.Select(i => new SaveBomItemRequest(i.MaterialId, i.Qty, i.Wastage)).ToList(), activate));
        Assert.True(res.IsSuccess, $"Arrange BOM: {res.StatusCode} {res.Body}");
        var id = await QueryAsync(db => db.MstBoms.Where(b => b.ProductId == productId && b.Version == version).Select(b => b.BomId).SingleAsync());
        Step($"Arrange: BOM {version} của SP {productId} (id {id}){(activate ? " đang áp dụng" : "")}");
        return id;
    }

    private SaveProductionPlanRequest Plan(int productId, decimal qty) => new(
        $"Kế hoạch IT {Guid.NewGuid():N}"[..30], Today, Today.AddDays(30), null,
        new() { new SaveProductionPlanItemInput(productId, qty, Today, Today.AddDays(30), K001, null) }, null, K001);

    private async Task<int> CreatePlanAsync(HttpClient client, int productId, decimal qty)
    {
        var res = await PostAsync(client, "/api/production/plans", Plan(productId, qty));
        Assert.True(res.IsSuccess, $"Arrange kế hoạch: {res.StatusCode} {res.Body}");
        return await QueryAsync(db => db.TrxProductionPlans.OrderByDescending(p => p.ProductionPlanId).Select(p => p.ProductionPlanId).FirstAsync());
    }

    private async Task<int> ApprovedPlanAsync(HttpClient t, int productId, decimal qty)
    {
        var id = await CreatePlanAsync(t, productId, qty);
        var submit = await PostAsync(t, $"/api/production/plans/{id}/submit");
        Assert.True(submit.IsSuccess, $"Arrange gửi duyệt: {submit.StatusCode} {submit.Body}");
        var approve = await PostAsync(t, $"/api/production/plans/{id}/approve");
        Assert.True(approve.IsSuccess, $"Arrange duyệt: {approve.StatusCode} {approve.Body}");
        Step($"Arrange: kế hoạch id {id} APPROVED");
        return id;
    }

    private static SaveProductionOrderRequest OrderRequest(int productId, decimal qty) =>
        new(productId, qty, DateTime.UtcNow.AddDays(10), null, null, WarehouseId: K001, ConfirmShortage: true, ClientRequestId: Guid.NewGuid().ToString("N"));

    private async Task<ApiResult> CreateOrderFromPlanAsync(HttpClient t, int planId, int productId, decimal qty) =>
        await PostAsync(t, $"/api/production/plans/{planId}/orders", OrderRequest(productId, qty));

    /// <summary>LSX0001 NOT_STARTED: FG-01 × qty, BOM RM-01 × 2 / thành phẩm.</summary>
    private async Task<(HttpClient T, int OrderId, int BomId)> ArrangeOrderAsync(decimal qty = 10, decimal rm01Stock = 50)
    {
        await SetStockAsync(K001, Ids.Rm01, rm01Stock, 5_000m);
        var t = await ClientAsync(TestDataSeeder.OpsK001);
        var bom = await CreateBomAsync(t, Ids.Fg01, "1.0", true, (Ids.Rm01, 2m, 0m));
        var plan = await ApprovedPlanAsync(t, Ids.Fg01, 100);
        var res = await CreateOrderFromPlanAsync(t, plan, Ids.Fg01, qty);
        Assert.True(res.IsSuccess, $"Arrange lệnh sản xuất: {res.StatusCode} {res.Body}");
        var orderId = await QueryAsync(db => db.TrxProductionOrders.OrderByDescending(o => o.ProductionOrderId).Select(o => o.ProductionOrderId).FirstAsync());
        Step($"Arrange: lệnh sản xuất id {orderId} NOT_STARTED, FG-01 × {qty}");
        return (t, orderId, bom);
    }

    private Task<TrxProductionOrder> ProductionOrderAsync(int id) => QueryAsync(db => db.TrxProductionOrders.SingleAsync(o => o.ProductionOrderId == id));
    private Task<int> RequirementIdAsync(int orderId, int materialId) => QueryAsync(db =>
        db.TrxProductionMaterialRequirements.Where(r => r.ProductionOrderId == orderId && r.MaterialId == materialId).Select(r => r.RequirementId).SingleAsync());

    private async Task<ApiResult> IssueAsync(HttpClient t, int orderId, decimal qty, string? reason = null) =>
        await PostAsync(t, "/api/production/material-issues",
            new CreateMaterialIssueRequest(orderId, K001, false, reason, new() { new CreateMaterialIssueItemRequest(await RequirementIdAsync(orderId, Ids.Rm01), qty) }));

    private Task<List<TrxInventoryTransaction>> CardAsync(int productId, string type) => QueryAsync(db =>
        db.TrxInventoryTransactions.Where(t => t.ProductId == productId && t.TransactionType == type).ToListAsync());

    // ───────── BOM Lifecycle ─────────

    [Fact(DisplayName = "INT-BOM-33-01 | Create a BOM")]
    public async Task INT_BOM_33_01_CreateBom()
    {
        var t = await ClientAsync(TestDataSeeder.OpsK001);
        var res = await PostAsync(t, "/api/production/boms", new SaveBomRequest(Ids.Fg01, null, "1.0", null,
            new() { new SaveBomItemRequest(Ids.Rm01, 2m, 5m), new SaveBomItemRequest(Ids.Rm02, 1m, 0m) }, false));

        var check = new Checks(Output);
        check.Success(res);
        var bom = await QueryAsync(db => db.MstBoms.Include(b => b.DtlBomItems).FirstOrDefaultAsync(b => b.ProductId == Ids.Fg01));
        check.True("BOM được tạo với 2 NVL", bom != null && bom.DtlBomItems.Count == 2, $"{bom?.DtlBomItems.Count ?? 0} dòng");
        check.Assert();
    }

    [Fact(DisplayName = "INT-BOM-33-02 | Activate the BOM")]
    public async Task INT_BOM_33_02_ActivateBom()
    {
        var t = await ClientAsync(TestDataSeeder.OpsK001);
        var id = await CreateBomAsync(t, Ids.Fg01, "1.0", false, (Ids.Rm01, 2m, 5m), (Ids.Rm02, 1m, 0m));

        var res = await PostAsync(t, $"/api/production/boms/{id}/activate");

        var check = new Checks(Output);
        check.Success(res);
        var active = await QueryAsync(db => db.MstBoms.Where(b => b.ProductId == Ids.Fg01 && b.IsActive == true).Select(b => b.BomId).ToListAsync());
        check.True("FG-01 có BOM đang áp dụng là BOM này", active.Count == 1 && active[0] == id, $"[{string.Join(", ", active)}]");
        check.Assert();
    }

    [Fact(DisplayName = "INT-BOM-33-03 | Activate an empty BOM")]
    public async Task INT_BOM_33_03_ActivateEmptyBom()
    {
        var t = await ClientAsync(TestDataSeeder.OpsK001);
        // API không cho lưu BOM rỗng → BOM không có NVL được chuẩn bị trực tiếp trong database
        var id = 0;
        await ArrangeDbAsync(async db =>
        {
            var b = new MstBom { ProductId = Ids.Fg01, BomName = "BOM rỗng", Version = "0.9", IsActive = false, CreatedAt = VietnamTime.Now };
            db.MstBoms.Add(b);
            await db.SaveChangesAsync();
            id = b.BomId;
        });

        var res = await PostAsync(t, $"/api/production/boms/{id}/activate");

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", "Định mức phải có ít nhất một nguyên vật liệu.", res);
        check.Assert();
    }

    [Fact(DisplayName = "INT-BOM-33-04 | Duplicate version")]
    public async Task INT_BOM_33_04_DuplicateVersion()
    {
        var t = await ClientAsync(TestDataSeeder.OpsK001);
        await CreateBomAsync(t, Ids.Fg01, "1.0", false, (Ids.Rm01, 2m, 0m));

        var res = await PostAsync(t, "/api/production/boms", new SaveBomRequest(Ids.Fg01, null, "1.0", null, new() { new SaveBomItemRequest(Ids.Rm02, 1m, 0m) }, false));

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", "Thành phẩm đã có định mức phiên bản 1.0.", res);
        check.Assert();
    }

    [Fact(DisplayName = "INT-BOM-33-05 | Edit a used BOM")]
    public async Task INT_BOM_33_05_EditUsedBom()
    {
        var (t, _, bom) = await ArrangeOrderAsync(); // 1. Lệnh sản xuất dùng BOM

        var res = await PutAsync(t, $"/api/production/boms/{bom}", new SaveBomRequest(Ids.Fg01, null, "1.0", null, new() { new SaveBomItemRequest(Ids.Rm01, 3m, 0m) }, false));

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", "Định mức đã được dùng cho lệnh sản xuất nên không sửa được. Vui lòng tạo phiên bản mới.", res);
        check.Assert();
    }

    [Fact(DisplayName = "INT-BOM-33-06 | Delete a used BOM")]
    public async Task INT_BOM_33_06_DeleteUsedBom()
    {
        var (t, _, bom) = await ArrangeOrderAsync();

        var res = await SendAsync(t, HttpMethod.Delete, $"/api/production/boms/{bom}");

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", "Định mức đã được dùng cho lệnh sản xuất nên không hủy được. Bạn có thể ngừng áp dụng định mức.", res);
        check.Equal("BOM còn trong database", 1, await QueryAsync(db => db.MstBoms.CountAsync(b => b.BomId == bom)));
        check.Assert();
    }

    // ───────── Production Plan Approval ─────────

    private async Task<(HttpClient P, HttpClient M)> ArrangePlanUsersAsync()
    {
        var m = await ClientAsync(TestDataSeeder.OpsK001);
        await CreateBomAsync(m, Ids.Fg01, "1.0", true, (Ids.Rm01, 2m, 0m)); // FG-01 có BOM đang áp dụng
        return (await ClientAsync(TestDataSeeder.Planner), m);
    }

    private Task<TrxProductionPlan> PlanAsync(int id) => QueryAsync(db => db.TrxProductionPlans.SingleAsync(p => p.ProductionPlanId == id));

    [Fact(DisplayName = "INT-PLN-34-01 | Create a plan")]
    public async Task INT_PLN_34_01_CreatePlan()
    {
        var (p, _) = await ArrangePlanUsersAsync();
        var res = await PostAsync(p, "/api/production/plans", Plan(Ids.Fg01, 100));

        var check = new Checks(Output);
        check.Success(res);
        var plan = await QueryAsync(db => db.TrxProductionPlans.OrderByDescending(x => x.ProductionPlanId).FirstOrDefaultAsync());
        check.Equal("Kế hoạch DRAFT", "DRAFT", plan?.Status);
        check.Assert();
    }

    [Fact(DisplayName = "INT-PLN-34-02 | Submit")]
    public async Task INT_PLN_34_02_Submit()
    {
        var (p, _) = await ArrangePlanUsersAsync();
        var id = await CreatePlanAsync(p, Ids.Fg01, 100);

        var res = await PostAsync(p, $"/api/production/plans/{id}/submit");

        var check = new Checks(Output);
        check.Success(res);
        check.Equal("PENDING_APPROVAL", "PENDING_APPROVAL", (await PlanAsync(id)).Status);
        check.Assert();
    }

    [Fact(DisplayName = "INT-PLN-34-03 | Approve without permission")]
    public async Task INT_PLN_34_03_ApproveWithoutPermission()
    {
        var (p, _) = await ArrangePlanUsersAsync();
        var id = await CreatePlanAsync(p, Ids.Fg01, 100);
        Assert.True((await PostAsync(p, $"/api/production/plans/{id}/submit")).IsSuccess);

        var res = await PostAsync(p, $"/api/production/plans/{id}/approve");

        // v1.1 (BR-02, MSG04): chặn ở tầng phân quyền chức năng "Duyệt kế hoạch sản xuất" → 403
        var check = new Checks(Output);
        check.Equal("HTTP status", 403, res.StatusCode);
        check.Message("Thông báo", "Vai trò của bạn chưa được phân quyền chức năng Duyệt kế hoạch sản xuất.", res);
        check.Equal("Vẫn PENDING_APPROVAL", "PENDING_APPROVAL", (await PlanAsync(id)).Status);
        check.Assert();
    }

    [Fact(DisplayName = "INT-PLN-34-04 | Approve")]
    public async Task INT_PLN_34_04_Approve()
    {
        var (p, m) = await ArrangePlanUsersAsync();
        var id = await CreatePlanAsync(p, Ids.Fg01, 100);
        Assert.True((await PostAsync(p, $"/api/production/plans/{id}/submit")).IsSuccess);

        var res = await PostAsync(m, $"/api/production/plans/{id}/approve");

        var check = new Checks(Output);
        check.Success(res);
        var plan = await PlanAsync(id);
        check.Equal("APPROVED", "APPROVED", plan.Status);
        check.Equal("approved_by = M", (int?)Ids.UserId(TestDataSeeder.OpsK001), plan.ApprovedBy);
        check.Assert();
    }

    [Fact(DisplayName = "INT-PLN-34-05 | Reject with reason")]
    public async Task INT_PLN_34_05_RejectWithReason()
    {
        var (p, m) = await ArrangePlanUsersAsync();
        var id = await CreatePlanAsync(p, Ids.Fg01, 50); // 1. Một kế hoạch khác, gửi duyệt
        Assert.True((await PostAsync(p, $"/api/production/plans/{id}/submit")).IsSuccess);

        var res = await PostAsync(m, $"/api/production/plans/{id}/reject", new ProductionPlanReasonRequest("Thiếu NVL"));

        var check = new Checks(Output);
        check.Success(res);
        var plan = await PlanAsync(id);
        check.Equal("REJECTED", "REJECTED", plan.Status);
        check.True("Ghi chú có lý do", plan.Notes?.Contains("Thiếu NVL") == true, plan.Notes ?? "(null)");
        check.Assert();
    }

    [Fact(DisplayName = "INT-PLN-34-06 | BOM deactivated before approval")]
    public async Task INT_PLN_34_06_BomDeactivated()
    {
        var (p, m) = await ArrangePlanUsersAsync();
        var fg02Bom = await CreateBomAsync(m, Ids.Fg02, "1.0", true, (Ids.Rm02, 1m, 0m));
        var id = await CreatePlanAsync(p, Ids.Fg02, 20); // 1. Kế hoạch FG-02, gửi duyệt
        Assert.True((await PostAsync(p, $"/api/production/plans/{id}/submit")).IsSuccess);
        var off = await PostAsync(m, $"/api/production/boms/{fg02Bom}/deactivate"); // 2. Ngừng BOM FG-02
        Assert.True(off.IsSuccess, off.Body);

        var res = await PostAsync(m, $"/api/production/plans/{id}/approve"); // 3. Duyệt

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", "Không duyệt được kế hoạch. ...", res);
        check.Equal("Vẫn PENDING_APPROVAL", "PENDING_APPROVAL", (await PlanAsync(id)).Status);
        check.Assert();
    }

    [Fact(DisplayName = "INT-PLN-34-07 | Order from approved plan")]
    public async Task INT_PLN_34_07_OrderFromPlan()
    {
        var (_, m) = await ArrangePlanUsersAsync();
        var plan = await ApprovedPlanAsync(m, Ids.Fg01, 100);

        var res = await CreateOrderFromPlanAsync(m, plan, Ids.Fg01, 40);

        var check = new Checks(Output);
        check.Success(res);
        var order = await QueryAsync(db => db.TrxProductionOrders.FirstOrDefaultAsync(o => o.ProductionPlanId == plan));
        check.Equal("Lệnh NOT_STARTED", "NOT_STARTED", order?.Status);
        var reqs = order == null ? new List<TrxProductionMaterialRequirement>()
            : await QueryAsync(db => db.TrxProductionMaterialRequirements.Where(r => r.ProductionOrderId == order.ProductionOrderId).ToListAsync());
        check.True("Có dòng NVL theo BOM (RM-01 × 2 × 40 = 80)", reqs.Any(r => r.MaterialId == Ids.Rm01 && r.RequiredQty == 80m),
            string.Join(", ", reqs.Select(r => $"{r.MaterialId}:{r.RequiredQty}")));
        check.Assert();
    }

    // ───────── Production Order & Material Issue ─────────

    [Fact(DisplayName = "INT-MFG-35-01 | Issue materials")]
    public async Task INT_MFG_35_01_IssueMaterials()
    {
        var (t, order, _) = await ArrangeOrderAsync();
        var res = await IssueAsync(t, order, 20m);

        var check = new Checks(Output);
        check.Success(res);
        check.Equal("Tồn RM-01", 30m, await StockAsync(K001, Ids.Rm01));
        var card = await CardAsync(Ids.Rm01, "PRODUCTION_ISSUE");
        check.True("Thẻ kho PRODUCTION_ISSUE -20", card.Any(c => c.Quantity == -20m), Describe(card));
        check.Equal("Lệnh IN_PROGRESS", "IN_PROGRESS", (await ProductionOrderAsync(order)).Status);
        check.Assert();
    }

    [Fact(DisplayName = "INT-MFG-35-02 | Issue above requirement")]
    public async Task INT_MFG_35_02_IssueAboveRequirement()
    {
        var (t, order, _) = await ArrangeOrderAsync();
        var res = await IssueAsync(t, order, 25m);

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", "Số lượng xuất luỹ kế vượt nhu cầu theo định mức. Vui lòng nhập lý do.", res);
        check.Equal("Tồn RM-01 không đổi", 50m, await StockAsync(K001, Ids.Rm01));
        check.Assert();
    }

    [Fact(DisplayName = "INT-MFG-35-03 | Issue above stock")]
    public async Task INT_MFG_35_03_IssueAboveStock()
    {
        var (t, order, _) = await ArrangeOrderAsync(rm01Stock: 10); // 1. RM-01 tồn 10
        var res = await IssueAsync(t, order, 15m);

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", "Số lượng thực xuất không được âm và không được vượt tồn kho hiện có. (RM-01: tồn 10)", res);
        check.Equal("Tồn RM-01 không đổi", 10m, await StockAsync(K001, Ids.Rm01));
        check.Assert();
    }

    [Fact(DisplayName = "INT-MFG-35-04 | Cancel order after issue")]
    public async Task INT_MFG_35_04_CancelAfterIssue()
    {
        var (t, order, _) = await ArrangeOrderAsync();
        Assert.True((await IssueAsync(t, order, 20m)).IsSuccess);

        var res = await PostAsync(t, $"/api/production/orders/{order}/cancel");

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", "Chỉ huỷ được lệnh sản xuất chưa xuất nguyên vật liệu.", res);
        check.Equal("Lệnh vẫn IN_PROGRESS", "IN_PROGRESS", (await ProductionOrderAsync(order)).Status);
        check.Assert();
    }

    private async Task<int> OrderItemIdAsync(int orderId) => await QueryAsync(db =>
        db.DtlProductionOrderItems.Where(i => i.ProductionOrderId == orderId).Select(i => i.ProductionOrderItemId).SingleAsync());

    private async Task<ApiResult> ApproveOrderAsync(HttpClient t, int orderId, decimal accepted, decimal defect = 0, string? reason = null) =>
        await PostAsync(t, $"/api/production/orders/{orderId}/approve", new ApproveProductionOrderRequest(K001, null, null, null, null, null,
            new() { new ApproveProductionOrderLine(await OrderItemIdAsync(orderId), accepted, defect, reason) }));

    [Fact(DisplayName = "INT-MFG-35-05 | Issue to a completed order")]
    public async Task INT_MFG_35_05_IssueToCompletedOrder()
    {
        var (t, order, _) = await ArrangeOrderAsync();
        Assert.True((await IssueAsync(t, order, 20m)).IsSuccess);
        var done = await ApproveOrderAsync(t, order, 10m); // lệnh hoàn thành
        Assert.True(done.IsSuccess, done.Body);
        Assert.Equal("COMPLETED", (await ProductionOrderAsync(order)).Status);

        var res = await IssueAsync(t, order, 1m);

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", "Lệnh sản xuất đã hoàn thành hoặc đã huỷ nên không xuất được nguyên vật liệu.", res);
        check.Assert();
    }

    [Fact(DisplayName = "INT-MFG-35-06 | Active stocktake blocks issue")]
    public async Task INT_MFG_35_06_ActiveStocktakeBlocksIssue()
    {
        var (t, order, _) = await ArrangeOrderAsync();
        await ArrangeStocktakeAsync(t, K001, "DRAFT", (Ids.Rm01, 50m)); // 1. Phiếu kiểm DRAFT của K001 có RM-01

        var res = await IssueAsync(t, order, 20m);

        var check = new Checks(Output);
        check.Rejected(res);
        check.Contains("Bị chặn bởi khóa kiểm kho (BR-42)", "đang được kiểm kho", res);
        check.Equal("Tồn RM-01 không đổi", 50m, await StockAsync(K001, Ids.Rm01));
        check.Assert();
    }

    // ───────── Finished Goods Receipt & Order Completion ─────────

    private async Task<(HttpClient T, int OrderId)> ArrangeInProgressAsync()
    {
        var (t, order, _) = await ArrangeOrderAsync();
        Assert.True((await IssueAsync(t, order, 20m)).IsSuccess); // đã xuất NVL → IN_PROGRESS
        return (t, order);
    }

    private static CreateFinishedGoodsReceiptRequest Fgr(int orderId, decimal accepted, decimal defect = 0, string? reason = null, bool confirm = false) =>
        new(orderId, K001, null, accepted, defect, reason, "L001", null, null, null, null, confirm);

    [Fact(DisplayName = "INT-MFG-36-01 | Receive finished goods")]
    public async Task INT_MFG_36_01_ReceiveFinishedGoods()
    {
        var (t, order) = await ArrangeInProgressAsync();
        var res = await PostAsync(t, "/api/production/finished-goods-receipts", Fgr(order, 5m));

        var check = new Checks(Output);
        check.Success(res);
        check.Equal("Tồn FG-01 +5", 5m, await StockAsync(K001, Ids.Fg01));
        var card = await CardAsync(Ids.Fg01, "PRODUCTION_RECEIPT");
        check.True("Thẻ kho PRODUCTION_RECEIPT +5", card.Any(c => c.Quantity == 5m), Describe(card));
        check.Assert();
    }

    [Fact(DisplayName = "INT-MFG-36-02 | Defect without reason")]
    public async Task INT_MFG_36_02_DefectWithoutReason()
    {
        var (t, order) = await ArrangeInProgressAsync();
        var res = await PostAsync(t, "/api/production/finished-goods-receipts", Fgr(order, 4m, defect: 1m));

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", "Vui lòng nhập lý do lỗi.", res);
        check.Equal("Tồn FG-01 không đổi", 0m, await StockAsync(K001, Ids.Fg01));
        check.Assert();
    }

    [Fact(DisplayName = "INT-MFG-36-03 | Above order quantity")]
    public async Task INT_MFG_36_03_AboveOrderQuantity()
    {
        var (t, order) = await ArrangeInProgressAsync();
        var first = await PostAsync(t, "/api/production/finished-goods-receipts", Fgr(order, 11m));
        var confirmed = await PostAsync(t, "/api/production/finished-goods-receipts", Fgr(order, 11m, confirm: true));

        var check = new Checks(Output);
        check.Equal("Không xác nhận: HTTP status", 400, first.StatusCode);
        check.Contains("Không xác nhận: có lời nhắc [CONFIRM_EXCEED_PLAN]", "[CONFIRM_EXCEED_PLAN]", first);
        // v1.1 (BR-37 sửa 25/11): NVL đã xuất chỉ đủ 10 thành phẩm → có xác nhận vẫn bị chặn, phải xuất bổ sung NVL trước (MSG43)
        check.Equal("Có xác nhận: HTTP status", 400, confirmed.StatusCode);
        check.Contains("Có xác nhận: thông báo thiếu NVL", "NVL đã xuất chỉ đủ sản xuất tối đa 10", confirmed);
        check.Equal("Tồn FG-01 không đổi", 0m, await StockAsync(K001, Ids.Fg01));
        check.Assert();
    }

    [Fact(DisplayName = "INT-MFG-36-04 | Approve completion")]
    public async Task INT_MFG_36_04_ApproveCompletion()
    {
        var (t, order) = await ArrangeInProgressAsync();
        // v1.1 (BR-38): duyệt 5/10 và chọn Kết thúc lệnh kèm lý do → Manager đóng lệnh sớm
        var res = await PostAsync(t, $"/api/production/orders/{order}/approve", new ApproveProductionOrderRequest(K001, null, null, null, null, null,
            new() { new ApproveProductionOrderLine(await OrderItemIdAsync(order), 5m, 0m, null) }, FinishOrder: true, FinishReason: "Không sản xuất bù"));

        var check = new Checks(Output);
        check.Success(res);
        check.Equal("Lệnh COMPLETED", "COMPLETED", (await ProductionOrderAsync(order)).Status);
        check.Equal("Tồn FG-01 +5", 5m, await StockAsync(K001, Ids.Fg01));
        check.Assert();
    }

    // ───────── Active Stocktake Blocks Moves (BR-42): nhập thành phẩm / duyệt hoàn thành ─────────

    [Fact(DisplayName = "INT-STK-48-01 | Finished goods receipt of a counted item")]
    public async Task INT_STK_48_01_FinishedGoodsReceiptBlocked()
    {
        var (t, order) = await ArrangeInProgressAsync();
        await ArrangeStocktakeAsync(t, K001, "DRAFT", (Ids.Fg01, 0m)); // 1. Phiếu kiểm DRAFT của K001 có FG-01

        var res = await PostAsync(t, "/api/production/finished-goods-receipts", Fgr(order, 5m));

        var check = new Checks(Output);
        check.Rejected(res);
        check.Message("Thông báo khóa kiểm kho (MSG50)", "Mặt hàng FG-01 đang được kiểm kho (phiếu ...). Không thể xác nhận giao dịch cho đến khi phiếu kiểm kho kết thúc.", res);
        check.Equal("Tồn FG-01 không đổi", 0m, await StockAsync(K001, Ids.Fg01));
        check.Assert();
    }

    [Fact(DisplayName = "INT-STK-48-02 | Completion approval of a counted item")]
    public async Task INT_STK_48_02_CompletionApprovalBlocked()
    {
        var (t, order) = await ArrangeInProgressAsync();
        await ArrangeStocktakeAsync(t, K001, "DRAFT", (Ids.Fg01, 0m));

        var res = await ApproveOrderAsync(t, order, 10m);

        var check = new Checks(Output);
        check.Rejected(res);
        check.Message("Thông báo khóa kiểm kho (MSG50)", "Mặt hàng FG-01 đang được kiểm kho (phiếu ...). Không thể xác nhận giao dịch cho đến khi phiếu kiểm kho kết thúc.", res);
        check.Equal("Lệnh vẫn IN_PROGRESS", "IN_PROGRESS", (await ProductionOrderAsync(order)).Status);
        check.Equal("Tồn FG-01 không đổi", 0m, await StockAsync(K001, Ids.Fg01));
        check.Assert();
    }

    [Fact(DisplayName = "INT-MFG-36-06 | Approve part without finishing the order")]
    public async Task INT_MFG_36_06_ApprovePartKeepsInProgress()
    {
        var (t, order) = await ArrangeInProgressAsync();
        var res = await ApproveOrderAsync(t, order, 5m); // không chọn Kết thúc lệnh

        // BR-38: chưa đủ kế hoạch và không đóng sớm → lệnh vẫn Đang sản xuất, thành phẩm vẫn nhập kho
        var check = new Checks(Output);
        check.Success(res);
        check.Equal("Lệnh vẫn IN_PROGRESS", "IN_PROGRESS", (await ProductionOrderAsync(order)).Status);
        check.Equal("Tồn FG-01 +5", 5m, await StockAsync(K001, Ids.Fg01));
        check.Assert();
    }

    [Fact(DisplayName = "INT-MFG-36-05 | Approve an order not started")]
    public async Task INT_MFG_36_05_ApproveNotStarted()
    {
        var (t, order, _) = await ArrangeOrderAsync();
        var res = await ApproveOrderAsync(t, order, 5m);

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", "Chỉ duyệt hoàn thành lệnh đang sản xuất (đã xuất nguyên vật liệu).", res);
        check.Equal("Lệnh vẫn NOT_STARTED", "NOT_STARTED", (await ProductionOrderAsync(order)).Status);
        check.Assert();
    }
}
