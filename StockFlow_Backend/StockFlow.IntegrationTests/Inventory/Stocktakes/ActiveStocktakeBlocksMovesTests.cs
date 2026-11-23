using StockFlow.Application.Features.PurchaseReturns.DTOs;
using StockFlow.Application.Features.Purchases.DTOs;
using StockFlow.IntegrationTests.Infrastructure;
using Xunit;
using Xunit.Abstractions;

namespace StockFlow.IntegrationTests.Inventory.Stocktakes;

/// <summary>
/// Report 5.2 – sheet "Active Stocktake Blocks Moves" (chức năng 23, BR-42 theo workbook).
/// Precondition: User A (K001) có quyền kho; phiếu kiểm P-TEST tại K001 đang mở (Phiếu tạm, chưa cân bằng / hủy).
/// 48-01…06 kiểm theo Expected của workbook (bị chặn). Report 3 hiện hành BR-42 chỉ chặn xuất NVL, nhập thành phẩm,
/// duyệt hoàn thành, xuất hủy (StocktakeGuard) → các ca này thuộc nhóm "cần quyết định", không đánh dấu Passed khi lệch.
/// User A dùng it.ops.k001k002 (cần cả quyền nhập hàng / bán hàng / chuyển kho mà Precondition không ghi).
/// </summary>
public sealed class ActiveStocktakeBlocksMovesTests : InventoryTestBase
{
    public ActiveStocktakeBlocksMovesTests(IntegrationTestFixture fixture, ITestOutputHelper output) : base(fixture, output) { }

    private async Task<HttpClient> ArrangeAsync()
    {
        await SetStockAsync(K001, Ids.PTest, 100, 10_000m);
        await SetStockAsync(K002, Ids.PTest, 100, 10_000m);
        await SetStockAsync(K001, Ids.POther, 100, 30_000m);
        return await ClientAsync(TestDataSeeder.OpsK001K002);
    }

    private Task<int> ActiveStocktakeAsync(HttpClient a) => ArrangeStocktakeAsync(a, K001, "DRAFT", (Ids.PTest, 100m));

    private async Task<Checks> BlockedAsync(ApiResult res, decimal expectedK001)
    {
        var check = new Checks(Output);
        check.Rejected(res);
        // Bị từ chối phải là do phiếu kiểm đang mở, không phải lý do khác (tránh Passed giả)
        check.Contains("Lý do từ chối là hàng đang kiểm kho", "kiểm kho", res);
        check.Equal("Tồn K001 không đổi", expectedK001, await StockAsync(K001, Ids.PTest));
        return check;
    }

    [Fact(DisplayName = "INT-STK-48-01 | Goods receipt of a counted item")]
    public async Task INT_STK_48_01_GoodsReceipt()
    {
        var a = await ArrangeAsync();
        await ActiveStocktakeAsync(a);

        var res = await PostAsync(a, "/api/purchases", Purchase(K001, "COMPLETED", (Ids.PTest, 5m, 10_000m)));

        (await BlockedAsync(res, 100m)).Assert();
    }

    [Fact(DisplayName = "INT-STK-48-02 | Completing a draft receipt of a counted item")]
    public async Task INT_STK_48_02_CompleteDraftReceipt()
    {
        var a = await ArrangeAsync();
        var gr = await ArrangePurchaseAsync(a, K001, "DRAFT", (Ids.PTest, 5m, 10_000m));
        await ActiveStocktakeAsync(a);

        var res = await SendAsync(a, HttpMethod.Patch, $"/api/purchases/{gr}/complete", new CompletePurchaseRequest());

        (await BlockedAsync(res, 100m)).Assert();
    }

    [Fact(DisplayName = "INT-STK-48-03 | POS sale of a counted item")]
    public async Task INT_STK_48_03_PosSale()
    {
        var a = await ArrangeAsync();
        await ActiveStocktakeAsync(a);

        var res = await PostAsync(a, "/api/orders/pos", Pos(WalkIn, K001, "CASH", 100_000m, new[] { (Ids.PTest, 1m, PTestPrice) }));

        (await BlockedAsync(res, 100m)).Assert();
    }

    [Fact(DisplayName = "INT-STK-48-04 | Transfer dispatch of a counted item")]
    public async Task INT_STK_48_04_TransferDispatch()
    {
        var a = await ArrangeAsync();
        var id = await ArrangeDraftTransferAsync(a, K001, K002, (Ids.PTest, 10m));
        await ActiveStocktakeAsync(a);

        var res = await PostAsync(a, $"/api/transfers/{id}/complete");

        (await BlockedAsync(res, 100m)).Assert();
    }

