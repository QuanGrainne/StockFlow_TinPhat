using Microsoft.EntityFrameworkCore;
using StockFlow.Domain.Entities;
using StockFlow.IntegrationTests.Infrastructure;
using Xunit;
using Xunit.Abstractions;

namespace StockFlow.IntegrationTests.Sales.Pos;

/// <summary>
/// Report 5.2 – sheet "POS Cash Sale and Stock Ledger" (chức năng 8, UC-35 POS, BR-04).
/// Precondition chung: User S có SALES_CREATE, quyền kho K001; tồn P-TEST tại K001 = 50, giá 100.000.
/// Luồng: HTTP → JWT → [RequirePermission]/[RequireFeature] → OrdersController → MediatR → CreatePosOrderCommandHandler
///        → EF Core → PostgreSQL (trx_orders, dtl_order_items, trx_stock_issues, dtl_stock_issue_items,
///        trx_inventory_balances, trx_inventory_transactions, trx_financial_transactions).
/// </summary>
public sealed class PosCashSaleTests : SalesTestBase
{
    public PosCashSaleTests(IntegrationTestFixture fixture, ITestOutputHelper output) : base(fixture, output) { }

    private async Task<HttpClient> ArrangeAsync()
    {
        await SetStockAsync(K001, Ids.PTest, 50);
        return await ClientAsync(TestDataSeeder.SalesK001);
    }

    [Fact(DisplayName = "INT-POS-08-01 | Cash sale")]
    public async Task INT_POS_08_01_CashSale()
    {
        var s = await ArrangeAsync();

        var res = await PostAsync(s, "/api/orders/pos", Pos(WalkIn, K001, "CASH", 200_000m, new[] { (Ids.PTest, 2m, PTestPrice) }));

        var check = new Checks(Output);
        check.Success(res);
        var orderId = res.IsSuccess ? res.Int("orderId") : 0;
        var order = await OrderAsync(orderId);
        check.Equal("Hóa đơn lưu trong trx_orders, trạng thái", "COMPLETED", order?.Status);
        check.True("Mã hóa đơn dạng HDxxxx", order?.OrderCode?.StartsWith("HD") == true, order?.OrderCode ?? "(null)");
        check.Equal("Loại chứng từ", "INVOICE", order?.OrderType);
        check.Equal("Số dòng hàng", 1, order?.DtlOrderItems.Count ?? 0);
        check.Equal("Tồn K001 sau bán", 48m, await StockAsync(K001, Ids.PTest));

        var card = await StockCardOfInvoiceAsync(orderId);
        Actual("Thẻ kho", card.Select(c => new { c.TransactionType, c.Quantity, c.ReferenceType, c.ReferenceId, c.BalanceAfter }));
        check.Equal("Số dòng thẻ kho của hóa đơn", 1, card.Count);
        check.Equal("Loại dòng thẻ kho", "ISSUE_SALE", card.FirstOrDefault()?.TransactionType);
        check.Equal("Số lượng dòng thẻ kho", -2m, card.FirstOrDefault()?.Quantity);
        check.Equal("Tồn sau giao dịch trên thẻ kho", 48m, card.FirstOrDefault()?.BalanceAfter);

        var receipts = await FinancialAsync("SALES_ORDER", orderId);
        Actual("Phiếu thu", receipts.Select(r => new { r.TxType, r.Amount, r.PaymentMethod, r.Status }));
        check.True("Thanh toán ghi cùng giao dịch: 1 phiếu thu CASH 200.000 COMPLETED",
            receipts.Count == 1 && receipts[0].Amount == 200_000m && receipts[0].PaymentMethod == "CASH" && receipts[0].Status == "COMPLETED",
            $"{receipts.Count} phiếu");
        check.Assert();
    }

    [Fact(DisplayName = "INT-POS-08-02 | VietQR sale (phần backend; hiển thị QR trên phiếu in là E2E)")]
    public async Task INT_POS_08_02_VietQrSale()
    {
        var s = await ArrangeAsync();

        var res = await PostAsync(s, "/api/orders/pos", Pos(WalkIn, K001, "VIETQR", 200_000m, new[] { (Ids.PTest, 2m, PTestPrice) }));

        var check = new Checks(Output);
        check.Success(res);
        var orderId = res.IsSuccess ? res.Int("orderId") : 0;
        check.Equal("Hóa đơn COMPLETED", "COMPLETED", (await OrderAsync(orderId))?.Status);
        var receipts = await FinancialAsync("SALES_ORDER", orderId);
        Actual("Phiếu thu", receipts.Select(r => new { r.TxType, r.Amount, r.PaymentMethod, r.Status }));
        check.Equal("Phương thức thanh toán ghi trên phiếu thu", "VIETQR", receipts.FirstOrDefault()?.PaymentMethod);
        Actual("Phần 'receipt shows QR'", "Không kiểm ở backend: hiển thị QR trên phiếu in thuộc giao diện (System / E2E).");
        check.Assert();
    }

    [Fact(DisplayName = "INT-POS-08-03 | Walk-in customer on debt")]
    public async Task INT_POS_08_03_WalkInOnDebt()
    {
        var s = await ArrangeAsync();

        var res = await PostAsync(s, "/api/orders/pos", Pos(WalkIn, K001, "DEBT", 0m, new[] { (Ids.PTest, 2m, PTestPrice) }));

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Contains("Thông báo PAY-009", "PAY-009", res.Message);
        check.Equal("Không đổi tồn K001", 50m, await StockAsync(K001, Ids.PTest));
        check.Equal("Không tạo hóa đơn", 0, await CountOrdersAsync("INVOICE"));
        check.Equal("Không ghi thẻ kho", 0, await CountInventoryTransactionsAsync());
        check.Assert();
    }

