using Microsoft.EntityFrameworkCore;
using StockFlow.Domain.Entities;
using StockFlow.IntegrationTests.Infrastructure;
using Xunit;
using Xunit.Abstractions;

namespace StockFlow.IntegrationTests.Sales.Bookings;

/// <summary>
/// Report 5.2 – sheet "Sales Booking and Deposit" (chức năng 11, UC-18..UC-22, BR-08).
/// Precondition chung: User S có SALES_CREATE, SALES_UPDATE, SALES_DELETE, quyền kho K001; tồn P-TEST 50.
/// Luồng: SalesBookingsController → SaveSalesBookingCommand / SalesBookingActionCommand (SalesBookingCommandHandler).
/// Bảng: trx_orders (order_type BOOKING), dtl_order_items, trx_financial_transactions (phiếu thu tiền trả trước),
///       mst_business_partners.current_debt, trx_inventory_balances (không được đổi – BR-08).
/// Ca 11-03..11-06 dùng đơn ở bước 11-01 (P-TEST x5, trả trước 200.000) làm dữ liệu sẵn có.
/// </summary>
public sealed class SalesBookingDepositTests : SalesTestBase
{
    public SalesBookingDepositTests(IntegrationTestFixture fixture, ITestOutputHelper output) : base(fixture, output) { }

    private async Task<HttpClient> ArrangeAsync()
    {
        await SetStockAsync(K001, Ids.PTest, 50);
        return await ClientAsync(TestDataSeeder.SalesK001);
    }

    private Task<(int Id, string Code)> ArrangeBookingWithDepositAsync(HttpClient s) =>
        ArrangeBookingAsync(s, Booking(Ids.KhHm01, K001, new[] { (Ids.PTest, 5m, PTestPrice) }, paid: 200_000m), "Đơn đặt KH-HM01 P-TEST x5, trả trước 200.000");

    [Fact(DisplayName = "INT-SBK-11-01 | Create a booking with deposit")]
    public async Task INT_SBK_11_01_CreateBookingWithDeposit()
    {
        var s = await ArrangeAsync();

        var res = await PostAsync(s, "/api/sales-bookings", Booking(Ids.KhHm01, K001, new[] { (Ids.PTest, 5m, PTestPrice) }, paid: 200_000m));

        var check = new Checks(Output);
        check.Success(res);
        var id = res.IsSuccess ? res.Int("orderId") : 0;
        var booking = await OrderAsync(id);
        check.Equal("Đơn đặt trạng thái", "DRAFT", booking?.Status);
        check.Equal("PaymentStatus", "PARTIAL", booking?.PaymentStatus);
        check.Equal("Tồn P-TEST không đổi (BR-08)", 50m, await StockAsync(K001, Ids.PTest));
        check.Equal("Không ghi thẻ kho", 0, await CountInventoryTransactionsAsync());
        var receipts = await FinancialAsync("SALES_ORDER", id);
        Actual("Phiếu thu tiền trả trước", receipts.Select(r => new { r.TxCode, r.TxType, r.Amount, r.Status }));
        check.True("Phiếu thu tiền trả trước COMPLETED", receipts.Count == 1 && receipts[0].Status == "COMPLETED" && receipts[0].Amount == 200_000m,
            string.Join(", ", receipts.Select(r => $"{r.TxCode} {r.Amount:N0} {r.Status}")));
        Actual("Dư nợ KH-HM01 sau khi thu trả trước", await DebtAsync(Ids.KhHm01));
        check.Assert();
    }

    [Fact(DisplayName = "INT-SBK-11-02 | Deposit above total")]
    public async Task INT_SBK_11_02_DepositAboveTotal()
    {
        var s = await ArrangeAsync();

        var res = await PostAsync(s, "/api/sales-bookings", Booking(Ids.KhHm01, K001, new[] { (Ids.PTest, 5m, PTestPrice) }, paid: 600_000m));

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", "Tiền khách trả trước (...) vượt quá giá trị đơn (...).", res.Message);
        check.Equal("Không tạo đơn đặt", 0, await CountOrdersAsync("BOOKING"));
        check.Equal("Không có phiếu thu", 0, await QueryAsync(db => db.TrxFinancialTransactions.CountAsync()));
        check.Assert();
    }

    [Fact(DisplayName = "INT-SBK-11-03 | Edit the booking")]
    public async Task INT_SBK_11_03_EditBooking()
    {
        var s = await ArrangeAsync();
        var (id, _) = await ArrangeBookingWithDepositAsync(s);

        // PUT qty 5 → 8 (tiền trả trước đã thu không gửi lại: PaidAmount = 0 là "thu thêm 0")
        var res = await PutAsync(s, $"/api/sales-bookings/{id}", Booking(Ids.KhHm01, K001, new[] { (Ids.PTest, 8m, PTestPrice) }));

        var check = new Checks(Output);
        check.Success(res);
        var booking = await OrderAsync(id);
        check.Equal("Số lượng dòng", 8m, booking?.DtlOrderItems.Single().Quantity);
        check.Equal("Tổng tiền tính lại", 800_000m, booking?.TotalAmount);
        Actual("Đơn sau sửa", new { booking?.Status, booking?.PaidAmount, booking?.PaymentStatus });
        check.Assert();
    }

