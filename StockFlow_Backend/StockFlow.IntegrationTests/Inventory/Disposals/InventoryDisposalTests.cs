using Microsoft.EntityFrameworkCore;
using StockFlow.IntegrationTests.Infrastructure;
using Xunit;
using Xunit.Abstractions;

namespace StockFlow.IntegrationTests.Inventory.Disposals;

/// <summary>
/// Report 5.2 – sheet "Inventory Disposal" (chức năng 29, UC-43, BR-42).
/// Precondition: User A có STOCK_CREATE, STOCK_UPDATE, quyền kho K001 (it.ops.k001); P-TEST tồn K001 = 10.
/// Bảng: trx_inventory_disposals, dtl_disposal_items, trx_inventory_balances, trx_inventory_transactions (DISPOSAL / DISPOSAL_CANCEL).
/// </summary>
public sealed class InventoryDisposalTests : InventoryTestBase
{
    public InventoryDisposalTests(IntegrationTestFixture fixture, ITestOutputHelper output) : base(fixture, output) { }

    private async Task<HttpClient> ArrangeAsync()
    {
        await SetStockAsync(K001, Ids.PTest, 10, 10_000m);
        return await ClientAsync(TestDataSeeder.OpsK001);
    }

    private static int IdOf(ApiResult r) => r.Node!["summary"]!["disposalId"]!.GetValue<int>();

    private async Task<int> ArrangeDisposalAsync(HttpClient a, string status, string? reason, decimal qty)
    {
        var res = await PostAsync(a, "/api/disposals", Disposal(K001, status, reason, (Ids.PTest, qty)));
        Assert.True(res.IsSuccess, $"Arrange: phiếu xuất hủy thất bại {res.StatusCode} {res.Body}");
        return IdOf(res);
    }

    private Task<StockFlow.Domain.Entities.TrxInventoryDisposal> DisposalAsync(int id) =>
        QueryAsync(db => db.TrxInventoryDisposals.SingleAsync(d => d.DisposalId == id));

    [Fact(DisplayName = "INT-DSP-29-01 | Save as draft")]
    public async Task INT_DSP_29_01_SaveDraft()
    {
        var a = await ArrangeAsync();
        var res = await PostAsync(a, "/api/disposals", Disposal(K001, "DRAFT", null, (Ids.PTest, 3m)));

        var check = new Checks(Output);
        check.Success(res);
        var d = res.IsSuccess ? await DisposalAsync(IdOf(res)) : null;
        check.True("Mã XHxxxx", d?.DisposalCode?.StartsWith("XH") == true, d?.DisposalCode ?? "(null)");
        check.Equal("Trạng thái", "DRAFT", d?.Status);
        check.Equal("Tồn giữ 10", 10m, await StockAsync(K001, Ids.PTest));
        check.Assert();
    }

    [Fact(DisplayName = "INT-DSP-29-02 | Complete the note")]
    public async Task INT_DSP_29_02_Complete()
    {
        var a = await ArrangeAsync();
        var id = await ArrangeDisposalAsync(a, "DRAFT", null, 3m);

        var res = await PutAsync(a, $"/api/disposals/{id}", Disposal(K001, "COMPLETED", "Hàng vỡ", (Ids.PTest, 3m)));

        var check = new Checks(Output);
        check.Success(res);
        check.Equal("Trạng thái", "COMPLETED", (await DisposalAsync(id)).Status);
        check.Equal("Tồn 7", 7m, await StockAsync(K001, Ids.PTest));
        var card = await DisposalCardAsync(id);
        check.True("Thẻ kho DISPOSAL -3", card.Any(c => c.TransactionType == "DISPOSAL" && c.Quantity == -3m), Describe(card));
        check.Assert();
    }

    [Fact(DisplayName = "INT-DSP-29-03 | Dispose above stock")]
    public async Task INT_DSP_29_03_AboveStock()
    {
        var a = await ArrangeAsync();
        var res = await PostAsync(a, "/api/disposals", Disposal(K001, "COMPLETED", "Hàng hỏng", (Ids.PTest, 11m)));

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", "Hàng P-TEST - <name> chỉ còn 10 trong kho, không thể hủy 11.", res);
        check.Equal("Tồn giữ 10", 10m, await StockAsync(K001, Ids.PTest));
        check.Assert();
    }

    [Fact(DisplayName = "INT-DSP-29-04 | Complete without reason")]
    public async Task INT_DSP_29_04_CompleteWithoutReason()
    {
        var a = await ArrangeAsync();
        var res = await PostAsync(a, "/api/disposals", Disposal(K001, "COMPLETED", null, (Ids.PTest, 1m)));

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", "Vui lòng nhập lý do xuất hủy trước khi hoàn thành phiếu.", res);
        check.Equal("Tồn giữ 10", 10m, await StockAsync(K001, Ids.PTest));
        check.Assert();
    }

    [Fact(DisplayName = "INT-DSP-29-05 | Cancel a completed note")]
    public async Task INT_DSP_29_05_CancelCompleted()
    {
        var a = await ArrangeAsync();
        var id = await ArrangeDisposalAsync(a, "COMPLETED", "Hàng vỡ", 3m);
        Assert.Equal(7m, await StockAsync(K001, Ids.PTest));

        var res = await PostAsync(a, $"/api/disposals/{id}/cancel");

        var check = new Checks(Output);
        check.Success(res);
        check.Equal("Trạng thái", "CANCELLED", (await DisposalAsync(id)).Status);
        check.Equal("Tồn trở lại 10", 10m, await StockAsync(K001, Ids.PTest));
        var card = await DisposalCardAsync(id);
        check.True("Thẻ kho DISPOSAL_CANCEL +3", card.Any(c => c.TransactionType == "DISPOSAL_CANCEL" && c.Quantity == 3m), Describe(card));
        check.Assert();
    }

    [Fact(DisplayName = "INT-DSP-29-06 | Warehouse not assigned")]
    public async Task INT_DSP_29_06_WarehouseNotAssigned()
    {
        var a = await ArrangeAsync();
        var id = await ArrangeDisposalAsync(a, "DRAFT", null, 3m);
        var b = await ClientAsync(TestDataSeeder.OpsK002); // STOCK_READ, chỉ K002

        var res = await GetAsync(b, $"/api/disposals/{id}");

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", "Bạn không có quyền xem phiếu xuất hủy của kho này.", res);
        check.Assert();
    }

    [Fact(DisplayName = "INT-DSP-29-07 | Active stocktake blocks completion")]
    public async Task INT_DSP_29_07_ActiveStocktakeBlocks()
    {
        var a = await ArrangeAsync();
        await ArrangeStocktakeAsync(a, K001, "DRAFT", (Ids.PTest, 10m)); // 1. Phiếu kiểm DRAFT của K001 có P-TEST

        var res = await PostAsync(a, "/api/disposals", Disposal(K001, "COMPLETED", "Hàng vỡ", (Ids.PTest, 1m)));

        var check = new Checks(Output);
        check.Rejected(res);
        check.Message("Thông báo khóa kiểm kho (BR-42)", "Mặt hàng P-TEST đang được kiểm kho (phiếu ...). Không thể xác nhận giao dịch cho đến khi phiếu kiểm kho kết thúc.", res);
        check.Equal("Tồn giữ 10", 10m, await StockAsync(K001, Ids.PTest));
        check.Assert();
    }
}
