using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Features.PurchaseOrders.DTOs;
using StockFlow.Application.Features.PurchaseReturns.DTOs;
using StockFlow.Application.Features.Purchases.DTOs;
using StockFlow.Domain.Entities;
using StockFlow.IntegrationTests.Infrastructure;
using StockFlow.IntegrationTests.Inventory;
using Xunit;
using Xunit.Abstractions;

namespace StockFlow.IntegrationTests.Purchasing;

/// <summary>
/// Report 5.2 – sheet "Purchase Order to Goods" (chức năng 30, UC-30..32, BR-26), "Goods Receipt Draft, Complete" (31, UC-31, BR-26),
/// "Supplier Return and Refund" (32, UC-33). User T = it.ops.k001 (PURCHASE_*, FIN_*, quyền kho K001); NCC-01.
/// Bảng: trx_purchase_orders, dtl_purchase_order_items, trx_goods_receipts, dtl_goods_receipt_items, trx_purchase_returns,
/// trx_inventory_balances, trx_inventory_transactions, trx_financial_transactions, mst_business_partners.current_payable.
/// </summary>
public sealed class PurchasingTests : InventoryTestBase
{
    public PurchasingTests(IntegrationTestFixture fixture, ITestOutputHelper output) : base(fixture, output) { }

    private Task<decimal> PayableAsync() => QueryAsync(async db => (await db.MstBusinessPartners.SingleAsync(p => p.PartnerId == Ids.Ncc01)).CurrentPayable ?? 0);
    private Task<TrxPurchaseOrder> PoAsync(int id) => QueryAsync(db => db.TrxPurchaseOrders.SingleAsync(p => p.PoId == id));
    private Task<TrxGoodsReceipt> GrAsync(int id) => QueryAsync(db => db.TrxGoodsReceipts.SingleAsync(g => g.GrId == id));
    private Task<List<TrxInventoryTransaction>> CardOfProductAsync(int productId) => QueryAsync(db =>
        db.TrxInventoryTransactions.Where(t => t.ProductId == productId && t.WarehouseId == K001).OrderBy(t => t.TransactionId).ToListAsync());

    // ───────── Purchase Order to Goods Receipt & MAC ─────────

    private async Task<(HttpClient T, int PoId)> ArrangePoAsync()
    {
        await SetStockAsync(K001, Ids.PTest, 100, 10_000m);
        var t = await ClientAsync(TestDataSeeder.OpsK001);
        var res = await PostAsync(t, "/api/purchase-orders", new CreatePurchaseOrderRequest(K001, Ids.Ncc01, null, "ORDERED", null,
            new() { new PurchaseOrderItemRequest(Ids.PTest, 100m, 13_000m) }));
        Assert.True(res.IsSuccess, $"Arrange PO: {res.StatusCode} {res.Body}");
        var poId = res.Int("poId");
        Step($"Arrange: PDN0001 (id {poId}) ORDERED: P-TEST 100 × 13.000");
        return (t, poId);
    }

    private static ReceivePurchaseOrderRequest Receive(params (int ProductId, decimal Accepted, decimal Defect)[] lines) =>
        new(null, 0m, "CASH", null, lines.Select(l => new ReceivePurchaseOrderLine(l.ProductId, l.Accepted, l.Defect)).ToList());

    [Fact(DisplayName = "INT-PUR-30-01 | Receive part of the order")]
    public async Task INT_PUR_30_01_ReceivePart()
    {
        var (t, po) = await ArrangePoAsync();

        var res = await PostAsync(t, $"/api/purchase-orders/{po}/receive", Receive((Ids.PTest, 60m, 5m)));

        var check = new Checks(Output);
        check.Success(res);
        var gr = await QueryAsync(db => db.TrxGoodsReceipts.Include(g => g.DtlGoodsReceiptItems).FirstOrDefaultAsync(g => g.PurchaseOrderId == po));
        check.Equal("Phiếu nhập COMPLETED", "COMPLETED", gr?.Status);
        check.Equal("Tồn K001", 160m, await StockAsync(K001, Ids.PTest));
        check.Equal("Giá vốn BQ = (100×10.000 + 60×13.000)/160", 11_125m, await CostAsync(K001, Ids.PTest));
        check.Equal("PO PARTIAL", "PARTIAL", (await PoAsync(po)).Status);
        check.Equal("Ghi nhận SL lỗi 5", 5m, gr?.DtlGoodsReceiptItems.Sum(i => i.DefectiveQty ?? 0));
        check.Assert();
    }

