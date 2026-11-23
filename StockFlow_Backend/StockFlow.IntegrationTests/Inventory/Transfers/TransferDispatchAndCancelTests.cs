using StockFlow.IntegrationTests.Infrastructure;
using Xunit;
using Xunit.Abstractions;

namespace StockFlow.IntegrationTests.Inventory.Transfers;

/// <summary>
/// Report 5.2 – sheet "Transfer Dispatch Over Stock" (chức năng 18, quyết định nhóm 10/11/2026: cho phép xuất vượt tồn, tồn được âm)
/// và "Cancel Transfer By Status" (chức năng 19, UC-37).
/// </summary>
public sealed class TransferDispatchAndCancelTests : InventoryTestBase
{
    public TransferDispatchAndCancelTests(IntegrationTestFixture fixture, ITestOutputHelper output) : base(fixture, output) { }

    // ───────── Transfer Dispatch Over Stock ─────────

    private async Task<(HttpClient A, int Id)> ArrangeOverStockAsync(decimal stock, decimal qty)
    {
        await SetStockAsync(K001, Ids.PTest, stock, 10_000m);
        var a = await ClientAsync(TestDataSeeder.OpsK001K002);
        return (a, await ArrangeDraftTransferAsync(a, K001, K002, (Ids.PTest, qty)));
    }

    [Fact(DisplayName = "INT-TRF-43-01 | Dispatch above source stock")]
    public async Task INT_TRF_43_01_DispatchAboveStock()
    {
        var (a, id) = await ArrangeOverStockAsync(10, 15);
        var res = await PostAsync(a, $"/api/transfers/{id}/complete");

        var check = new Checks(Output);
        check.Success(res);
        check.Equal("Trạng thái", "IN_TRANSIT", (await TransferAsync(id)).Status);
        check.Equal("Tồn K001", -5m, await StockAsync(K001, Ids.PTest));
        var card = await TransferCardAsync(id);
        check.True("Thẻ kho TRANSFER_OUT -15", card.Any(c => c.TransactionType == "TRANSFER_OUT" && c.Quantity == -15m), Describe(card));
        check.Assert();
    }

    [Fact(DisplayName = "INT-TRF-43-02 | Dispatch when source stock is zero")]
    public async Task INT_TRF_43_02_DispatchFromZero()
    {
        var (a, id) = await ArrangeOverStockAsync(0, 5);
        var res = await PostAsync(a, $"/api/transfers/{id}/complete");

        var check = new Checks(Output);
        check.Success(res);
        check.Equal("Trạng thái", "IN_TRANSIT", (await TransferAsync(id)).Status);
        check.Equal("Tồn K001", -5m, await StockAsync(K001, Ids.PTest));
        Actual("Giá vốn K001 sau khi âm", await CostAsync(K001, Ids.PTest));
        check.Assert();
    }

    [Fact(DisplayName = "INT-TRF-43-03 | Boundary: quantity equals source stock")]
    public async Task INT_TRF_43_03_EqualStock()
    {
        var (a, id) = await ArrangeOverStockAsync(10, 10);
        var res = await PostAsync(a, $"/api/transfers/{id}/complete");

        var check = new Checks(Output);
        check.Success(res);
        check.Equal("Trạng thái", "IN_TRANSIT", (await TransferAsync(id)).Status);
        check.Equal("Tồn K001", 0m, await StockAsync(K001, Ids.PTest));
        check.Assert();
    }

    [Fact(DisplayName = "INT-TRF-43-04 | Create screen warns when quantity exceeds stock",
        Skip = "E2E (nhóm C): cảnh báo + xác nhận trên màn Tạo phiếu chuyển là hành vi giao diện, không kiểm được ở Backend Integration Test.")]
    public void INT_TRF_43_04_ScreenWarning() { }

    [Fact(DisplayName = "INT-TRF-43-05 | Cancel after dispatching above stock")]
    public async Task INT_TRF_43_05_CancelAfterOverDispatch()
    {
        var (a, id) = await ArrangeOverStockAsync(10, 15);
        var dispatch = await PostAsync(a, $"/api/transfers/{id}/complete");
        Assert.True(dispatch.IsSuccess, dispatch.Body);

        var res = await PostAsync(a, $"/api/transfers/{id}/cancel", new { reason = "Hủy" });

        var check = new Checks(Output);
        check.Success(res);
        check.Equal("Trạng thái", "CANCELLED", (await TransferAsync(id)).Status);
        check.Equal("Tồn K001 trở lại 10", 10m, await StockAsync(K001, Ids.PTest));
        check.Assert();
    }

