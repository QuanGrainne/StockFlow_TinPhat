using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Features.SalesReturns.DTOs;
using StockFlow.Domain.Entities;
using StockFlow.IntegrationTests.Infrastructure;
using Xunit;
using Xunit.Abstractions;

namespace StockFlow.IntegrationTests.Sales.Returns;

/// <summary>
/// Report 5.2 – sheet "Sales Returns and Refund" (chức năng 14, UC-41, UC-79..UC-82, BR-18, BR-19).
/// Precondition: User S có SALES_CREATE, SALES_UPDATE, quyền kho K001; hóa đơn HD0001: KH-HM01, P-TEST x5 giá 100.000, ghi nợ.
/// HD0001 được tạo bằng API POS thật (tồn P-TEST K001 đặt 50 → còn 45, dư nợ KH-HM01 500.000).
/// Luồng: SalesReturnsController → SalesReturnCommandHandler (TransferStockOps.InboundAsync / OutboundAsync).
/// Bảng: trx_return_requests, dtl_return_request_items, trx_inventory_balances, trx_inventory_transactions,
///       trx_financial_transactions (CUSTOMER_REFUND), mst_business_partners.current_debt.
/// </summary>
public sealed class SalesReturnRefundTests : SalesTestBase
{
    public SalesReturnRefundTests(IntegrationTestFixture fixture, ITestOutputHelper output) : base(fixture, output) { }

    private async Task<(HttpClient S, int Hd1, int Hd1ItemId, string Hd1Code)> ArrangeAsync()
    {
        await SetStockAsync(K001, Ids.PTest, 50);
        var s = await ClientAsync(TestDataSeeder.SalesK001);
        var hd1 = await ArrangeInvoiceAsync(s, Pos(Ids.KhHm01, K001, "DEBT", 0m, new[] { (Ids.PTest, 5m, PTestPrice) }), "HD0001 (KH-HM01, P-TEST x5, ghi nợ)");
        var invoice = await OrderAsync(hd1);
        return (s, hd1, invoice!.DtlOrderItems.Single().OrderItemId, invoice.OrderCode ?? "");
    }

    private static CreateSalesReturnRequest Return(int invoiceId, int orderItemId, int productId, decimal qty, decimal refund = 0) => new()
    {
        InvoiceId = invoiceId, RefundAmount = refund, PaymentMethod = "CASH",
        Items = new() { new SalesReturnLineRequest { OrderItemId = orderItemId, ProductId = productId, Quantity = qty, ReturnPrice = PTestPrice } },
    };

    private async Task<int> ArrangeReturnAsync(HttpClient s, CreateSalesReturnRequest request, string label)
    {
        var res = await PostAsync(s, "/api/sales-returns", request);
        Assert.True(res.IsSuccess, $"Arrange '{label}' thất bại: {res.StatusCode} {res.Body}");
        Step($"Arrange: {label} = {res.String("returnCode")}");
        return res.Int("returnId");
    }

    private Task<List<TrxInventoryTransaction>> ReturnCardAsync(int returnId) => QueryAsync(db =>
        db.TrxInventoryTransactions.Where(t => t.ReferenceType == "SALES_RETURN" && t.ReferenceId == returnId).OrderBy(t => t.TransactionId).ToListAsync());

    [Fact(DisplayName = "INT-SRT-14-01 | Return part of the invoice")]
    public async Task INT_SRT_14_01_ReturnPartOfInvoice()
    {
        var (s, hd1, itemId, _) = await ArrangeAsync();
        var debtBefore = await DebtAsync(Ids.KhHm01);

        var source = await GetAsync(s, $"/api/sales-returns/source/{hd1}"); // 1. Lấy dữ liệu trả hàng của HD0001
        var res = await PostAsync(s, "/api/sales-returns", Return(hd1, itemId, Ids.PTest, 2m)); // 2. Trả P-TEST x2

        var check = new Checks(Output);
        check.True("GET source thành công, còn được trả 5", source.IsSuccess && source.Node?["items"]?[0]?["remainingQuantity"]?.GetValue<decimal>() == 5m,
            $"{source.StatusCode}");
        check.Success(res);
        var returnId = res.IsSuccess ? res.Int("returnId") : 0;
        var ret = await QueryAsync(db => db.TrxReturnRequests.FirstOrDefaultAsync(r => r.ReturnRequestId == returnId));
        check.Equal("Phiếu trả COMPLETED", "COMPLETED", ret?.Status);
        check.True("Mã phiếu trả dạng THxxxx", ret?.ReturnCode?.StartsWith("TH") == true, ret?.ReturnCode ?? "(null)");
        check.Equal("Tồn K001 +2 (45 → 47)", 47m, await StockAsync(K001, Ids.PTest));
        var card = await ReturnCardAsync(returnId);
        Actual("Thẻ kho phiếu trả", card.Select(c => new { c.TransactionType, c.Quantity, c.BalanceAfter }));
        check.True("Dòng thẻ kho RETURN_SALE +2", card.Count == 1 && card[0].TransactionType == "RETURN_SALE" && card[0].Quantity == 2m,
            string.Join(", ", card.Select(c => $"{c.TransactionType} {c.Quantity}")));
        check.Equal("Dư nợ KH-HM01 giảm 200.000", debtBefore - 200_000m, await DebtAsync(Ids.KhHm01));
        check.Assert();
    }