    [Fact(DisplayName = "INT-PUR-30-02 | Receive the rest")]
    public async Task INT_PUR_30_02_ReceiveRest()
    {
        var (t, po) = await ArrangePoAsync();
        Assert.True((await PostAsync(t, $"/api/purchase-orders/{po}/receive", Receive((Ids.PTest, 60m, 5m)))).IsSuccess);

        var res = await PostAsync(t, $"/api/purchase-orders/{po}/receive", Receive((Ids.PTest, 40m, 0m)));

        var check = new Checks(Output);
        check.Success(res);
        check.Equal("PO COMPLETED", "COMPLETED", (await PoAsync(po)).Status);
        check.Assert();
    }

    [Fact(DisplayName = "INT-PUR-30-03 | Only defective goods")]
    public async Task INT_PUR_30_03_OnlyDefective()
    {
        var (t, po) = await ArrangePoAsync();
        var res = await PostAsync(t, $"/api/purchase-orders/{po}/receive", Receive((Ids.PTest, 0m, 5m)));

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", "Số lượng đạt phải lớn hơn 0. Mặt hàng lỗi toàn bộ thì để trống dòng và ghi chú lý do.", res);
        check.Equal("Không tạo phiếu nhập", 0, await QueryAsync(db => db.TrxGoodsReceipts.CountAsync()));
        check.Assert();
    }

    [Fact(DisplayName = "INT-PUR-30-04 | Product not in the order")]
    public async Task INT_PUR_30_04_ProductNotInOrder()
    {
        var (t, po) = await ArrangePoAsync();
        var res = await PostAsync(t, $"/api/purchase-orders/{po}/receive", Receive((Ids.PTest2, 5m, 0m)));

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", "Mặt hàng không có trong phiếu đặt hàng nhập.", res);
        check.Assert();
    }

    [Fact(DisplayName = "INT-PUR-30-05 | Finish a partial order")]
    public async Task INT_PUR_30_05_FinishPartial()
    {
        var (t, po) = await ArrangePoAsync();
        Assert.True((await PostAsync(t, $"/api/purchase-orders/{po}/receive", Receive((Ids.PTest, 60m, 0m)))).IsSuccess);

        var res = await PostAsync(t, $"/api/purchase-orders/{po}/finish");
        var again = await PostAsync(t, $"/api/purchase-orders/{po}/receive", Receive((Ids.PTest, 10m, 0m)));

        var check = new Checks(Output);
        check.Success(res);
        check.Equal("PO COMPLETED", "COMPLETED", (await PoAsync(po)).Status);
        check.True("Không nhập thêm được", !again.IsSuccess, $"{again.StatusCode} {again.Message}");
        check.Assert();
    }

    [Fact(DisplayName = "INT-PUR-30-06 | Payable increases")]
    public async Task INT_PUR_30_06_PayableIncreases()
    {
        var (t, po) = await ArrangePoAsync();
        var before = await PayableAsync();

        var res = await PostAsync(t, $"/api/purchase-orders/{po}/receive", Receive((Ids.PTest, 60m, 5m)));

        var check = new Checks(Output);
        check.Success(res);
        check.Equal("Công nợ NCC + SL đạt × giá (60 × 13.000)", before + 780_000m, await PayableAsync());
        check.Assert();
    }

    // ───────── Goods Receipt Draft, Complete & Cancel ─────────

    private async Task<HttpClient> ArrangeTAsync()
    {
        await SetStockAsync(K001, Ids.PTest, 100, 10_000m);
        return await ClientAsync(TestDataSeeder.OpsK001);
    }

