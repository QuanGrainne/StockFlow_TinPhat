using Microsoft.EntityFrameworkCore;
using StockFlow.IntegrationTests.Infrastructure;
using Xunit;
using Xunit.Abstractions;

namespace StockFlow.IntegrationTests.Sales.Pos;

/// <summary>
/// Report 5.2 – sheet "POS Debt Sale and Credit Limit" (chức năng 9, BR-12, UC-29).
/// Precondition chung: User S có SALES_CREATE, quyền kho K001; KH-HM01 hạn mức 10.000.000, dư nợ 0.
/// Tồn P-TEST tại K001 không ghi trong Precondition: đặt 50 để ca chỉ kiểm hạn mức tín dụng.
/// Bảng: trx_orders, mst_business_partners (current_debt, credit_limit), trx_financial_transactions, mst_debt_warning_settings.
/// </summary>
public sealed class PosDebtSaleTests : SalesTestBase
{
    public PosDebtSaleTests(IntegrationTestFixture fixture, ITestOutputHelper output) : base(fixture, output) { }

    private async Task<HttpClient> ArrangeAsync()
    {
        await SetStockAsync(K001, Ids.PTest, 50);
        return await ClientAsync(TestDataSeeder.SalesK001);
    }

    [Fact(DisplayName = "INT-POS-09-01 | Debt sale within limit")]
    public async Task INT_POS_09_01_DebtSaleWithinLimit()
    {
        var s = await ArrangeAsync();

        var res = await PostAsync(s, "/api/orders/pos", Pos(Ids.KhHm01, K001, "DEBT", 0m, new[] { (Ids.PTest, 3m, PTestPrice) }));

        var check = new Checks(Output);
        check.Success(res);
        var order = await OrderAsync(res.IsSuccess ? res.Int("orderId") : 0);
        check.Equal("Hóa đơn COMPLETED", "COMPLETED", order?.Status);
        check.Equal("Dư nợ KH-HM01", 300_000m, await DebtAsync(Ids.KhHm01));
        Actual("Hóa đơn", new { order?.PaymentStatus, order?.OutstandingAmount, order?.PaidAmount });
        check.Assert();
    }

    [Fact(DisplayName = "INT-POS-09-02 | Partial payment")]
    public async Task INT_POS_09_02_PartialPayment()
    {
        var s = await ArrangeAsync();

        // Tổng 500.000 (P-TEST x5), trả tiền mặt 200.000, phần còn lại ghi nợ
        var res = await PostAsync(s, "/api/orders/pos", Pos(Ids.KhHm01, K001, "CASH", 200_000m, new[] { (Ids.PTest, 5m, PTestPrice) }));

        var check = new Checks(Output);
        check.Success(res);
        var orderId = res.IsSuccess ? res.Int("orderId") : 0;
        check.Equal("Dư nợ tăng 300.000", 300_000m, await DebtAsync(Ids.KhHm01));
        var receipts = await FinancialAsync("SALES_ORDER", orderId);
        Actual("Phiếu thu", receipts.Select(r => new { r.TxCode, r.Amount, r.PaymentMethod, r.Status }));
        check.True("Ghi nhận phiếu thu 200.000", receipts.Count == 1 && receipts[0].Amount == 200_000m && receipts[0].Status == "COMPLETED",
            string.Join(", ", receipts.Select(r => $"{r.Amount:N0} {r.Status}")));
        check.Assert();
    }

    [Fact(DisplayName = "INT-POS-09-03 | Customer limit 0")]
    public async Task INT_POS_09_03_CustomerLimitZero()
    {
        var s = await ArrangeAsync();

        var res = await PostAsync(s, "/api/orders/pos", Pos(Ids.KhZero, K001, "DEBT", 0m, new[] { (Ids.PTest, 1m, PTestPrice) }));

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo",
            "Khách hàng '<name>' không có hạn mức tín dụng (Hạn mức: 0 đ). Không thể thực hiện ghi công nợ (CUS-007).", res.Message);
        check.Equal("Không tạo hóa đơn", 0, await CountOrdersAsync("INVOICE"));
        check.Equal("Dư nợ KH-ZERO không đổi", 0m, await DebtAsync(Ids.KhZero));
        check.Assert();
    }

    [Fact(DisplayName = "INT-POS-09-04 | Limit used up")]
    public async Task INT_POS_09_04_LimitUsedUp()
    {
        var s = await ArrangeAsync();
        await SetDebtAsync(Ids.KhHm01, 10_000_000m); // 1. Customer debt = limit

        var res = await PostAsync(s, "/api/orders/pos", Pos(Ids.KhHm01, K001, "DEBT", 0m, new[] { (Ids.PTest, 1m, PTestPrice) }));

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Contains("Thông báo CUS-008", "CUS-008", res.Message);
        check.Equal("Dư nợ không đổi", 10_000_000m, await DebtAsync(Ids.KhHm01));
        check.Equal("Không tạo hóa đơn", 0, await CountOrdersAsync("INVOICE"));
        check.Assert();
    }

    [Fact(DisplayName = "INT-POS-09-05 | Above remaining limit")]
    public async Task INT_POS_09_05_AboveRemainingLimit()
    {
        var s = await ArrangeAsync();
        await SetDebtAsync(Ids.KhHm01, 9_900_000m);

        var res = await PostAsync(s, "/api/orders/pos", Pos(Ids.KhHm01, K001, "DEBT", 0m, new[] { (Ids.PTest, 3m, PTestPrice) }));

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Contains("Thông báo CUS-009", "CUS-009", res.Message);
        // Số tiền trong câu do máy chủ định dạng N0 theo culture của tiến trình (máy test: en-US → 100,000)
        check.Contains("Còn được nợ 100.000 (remaining 100,000)", $"Còn được nợ: {100_000m:N0} đ", res.Message);
        check.Equal("Dư nợ không đổi", 9_900_000m, await DebtAsync(Ids.KhHm01));
        check.Assert();
    }

    [Fact(DisplayName = "INT-POS-09-06 | Inactive customer")]
    public async Task INT_POS_09_06_InactiveCustomer()
    {
        var s = await ArrangeAsync();
        // 1. Deactivate KH-HM01 (Admin, API PATCH /api/customers/{id}/toggle-status)
        var admin = await ClientAsync(TestDataSeeder.Admin);
        var off = await SendAsync(admin, HttpMethod.Patch, $"/api/customers/{Ids.KhHm01}/toggle-status");
        Assert.True(off.IsSuccess, $"Arrange: ngừng hoạt động KH-HM01 thất bại {off.StatusCode} {off.Body}");
        Assert.False((await QueryAsync(db => db.MstBusinessPartners.SingleAsync(p => p.PartnerId == Ids.KhHm01))).IsActive ?? true);

        var res = await PostAsync(s, "/api/orders/pos", Pos(Ids.KhHm01, K001, "CASH", 100_000m, new[] { (Ids.PTest, 1m, PTestPrice) }));

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo",
            "Khách hàng 'Công ty Hoa Mai' đang trong trạng thái ngừng hoạt động, từ chối giao dịch (CUS-003).", res.Message);
        check.Equal("Không tạo hóa đơn", 0, await CountOrdersAsync("INVOICE"));
        check.Equal("Không đổi tồn", 50m, await StockAsync(K001, Ids.PTest));
        check.Assert();
    }
}