    [Fact(DisplayName = "INT-SRT-14-02 | Return above remaining")]
    public async Task INT_SRT_14_02_ReturnAboveRemaining()
    {
        var (s, hd1, itemId, _) = await ArrangeAsync();
        await ArrangeReturnAsync(s, Return(hd1, itemId, Ids.PTest, 2m), "Đã trả 2");

        var res = await PostAsync(s, "/api/sales-returns", Return(hd1, itemId, Ids.PTest, 4m));

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo BR-19", "... chỉ còn được trả 3 (đã mua 5, đã trả 2) (BR-19).", res.Message);
        check.Equal("Chỉ có 1 phiếu trả", 1, await QueryAsync(db => db.TrxReturnRequests.CountAsync()));
        check.Equal("Tồn K001 = 47", 47m, await StockAsync(K001, Ids.PTest));
        check.Assert();
    }

    [Fact(DisplayName = "INT-SRT-14-03 | Product not in invoice")]
    public async Task INT_SRT_14_03_ProductNotInInvoice()
    {
        var (s, hd1, _, _) = await ArrangeAsync();
        // Dòng P-TEST2 thuộc một hóa đơn khác (HD0001 không có P-TEST2)
        await SetStockAsync(K001, Ids.PTest2, 10);
        var other = await ArrangeInvoiceAsync(s, Pos(Ids.KhAbc, K001, "CASH", 150_000m, new[] { (Ids.PTest2, 1m, PTest2Price) }), "Hóa đơn khác có P-TEST2");
        var otherItem = (await OrderAsync(other))!.DtlOrderItems.Single().OrderItemId;

        var res = await PostAsync(s, "/api/sales-returns", Return(hd1, otherItem, Ids.PTest2, 1m));

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", "Hàng trả không thuộc hóa đơn gốc (BR-18).", res.Message);
        check.Equal("Không tạo phiếu trả", 0, await QueryAsync(db => db.TrxReturnRequests.CountAsync()));
        check.Assert();
    }

    [Fact(DisplayName = "INT-SRT-14-04 | Refund to walk-in customer")]
    public async Task INT_SRT_14_04_RefundToWalkIn()
    {
        var (s, _, _, _) = await ArrangeAsync();
        var walkInInvoice = await ArrangeInvoiceAsync(s, Pos(WalkIn, K001, "CASH", 200_000m, new[] { (Ids.PTest, 2m, PTestPrice) }), "Hóa đơn khách lẻ P-TEST x2");
        var item = (await OrderAsync(walkInInvoice))!.DtlOrderItems.Single().OrderItemId;

        // Trả 1 cái (cần trả khách 100.000), chỉ trả 50.000
        var res = await PostAsync(s, "/api/sales-returns", Return(walkInInvoice, item, Ids.PTest, 1m, refund: 50_000m));

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", "Khách lẻ không có công nợ — phải trả đủ tiền cho khách.", res.Message);
        check.Equal("Không tạo phiếu trả", 0, await QueryAsync(db => db.TrxReturnRequests.CountAsync()));
        check.Assert();
    }

    [Fact(DisplayName = "INT-SRT-14-05 | Refund later")]
    public async Task INT_SRT_14_05_RefundLater()
    {
        var (s, hd1, itemId, _) = await ArrangeAsync();
        var returnId = await ArrangeReturnAsync(s, Return(hd1, itemId, Ids.PTest, 2m), "Phiếu trả P-TEST x2, chưa trả tiền khách");
        var debtBefore = await DebtAsync(Ids.KhHm01);

        var res = await PostAsync(s, $"/api/sales-returns/{returnId}/refunds", new AddSalesReturnRefundRequest { Amount = 50_000m, PaymentMethod = "CASH" });

        var check = new Checks(Output);
        check.Success(res);
        var ret = await QueryAsync(db => db.TrxReturnRequests.SingleAsync(r => r.ReturnRequestId == returnId));
        check.Equal("Đã trả khách", 50_000m, ret.RefundAmount);
        check.Equal("Còn phải trả khách giảm (200.000 → 150.000)", 150_000m, ret.TotalAmount - ret.RefundAmount);
        var refunds = await FinancialAsync("SALES_RETURN", returnId);
        Actual("Phiếu chi trả khách", refunds.Select(r => new { r.TxCode, r.TxType, r.Amount, r.Status }));
        check.True("Giao dịch CUSTOMER_REFUND 50.000", refunds.Count == 1 && refunds[0].TxType == "CUSTOMER_REFUND" && refunds[0].Amount == 50_000m,
            string.Join(", ", refunds.Select(r => $"{r.TxType} {r.Amount:N0}")));
        Actual("Dư nợ KH-HM01 trước / sau", new { debtBefore, after = await DebtAsync(Ids.KhHm01) });
        check.Assert();
    }