    [Fact(DisplayName = "INT-PUR-31-01 | Save draft")]
    public async Task INT_PUR_31_01_SaveDraft()
    {
        var t = await ArrangeTAsync();
        var res = await PostAsync(t, "/api/purchases", Purchase(K001, "DRAFT", (Ids.PTest, 50m, 12_000m)));

        var check = new Checks(Output);
        check.Success(res);
        check.Equal("Phiếu nhập DRAFT", "DRAFT", res.String("status"));
        check.Equal("Tồn không đổi", 100m, await StockAsync(K001, Ids.PTest));
        check.Assert();
    }

    [Fact(DisplayName = "INT-PUR-31-02 | Complete the draft")]
    public async Task INT_PUR_31_02_CompleteDraft()
    {
        var t = await ArrangeTAsync();
        var gr = await ArrangePurchaseAsync(t, K001, "DRAFT", (Ids.PTest, 50m, 12_000m));
        var payable = await PayableAsync();

        var res = await SendAsync(t, HttpMethod.Patch, $"/api/purchases/{gr}/complete", new CompletePurchaseRequest());

        var check = new Checks(Output);
        check.Success(res);
        check.Equal("COMPLETED", "COMPLETED", (await GrAsync(gr)).Status);
        check.Equal("Tồn +50", 150m, await StockAsync(K001, Ids.PTest));
        var card = await CardOfProductAsync(Ids.PTest);
        Actual("Thẻ kho", Describe(card));
        check.True("Có dòng thẻ kho nhập +50 của phiếu", card.Any(c => c.ReferenceId == gr && c.Quantity == 50m), Describe(card));
        check.Equal("Công nợ NCC +600.000", payable + 600_000m, await PayableAsync());
        check.Assert();
    }

    [Fact(DisplayName = "INT-PUR-31-03 | Complete twice")]
    public async Task INT_PUR_31_03_CompleteTwice()
    {
        var t = await ArrangeTAsync();
        var gr = await ArrangePurchaseAsync(t, K001, "DRAFT", (Ids.PTest, 50m, 12_000m));
        Assert.True((await SendAsync(t, HttpMethod.Patch, $"/api/purchases/{gr}/complete", new CompletePurchaseRequest())).IsSuccess);

        var res = await SendAsync(t, HttpMethod.Patch, $"/api/purchases/{gr}/complete", new CompletePurchaseRequest());

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", "Phiếu nhập hàng này đã ở trạng thái Hoàn thành trước đó.", res);
        check.Equal("Tồn chỉ cộng một lần", 150m, await StockAsync(K001, Ids.PTest));
        check.Assert();
    }

    [Fact(DisplayName = "INT-PUR-31-04 | Cancel a completed receipt")]
    public async Task INT_PUR_31_04_CancelCompleted()
    {
        var t = await ArrangeTAsync();
        var payable = await PayableAsync();
        var gr = await ArrangePurchaseAsync(t, K001, "COMPLETED", (Ids.PTest, 50m, 12_000m));

        var res = await SendAsync(t, HttpMethod.Patch, $"/api/purchases/{gr}/cancel", new CancelPurchaseRequest("Nhập nhầm"));

        var check = new Checks(Output);
        check.Success(res);
        check.Equal("CANCELLED", "CANCELLED", (await GrAsync(gr)).Status);
        check.Equal("Tồn −50 (về 100)", 100m, await StockAsync(K001, Ids.PTest));
        check.Equal("Công nợ NCC −600.000 (về như trước)", payable, await PayableAsync());
        check.Assert();
    }

    private async Task<int> ArrangeReturnAsync(HttpClient t, int gr, decimal qty)
    {
        var grItem = await QueryAsync(db => db.DtlGoodsReceiptItems.Where(i => i.GrId == gr).Select(i => i.GrItemId).SingleAsync());
        var res = await PostAsync(t, "/api/purchasereturns", new SavePurchaseReturnRequest(Ids.Ncc01,
            new() { new PurchaseReturnItemRequest(Ids.PTest, qty, 12_000m, grItem) }, WarehouseId: K001, GrId: gr, Status: "COMPLETED"));
        Assert.True(res.IsSuccess, $"Arrange phiếu trả NCC: {res.StatusCode} {res.Body}");
        return res.Int("purchaseReturnId");
    }

