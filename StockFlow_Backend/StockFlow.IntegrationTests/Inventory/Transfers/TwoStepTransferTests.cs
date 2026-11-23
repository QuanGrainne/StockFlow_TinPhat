using StockFlow.IntegrationTests.Infrastructure;
using Xunit;
using Xunit.Abstractions;

namespace StockFlow.IntegrationTests.Inventory.Transfers;

/// <summary>
/// Report 5.2 – sheet "Two-Step Stock Transfer" (chức năng 15, UC-37, BR-40).
/// Precondition: User A có STOCK_CREATE, STOCK_UPDATE, quyền kho K001 và K002; P-TEST: K001 tồn 100 giá vốn 10.000; K002 tồn 20 giá vốn 13.000.
/// User A = it.ops.k001k002; User B (chỉ K002) = it.ops.k002; User C (chỉ K001) = it.ops.k001.
/// Bảng: trx_stock_transfers, dtl_stock_transfer_items, trx_inventory_balances, trx_inventory_transactions (TRANSFER_OUT / TRANSFER_IN).
/// </summary>
public sealed class TwoStepTransferTests : InventoryTestBase
{
    public TwoStepTransferTests(IntegrationTestFixture fixture, ITestOutputHelper output) : base(fixture, output) { }

    private async Task<HttpClient> ArrangeAsync()
    {
        await SetStockAsync(K001, Ids.PTest, 100, 10_000m);
        await SetStockAsync(K002, Ids.PTest, 20, 13_000m);
        return await ClientAsync(TestDataSeeder.OpsK001K002);
    }

    [Fact(DisplayName = "INT-TRF-40-01 | Create draft does not change stock")]
    public async Task INT_TRF_40_01_CreateDraft()
    {
        var a = await ArrangeAsync();

        var res = await PostAsync(a, "/api/transfers", TransferRequest(K001, K002, (Ids.PTest, 30m)));

        var check = new Checks(Output);
        check.Success(res);
        var id = res.IsSuccess ? res.Int("stockTransferId") : 0;
        check.Equal("Trạng thái", "DRAFT", id > 0 ? (await TransferAsync(id)).Status : null);
        check.Equal("Tồn K001", 100m, await StockAsync(K001, Ids.PTest));
        check.Equal("Tồn K002", 20m, await StockAsync(K002, Ids.PTest));
        check.Equal("Không có thẻ kho", 0, await CountInventoryTransactionsAsync());
        check.Assert();
    }

    [Fact(DisplayName = "INT-TRF-40-02 | Full flow: dispatch then receive the full quantity")]
    public async Task INT_TRF_40_02_FullFlow()
    {
        var a = await ArrangeAsync();
        var id = await ArrangeDraftTransferAsync(a, K001, K002, (Ids.PTest, 30m));

        var dispatch = await PostAsync(a, $"/api/transfers/{id}/complete");
        var check = new Checks(Output);
        check.Success(dispatch);
        check.Equal("Sau xuất: trạng thái", "IN_TRANSIT", (await TransferAsync(id)).Status);
        check.Equal("Sau xuất: tồn K001", 70m, await StockAsync(K001, Ids.PTest));
        check.Equal("Sau xuất: tồn K002", 20m, await StockAsync(K002, Ids.PTest));

        var receive = await PostAsync(a, $"/api/transfers/{id}/receive", Receive(null, (Ids.PTest, 30m)));
        check.Success(receive);
        check.Equal("Sau nhận: trạng thái", "RECEIVED", (await TransferAsync(id)).Status);
        check.Equal("Sau nhận: tồn K002", 50m, await StockAsync(K002, Ids.PTest));
        check.Equal("Sau nhận: tồn K001", 70m, await StockAsync(K001, Ids.PTest));
        check.Equal("Giá vốn K002 = (20×13.000 + 30×10.000)/50", 11_200m, await CostAsync(K002, Ids.PTest));
        check.Equal("Giá vốn K001 giữ 10.000", 10_000m, await CostAsync(K001, Ids.PTest));
        var card = await TransferCardAsync(id);
        Actual("Thẻ kho", Describe(card));
        check.True("1 TRANSFER_OUT (K001, -30) và 1 TRANSFER_IN (K002, +30)",
            card.Count == 2
            && card.Count(c => c.TransactionType == "TRANSFER_OUT" && c.WarehouseId == K001 && c.Quantity == -30m) == 1
            && card.Count(c => c.TransactionType == "TRANSFER_IN" && c.WarehouseId == K002 && c.Quantity == 30m) == 1,
            Describe(card));
        check.Assert();
    }