    [Fact(DisplayName = "INT-STK-48-05 | Transfer receipt of a counted item")]
    public async Task INT_STK_48_05_TransferReceipt()
    {
        var a = await ArrangeAsync();
        var id = await ArrangeInTransitTransferAsync(a, K002, K001, (Ids.PTest, 10m)); // đang chuyển về K001
        await ActiveStocktakeAsync(a);

        var res = await PostAsync(a, $"/api/transfers/{id}/receive", Receive(null, (Ids.PTest, 10m)));

        (await BlockedAsync(res, 100m)).Assert();
    }

    [Fact(DisplayName = "INT-STK-48-06 | Purchase return of a counted item")]
    public async Task INT_STK_48_06_PurchaseReturn()
    {
        var a = await ArrangeAsync();
        var gr = await ArrangePurchaseAsync(a, K001, "COMPLETED", (Ids.PTest, 10m, 10_000m)); // phiếu nhập để trả hàng
        var stock = await StockAsync(K001, Ids.PTest);
        var grItemId = await QueryAsync(db => Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions
            .SingleAsync(db.DtlGoodsReceiptItems.Where(i => i.GrId == gr).Select(i => i.GrItemId)));
        await ArrangeStocktakeAsync(a, K001, "DRAFT", (Ids.PTest, stock));

        var res = await PostAsync(a, "/api/purchasereturns",
            new SavePurchaseReturnRequest(Ids.Ncc01, new() { new PurchaseReturnItemRequest(Ids.PTest, 2m, 10_000m, grItemId) },
                WarehouseId: K001, GrId: gr, Status: "COMPLETED"));

        (await BlockedAsync(res, stock)).Assert();
    }

    [Fact(DisplayName = "INT-STK-48-07 | Item outside the stocktake continues")]
    public async Task INT_STK_48_07_ItemOutsideContinues()
    {
        var a = await ArrangeAsync();
        await ActiveStocktakeAsync(a);

        var res = await PostAsync(a, "/api/orders/pos", Pos(WalkIn, K001, "CASH", 50_000m, new[] { (Ids.POther, 1m, POtherPrice) }));

        var check = new Checks(Output);
        check.Success(res);
        check.Equal("Tồn P-OTHER giảm", 99m, await StockAsync(K001, Ids.POther));
        check.Assert();
    }

    [Fact(DisplayName = "INT-STK-48-08 | Same item in another warehouse continues")]
    public async Task INT_STK_48_08_OtherWarehouseContinues()
    {
        var a = await ArrangeAsync();
        await ActiveStocktakeAsync(a);

        var res = await PostAsync(a, "/api/orders/pos", Pos(WalkIn, K002, "CASH", 100_000m, new[] { (Ids.PTest, 1m, PTestPrice) }));

        var check = new Checks(Output);
        check.Success(res);
        check.Equal("Tồn K002 giảm", 99m, await StockAsync(K002, Ids.PTest));
        check.Assert();
    }

    [Fact(DisplayName = "INT-STK-48-09 | Moves are allowed after balancing")]
    public async Task INT_STK_48_09_AllowedAfterBalancing()
    {
        var a = await ArrangeAsync();
        var id = await ActiveStocktakeAsync(a);
        var balance = await PutAsync(a, $"/api/stocktakes/{id}", Stocktake(K001, "BALANCED", (Ids.PTest, 100m))); // 1. Balance
        Assert.True(balance.IsSuccess, balance.Body);

        var res = await PostAsync(a, "/api/orders/pos", Pos(WalkIn, K001, "CASH", 100_000m, new[] { (Ids.PTest, 1m, PTestPrice) }));

        var check = new Checks(Output);
        check.Success(res);
        check.Assert();
    }

    [Fact(DisplayName = "INT-STK-48-10 | Moves are allowed after cancelling")]
    public async Task INT_STK_48_10_AllowedAfterCancelling()
    {
        var a = await ArrangeAsync();
        var id = await ActiveStocktakeAsync(a);
        var cancel = await PostAsync(a, $"/api/stocktakes/{id}/cancel"); // 1. Cancel
        Assert.True(cancel.IsSuccess, cancel.Body);

        var res = await PostAsync(a, "/api/orders/pos", Pos(WalkIn, K001, "CASH", 100_000m, new[] { (Ids.PTest, 1m, PTestPrice) }));

        var check = new Checks(Output);
        check.Success(res);
        check.Assert();
    }
}
