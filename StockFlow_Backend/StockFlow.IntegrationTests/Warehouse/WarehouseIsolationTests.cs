using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Features.PurchaseOrders.DTOs;
using StockFlow.Application.Features.Purchases.DTOs;
using StockFlow.Application.Features.Admin.DTOs;
using StockFlow.IntegrationTests.Infrastructure;
using StockFlow.IntegrationTests.Inventory;
using Xunit;
using Xunit.Abstractions;

namespace StockFlow.IntegrationTests.Warehouse;

/// <summary>
/// Report 5.2 – sheet "Warehouse Data Isolation" (chức năng 27, BR-04, quyết định 10/11 + 12/11: Admin cũng chỉ thấy kho được tích)
/// và "Revoked Warehouse Access" (chức năng 28, quyết định 10/11: tài khoản được phép không có kho).
/// Chứng từ K001 / K002 được Admin lập bằng API thật. Quyền kho đổi bằng PUT /api/WarehousePermissions/{userId} (Admin).
/// Workbook ghi /api/purchaseorders; route thật là /api/purchase-orders (ghi nhận lệch tên endpoint).
/// </summary>
public sealed class WarehouseIsolationTests : InventoryTestBase
{
    public WarehouseIsolationTests(IntegrationTestFixture fixture, ITestOutputHelper output) : base(fixture, output) { }

    private sealed record Docs(int GrK001, int GrK002, int PoK001, int PoK002, int StK001, int StK002);

    /// <summary>Phiếu nhập (Phiếu tạm), phiếu đặt hàng nhập, phiếu kiểm của K001 và K002.</summary>
    private async Task<Docs> ArrangeDocsAsync()
    {
        await SetStockAsync(K001, Ids.PTest, 100, 10_000m);
        await SetStockAsync(K002, Ids.PTest, 100, 10_000m);
        var admin = await ClientAsync(TestDataSeeder.Admin);
        async Task<int> Po(int wh)
        {
            var r = await PostAsync(admin, "/api/purchase-orders", new CreatePurchaseOrderRequest(wh, Ids.Ncc01, null, "ORDERED", null,
                new() { new PurchaseOrderItemRequest(Ids.PTest, 10m, 10_000m) }));
            Assert.True(r.IsSuccess, $"Arrange PO: {r.StatusCode} {r.Body}");
            return await QueryAsync(db => db.TrxPurchaseOrders.Where(p => p.WarehouseId == wh).OrderByDescending(p => p.PoId).Select(p => p.PoId).FirstAsync());
        }
        return new Docs(
            await ArrangePurchaseAsync(admin, K001, "DRAFT", (Ids.PTest, 5m, 10_000m)),
            await ArrangePurchaseAsync(admin, K002, "DRAFT", (Ids.PTest, 5m, 10_000m)),
            await Po(K001), await Po(K002),
            await ArrangeStocktakeAsync(admin, K001, "DRAFT", (Ids.PTest, 100m)),
            await ArrangeStocktakeAsync(admin, K002, "DRAFT", (Ids.PTest, 100m)));
    }

    private async Task<ApiResult> SetWarehousesAsync(TestUser user, params int[] warehouseIds)
    {
        var admin = await ClientAsync(TestDataSeeder.Admin);
        var res = await PutAsync(admin, $"/api/WarehousePermissions/{Ids.UserId(user)}", new { warehouseIds, assignedWarehouses = Array.Empty<string>() });
        Step($"Admin đặt quyền kho {user.Username} = [{string.Join(", ", warehouseIds)}]: {res.StatusCode}");
        return res;
    }

    private static string Wh(IEnumerable<int> ids) => "[" + string.Join(", ", ids) + "]";

    // ───────── Warehouse Data Isolation ─────────

