using Microsoft.EntityFrameworkCore;
using StockFlow.IntegrationTests.Infrastructure;
using Xunit;
using Xunit.Abstractions;

namespace StockFlow.IntegrationTests.Inventory.Transfers;

/// <summary>
/// Report 5.2 – sheet "Transfer Short Receipt" (chức năng 16, UC-38, BR-41) và "Transfer Over Receipt" (chức năng 17, UC-37, BR-40).
/// Precondition chung: User A (K001 + K002); phiếu K001 → K002 P-TEST SL 30 Đang chuyển; K001 tồn 70, K002 tồn 20.
/// Phiếu được lập + xuất bằng API thật từ tồn K001 = 100, K002 = 20.
/// </summary>
public sealed class TransferReceiptQuantityTests : InventoryTestBase
{
    public TransferReceiptQuantityTests(IntegrationTestFixture fixture, ITestOutputHelper output) : base(fixture, output) { }

    private async Task<(HttpClient A, int Id)> ArrangeAsync(params (int ProductId, decimal Qty)[] extra)
    {
        await SetStockAsync(K001, Ids.PTest, 100, 10_000m);
        await SetStockAsync(K002, Ids.PTest, 20, 13_000m);
        foreach (var (p, _) in extra) { await SetStockAsync(K001, p, 50); await SetStockAsync(K002, p, 0); }
        var a = await ClientAsync(TestDataSeeder.OpsK001K002);
        var id = await ArrangeInTransitTransferAsync(a, K001, K002, new[] { (Ids.PTest, 30m) }.Concat(extra).ToArray());
        Assert.Equal(70m, await StockAsync(K001, Ids.PTest));
        return (a, id);
    }

    private async Task<ApiResult> ReceiveAsync(HttpClient a, int id, string? notes, params (int, decimal)[] lines) =>
        await PostAsync(a, $"/api/transfers/{id}/receive", Receive(notes, lines));

    // ───────── Transfer Short Receipt ─────────

    [Fact(DisplayName = "INT-TRF-41-01 | Short receipt with a note")]
    public async Task INT_TRF_41_01_ShortWithNote()
    {
        var (a, id) = await ArrangeAsync();
        var res = await ReceiveAsync(a, id, "Thiếu 5 cái", (Ids.PTest, 25m));

        var check = new Checks(Output);
        check.Success(res);
        var t = await TransferAsync(id);
        check.Equal("Trạng thái", "RECEIVED", t.Status);
        check.Equal("SL nhận", 25m, t.DtlStockTransferItems.Single().ReceivedQuantity);
        check.Equal("Ghi chú nhận đã lưu", "Thiếu 5 cái", t.ReceiveNotes);
        check.Equal("Tồn K002", 45m, await StockAsync(K002, Ids.PTest));
        check.Equal("Tồn K001", 70m, await StockAsync(K001, Ids.PTest));
        check.Assert();
    }

    [Fact(DisplayName = "INT-TRF-41-02 | Short receipt without a note")]
    public async Task INT_TRF_41_02_ShortWithoutNote()
    {
        var (a, id) = await ArrangeAsync();
        var res = await ReceiveAsync(a, id, "", (Ids.PTest, 25m));

        var check = new Checks(Output);
        check.Message("Thông báo", "Phát hiện nhận thiếu hàng! Bắt buộc phải nhập ghi chú lý do thiếu hàng trước khi xác nhận Nhận hàng.", res);
        check.Equal("Vẫn Đang chuyển", "IN_TRANSIT", (await TransferAsync(id)).Status);
        check.Equal("Tồn K002 không đổi", 20m, await StockAsync(K002, Ids.PTest));
        check.Assert();
    }

    [Fact(DisplayName = "INT-TRF-41-03 | Short receipt with a whitespace note")]
    public async Task INT_TRF_41_03_ShortWithWhitespaceNote()
    {
        var (a, id) = await ArrangeAsync();
        var res = await ReceiveAsync(a, id, "   ", (Ids.PTest, 25m));

        var check = new Checks(Output);
        check.Message("Thông báo thiếu ghi chú", "Phát hiện nhận thiếu hàng! Bắt buộc phải nhập ghi chú lý do thiếu hàng trước khi xác nhận Nhận hàng.", res);
        check.Equal("Tồn K002 không đổi", 20m, await StockAsync(K002, Ids.PTest));
        check.Assert();
    }

    [Fact(DisplayName = "INT-TRF-41-04 | Boundary: short by one unit")]
    public async Task INT_TRF_41_04_ShortByOne()
    {
        var (a, id) = await ArrangeAsync();
        var res = await ReceiveAsync(a, id, null, (Ids.PTest, 29m));

        var check = new Checks(Output);
        check.Message("Thông báo thiếu ghi chú", "Phát hiện nhận thiếu hàng! Bắt buộc phải nhập ghi chú lý do thiếu hàng trước khi xác nhận Nhận hàng.", res);
        check.Assert();
    }

