using StockFlow.IntegrationTests.Infrastructure;
using Xunit;
using Xunit.Abstractions;

namespace StockFlow.IntegrationTests.Inventory.Stocktakes;

/// <summary>
/// Report 5.2 – sheet "Stocktake Balance" (chức năng 21, UC-39, UC-40) và "Cancel Balanced Stocktake" (chức năng 22, UC-39).
/// Precondition: User A có STOCK_CREATE, STOCK_UPDATE, chức năng kiểm kho, quyền kho K001 (it.ops.k001); P-TEST: K001 tồn 100, giá vốn 10.000.
/// User B (chỉ K002) = it.ops.k002. Bảng: trx_stocktakes, dtl_stocktake_items, trx_inventory_balances, trx_inventory_transactions (STOCKTAKE_*).
/// </summary>
public sealed class StocktakeTests : InventoryTestBase
{
    public StocktakeTests(IntegrationTestFixture fixture, ITestOutputHelper output) : base(fixture, output) { }

    private async Task<HttpClient> ArrangeAsync()
    {
        await SetStockAsync(K001, Ids.PTest, 100, 10_000m);
        return await ClientAsync(TestDataSeeder.OpsK001);
    }

    private async Task<(ApiResult Res, int Id)> SaveAsync(HttpClient a, string status, params (int, decimal)[] lines)
    {
        var res = await PostAsync(a, "/api/stocktakes", Stocktake(K001, status, lines));
        var id = res.IsSuccess ? res.Node!["summary"]!["stocktakeId"]!.GetValue<int>() : 0;
        return (res, id);
    }

    // ───────── Stocktake Balance ─────────

    [Fact(DisplayName = "INT-STK-46-01 | Save draft does not change stock")]
    public async Task INT_STK_46_01_SaveDraft()
    {
        var a = await ArrangeAsync();
        var (res, id) = await SaveAsync(a, "DRAFT", (Ids.PTest, 105m));

        var check = new Checks(Output);
        check.Success(res);
        check.Equal("Trạng thái", "DRAFT", id > 0 ? (await StocktakeAsync(id)).Status : null);
        check.Equal("Tồn K001 giữ 100", 100m, await StockAsync(K001, Ids.PTest));
        check.Equal("Không có thẻ kho", 0, await CountInventoryTransactionsAsync());
        check.Assert();
    }

    [Fact(DisplayName = "INT-STK-46-02 | Balance a surplus")]
    public async Task INT_STK_46_02_BalanceSurplus()
    {
        var a = await ArrangeAsync();
        var (res, id) = await SaveAsync(a, "BALANCED", (Ids.PTest, 105m));

        var check = new Checks(Output);
        check.Success(res);
        var st = id > 0 ? await StocktakeAsync(id) : null;
        check.Equal("Trạng thái", "BALANCED", st?.Status);
        check.Equal("Chênh lệch", 5m, st?.DtlStocktakeItems.Single().Discrepancy);
        check.Equal("Tồn K001", 105m, await StockAsync(K001, Ids.PTest));
        var card = await StocktakeCardAsync(id);
        check.True("Thẻ kho STOCKTAKE_IN +5", card.Count == 1 && card[0].TransactionType == "STOCKTAKE_IN" && card[0].Quantity == 5m, Describe(card));
        check.Assert();
    }

    [Fact(DisplayName = "INT-STK-46-03 | Balance a shortage")]
    public async Task INT_STK_46_03_BalanceShortage()
    {
        var a = await ArrangeAsync();
        var (res, id) = await SaveAsync(a, "BALANCED", (Ids.PTest, 97m));

        var check = new Checks(Output);
        check.Success(res);
        var st = id > 0 ? await StocktakeAsync(id) : null;
        check.Equal("Trạng thái", "BALANCED", st?.Status);
        check.Equal("Chênh lệch", -3m, st?.DtlStocktakeItems.Single().Discrepancy);
        check.Equal("Tồn K001", 97m, await StockAsync(K001, Ids.PTest));
        var card = await StocktakeCardAsync(id);
        check.True("Thẻ kho STOCKTAKE_OUT -3", card.Count == 1 && card[0].TransactionType == "STOCKTAKE_OUT" && card[0].Quantity == -3m, Describe(card));
        check.Assert();
    }