    // ───────── Cancel Transfer By Status ─────────

    private async Task<HttpClient> ArrangeStockAsync()
    {
        await SetStockAsync(K001, Ids.PTest, 100, 10_000m);
        await SetStockAsync(K002, Ids.PTest, 20, 13_000m);
        return await ClientAsync(TestDataSeeder.OpsK001K002);
    }

    [Fact(DisplayName = "INT-TRF-44-01 | Cancel a draft transfer")]
    public async Task INT_TRF_44_01_CancelDraft()
    {
        var a = await ArrangeStockAsync();
        var id = await ArrangeDraftTransferAsync(a, K001, K002, (Ids.PTest, 30m));

        var res = await PostAsync(a, $"/api/transfers/{id}/cancel", new { reason = "Nhập sai" });

        var check = new Checks(Output);
        check.Success(res);
        check.Equal("Trạng thái", "CANCELLED", (await TransferAsync(id)).Status);
        check.Equal("Tồn K001", 100m, await StockAsync(K001, Ids.PTest));
        check.Equal("Tồn K002", 20m, await StockAsync(K002, Ids.PTest));
        check.Equal("Không có thẻ kho", 0, (await TransferCardAsync(id)).Count);
        check.Assert();
    }

    [Fact(DisplayName = "INT-TRF-44-02 | Cancel an in-transit transfer")]
    public async Task INT_TRF_44_02_CancelInTransit()
    {
        var a = await ArrangeStockAsync();
        var id = await ArrangeInTransitTransferAsync(a, K001, K002, (Ids.PTest, 30m));

        var res = await PostAsync(a, $"/api/transfers/{id}/cancel", new { reason = "Hủy" });

        var check = new Checks(Output);
        check.Success(res);
        check.Equal("Trạng thái", "CANCELLED", (await TransferAsync(id)).Status);
        check.Equal("Tồn K001 trở lại 100", 100m, await StockAsync(K001, Ids.PTest));
        check.Equal("Tồn K002 giữ 20", 20m, await StockAsync(K002, Ids.PTest));
        var card = await TransferCardAsync(id);
        check.True("Thẻ kho TRANSFER_CANCEL_IN +30", card.Any(c => c.TransactionType == "TRANSFER_CANCEL_IN" && c.Quantity == 30m), Describe(card));
        check.Assert();
    }

    [Fact(DisplayName = "INT-TRF-44-03 | Cancel a fully received transfer")]
    public async Task INT_TRF_44_03_CancelReceived()
    {
        var a = await ArrangeStockAsync();
        var id = await ArrangeInTransitTransferAsync(a, K001, K002, (Ids.PTest, 30m));
        var rec = await PostAsync(a, $"/api/transfers/{id}/receive", Receive(null, (Ids.PTest, 30m))); // 1. Receive 30
        Assert.True(rec.IsSuccess, rec.Body);

        var res = await PostAsync(a, $"/api/transfers/{id}/cancel", new { reason = "Hủy" });

        var check = new Checks(Output);
        check.Success(res);
        check.Equal("Trạng thái", "CANCELLED", (await TransferAsync(id)).Status);
        check.Equal("Tồn K002 trở lại 20", 20m, await StockAsync(K002, Ids.PTest));
        check.Equal("Tồn K001 trở lại 100", 100m, await StockAsync(K001, Ids.PTest));
        var card = await TransferCardAsync(id);
        check.True("TRANSFER_CANCEL_OUT -30 và TRANSFER_CANCEL_IN +30",
            card.Any(c => c.TransactionType == "TRANSFER_CANCEL_OUT" && c.Quantity == -30m)
            && card.Any(c => c.TransactionType == "TRANSFER_CANCEL_IN" && c.Quantity == 30m), Describe(card));
        check.Assert();
    }