    [Fact(DisplayName = "INT-TRF-41-05 | Boundary: received equals dispatched needs no note")]
    public async Task INT_TRF_41_05_EqualNoNote()
    {
        var (a, id) = await ArrangeAsync();
        var res = await ReceiveAsync(a, id, null, (Ids.PTest, 30m));

        var check = new Checks(Output);
        check.Success(res);
        check.Equal("Trạng thái", "RECEIVED", (await TransferAsync(id)).Status);
        check.Equal("Tồn K002", 50m, await StockAsync(K002, Ids.PTest));
        check.Assert();
    }

    [Fact(DisplayName = "INT-TRF-41-06 | Boundary: received zero with a note")]
    public async Task INT_TRF_41_06_ZeroWithNote()
    {
        var (a, id) = await ArrangeAsync();
        var res = await ReceiveAsync(a, id, "Mất cả lô", (Ids.PTest, 0m));

        var check = new Checks(Output);
        check.Success(res);
        var t = await TransferAsync(id);
        check.Equal("Trạng thái", "RECEIVED", t.Status);
        check.Equal("SL nhận", 0m, t.DtlStockTransferItems.Single().ReceivedQuantity);
        check.Equal("Tồn K002 giữ 20", 20m, await StockAsync(K002, Ids.PTest));
        var card = await TransferCardAsync(id);
        Actual("Thẻ kho", Describe(card));
        check.Equal("Không có dòng TRANSFER_IN", 0, card.Count(c => c.TransactionType == "TRANSFER_IN"));
        check.Assert();
    }

    [Fact(DisplayName = "INT-TRF-41-07 | Negative received quantity")]
    public async Task INT_TRF_41_07_Negative()
    {
        var (a, id) = await ArrangeAsync();
        var res = await ReceiveAsync(a, id, "Ghi chú", (Ids.PTest, -5m));

        var check = new Checks(Output);
        check.Rejected(res);
        check.Equal("Tồn K002 không đổi", 20m, await StockAsync(K002, Ids.PTest));
        Actual("Trạng thái phiếu sau yêu cầu", (await TransferAsync(id)).Status);
        check.Assert();
    }

    // ───────── Transfer Over Receipt ─────────

    [Fact(DisplayName = "INT-TRF-42-01 | Received above dispatched")]
    public async Task INT_TRF_42_01_AboveDispatched()
    {
        var (a, id) = await ArrangeAsync();
        var res = await ReceiveAsync(a, id, null, (Ids.PTest, 31m));

        var check = new Checks(Output);
        check.Rejected(res);
        check.Equal("Vẫn Đang chuyển", "IN_TRANSIT", (await TransferAsync(id)).Status);
        check.Equal("Tồn K002 giữ 20", 20m, await StockAsync(K002, Ids.PTest));
        check.Assert();
    }

    [Fact(DisplayName = "INT-TRF-42-02 | Boundary: decimal above dispatched")]
    public async Task INT_TRF_42_02_DecimalAbove()
    {
        var (a, id) = await ArrangeAsync();
        var res = await ReceiveAsync(a, id, null, (Ids.PTest, 30.5m));

        var check = new Checks(Output);
        check.Rejected(res);
        check.Equal("Tồn K002 giữ 20", 20m, await StockAsync(K002, Ids.PTest));
        check.Assert();
    }

    [Fact(DisplayName = "INT-TRF-42-03 | Boundary: received equals dispatched")]
    public async Task INT_TRF_42_03_Equal()
    {
        var (a, id) = await ArrangeAsync();
        var res = await ReceiveAsync(a, id, null, (Ids.PTest, 30m));

        var check = new Checks(Output);
        check.Success(res);
        check.Equal("Trạng thái", "RECEIVED", (await TransferAsync(id)).Status);
        check.Equal("Tồn K002", 50m, await StockAsync(K002, Ids.PTest));
        check.Assert();
    }

    [Fact(DisplayName = "INT-TRF-42-04 | Several lines, one line above dispatched")]
    public async Task INT_TRF_42_04_OneLineAbove()
    {
        var (a, id) = await ArrangeAsync((Ids.PTest2, 10m)); // phiếu có thêm P-TEST2 SL 10
        var res = await ReceiveAsync(a, id, null, (Ids.PTest, 30m), (Ids.PTest2, 11m));

        var check = new Checks(Output);
        check.Rejected(res);
        var t = await TransferAsync(id);
        check.True("Không dòng nào được nhận", t.DtlStockTransferItems.All(i => i.ReceivedQuantity == null),
            string.Join(", ", t.DtlStockTransferItems.Select(i => $"{i.ProductId}:{i.ReceivedQuantity}")));
        check.Equal("Tồn K002 P-TEST không đổi", 20m, await StockAsync(K002, Ids.PTest));
        check.Equal("Tồn K002 P-TEST2 không đổi", 0m, await StockAsync(K002, Ids.PTest2));
        check.Assert();
    }
}