    [Fact(DisplayName = "INT-PUR-31-05 | Cancel with a supplier return")]
    public async Task INT_PUR_31_05_CancelWithReturn()
    {
        var t = await ArrangeTAsync();
        var gr = await ArrangePurchaseAsync(t, K001, "COMPLETED", (Ids.PTest, 50m, 12_000m));
        await ArrangeReturnAsync(t, gr, 10m); // 1. Phiếu trả hàng nhập từ phiếu nhập

        var res = await SendAsync(t, HttpMethod.Patch, $"/api/purchases/{gr}/cancel", new CancelPurchaseRequest("Hủy"));

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", "Phiếu nhập đã có phiếu trả hàng nhập ...", res);
        check.Equal("Phiếu nhập vẫn COMPLETED", "COMPLETED", (await GrAsync(gr)).Status);
        check.Assert();
    }

    [Fact(DisplayName = "INT-PUR-31-06 | Negative price")]
    public async Task INT_PUR_31_06_NegativePrice()
    {
        var t = await ArrangeTAsync();
        var res = await PostAsync(t, "/api/purchases", Purchase(K001, "COMPLETED", (Ids.PTest, 5m, -1m)));

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", $"Đơn giá nhập của sản phẩm ID #{Ids.PTest} không được âm.", res);
        check.Equal("Không tạo phiếu nhập", 0, await QueryAsync(db => db.TrxGoodsReceipts.CountAsync()));
        check.Assert();
    }

    // ───────── Supplier Return & Refund ─────────

    private async Task<(HttpClient T, int Gr)> ArrangeReceiptAsync()
    {
        var t = await ArrangeTAsync();
        var gr = await ArrangePurchaseAsync(t, K001, "COMPLETED", (Ids.PTest, 50m, 12_000m)); // NH0001 COMPLETED: P-TEST × 50 @ 12.000
        return (t, gr);
    }

    private Task<TrxPurchaseReturn?> ReturnAsync(int id) => QueryAsync(db => db.TrxPurchaseReturns.FirstOrDefaultAsync(r => r.PurchaseReturnId == id));

    [Fact(DisplayName = "INT-PRT-32-01 | Return part of a receipt")]
    public async Task INT_PRT_32_01_ReturnPart()
    {
        var (t, gr) = await ArrangeReceiptAsync();
        var stock = await StockAsync(K001, Ids.PTest);
        var payable = await PayableAsync();

        var source = await GetAsync(t, $"/api/purchasereturns/source/{gr}"); // 1. Lấy dữ liệu nguồn
        var grItem = source.Node?["items"]?[0]?["grItemId"]?.GetValue<int>() ?? 0;
        var res = await PostAsync(t, "/api/purchasereturns", new SavePurchaseReturnRequest(Ids.Ncc01,
            new() { new PurchaseReturnItemRequest(Ids.PTest, 10m, 12_000m, grItem) }, WarehouseId: K001, GrId: gr, Status: "COMPLETED"));

        var check = new Checks(Output);
        check.Success(source);
        check.Success(res);
        check.Equal("Phiếu trả COMPLETED", "COMPLETED", res.IsSuccess ? (await ReturnAsync(res.Int("purchaseReturnId")))?.Status : null);
        check.Equal("Tồn −10", stock - 10m, await StockAsync(K001, Ids.PTest));
        check.Equal("Công nợ NCC −120.000", payable - 120_000m, await PayableAsync());
        check.Assert();
    }

