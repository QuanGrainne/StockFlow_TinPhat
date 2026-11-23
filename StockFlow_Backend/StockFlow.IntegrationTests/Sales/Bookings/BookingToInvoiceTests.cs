using Microsoft.EntityFrameworkCore;
using StockFlow.Domain.Entities;
using StockFlow.IntegrationTests.Infrastructure;
using Xunit;
using Xunit.Abstractions;

namespace StockFlow.IntegrationTests.Sales.Bookings;

/// <summary>
/// Report 5.2 – sheet "Booking to Delivery Invoice" (chức năng 13, UC-35, UC-36 theo code).
/// Precondition: User S có SALES_CREATE, quyền kho K001; DH0001 DRAFT: KH-HM01, K001, P-TEST x5, trả trước 200.000.
/// Tồn P-TEST tại K001 không ghi trong Precondition: đặt 50.
/// Luồng: POST /api/orders/pos (BookingOrderId) → CreatePosOrderCommandHandler + SalesBookingOps.SettleWithInvoice;
///        hủy phiếu thu: POST /api/customers/{id}/receipts/{code}/cancel → CancelCustomerReceiptCommandHandler.
/// </summary>
public sealed class BookingToInvoiceTests : SalesTestBase
{
    public BookingToInvoiceTests(IntegrationTestFixture fixture, ITestOutputHelper output) : base(fixture, output) { }

    private async Task<(HttpClient S, int Dh1, string Dh1Code)> ArrangeAsync()
    {
        await SetStockAsync(K001, Ids.PTest, 50);
        var s = await ClientAsync(TestDataSeeder.SalesK001);
        var dh1 = await ArrangeBookingAsync(s, Booking(Ids.KhHm01, K001, new[] { (Ids.PTest, 5m, PTestPrice) }, paid: 200_000m),
            "DH0001 (KH-HM01, P-TEST x5, trả trước 200.000)");
        return (s, dh1.Id, dh1.Code);
    }

    [Fact(DisplayName = "INT-SBK-13-01 | Invoice the whole booking")]
    public async Task INT_SBK_13_01_InvoiceWholeBooking()
    {
        var (s, dh1, _) = await ArrangeAsync();

        // 1. Mở DH0001 ở POS và trả phần còn lại (500.000 − 200.000 trả trước = 300.000)
        var res = await PostAsync(s, "/api/orders/pos", Pos(Ids.KhHm01, K001, "CASH", 300_000m, new[] { (Ids.PTest, 5m, PTestPrice) }, bookingOrderId: dh1));

        var check = new Checks(Output);
        check.Success(res);
        var invoiceId = res.IsSuccess ? res.Int("orderId") : 0;
        var invoice = await QueryAsync(db => db.TrxOrders.FirstOrDefaultAsync(o => o.OrderId == invoiceId));
        check.Equal("Hóa đơn COMPLETED", "COMPLETED", invoice?.Status);
        check.Equal("bookingOrderId = DH0001", (int?)dh1, invoice?.BookingOrderId);
        check.Equal("Tồn K001 giảm 5", 45m, await StockAsync(K001, Ids.PTest));
        check.Equal("Tiền trả trước 200.000 trừ vào hóa đơn", 200_000m, invoice?.DepositAmount);
        check.Equal("Hóa đơn không còn nợ", 0m, invoice?.OutstandingAmount);
        Actual("Đơn đặt sau khi tạo hóa đơn", new { (await OrderAsync(dh1))?.Status });
        Actual("Phiếu thu", (await QueryAsync(db => db.TrxFinancialTransactions.ToListAsync())).Select(t => new { t.TxCode, t.Amount, t.ReferenceId, t.Status }));
        check.Assert();
    }

    [Fact(DisplayName = "INT-SBK-13-02 | Invoice for another customer")]
    public async Task INT_SBK_13_02_InvoiceForAnotherCustomer()
    {
        var (s, dh1, code) = await ArrangeAsync();

        var res = await PostAsync(s, "/api/orders/pos", Pos(Ids.KhAbc, K001, "CASH", 500_000m, new[] { (Ids.PTest, 5m, PTestPrice) }, bookingOrderId: dh1));

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        // "DH0001" trong workbook = mã thật của đơn đặt ở bước Arrange
        check.Message("Thông báo", $"Hóa đơn phải cùng khách hàng với đơn đặt hàng {code}.", res.Message);
        check.Equal("Không tạo hóa đơn", 0, await CountOrdersAsync("INVOICE"));
        check.Equal("Tồn không đổi", 50m, await StockAsync(K001, Ids.PTest));
        check.Assert();
    }