    [Fact(DisplayName = "INT-TRF-44-04 | Cancel a short-received transfer")]
    public async Task INT_TRF_44_04_CancelShortReceived()
    {
        var a = await ArrangeStockAsync();
        var id = await ArrangeInTransitTransferAsync(a, K001, K002, (Ids.PTest, 30m));
        var rec = await PostAsync(a, $"/api/transfers/{id}/receive", Receive("Thiếu 5", (Ids.PTest, 25m)));
        Assert.True(rec.IsSuccess, rec.Body);

        var res = await PostAsync(a, $"/api/transfers/{id}/cancel", new { reason = "Hủy" });

        var check = new Checks(Output);
        check.Success(res);
        check.Equal("Trạng thái", "CANCELLED", (await TransferAsync(id)).Status);
        check.Equal("Tồn K002 −25 → 20", 20m, await StockAsync(K002, Ids.PTest));
        check.Equal("Tồn K001 +30 → 100", 100m, await StockAsync(K001, Ids.PTest));
        check.Assert();
    }

    [Fact(DisplayName = "INT-TRF-44-05 | Cancel a transfer twice")]
    public async Task INT_TRF_44_05_CancelTwice()
    {
        var a = await ArrangeStockAsync();
        var id = await ArrangeInTransitTransferAsync(a, K001, K002, (Ids.PTest, 30m));
        var first = await PostAsync(a, $"/api/transfers/{id}/cancel", new { reason = "Hủy" });
        Assert.True(first.IsSuccess, first.Body);

        var res = await PostAsync(a, $"/api/transfers/{id}/cancel", new { reason = "Hủy lần 2" });

        var check = new Checks(Output);
        check.Message("Thông báo", "Phiếu chuyển hàng này đã bị hủy trước đó.", res);
        check.Equal("Tồn K001 chỉ hoàn một lần", 100m, await StockAsync(K001, Ids.PTest));
        check.Assert();
    }

    [Fact(DisplayName = "INT-TRF-44-06 | Cancel without access to the source warehouse")]
    public async Task INT_TRF_44_06_CancelWithoutSourceAccess()
    {
        var a = await ArrangeStockAsync();
        var id = await ArrangeInTransitTransferAsync(a, K001, K002, (Ids.PTest, 30m));
        var b = await ClientAsync(TestDataSeeder.OpsK002);

        var res = await PostAsync(b, $"/api/transfers/{id}/cancel", new { reason = "Hủy" });

        var check = new Checks(Output);
        check.Message("Thông báo", "Bạn không có quyền hủy phiếu chuyển hàng của kho xuất này.", res);
        check.Equal("Vẫn Đang chuyển", "IN_TRANSIT", (await TransferAsync(id)).Status);
        check.Equal("Tồn K001 không đổi", 70m, await StockAsync(K001, Ids.PTest));
        check.Assert();
    }

    [Fact(DisplayName = "INT-TRF-44-07 | Cancel a received transfer without access to the destination")]
    public async Task INT_TRF_44_07_CancelReceivedWithoutDestAccess()
    {
        var a = await ArrangeStockAsync();
        var id = await ArrangeInTransitTransferAsync(a, K001, K002, (Ids.PTest, 30m));
        var rec = await PostAsync(a, $"/api/transfers/{id}/receive", Receive(null, (Ids.PTest, 30m)));
        Assert.True(rec.IsSuccess, rec.Body);
        var c = await ClientAsync(TestDataSeeder.OpsK001);

        var res = await PostAsync(c, $"/api/transfers/{id}/cancel", new { reason = "Hủy" });

        var check = new Checks(Output);
        check.Message("Thông báo", "Bạn không có quyền hủy phiếu đã nhận vì không quản lý kho nhận hàng.", res);
        check.Equal("Vẫn Đã nhận", "RECEIVED", (await TransferAsync(id)).Status);
        check.Equal("Tồn K002 không đổi", 50m, await StockAsync(K002, Ids.PTest));
        check.Equal("Tồn K001 không đổi", 70m, await StockAsync(K001, Ids.PTest));
        check.Assert();
    }

    [Fact(DisplayName = "INT-TRF-44-08 | Cancel reason is saved")]
    public async Task INT_TRF_44_08_CancelReasonSaved()
    {
        var a = await ArrangeStockAsync();
        var id = await ArrangeInTransitTransferAsync(a, K001, K002, (Ids.PTest, 30m));

        var res = await PostAsync(a, $"/api/transfers/{id}/cancel", new { reason = "Khách đổi kho" });
        var detail = await GetAsync(a, $"/api/transfers/{id}"); // 2. Open transfer detail

        var check = new Checks(Output);
        check.Success(res);
        check.True("Ghi chú có \"[Lý do hủy]: Khách đổi kho\"", detail.String("notes")?.Contains("[Lý do hủy]: Khách đổi kho") == true, detail.String("notes") ?? "(null)");
        check.Assert();
    }
}