    [Fact(DisplayName = "INT-POS-08-04 | Product stopped")]
    public async Task INT_POS_08_04_ProductStopped()
    {
        var s = await ArrangeAsync();
        var admin = await ClientAsync(TestDataSeeder.Admin);
        var stop = await SendAsync(admin, HttpMethod.Patch, $"/api/products/{Ids.PTest}/toggle-status");
        Assert.True(stop.StatusCode == 200, $"Arrange: ngừng kinh doanh P-TEST thất bại {stop.StatusCode} {stop.Body}");
        var product = await QueryAsync(db => db.MstProducts.SingleAsync(p => p.ProductId == Ids.PTest));
        Assert.False(product.IsActive ?? true, "Arrange: P-TEST phải ở trạng thái ngừng kinh doanh");

        var res = await PostAsync(s, "/api/orders/pos", Pos(WalkIn, K001, "CASH", 200_000m, new[] { (Ids.PTest, 2m, PTestPrice) }));

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", "Sản phẩm '<name>' (P-TEST) đã ngừng kinh doanh/ngừng hoạt động (POS-003).", res.Message);
        check.Equal("Không đổi tồn K001", 50m, await StockAsync(K001, Ids.PTest));
        check.Equal("Không tạo hóa đơn", 0, await CountOrdersAsync("INVOICE"));
        check.Assert();
    }

    [Fact(DisplayName = "INT-POS-08-05 | Warehouse not assigned")]
    public async Task INT_POS_08_05_WarehouseNotAssigned()
    {
        await SetStockAsync(K001, Ids.PTest, 50);
        var k002Only = await ClientAsync(TestDataSeeder.SalesK002); // Precondition: SALES_CREATE, chỉ quyền kho K002

        var res = await PostAsync(k002Only, "/api/orders/pos", Pos(WalkIn, K001, "CASH", 200_000m, new[] { (Ids.PTest, 2m, PTestPrice) }));

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", "Bạn không có quyền xuất hàng từ kho 'Kho Tổng Gia Lâm' (AUTH-WH).", res.Message);
        check.Equal("Không đổi tồn K001", 50m, await StockAsync(K001, Ids.PTest));
        check.Equal("Không tạo hóa đơn", 0, await CountOrdersAsync("INVOICE"));
        check.Assert();
    }

    [Fact(DisplayName = "INT-POS-08-06 | Cancel the invoice")]
    public async Task INT_POS_08_06_CancelInvoice()
    {
        var s = await ArrangeAsync();
        var orderId = await ArrangeInvoiceAsync(s, Pos(WalkIn, K001, "CASH", 200_000m, new[] { (Ids.PTest, 2m, PTestPrice) }), "Hóa đơn tiền mặt P-TEST x2");
        Assert.Equal(48m, await StockAsync(K001, Ids.PTest));

        var res = await PostAsync(s, $"/api/orders/{orderId}/cancel");

        var check = new Checks(Output);
        check.Success(res);
        check.Equal("Hóa đơn CANCELLED", "CANCELLED", (await OrderAsync(orderId))?.Status);
        check.Equal("Tồn K001 trở lại", 50m, await StockAsync(K001, Ids.PTest));
        var card = await StockCardOfInvoiceAsync(orderId);
        Actual("Thẻ kho", card.Select(c => new { c.TransactionType, c.Quantity, c.BalanceAfter }));
        check.True("Có dòng ISSUE_SALE_CANCEL +2", card.Any(c => c.TransactionType == "ISSUE_SALE_CANCEL" && c.Quantity == 2m),
            string.Join(", ", card.Select(c => $"{c.TransactionType} {c.Quantity}")));
        check.Assert();
    }

    /// <summary>
    /// Ca BỔ SUNG (không có trong workbook) – yêu cầu 11: rollback transaction.
    /// Căn cứ Report 3 mục 4.2.3 (Inventory Consistency: "a failed transaction must not partially update inventory";
    /// Transaction Recovery: không báo hoàn thành nếu transaction chưa commit).
    /// Gây lỗi khi lưu dòng thẻ kho (sau khi hóa đơn, dòng hàng, phiếu xuất đã được ghi trong cùng transaction).
    /// </summary>
    [Fact(DisplayName = "INT-POS-08-S01 | (Bổ sung) Lỗi giữa chừng khi bán POS → rollback toàn bộ")]
    public async Task INT_POS_08_S01_RollbackOnFailure()
    {
        var s = await ArrangeAsync();
        Fx.Faults.FailWhenAdding<TrxInventoryTransaction>("lỗi khi ghi thẻ kho của hóa đơn POS");

        var res = await PostAsync(s, "/api/orders/pos", Pos(WalkIn, K001, "CASH", 200_000m, new[] { (Ids.PTest, 2m, PTestPrice) }));

        var check = new Checks(Output);
        check.Equal("Đã kích hoạt lỗi giữa chừng", 1, Fx.Faults.FiredCount);
        check.Equal("HTTP status (lỗi máy chủ, không báo thành công)", 500, res.StatusCode);
        check.Equal("Không còn hóa đơn", 0, await CountOrdersAsync("INVOICE"));
        check.Equal("Không còn dòng hàng", 0, await QueryAsync(db => db.DtlOrderItems.CountAsync()));
        check.Equal("Không còn phiếu xuất kho", 0, await QueryAsync(db => db.TrxStockIssues.CountAsync()));
        check.Equal("Tồn K001 không đổi", 50m, await StockAsync(K001, Ids.PTest));
        check.Equal("Không có thẻ kho", 0, await CountInventoryTransactionsAsync());
        check.Equal("Không có phiếu thu", 0, await QueryAsync(db => db.TrxFinancialTransactions.CountAsync(t => t.TxType == "RECEIPT")));
        check.Assert();
    }
}
