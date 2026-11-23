using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using StockFlow.IntegrationTests.Infrastructure;
using Xunit;
using Xunit.Abstractions;

namespace StockFlow.IntegrationTests.Sales.Pos;

/// <summary>
/// Report 5.2 – sheet "POS Stock Policy and Reserved" (chức năng 10, UC-73, Order settings A2/A3).
/// Precondition chung: User S có SALES_CREATE, quyền kho K001; tồn P-TEST tại K001 = 10; một đơn đặt hàng đang mở giữ 6;
/// thiết lập không cho bán âm kho (B1) và không cho bán hàng đang tạm giữ (A3).
/// Bảng: mst_order_settings, trx_orders (BOOKING), dtl_order_items, trx_inventory_balances.
/// </summary>
public sealed class PosStockPolicyTests : SalesTestBase
{
    public PosStockPolicyTests(IntegrationTestFixture fixture, ITestOutputHelper output) : base(fixture, output) { }

    private async Task<HttpClient> ArrangeAsync()
    {
        await SetStockAsync(K001, Ids.PTest, 10);
        await ArrangeDbAsync(async db =>
        {
            var st = await db.MstOrderSettings.SingleAsync(x => x.SettingId == 1);
            st.AllowNegativeStockSale = false;    // không cho bán khi hết hàng / âm kho
            st.AllowSellingReservedStock = false; // không cho bán hàng đang tạm giữ
            Step("Thiết lập: AllowNegativeStockSale = false, AllowSellingReservedStock = false");
        });
        var s = await ClientAsync(TestDataSeeder.SalesK001);
        await ArrangeBookingAsync(s, Booking(Ids.KhAbc, K001, new[] { (Ids.PTest, 6m, PTestPrice) }), "Đơn đặt hàng đang mở giữ P-TEST x6");
        return s;
    }

    [Fact(DisplayName = "INT-POS-10-01 | Sell within available")]
    public async Task INT_POS_10_01_SellWithinAvailable()
    {
        var s = await ArrangeAsync();

        var res = await PostAsync(s, "/api/orders/pos", Pos(WalkIn, K001, "CASH", 400_000m, new[] { (Ids.PTest, 4m, PTestPrice) }));

        var check = new Checks(Output);
        check.Success(res);
        check.Equal("Hóa đơn COMPLETED", "COMPLETED", (await OrderAsync(res.IsSuccess ? res.Int("orderId") : 0))?.Status);
        check.Equal("Tồn K001", 6m, await StockAsync(K001, Ids.PTest));
        check.Assert();
    }

    [Fact(DisplayName = "INT-POS-10-02 | Sell reserved quantity")]
    public async Task INT_POS_10_02_SellReservedQuantity()
    {
        var s = await ArrangeAsync();

        var res = await PostAsync(s, "/api/orders/pos", Pos(WalkIn, K001, "CASH", 500_000m, new[] { (Ids.PTest, 5m, PTestPrice) }));

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo A3", "... Tồn khả dụng: 4, Yêu cầu xuất: 5 ...", res.Message);
        check.Contains("Mã A3", "(A3)", res.Message);
        check.Equal("Tồn K001 không đổi", 10m, await StockAsync(K001, Ids.PTest));
        check.Assert();
    }

    [Fact(DisplayName = "INT-POS-10-03 | Out of stock")]
    public async Task INT_POS_10_03_OutOfStock()
    {
        var s = await ArrangeAsync();
        await SetStockAsync(K001, Ids.PTest, 0); // 1. Stock 0

        var res = await PostAsync(s, "/api/orders/pos", Pos(WalkIn, K001, "CASH", 100_000m, new[] { (Ids.PTest, 1m, PTestPrice) }));

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Contains("Thông báo A2 (hết hàng tồn kho)", "(A2)", res.Message);
        check.Equal("Tồn K001 không đổi", 0m, await StockAsync(K001, Ids.PTest));
        check.Equal("Không tạo hóa đơn", 0, await CountOrdersAsync("INVOICE"));
        check.Assert();
    }

    [Fact(DisplayName = "INT-POS-10-04 | Reserved quantity API")]
    public async Task INT_POS_10_04_ReservedQuantityApi()
    {
        var s = await ArrangeAsync();

        var res = await GetAsync(s, $"/api/sales-bookings/reserved?warehouseId={K001}");

        var check = new Checks(Output);
        check.Success(res);
        var reserved = res.Node?[Ids.PTest.ToString()]?.GetValue<decimal>();
        check.Equal("P-TEST reserved", 6m, reserved);
        check.Assert();
    }

    [Fact(DisplayName = "INT-POS-10-05 | Setting allows out-of-stock")]
    public async Task INT_POS_10_05_SettingAllowsOutOfStock()
    {
        var s = await ArrangeAsync();
        var admin = await ClientAsync(TestDataSeeder.Admin);

        // 1. Admin cho phép bán khi hết hàng (B1) qua /api/settings/orders: đọc thiết lập hiện tại, đổi 1 trường, lưu lại
        var current = await GetAsync(admin, "/api/settings/orders");
        Assert.True(current.IsSuccess, current.Body);
        var body = (JsonObject)current.Node!;
        body["allowNegativeStockSale"] = true;
        var put = await PutAsync(admin, "/api/settings/orders", body);

        // 2. POST pos P-TEST x12
        var res = await PostAsync(s, "/api/orders/pos", Pos(WalkIn, K001, "CASH", 1_200_000m, new[] { (Ids.PTest, 12m, PTestPrice) }));

        var check = new Checks(Output);
        check.True("Admin lưu thiết lập thành công", put.IsSuccess, $"{put.StatusCode} {put.Body}");
        check.Equal("Thiết lập trong DB", true, await QueryAsync(async db => (await db.MstOrderSettings.SingleAsync(x => x.SettingId == 1)).AllowNegativeStockSale));
        check.Success(res);
        check.Equal("Hóa đơn COMPLETED", "COMPLETED", (await OrderAsync(res.IsSuccess ? res.Int("orderId") : 0))?.Status);
        check.Equal("Tồn K001", -2m, await StockAsync(K001, Ids.PTest));
        check.Assert();
    }
}
