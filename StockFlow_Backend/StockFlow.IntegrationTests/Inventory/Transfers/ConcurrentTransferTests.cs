using StockFlow.IntegrationTests.Infrastructure;
using Xunit;
using Xunit.Abstractions;

namespace StockFlow.IntegrationTests.Inventory.Transfers;

/// <summary>
/// Report 5.2 – sheet "Concurrent Transfer Receipt" (chức năng 20, UC-37).
/// Hai request gửi đồng thời tới API thật (TestServer xử lý song song, mỗi request một kết nối PostgreSQL riêng).
/// Ghi chú workbook: "At risk on c60ea62: no row lock or concurrency token" – phải chạy thật để kết luận.
/// </summary>
public sealed class ConcurrentTransferTests : InventoryTestBase
{
    public ConcurrentTransferTests(IntegrationTestFixture fixture, ITestOutputHelper output) : base(fixture, output) { }

    private async Task<HttpClient> ArrangeStockAsync()
    {
        await SetStockAsync(K001, Ids.PTest, 100, 10_000m);
        await SetStockAsync(K002, Ids.PTest, 20, 13_000m);
        return await ClientAsync(TestDataSeeder.OpsK001K002);
    }

    private async Task<ApiResult[]> SimultaneousAsync(params Func<Task<ApiResult>>[] calls)
    {
        using var gate = new SemaphoreSlim(0);
        var tasks = calls.Select(async c => { await gate.WaitAsync(); return await c(); }).ToArray();
        gate.Release(calls.Length);
        return await Task.WhenAll(tasks);
    }

    [Fact(DisplayName = "INT-TRF-45-01 | Two simultaneous receipts")]
    public async Task INT_TRF_45_01_TwoReceipts()
    {
        var a = await ArrangeStockAsync();
        var id = await ArrangeInTransitTransferAsync(a, K001, K002, (Ids.PTest, 30m));
        var a2 = await ClientAsync(TestDataSeeder.OpsK001K002);

        var results = await SimultaneousAsync(
            () => PostAsync(a, $"/api/transfers/{id}/receive", Receive(null, (Ids.PTest, 30m))),
            () => PostAsync(a2, $"/api/transfers/{id}/receive", Receive(null, (Ids.PTest, 30m))));

        var check = new Checks(Output);
        check.Equal("Đúng 1 request thành công", 1, results.Count(r => r.IsSuccess));
        check.Equal("Tồn K002", 50m, await StockAsync(K002, Ids.PTest));
        var card = await TransferCardAsync(id);
        Actual("Thẻ kho", Describe(card));
        check.Equal("Đúng 1 dòng TRANSFER_IN", 1, card.Count(c => c.TransactionType == "TRANSFER_IN"));
        check.Assert();
    }

    [Fact(DisplayName = "INT-TRF-45-02 | Simultaneous receipt and cancel")]
    public async Task INT_TRF_45_02_ReceiveAndCancel()
    {
        var a = await ArrangeStockAsync();
        var id = await ArrangeInTransitTransferAsync(a, K001, K002, (Ids.PTest, 30m));
        var a2 = await ClientAsync(TestDataSeeder.OpsK001K002);

        var results = await SimultaneousAsync(
            () => PostAsync(a, $"/api/transfers/{id}/receive", Receive(null, (Ids.PTest, 30m))),
            () => PostAsync(a2, $"/api/transfers/{id}/cancel", new { reason = "Hủy" }));

        // Khóa theo phiếu chuyển (DEF-IT-01) cho 2 request chạy tuần tự:
        // - Hủy trước: nhận bị từ chối (phiếu đã hủy) → đúng 1 request thành công.
        // - Nhận trước: hủy chạy sau trên phiếu đã nhận (hợp lệ, xem INT-TRF-44) → cả 2 thành công, trạng thái cuối CANCELLED.
        var receiveOk = results[0].IsSuccess;
        var cancelOk = results[1].IsSuccess;
        var check = new Checks(Output);
        var status = (await TransferAsync(id)).Status;
        check.True("Kết quả là một thứ tự tuần tự hợp lệ (hủy trước: chỉ hủy thành công; nhận trước: cả 2 thành công, phiếu bị hủy)",
            cancelOk && (!receiveOk || status == "CANCELLED"),
            $"nhận {(receiveOk ? "OK" : "bị từ chối")}, hủy {(cancelOk ? "OK" : "bị từ chối")}, trạng thái {status}");
        var k1 = await StockAsync(K001, Ids.PTest);
        var k2 = await StockAsync(K002, Ids.PTest);
        Actual("Trạng thái cuối / tồn K001 / tồn K002", new { status, k1, k2 });
        check.True("Tồn khớp trạng thái cuối (RECEIVED: 70/50; CANCELLED: 100/20)",
            (status == "RECEIVED" && k1 == 70m && k2 == 50m) || (status == "CANCELLED" && k1 == 100m && k2 == 20m),
            $"{status}: K001 {k1}, K002 {k2}");
        check.Assert();
    }

    [Fact(DisplayName = "INT-TRF-45-03 | Two simultaneous dispatches")]
    public async Task INT_TRF_45_03_TwoDispatches()
    {
        var a = await ArrangeStockAsync();
        var id = await ArrangeDraftTransferAsync(a, K001, K002, (Ids.PTest, 30m));
        var a2 = await ClientAsync(TestDataSeeder.OpsK001K002);

        var results = await SimultaneousAsync(
            () => PostAsync(a, $"/api/transfers/{id}/complete"),
            () => PostAsync(a2, $"/api/transfers/{id}/complete"));

        var check = new Checks(Output);
        check.Equal("Đúng 1 request thành công", 1, results.Count(r => r.IsSuccess));
        check.Equal("Tồn K001", 70m, await StockAsync(K001, Ids.PTest));
        var card = await TransferCardAsync(id);
        Actual("Thẻ kho", Describe(card));
        check.Equal("Đúng 1 dòng TRANSFER_OUT", 1, card.Count(c => c.TransactionType == "TRANSFER_OUT"));
        check.Assert();
    }
}
