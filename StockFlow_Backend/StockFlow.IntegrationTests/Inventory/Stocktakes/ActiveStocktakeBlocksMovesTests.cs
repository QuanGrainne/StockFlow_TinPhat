using StockFlow.Application.Features.PurchaseReturns.DTOs;
using StockFlow.IntegrationTests.Infrastructure;
using Xunit;
using Xunit.Abstractions;

namespace StockFlow.IntegrationTests.Inventory.Stocktakes;

/// <summary>
/// Report 5.2 – sheet "Active Stocktake Blocks Moves" (chức năng 23, BR-42 theo Report 3 bản 24/11/2026).
/// BR-42: khi phiếu kiểm kho của một kho đang ở Phiếu tạm, không được xác nhận xuất NVL, nhập thành phẩm,
/// duyệt hoàn thành và xuất hủy các mặt hàng trong phiếu tại kho đó.
/// - 48-01, 48-02 (nhập thành phẩm, duyệt hoàn thành) nằm trong ProductionTests vì cần lệnh sản xuất.
///   Xuất NVL và xuất hủy đã có ở INT-MFG-35-06, INT-DSP-29-07.
/// - 48-03…06: giao dịch ngoài phạm vi BR-42 (nhập hàng, bán POS, chuyển kho, trả NCC) vẫn thực hiện được.
/// - 48-07…10: xuất hủy (giao dịch bị khóa) vẫn làm được khi hàng / kho nằm ngoài phiếu, hoặc phiếu đã kết thúc.
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

    private async Task<Checks> ContinuesAsync(ApiResult res, decimal expectedK001)
    {
        var check = new Checks(Output);
        check.Success(res);
        check.Equal("Tồn K001", expectedK001, await StockAsync(K001, Ids.PTest));
        return check;
    }

    [Fact(DisplayName = "INT-STK-48-03 | Goods receipt of a counted item continues")]
    public async Task INT_STK_48_03_GoodsReceiptContinues()
    {
        var a = await ArrangeAsync();
        await ActiveStocktakeAsync(a);

        var res = await PostAsync(a, "/api/purchases", Purchase(K001, "COMPLETED", (Ids.PTest, 5m, 10_000m)));

        (await ContinuesAsync(res, 105m)).Assert();
    }

    [Fact(DisplayName = "INT-STK-48-04 | POS sale of a counted item continues")]
    public async Task INT_STK_48_04_PosSaleContinues()
    {
        var a = await ArrangeAsync();
        await ActiveStocktakeAsync(a);

        var res = await PostAsync(a, "/api/orders/pos", Pos(WalkIn, K001, "CASH", 100_000m, new[] { (Ids.PTest, 1m, PTestPrice) }));

        (await ContinuesAsync(res, 99m)).Assert();
    }

    [Fact(DisplayName = "INT-STK-48-05 | Transfer dispatch of a counted item continues")]
    public async Task INT_STK_48_05_TransferDispatchContinues()
    {
        var a = await ArrangeAsync();
        var id = await ArrangeDraftTransferAsync(a, K001, K002, (Ids.PTest, 10m));
        await ActiveStocktakeAsync(a);

        var res = await PostAsync(a, $"/api/transfers/{id}/complete");

        (await ContinuesAsync(res, 90m)).Assert();
    }

    [Fact(DisplayName = "INT-STK-48-06 | Purchase return of a counted item continues")]
    public async Task INT_STK_48_06_PurchaseReturnContinues()
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

        (await ContinuesAsync(res, stock - 2m)).Assert();
    }

    [Fact(DisplayName = "INT-STK-48-07 | Item outside the stocktake continues")]
    public async Task INT_STK_48_07_ItemOutsideContinues()
    {
        var a = await ArrangeAsync();
        await ActiveStocktakeAsync(a);

        var res = await PostAsync(a, "/api/disposals", Disposal(K001, "COMPLETED", "Hàng vỡ", (Ids.POther, 1m)));

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

        var res = await PostAsync(a, "/api/disposals", Disposal(K002, "COMPLETED", "Hàng vỡ", (Ids.PTest, 1m)));

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

        var res = await PostAsync(a, "/api/disposals", Disposal(K001, "COMPLETED", "Hàng vỡ", (Ids.PTest, 1m)));

        (await ContinuesAsync(res, 99m)).Assert();
    }

    [Fact(DisplayName = "INT-STK-48-10 | Moves are allowed after cancelling")]
    public async Task INT_STK_48_10_AllowedAfterCancelling()
    {
        var a = await ArrangeAsync();
        var id = await ActiveStocktakeAsync(a);
        var cancel = await PostAsync(a, $"/api/stocktakes/{id}/cancel"); // 1. Cancel
        Assert.True(cancel.IsSuccess, cancel.Body);

        var res = await PostAsync(a, "/api/disposals", Disposal(K001, "COMPLETED", "Hàng vỡ", (Ids.PTest, 1m)));

        (await ContinuesAsync(res, 99m)).Assert();
    }
}