    [Fact(DisplayName = "INT-STK-46-04 | Boundary: actual equals system quantity")]
    public async Task INT_STK_46_04_NoDiscrepancy()
    {
        var a = await ArrangeAsync();
        var (res, id) = await SaveAsync(a, "BALANCED", (Ids.PTest, 100m));

        var check = new Checks(Output);
        check.Success(res);
        var st = id > 0 ? await StocktakeAsync(id) : null;
        check.Equal("Trạng thái", "BALANCED", st?.Status);
        check.Equal("Chênh lệch", 0m, st?.DtlStocktakeItems.Single().Discrepancy);
        check.Equal("Tồn K001", 100m, await StockAsync(K001, Ids.PTest));
        check.Equal("Không có thẻ kho", 0, (await StocktakeCardAsync(id)).Count);
        check.Assert();
    }

    [Fact(DisplayName = "INT-STK-46-05 | Boundary: actual is zero")]
    public async Task INT_STK_46_05_ActualZero()
    {
        var a = await ArrangeAsync();
        var (res, id) = await SaveAsync(a, "BALANCED", (Ids.PTest, 0m));

        var check = new Checks(Output);
        check.Success(res);
        check.Equal("Trạng thái", "BALANCED", id > 0 ? (await StocktakeAsync(id)).Status : null);
        check.Equal("Tồn K001", 0m, await StockAsync(K001, Ids.PTest));
        var card = await StocktakeCardAsync(id);
        check.True("Thẻ kho STOCKTAKE_OUT -100", card.Count == 1 && card[0].TransactionType == "STOCKTAKE_OUT" && card[0].Quantity == -100m, Describe(card));
        check.Assert();
    }

    [Fact(DisplayName = "INT-STK-46-06 | Several products with surplus, shortage and match")]
    public async Task INT_STK_46_06_SeveralProducts()
    {
        await SetStockAsync(K001, Ids.PA, 10);
        await SetStockAsync(K001, Ids.PB, 10);
        await SetStockAsync(K001, Ids.PC, 10);
        var a = await ClientAsync(TestDataSeeder.OpsK001);
        var (res, id) = await SaveAsync(a, "BALANCED", (Ids.PA, 12m), (Ids.PB, 8m), (Ids.PC, 10m));

        var check = new Checks(Output);
        check.Success(res);
        var card = await StocktakeCardAsync(id);
        Actual("Thẻ kho", Describe(card));
        check.Equal("P-A tồn 12", 12m, await StockAsync(K001, Ids.PA));
        check.True("P-A STOCKTAKE_IN +2", card.Any(c => c.ProductId == Ids.PA && c.TransactionType == "STOCKTAKE_IN" && c.Quantity == 2m), Describe(card));
        check.Equal("P-B tồn 8", 8m, await StockAsync(K001, Ids.PB));
        check.True("P-B STOCKTAKE_OUT -2", card.Any(c => c.ProductId == Ids.PB && c.TransactionType == "STOCKTAKE_OUT" && c.Quantity == -2m), Describe(card));
        check.Equal("P-C tồn 10", 10m, await StockAsync(K001, Ids.PC));
        check.Equal("P-C không có dòng thẻ kho", 0, card.Count(c => c.ProductId == Ids.PC));
        check.Assert();
    }

    [Fact(DisplayName = "INT-STK-46-07 | Negative actual quantity")]
    public async Task INT_STK_46_07_NegativeActual()
    {
        var a = await ArrangeAsync();
        var (res, _) = await SaveAsync(a, "BALANCED", (Ids.PTest, -1m));

        var check = new Checks(Output);
        check.Message("Thông báo", "Số lượng thực tế không được âm.", res);
        check.Equal("Tồn K001 không đổi", 100m, await StockAsync(K001, Ids.PTest));
        check.Assert();
    }