    [Fact(DisplayName = "INT-SEC-52-01 | List shows assigned warehouses only")]
    public async Task INT_SEC_52_01_ListAssignedOnly()
    {
        await ArrangeDocsAsync();
        var b = await ClientAsync(TestDataSeeder.OpsK001); // User B: chỉ K001

        var purchases = await GetAsync(b, "/api/purchases");
        var orders = await GetAsync(b, "/api/purchase-orders");
        var stocktakes = await GetAsync(b, "/api/stocktakes");

        var check = new Checks(Output);
        foreach (var (name, r) in new[] { ("phiếu nhập", purchases), ("đặt hàng nhập", orders), ("kiểm kho", stocktakes) })
        {
            var whs = WarehouseIdsOf(r).ToList();
            check.True($"Danh sách {name} chỉ có K001", r.IsSuccess && whs.Count > 0 && whs.All(w => w == K001), $"{r.StatusCode} kho {Wh(whs)}");
        }
        check.Assert();
    }

    [Fact(DisplayName = "INT-SEC-52-02 | Open a document of another warehouse")]
    public async Task INT_SEC_52_02_OpenOtherWarehouseDoc()
    {
        var docs = await ArrangeDocsAsync();
        var b = await ClientAsync(TestDataSeeder.OpsK001);
        var res = await GetAsync(b, $"/api/purchases/{docs.GrK002}");
        var check = new Checks(Output);
        check.Rejected(res);
        check.Message("Thông báo", "Bạn không có quyền truy cập phiếu nhập của kho này.", res);
        check.Assert();
    }

    [Fact(DisplayName = "INT-SEC-52-03 | Create a document in another warehouse")]
    public async Task INT_SEC_52_03_CreateInOtherWarehouse()
    {
        await ArrangeDocsAsync();
        var before = await QueryAsync(db => db.TrxGoodsReceipts.CountAsync());
        var b = await ClientAsync(TestDataSeeder.OpsK001);

        var res = await PostAsync(b, "/api/purchases", Purchase(K002, "DRAFT", (Ids.PTest, 5m, 10_000m)));

        var check = new Checks(Output);
        check.Message("Thông báo", "Bạn không có quyền nhập hàng vào kho này.", res);
        check.Equal("Không tạo phiếu nhập", before, await QueryAsync(db => db.TrxGoodsReceipts.CountAsync()));
        check.Assert();
    }

    [Fact(DisplayName = "INT-SEC-52-04 | Update a document of another warehouse")]
    public async Task INT_SEC_52_04_UpdateOtherWarehouseDoc()
    {
        var docs = await ArrangeDocsAsync();
        var b = await ClientAsync(TestDataSeeder.OpsK001);

        var res = await PutAsync(b, $"/api/purchases/{docs.GrK002}",
            new UpdatePurchaseRequest(Ids.Ncc01, null, null, "Sửa từ kho khác", new() { new CreatePurchaseItemRequest(Ids.PTest, 50m, 10_000m) }));

        var check = new Checks(Output);
        check.Rejected(res);
        var qty = await QueryAsync(db => db.DtlGoodsReceiptItems.Where(i => i.GrId == docs.GrK002).SumAsync(i => i.AcceptedQty ?? i.ReceivedQty ?? 0));
        check.Equal("Phiếu nhập K002 không đổi (SL 5)", 5m, qty);
        check.Assert();
    }

    [Fact(DisplayName = "INT-SEC-52-05 | Transfer: only the destination warehouse is assigned")]
    public async Task INT_SEC_52_05_OnlyDestinationAssigned()
    {
        await SetStockAsync(K001, Ids.PTest, 100, 10_000m);
        var a = await ClientAsync(TestDataSeeder.OpsK001K002);
        var draft = await ArrangeDraftTransferAsync(a, K001, K002, (Ids.PTest, 10m));
        var inTransit = await ArrangeInTransitTransferAsync(a, K001, K002, (Ids.PTest, 10m));
        var c = await ClientAsync(TestDataSeeder.OpsK002); // User C: chỉ K002

        var dispatch = await PostAsync(c, $"/api/transfers/{draft}/complete");
        var receive = await PostAsync(c, $"/api/transfers/{inTransit}/receive", Receive(null, (Ids.PTest, 10m)));

        var check = new Checks(Output);
        check.True("Xuất phiếu nháp từ K001 bị từ chối", !dispatch.IsSuccess, $"{dispatch.StatusCode} {dispatch.Message}");
        check.Success(receive);
        check.Equal("Phiếu đang chuyển tới K002 đã nhận", "RECEIVED", (await TransferAsync(inTransit)).Status);
        check.Assert();
    }