    [Fact(DisplayName = "INT-SRT-14-06 | Cancel the return")]
    public async Task INT_SRT_14_06_CancelReturn()
    {
        var (s, hd1, itemId, _) = await ArrangeAsync();
        var debtInvoice = await DebtAsync(Ids.KhHm01);
        var returnId = await ArrangeReturnAsync(s, Return(hd1, itemId, Ids.PTest, 2m), "Phiếu trả P-TEST x2");
        Assert.Equal(47m, await StockAsync(K001, Ids.PTest));

        var res = await PostAsync(s, $"/api/sales-returns/{returnId}/cancel");

        var check = new Checks(Output);
        check.Success(res);
        check.Equal("Phiếu trả CANCELLED", "CANCELLED", (await QueryAsync(db => db.TrxReturnRequests.SingleAsync(r => r.ReturnRequestId == returnId))).Status);
        check.Equal("Tồn K001 −2 (47 → 45)", 45m, await StockAsync(K001, Ids.PTest));
        var card = await ReturnCardAsync(returnId);
        Actual("Thẻ kho phiếu trả", card.Select(c => new { c.TransactionType, c.Quantity }));
        check.True("Có dòng RETURN_SALE_CANCEL", card.Any(c => c.TransactionType == "RETURN_SALE_CANCEL" && c.Quantity == -2m),
            string.Join(", ", card.Select(c => $"{c.TransactionType} {c.Quantity}")));
        check.Equal("Dư nợ khôi phục", debtInvoice, await DebtAsync(Ids.KhHm01));
        check.Assert();
    }

    [Fact(DisplayName = "INT-SRT-14-07 | Invoice with active return cannot be cancelled")]
    public async Task INT_SRT_14_07_InvoiceWithActiveReturn()
    {
        var (s, hd1, itemId, code) = await ArrangeAsync();
        await ArrangeReturnAsync(s, Return(hd1, itemId, Ids.PTest, 2m), "1. Phiếu trả của HD0001");

        var res = await PostAsync(s, $"/api/orders/{hd1}/cancel"); // 2. Hủy HD0001

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", $"Hóa đơn {code} đã có phiếu trả hàng ... — hủy phiếu trả hàng trước.", res.Message);
        check.Equal("HD0001 vẫn COMPLETED", "COMPLETED", (await OrderAsync(hd1))?.Status);
        check.Assert();
    }

    /// <summary>
    /// Ca BỔ SUNG – yêu cầu 11: tạo phiếu trả ghi phiếu + dòng, nhập lại kho + thẻ kho, giảm công nợ trong 1 transaction.
    /// Gây lỗi khi lưu thẻ kho → không có phiếu trả, tồn và công nợ giữ nguyên.
    /// </summary>
    [Fact(DisplayName = "INT-SRT-14-S01 | (Bổ sung) Lỗi khi nhập lại kho hàng trả → rollback")]
    public async Task INT_SRT_14_S01_RollbackOnReturnFailure()
    {
        var (s, hd1, itemId, _) = await ArrangeAsync();
        var debtBefore = await DebtAsync(Ids.KhHm01);
        Fx.Faults.FailWhenAdding<TrxInventoryTransaction>("lỗi khi ghi thẻ kho hàng trả");

        var res = await PostAsync(s, "/api/sales-returns", Return(hd1, itemId, Ids.PTest, 2m));

        var check = new Checks(Output);
        check.Equal("Đã kích hoạt lỗi giữa chừng", 1, Fx.Faults.FiredCount);
        check.Equal("HTTP status", 500, res.StatusCode);
        check.Equal("Không có phiếu trả", 0, await QueryAsync(db => db.TrxReturnRequests.CountAsync()));
        check.Equal("Không có dòng phiếu trả", 0, await QueryAsync(db => db.DtlReturnRequestItems.CountAsync()));
        check.Equal("Tồn K001 giữ 45", 45m, await StockAsync(K001, Ids.PTest));
        check.Equal("Dư nợ không đổi", debtBefore, await DebtAsync(Ids.KhHm01));
        check.Assert();
    }
}