    [Fact(DisplayName = "INT-TRF-40-03 | Dispatch twice is rejected")]
    public async Task INT_TRF_40_03_DispatchTwice()
    {
        var a = await ArrangeAsync();
        var id = await ArrangeInTransitTransferAsync(a, K001, K002, (Ids.PTest, 30m));

        var res = await PostAsync(a, $"/api/transfers/{id}/complete");

        var check = new Checks(Output);
        check.Message("Thông báo", "Chỉ phiếu ở trạng thái 'Phiếu tạm' mới có thể xuất chuyển đi...", res);
        check.Equal("Tồn K001 chỉ trừ một lần", 70m, await StockAsync(K001, Ids.PTest));
        check.Assert();
    }

    [Fact(DisplayName = "INT-TRF-40-04 | Receive a draft transfer is rejected")]
    public async Task INT_TRF_40_04_ReceiveDraft()
    {
        var a = await ArrangeAsync();
        var id = await ArrangeDraftTransferAsync(a, K001, K002, (Ids.PTest, 30m));

        var res = await PostAsync(a, $"/api/transfers/{id}/receive", Receive(null, (Ids.PTest, 30m)));

        var check = new Checks(Output);
        check.Message("Thông báo", "Chỉ phiếu ở trạng thái 'Đang chuyển' mới có thể nhận hàng...", res);
        check.Equal("Tồn K001", 100m, await StockAsync(K001, Ids.PTest));
        check.Equal("Tồn K002", 20m, await StockAsync(K002, Ids.PTest));
        check.Assert();
    }

    [Fact(DisplayName = "INT-TRF-40-05 | Dispatch without access to the source warehouse")]
    public async Task INT_TRF_40_05_DispatchWithoutSourceAccess()
    {
        var a = await ArrangeAsync();
        var id = await ArrangeDraftTransferAsync(a, K001, K002, (Ids.PTest, 30m));
        var b = await ClientAsync(TestDataSeeder.OpsK002); // User B: chỉ K002

        var res = await PostAsync(b, $"/api/transfers/{id}/complete");

        var check = new Checks(Output);
        check.Message("Thông báo", "Bạn không có quyền xuất hàng chuyển kho từ kho này.", res);
        check.Equal("Vẫn Phiếu tạm", "DRAFT", (await TransferAsync(id)).Status);
        check.Equal("Tồn K001 không đổi", 100m, await StockAsync(K001, Ids.PTest));
        check.Assert();
    }

    [Fact(DisplayName = "INT-TRF-40-06 | Receive without access to the destination warehouse")]
    public async Task INT_TRF_40_06_ReceiveWithoutDestAccess()
    {
        var a = await ArrangeAsync();
        var id = await ArrangeInTransitTransferAsync(a, K001, K002, (Ids.PTest, 30m));
        var c = await ClientAsync(TestDataSeeder.OpsK001); // User C: chỉ K001

        var res = await PostAsync(c, $"/api/transfers/{id}/receive", Receive(null, (Ids.PTest, 30m)));

        var check = new Checks(Output);
        check.Message("Thông báo", "Bạn không có quyền xác nhận nhận hàng cho kho nhận này.", res);
        check.Equal("Vẫn Đang chuyển", "IN_TRANSIT", (await TransferAsync(id)).Status);
        check.Equal("Tồn K002 không đổi", 20m, await StockAsync(K002, Ids.PTest));
        check.Assert();
    }

    [Fact(DisplayName = "INT-TRF-40-07 | Received date must be after the transfer date")]
    public async Task INT_TRF_40_07_ReceivedDateBeforeTransferDate()
    {
        var a = await ArrangeAsync();
        var id = await ArrangeInTransitTransferAsync(a, K001, K002, (Ids.PTest, 30m));
        var request = Receive(null, (Ids.PTest, 30m));
        request.ReceivedDate = TransferDateUtc.AddDays(-1);

        var res = await PostAsync(a, $"/api/transfers/{id}/receive", request);

        var check = new Checks(Output);
        check.Message("Thông báo", "Thời gian nhận hàng (...) phải lớn hơn thời gian chuyển hàng (...)", res);
        check.Equal("Tồn K002 không đổi", 20m, await StockAsync(K002, Ids.PTest));
        check.Assert();
    }

    [Fact(DisplayName = "INT-TRF-40-08 | Source and destination must be different")]
    public async Task INT_TRF_40_08_SameWarehouse()
    {
        var a = await ArrangeAsync();

        var res = await PostAsync(a, "/api/transfers", TransferRequest(K001, K001, (Ids.PTest, 30m)));

        var check = new Checks(Output);
        check.Rejected(res);
        check.Equal("Không tạo phiếu", 0, await QueryAsync(db => Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.CountAsync(db.TrxStockTransfers)));
        check.Assert();
    }
}