    [Fact(DisplayName = "INT-SEC-52-06 | Admin only sees ticked warehouses")]
    public async Task INT_SEC_52_06_AdminOnlyTicked()
    {
        var docs = await ArrangeDocsAsync();
        var set = await SetWarehousesAsync(TestDataSeeder.Admin, K001); // Admin chỉ tích K001
        var admin = await ClientAsync(TestDataSeeder.Admin);

        var list = await GetAsync(admin, "/api/purchases");
        var open = await GetAsync(admin, $"/api/purchases/{docs.GrK002}");

        var check = new Checks(Output);
        check.True("Admin tự đặt quyền kho K001", set.IsSuccess, $"{set.StatusCode} {set.Message}");
        var whs = WarehouseIdsOf(list).ToList();
        check.True("Chỉ chứng từ K001", list.IsSuccess && whs.Count > 0 && whs.All(w => w == K001), Wh(whs));
        check.Message("Mở phiếu K002 bị từ chối", "Bạn không có quyền truy cập phiếu nhập của kho này.", open);
        check.Assert();
    }

    [Fact(DisplayName = "INT-SEC-52-07 | Inactive warehouse is hidden")]
    public async Task INT_SEC_52_07_InactiveWarehouseHidden()
    {
        await ArrangeDocsAsync();
        var admin = await ClientAsync(TestDataSeeder.Admin);
        var off = await SendAsync(admin, HttpMethod.Patch, $"/api/warehouses/{K002}/toggle-status"); // 1. Admin ngừng K002
        var u = await ClientAsync(TestDataSeeder.OpsK001K002);

        var list = await GetAsync(u, "/api/purchases");

        var check = new Checks(Output);
        check.True("Admin ngừng hoạt động K002", off.IsSuccess, $"{off.StatusCode} {off.Message}");
        var whs = WarehouseIdsOf(list).ToList();
        check.True("Không còn chứng từ K002", list.IsSuccess && !whs.Contains(K002), Wh(whs));
        check.Assert();
    }

    // ───────── Revoked Warehouse Access ─────────

    [Fact(DisplayName = "INT-SEC-53-01 | Revoke one of two warehouses")]
    public async Task INT_SEC_53_01_RevokeOne()
    {
        await ArrangeDocsAsync();
        var u = await ClientAsync(TestDataSeeder.OpsK001K002);
        var revoke = await SetWarehousesAsync(TestDataSeeder.OpsK001K002, K001);

        var list = await GetAsync(u, "/api/purchases");

        var check = new Checks(Output);
        check.True("Admin thu hồi K002", revoke.IsSuccess, $"{revoke.StatusCode}");
        var whs = WarehouseIdsOf(list).ToList();
        check.True("Chỉ chứng từ K001", list.IsSuccess && whs.Count > 0 && whs.All(w => w == K001), Wh(whs));
        check.Assert();
    }

    [Fact(DisplayName = "INT-SEC-53-02 | Open a document after revocation")]
    public async Task INT_SEC_53_02_OpenAfterRevocation()
    {
        var docs = await ArrangeDocsAsync();
        var u = await ClientAsync(TestDataSeeder.OpsK001K002);
        Assert.True((await SetWarehousesAsync(TestDataSeeder.OpsK001K002, K001)).IsSuccess);

        var res = await GetAsync(u, $"/api/purchases/{docs.GrK002}");

        var check = new Checks(Output);
        check.Rejected(res);
        check.Assert();
    }