    [Fact(DisplayName = "INT-SBK-11-04 | Change customer after deposit")]
    public async Task INT_SBK_11_04_ChangeCustomerAfterDeposit()
    {
        var s = await ArrangeAsync();
        var (id, _) = await ArrangeBookingWithDepositAsync(s);

        var res = await PutAsync(s, $"/api/sales-bookings/{id}", Booking(Ids.KhAbc, K001, new[] { (Ids.PTest, 5m, PTestPrice) }));

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", "Đơn đã có tiền khách trả trước, không đổi được khách hàng.", res.Message);
        check.Equal("Khách hàng của đơn không đổi", Ids.KhHm01, (await OrderAsync(id))?.PartnerId);
        check.Assert();
    }

    [Fact(DisplayName = "INT-SBK-11-05 | Cancel and refund")]
    public async Task INT_SBK_11_05_CancelAndRefund()
    {
        var s = await ArrangeAsync();
        var (id, _) = await ArrangeBookingWithDepositAsync(s);
        var debtBefore = await DebtAsync(Ids.KhHm01);

        // API nhận keepDeposit qua query string (workbook ghi dạng body {keepDeposit: false})
        var res = await PostAsync(s, $"/api/sales-bookings/{id}/cancel?keepDeposit=false");

        var check = new Checks(Output);
        check.Success(res);
        var booking = await OrderAsync(id);
        check.Equal("Đơn đặt CANCELLED", "CANCELLED", booking?.Status);
        var receipts = await FinancialAsync("SALES_ORDER", id);
        check.True("Phiếu thu tiền trả trước CANCELLED", receipts.Count == 1 && receipts[0].Status == "CANCELLED",
            string.Join(", ", receipts.Select(r => $"{r.TxCode} {r.Status}")));
        check.Equal("PaidAmount", 0m, booking?.PaidAmount);
        Actual("Dư nợ KH-HM01 trước / sau hủy", new { debtBefore, after = await DebtAsync(Ids.KhHm01) });
        check.Assert();
    }

    [Fact(DisplayName = "INT-SBK-11-06 | Branch not assigned")]
    public async Task INT_SBK_11_06_BranchNotAssigned()
    {
        var s = await ArrangeAsync();
        var (id, _) = await ArrangeBookingWithDepositAsync(s);
        var k002Only = await ClientAsync(TestDataSeeder.SalesK002); // SALES_UPDATE, chỉ quyền kho K002

        var res = await PutAsync(k002Only, $"/api/sales-bookings/{id}", Booking(Ids.KhHm01, K001, new[] { (Ids.PTest, 8m, PTestPrice) }));

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", "Bạn không có quyền sửa đơn đặt hàng của chi nhánh này.", res.Message);
        check.Equal("Đơn không đổi (SL 5)", 5m, (await OrderAsync(id))?.DtlOrderItems.Single().Quantity);
        check.Assert();
    }

    /// <summary>
    /// Ca BỔ SUNG – yêu cầu 11: đơn đặt có tiền trả trước ghi 2 lần (đơn + dòng hàng, rồi phiếu thu + công nợ) trong 1 transaction.
    /// Gây lỗi khi lưu phiếu thu → đơn đặt, dòng hàng, công nợ phải được rollback. Căn cứ Report 3 mục 4.2.3 (Data Integrity).
    /// </summary>
    [Fact(DisplayName = "INT-SBK-11-S01 | (Bổ sung) Lỗi khi lưu phiếu thu trả trước → rollback đơn đặt")]
    public async Task INT_SBK_11_S01_RollbackOnDepositFailure()
    {
        var s = await ArrangeAsync();
        Fx.Faults.FailWhenAdding<TrxFinancialTransaction>("lỗi khi lưu phiếu thu tiền trả trước");

        var res = await PostAsync(s, "/api/sales-bookings", Booking(Ids.KhHm01, K001, new[] { (Ids.PTest, 5m, PTestPrice) }, paid: 200_000m));

        var check = new Checks(Output);
        check.Equal("Đã kích hoạt lỗi giữa chừng", 1, Fx.Faults.FiredCount);
        check.Equal("HTTP status", 500, res.StatusCode);
        check.Equal("Không còn đơn đặt", 0, await CountOrdersAsync("BOOKING"));
        check.Equal("Không còn dòng hàng", 0, await QueryAsync(db => db.DtlOrderItems.CountAsync()));
        check.Equal("Không có phiếu thu", 0, await QueryAsync(db => db.TrxFinancialTransactions.CountAsync()));
        check.Equal("Dư nợ KH-HM01 không đổi", 0m, await DebtAsync(Ids.KhHm01));
        check.Assert();
    }
}