    [Fact(DisplayName = "INT-SBK-13-03 | Invoice from another branch")]
    public async Task INT_SBK_13_03_InvoiceFromAnotherBranch()
    {
        var (s, dh1, code) = await ArrangeAsync(); // User S theo Precondition: chỉ quyền kho K001

        var res = await PostAsync(s, "/api/orders/pos", Pos(Ids.KhHm01, K002, "CASH", 300_000m, new[] { (Ids.PTest, 5m, PTestPrice) }, bookingOrderId: dh1));

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", $"Đơn đặt hàng {code} thuộc chi nhánh khác — hóa đơn phải xuất từ chi nhánh xử lý của đơn.", res.Message);
        check.Equal("Không tạo hóa đơn", 0, await CountOrdersAsync("INVOICE"));
        check.Assert();
    }

    [Fact(DisplayName = "INT-SBK-13-04 | Cancelled booking")]
    public async Task INT_SBK_13_04_CancelledBooking()
    {
        var (s, dh1, code) = await ArrangeAsync();
        var cancel = await PostAsync(s, $"/api/sales-bookings/{dh1}/cancel?keepDeposit=false"); // 1. Cancel DH0001
        Assert.True(cancel.IsSuccess, cancel.Body);

        var res = await PostAsync(s, "/api/orders/pos", Pos(Ids.KhHm01, K001, "CASH", 500_000m, new[] { (Ids.PTest, 5m, PTestPrice) }, bookingOrderId: dh1));

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", $"Đơn đặt hàng {code} đã hoàn thành hoặc đã hủy.", res.Message);
        check.Equal("Không tạo hóa đơn", 0, await CountOrdersAsync("INVOICE"));
        check.Equal("Tồn không đổi", 50m, await StockAsync(K001, Ids.PTest));
        check.Assert();
    }

    [Fact(DisplayName = "INT-SBK-13-05 | Deposit receipt locked")]
    public async Task INT_SBK_13_05_DepositReceiptLocked()
    {
        var (s, dh1, _) = await ArrangeAsync();
        await ArrangeInvoiceAsync(s, Pos(Ids.KhHm01, K001, "CASH", 300_000m, new[] { (Ids.PTest, 5m, PTestPrice) }, bookingOrderId: dh1),
            "Hóa đơn giao hàng từ DH0001");
        var deposit = (await FinancialAsync("SALES_ORDER", dh1)).Single();
        var debtBefore = await DebtAsync(Ids.KhHm01);

        // 1. Sau khi tạo hóa đơn, hủy phiếu thu tiền trả trước
        var res = await PostAsync(s, $"/api/customers/{Ids.KhHm01}/receipts/{deposit.TxCode}/cancel");

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", "Tiền trả trước của đơn đặt hàng đã được trừ vào hóa đơn giao hàng, không hủy phiếu thu được.", res.Message);
        check.Equal("Phiếu thu vẫn COMPLETED", "COMPLETED", (await FinancialAsync("SALES_ORDER", dh1)).Single().Status);
        check.Equal("Dư nợ không đổi", debtBefore, await DebtAsync(Ids.KhHm01));
        check.Assert();
    }