    [Fact(DisplayName = "INT-PRT-32-02 | Return above received")]
    public async Task INT_PRT_32_02_ReturnAboveReceived()
    {
        var (t, gr) = await ArrangeReceiptAsync();
        await ArrangeReturnAsync(t, gr, 10m);
        var grItem = await QueryAsync(db => db.DtlGoodsReceiptItems.Where(i => i.GrId == gr).Select(i => i.GrItemId).SingleAsync());

        var res = await PostAsync(t, "/api/purchasereturns", new SavePurchaseReturnRequest(Ids.Ncc01,
            new() { new PurchaseReturnItemRequest(Ids.PTest, 45m, 12_000m, grItem) }, WarehouseId: K001, GrId: gr, Status: "COMPLETED"));

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", "Mặt hàng P-TEST chỉ còn được trả tối đa 40 (đã nhập 50).", res);
        check.Assert();
    }

    [Fact(DisplayName = "INT-PRT-32-03 | Return from a draft receipt")]
    public async Task INT_PRT_32_03_ReturnFromDraft()
    {
        var t = await ArrangeTAsync();
        var gr = await ArrangePurchaseAsync(t, K001, "DRAFT", (Ids.PTest, 50m, 12_000m));
        var grItem = await QueryAsync(db => db.DtlGoodsReceiptItems.Where(i => i.GrId == gr).Select(i => i.GrItemId).SingleAsync());

        var res = await PostAsync(t, "/api/purchasereturns", new SavePurchaseReturnRequest(Ids.Ncc01,
            new() { new PurchaseReturnItemRequest(Ids.PTest, 5m, 12_000m, grItem) }, WarehouseId: K001, GrId: gr, Status: "COMPLETED"));

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", "Chỉ trả hàng được cho phiếu nhập đã nhập hàng.", res);
        check.Assert();
    }

    [Fact(DisplayName = "INT-PRT-32-04 | Supplier refund")]
    public async Task INT_PRT_32_04_SupplierRefund()
    {
        var (t, gr) = await ArrangeReceiptAsync();
        var ret = await ArrangeReturnAsync(t, gr, 10m);

        var res = await PostAsync(t, $"/api/purchasereturns/{ret}/refunds", new CreateSupplierRefundRequest(50_000m, "CASH"));

        var check = new Checks(Output);
        check.Success(res);
        var refunds = await QueryAsync(db => db.TrxFinancialTransactions.Where(f => f.TxType == "SUPPLIER_REFUND").ToListAsync());
        Actual("Giao dịch SUPPLIER_REFUND", refunds.Select(r => new { r.TxCode, r.Amount, r.ReferenceType, r.ReferenceId, r.Status }));
        check.True("Ghi nhận SUPPLIER_REFUND 50.000", refunds.Any(r => r.Amount == 50_000m && r.Status == "COMPLETED"), $"{refunds.Count} dòng");
        check.Assert();
    }

    [Fact(DisplayName = "INT-PRT-32-05 | Refund above remaining")]
    public async Task INT_PRT_32_05_RefundAboveRemaining()
    {
        var (t, gr) = await ArrangeReceiptAsync();
        var ret = await ArrangeReturnAsync(t, gr, 10m); // còn phải thu NCC 120.000

        var res = await PostAsync(t, $"/api/purchasereturns/{ret}/refunds", new CreateSupplierRefundRequest(120_001m, "CASH"));

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", "Số tiền vượt quá số nhà cung cấp còn phải trả (...).", res);
        check.Assert();
    }

    [Fact(DisplayName = "INT-PRT-32-06 | Cancel the return")]
    public async Task INT_PRT_32_06_CancelReturn()
    {
        var (t, gr) = await ArrangeReceiptAsync();
        var stock = await StockAsync(K001, Ids.PTest);
        var payable = await PayableAsync();
        var ret = await ArrangeReturnAsync(t, gr, 10m);

        var res = await SendAsync(t, HttpMethod.Patch, $"/api/purchasereturns/{ret}/cancel");

        var check = new Checks(Output);
        check.Success(res);
        check.Equal("CANCELLED", "CANCELLED", (await ReturnAsync(ret))?.Status);
        check.Equal("Tồn +10 (về như trước trả)", stock, await StockAsync(K001, Ids.PTest));
        check.Equal("Công nợ NCC khôi phục", payable, await PayableAsync());
        check.Assert();
    }
}