    [Fact(DisplayName = "INT-STK-46-08 | Balanced stocktake cannot be edited")]
    public async Task INT_STK_46_08_EditBalanced()
    {
        var a = await ArrangeAsync();
        var id = await ArrangeStocktakeAsync(a, K001, "BALANCED", (Ids.PTest, 105m));

        var res = await PutAsync(a, $"/api/stocktakes/{id}", Stocktake(K001, "BALANCED", (Ids.PTest, 110m)));

        var check = new Checks(Output);
        check.Message("Thông báo", "Chỉ sửa được phiếu kiểm kho ở trạng thái Phiếu tạm.", res);
        check.Equal("Tồn chỉ điều chỉnh một lần (105)", 105m, await StockAsync(K001, Ids.PTest));
        check.Assert();
    }

    [Fact(DisplayName = "INT-STK-46-09 | Variance without a reason")]
    public async Task INT_STK_46_09_VarianceWithoutReason()
    {
        var a = await ArrangeAsync();
        // Request không có lý do chênh lệch (SaveStocktakeRequest / StocktakeItemRequest không có trường lý do)
        var (res, id) = await SaveAsync(a, "BALANCED", (Ids.PTest, 105m));

        var check = new Checks(Output);
        check.Rejected(res);
        check.Equal("Tồn K001 giữ 100", 100m, await StockAsync(K001, Ids.PTest));
        Actual("Phiếu tạo ra (nếu có)", id > 0 ? (await StocktakeAsync(id)).Status : "(không có)");
        check.Assert();
    }

    [Fact(DisplayName = "INT-STK-46-10 | No access to the warehouse")]
    public async Task INT_STK_46_10_NoWarehouseAccess()
    {
        await SetStockAsync(K001, Ids.PTest, 100, 10_000m);
        var b = await ClientAsync(TestDataSeeder.OpsK002);

        var res = await PostAsync(b, "/api/stocktakes", Stocktake(K001, "DRAFT", (Ids.PTest, 105m)));

        var check = new Checks(Output);
        check.Message("Thông báo", "Bạn không có quyền kiểm kho tại Kho Tổng Gia Lâm.", res);
        check.Equal("Không tạo phiếu kiểm", 0, await QueryAsync(db => Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.CountAsync(db.TrxStocktakes)));
        check.Assert();
    }

    // ───────── Cancel Balanced Stocktake ─────────

    private async Task<(HttpClient A, int Id)> ArrangeBalancedAsync(decimal actual)
    {
        var a = await ArrangeAsync();
        return (a, await ArrangeStocktakeAsync(a, K001, "BALANCED", (Ids.PTest, actual)));
    }

    [Fact(DisplayName = "INT-STK-47-01 | Cancel a balanced surplus")]
    public async Task INT_STK_47_01_CancelSurplus()
    {
        var (a, id) = await ArrangeBalancedAsync(105m);
        var res = await PostAsync(a, $"/api/stocktakes/{id}/cancel");

        var check = new Checks(Output);
        check.Success(res);
        check.Equal("Trạng thái", "CANCELLED", (await StocktakeAsync(id)).Status);
        check.Equal("Tồn K001 trở lại 100", 100m, await StockAsync(K001, Ids.PTest));
        var card = await StocktakeCardAsync(id);
        check.True("Thẻ kho STOCKTAKE_CANCEL_OUT -5", card.Any(c => c.TransactionType == "STOCKTAKE_CANCEL_OUT" && c.Quantity == -5m), Describe(card));
        check.Assert();
    }