    /// <summary>
    /// Ca BỔ SUNG – yêu cầu 11: tạo hóa đơn từ đơn đặt ghi nhiều bảng (hóa đơn, phiếu xuất, thẻ kho, công nợ, chốt đơn đặt).
    /// Gây lỗi khi lưu thẻ kho → đơn đặt phải vẫn DRAFT, tồn không đổi, không có hóa đơn.
    /// </summary>
    [Fact(DisplayName = "INT-SBK-13-S01 | (Bổ sung) Lỗi khi tạo hóa đơn từ đơn đặt → rollback")]
    public async Task INT_SBK_13_S01_RollbackOnInvoiceFailure()
    {
        var (s, dh1, _) = await ArrangeAsync();
        var debtBefore = await DebtAsync(Ids.KhHm01);
        Fx.Faults.FailWhenAdding<TrxInventoryTransaction>("lỗi khi ghi thẻ kho của hóa đơn giao hàng");

        var res = await PostAsync(s, "/api/orders/pos", Pos(Ids.KhHm01, K001, "CASH", 300_000m, new[] { (Ids.PTest, 5m, PTestPrice) }, bookingOrderId: dh1));

        var check = new Checks(Output);
        check.Equal("Đã kích hoạt lỗi giữa chừng", 1, Fx.Faults.FiredCount);
        check.Equal("HTTP status", 500, res.StatusCode);
        check.Equal("Không có hóa đơn", 0, await CountOrdersAsync("INVOICE"));
        check.Equal("Đơn đặt vẫn DRAFT", "DRAFT", (await OrderAsync(dh1))?.Status);
        check.Equal("Tồn K001 không đổi", 50m, await StockAsync(K001, Ids.PTest));
        check.Equal("Dư nợ không đổi", debtBefore, await DebtAsync(Ids.KhHm01));
        check.Assert();
    }

    /// <summary>
    /// Ca BỔ SUNG – nhất quán công nợ (Report 3 BR-15: nợ phải thu tăng phần chưa trả của hóa đơn, giảm theo phiếu thu).
    /// Đơn 500.000: thu trả trước 200.000, hóa đơn thu thêm 300.000 → khách đã trả đủ, dư nợ quay về như trước khi đặt.
    /// </summary>
    [Fact(DisplayName = "INT-SBK-13-S02 | (Bổ sung) Công nợ nhất quán sau đặt cọc + hóa đơn trả đủ (BR-15)")]
    public async Task INT_SBK_13_S02_DebtConsistency()
    {
        await SetStockAsync(K001, Ids.PTest, 50);
        var s = await ClientAsync(TestDataSeeder.SalesK001);
        var debtStart = await DebtAsync(Ids.KhHm01);
        var dh1 = await ArrangeBookingAsync(s, Booking(Ids.KhHm01, K001, new[] { (Ids.PTest, 5m, PTestPrice) }, paid: 200_000m), "DH0001");
        var debtAfterDeposit = await DebtAsync(Ids.KhHm01);

        var res = await PostAsync(s, "/api/orders/pos", Pos(Ids.KhHm01, K001, "CASH", 300_000m, new[] { (Ids.PTest, 5m, PTestPrice) }, bookingOrderId: dh1.Id));

        var check = new Checks(Output);
        check.Success(res);
        check.Equal("Dư nợ sau thu trả trước giảm 200.000", debtStart - 200_000m, debtAfterDeposit);
        check.Equal("Dư nợ sau hóa đơn trả đủ = ban đầu", debtStart, await DebtAsync(Ids.KhHm01));
        var receipts = await QueryAsync(db => db.TrxFinancialTransactions.Where(t => t.PartnerId == Ids.KhHm01 && t.Status == "COMPLETED").SumAsync(t => t.Amount ?? 0));
        check.Equal("Tổng phiếu thu = giá trị hóa đơn", 500_000m, receipts);
        check.Assert();
    }

    /// <summary>
    /// Ca BỔ SUNG cho INT-SBK-13-03: Precondition gốc (User S chỉ có K001) làm API dừng ở kiểm tra quyền kho K002 trước;
    /// ca này dùng tài khoản có cả K001 + K002 để kiểm tra đúng luật "hóa đơn phải xuất từ chi nhánh xử lý của đơn".
    /// </summary>
    [Fact(DisplayName = "INT-SBK-13-S03 | (Bổ sung) Hóa đơn khác chi nhánh, người dùng có quyền cả 2 kho")]
    public async Task INT_SBK_13_S03_AnotherBranchWithBothWarehouses()
    {
        var (s, dh1, code) = await ArrangeAsync();
        var both = await ClientAsync(TestDataSeeder.SalesK001K002);

        var res = await PostAsync(both, "/api/orders/pos", Pos(Ids.KhHm01, K002, "CASH", 300_000m, new[] { (Ids.PTest, 5m, PTestPrice) }, bookingOrderId: dh1));

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", $"Đơn đặt hàng {code} thuộc chi nhánh khác — hóa đơn phải xuất từ chi nhánh xử lý của đơn.", res.Message);
        check.Equal("Không tạo hóa đơn", 0, await CountOrdersAsync("INVOICE"));
        check.Assert();
    }
}