    [Fact(DisplayName = "INT-SEC-53-03 | Account with no warehouse is valid")]
    public async Task INT_SEC_53_03_AccountWithNoWarehouse()
    {
        var admin = await ClientAsync(TestDataSeeder.Admin);
        var user = TestDataSeeder.OpsK001K002;
        // 1. Admin lưu tài khoản (form Nhân viên) không chọn kho nào
        var save = await PutAsync(admin, $"/api/staff/{Ids.UserId(user)}", new UpdateStaffRequest
        {
            Name = "IT Nghiệp vụ K001+K002", Phone = "0900000000", Email = $"{user.Username}@it.test", Username = user.Username,
            Role = TestDataSeeder.OpsRole, AssignedWarehouses = new(),
        });
        // 2. Người dùng đăng nhập
        var login = await LoginAsync(user.Username, user.Password);

        var check = new Checks(Output);
        check.Success(save);
        var left = await QueryAsync(db => db.JncUserWarehouseAccesses.CountAsync(w => w.UserId == Ids.UserId(user)));
        check.Equal("Tài khoản lưu với 0 kho", 0, left);
        check.Equal("Đăng nhập thành công", 200, login.StatusCode);
        check.Assert();
    }

    [Fact(DisplayName = "INT-SEC-53-04 | Revoke the last warehouse: purchase list")]
    public async Task INT_SEC_53_04_RevokeLastPurchases()
    {
        await ArrangeDocsAsync();
        var u = await ClientAsync(TestDataSeeder.OpsK001); // chỉ K001
        var revoke = await SetWarehousesAsync(TestDataSeeder.OpsK001);

        var list = await GetAsync(u, "/api/purchases");

        var check = new Checks(Output);
        check.True("Admin thu hồi kho cuối cùng", revoke.IsSuccess, $"{revoke.StatusCode}");
        check.Equal("Danh sách rỗng", 0, list.Items.Count);
        Actual("Kho của các phiếu trả về", Wh(WarehouseIdsOf(list)));
        check.Assert();
    }

    [Fact(DisplayName = "INT-SEC-53-05 | Revoke the last warehouse: other lists")]
    public async Task INT_SEC_53_05_RevokeLastOtherLists()
    {
        await ArrangeDocsAsync();
        var a = await ClientAsync(TestDataSeeder.OpsK001K002);
        await ArrangeDraftTransferAsync(a, K001, K002, (Ids.PTest, 5m));
        var u = await ClientAsync(TestDataSeeder.OpsK001);
        Assert.True((await SetWarehousesAsync(TestDataSeeder.OpsK001)).IsSuccess);

        var check = new Checks(Output);
        foreach (var url in new[] { "/api/transfers", "/api/stocktakes", "/api/purchase-orders", "/api/purchasereturns" })
        {
            var r = await GetAsync(u, url);
            check.True($"{url} rỗng", r.IsSuccess && r.Items.Count == 0, $"{r.StatusCode}, {r.Items.Count} dòng");
        }
        check.Assert();
    }

    [Fact(DisplayName = "INT-SEC-53-06 | No warehouse: create without choosing one")]
    public async Task INT_SEC_53_06_NoWarehouseCreate()
    {
        var u = await ClientAsync(TestDataSeeder.OpsNoWarehouse); // PURCHASE_CREATE, không có kho
        var res = await PostAsync(u, "/api/purchase-orders",
            new CreatePurchaseOrderRequest(null, Ids.Ncc01, null, "ORDERED", null, new() { new PurchaseOrderItemRequest(Ids.PTest, 10m, 10_000m) }));

        var check = new Checks(Output);
        check.Message("Thông báo", "Bạn chưa được phân quyền kho nào.", res);
        check.Equal("Không tạo phiếu", 0, await QueryAsync(db => db.TrxPurchaseOrders.CountAsync()));
        check.Assert();
    }

    [Fact(DisplayName = "INT-SEC-53-07 | Warehouse granted again")]
    public async Task INT_SEC_53_07_GrantedAgain()
    {
        await ArrangeDocsAsync();
        var u = await ClientAsync(TestDataSeeder.OpsNoWarehouse); // Precondition: không có kho
        var grant = await SetWarehousesAsync(TestDataSeeder.OpsNoWarehouse, K001);

        var list = await GetAsync(u, "/api/purchases");

        var check = new Checks(Output);
        check.True("Admin cấp lại K001", grant.IsSuccess, $"{grant.StatusCode}");
        var whs = WarehouseIdsOf(list).ToList();
        check.True("Trả về chứng từ K001", list.IsSuccess && whs.Contains(K001) && whs.All(w => w == K001), Wh(whs));
        check.Assert();
    }
}