    [Fact(DisplayName = "INT-STK-47-02 | Cancel a balanced shortage")]
    public async Task INT_STK_47_02_CancelShortage()
    {
        var (a, id) = await ArrangeBalancedAsync(97m);
        var res = await PostAsync(a, $"/api/stocktakes/{id}/cancel");

        var check = new Checks(Output);
        check.Success(res);
        check.Equal("Trạng thái", "CANCELLED", (await StocktakeAsync(id)).Status);
        check.Equal("Tồn K001 trở lại 100", 100m, await StockAsync(K001, Ids.PTest));
        var card = await StocktakeCardAsync(id);
        check.True("Thẻ kho STOCKTAKE_CANCEL_IN +3", card.Any(c => c.TransactionType == "STOCKTAKE_CANCEL_IN" && c.Quantity == 3m), Describe(card));
        check.Assert();
    }

    [Fact(DisplayName = "INT-STK-47-03 | Cancel twice")]
    public async Task INT_STK_47_03_CancelTwice()
    {
        var (a, id) = await ArrangeBalancedAsync(105m);
        var first = await PostAsync(a, $"/api/stocktakes/{id}/cancel");
        Assert.True(first.IsSuccess, first.Body);

        var res = await PostAsync(a, $"/api/stocktakes/{id}/cancel");

        var check = new Checks(Output);
        check.Message("Thông báo", "Phiếu kiểm kho đã bị hủy trước đó.", res);
        check.Equal("Tồn chỉ hoàn một lần (100)", 100m, await StockAsync(K001, Ids.PTest));
        check.Assert();
    }

    [Fact(DisplayName = "INT-STK-47-04 | Cancel a draft stocktake")]
    public async Task INT_STK_47_04_CancelDraft()
    {
        var a = await ArrangeAsync();
        var id = await ArrangeStocktakeAsync(a, K001, "DRAFT", (Ids.PTest, 105m));

        var res = await PostAsync(a, $"/api/stocktakes/{id}/cancel");

        var check = new Checks(Output);
        check.Success(res);
        check.Equal("Trạng thái", "CANCELLED", (await StocktakeAsync(id)).Status);
        check.Equal("Tồn K001 giữ 100", 100m, await StockAsync(K001, Ids.PTest));
        check.Equal("Không có thẻ kho", 0, (await StocktakeCardAsync(id)).Count);
        check.Assert();
    }

    [Fact(DisplayName = "INT-STK-47-05 | Stock changed after balancing")]
    public async Task INT_STK_47_05_StockChangedAfterBalancing()
    {
        var (a, id) = await ArrangeBalancedAsync(105m);
        // 1. Bán 10 P-TEST từ K001 (API POS thật, tài khoản bán hàng K001)
        var s = await ClientAsync(TestDataSeeder.SalesK001);
        await ArrangeInvoiceAsync(s, Pos(WalkIn, K001, "CASH", 1_000_000m, new[] { (Ids.PTest, 10m, PTestPrice) }), "Bán 10 P-TEST");
        Assert.Equal(95m, await StockAsync(K001, Ids.PTest));

        var res = await PostAsync(a, $"/api/stocktakes/{id}/cancel");

        var check = new Checks(Output);
        check.Success(res);
        check.Equal("Trạng thái", "CANCELLED", (await StocktakeAsync(id)).Status);
        check.Equal("Tồn K001 = 95 − 5 = 90", 90m, await StockAsync(K001, Ids.PTest));
        check.Assert();
    }

    [Fact(DisplayName = "INT-STK-47-06 | No access to the warehouse")]
    public async Task INT_STK_47_06_NoWarehouseAccess()
    {
        var (_, id) = await ArrangeBalancedAsync(105m);
        var b = await ClientAsync(TestDataSeeder.OpsK002);

        var res = await PostAsync(b, $"/api/stocktakes/{id}/cancel");

        var check = new Checks(Output);
        check.Message("Thông báo", "Bạn không có quyền hủy phiếu kiểm của kho này.", res);
        check.Equal("Vẫn BALANCED", "BALANCED", (await StocktakeAsync(id)).Status);
        check.Equal("Tồn K001 giữ 105", 105m, await StockAsync(K001, Ids.PTest));
        check.Assert();
    }
}
