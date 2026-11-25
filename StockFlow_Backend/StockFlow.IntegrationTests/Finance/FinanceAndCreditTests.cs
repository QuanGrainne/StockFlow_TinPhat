using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Features.Customers.Commands;
using StockFlow.Application.Features.Customers.DTOs;
using StockFlow.Application.Features.Purchases.DTOs;
using StockFlow.Application.Features.Suppliers.Commands;
using StockFlow.Application.Features.Suppliers.DTOs;
using StockFlow.Application.Features.CreditRequests.DTOs;
using StockFlow.IntegrationTests.Infrastructure;
using StockFlow.IntegrationTests.Inventory;
using Xunit;
using Xunit.Abstractions;

namespace StockFlow.IntegrationTests.Finance;

/// <summary>
/// Report 5.2 – sheet "Customer Receipts and Debt" (chức năng 4, UC-84, UC-29), "Supplier Payments and Payable" (5, UC-85, UC-71),
/// "Credit Limit Request" (6, UC-27, UC-64, BR-12, BR-13), "Credit Limit Settings" (7, UC-55, UC-66).
/// User A / Manager M = it.ops.k001 (FIN_*, SALES_APPROVE, chức năng công nợ / duyệt hạn mức); Manager thứ hai = manager01;
/// Sales Accountant S = it.sales.k001. Số tiền trong câu thông báo do API định dạng theo culture của tiến trình (máy test: en-US).
/// </summary>
public sealed class FinanceAndCreditTests : InventoryTestBase
{
    public FinanceAndCreditTests(IntegrationTestFixture fixture, ITestOutputHelper output) : base(fixture, output) { }

    private Task<decimal> SupplierPayableAsync() => QueryAsync(async db => (await db.MstBusinessPartners.SingleAsync(p => p.PartnerId == Ids.Ncc01)).CurrentPayable ?? 0);

    // ───────── Customer Receipts & Debt Ledger ─────────

    /// <summary>KH-HM01 nợ 5.000.000 từ hóa đơn HD0001 (POS ghi nợ P-TEST × 50 @ 100.000).</summary>
    private async Task<(HttpClient A, int Hd1)> ArrangeCustomerDebtAsync()
    {
        await SetStockAsync(K001, Ids.PTest, 100);
        var s = await ClientAsync(TestDataSeeder.SalesK001);
        var hd1 = await ArrangeInvoiceAsync(s, Pos(Ids.KhHm01, K001, "DEBT", 0m, new[] { (Ids.PTest, 50m, PTestPrice) }), "HD0001 ghi nợ 5.000.000");
        Assert.Equal(5_000_000m, await DebtAsync(Ids.KhHm01));
        return (await ClientAsync(TestDataSeeder.OpsK001), hd1);
    }

    private async Task<string> ArrangeReceiptAsync(HttpClient a, int hd1, decimal amount)
    {
        var res = await PostAsync(a, $"/api/customers/{Ids.KhHm01}/payments",
            new CreateCustomerPaymentRequest(amount, null, "CASH", null, new() { new CustomerPaymentAllocationRequest(hd1, amount) }));
        Assert.True(res.IsSuccess, $"Arrange phiếu thu: {res.StatusCode} {res.Body}");
        var code = res.String("voucherCode")!;
        Step($"Arrange: phiếu thu {code} {amount:N0}");
        return code;
    }

    [Fact(DisplayName = "INT-FIN-04-01 | Receipt allocated to an invoice")]
    public async Task INT_FIN_04_01_ReceiptAllocated()
    {
        var (a, hd1) = await ArrangeCustomerDebtAsync();
        var res = await PostAsync(a, $"/api/customers/{Ids.KhHm01}/payments",
            new CreateCustomerPaymentRequest(2_000_000m, null, "CASH", null, new() { new CustomerPaymentAllocationRequest(hd1, 2_000_000m) }));

        var check = new Checks(Output);
        check.Success(res);
        var code = res.String("voucherCode") ?? "";
        var receipts = await QueryAsync(db => db.TrxFinancialTransactions.Where(t => t.TxCode == code).ToListAsync());
        Actual("Phiếu thu", receipts.Select(r => new { r.TxCode, r.TxType, r.Amount, r.ReferenceType, r.ReferenceId }));
        // v1.1: phiếu thu phân bổ cho hóa đơn có mã TT + mã hóa đơn (VD TTHD00001)
        check.True("Phiếu thu TTHDxxxxx được tạo", receipts.Count > 0 && code.StartsWith("TTHD"), code);
        check.Equal("Dư nợ KH-HM01", 3_000_000m, await DebtAsync(Ids.KhHm01));
        check.Equal("HD0001 còn nợ", 3_000_000m, (await OrderAsync(hd1))?.OutstandingAmount);
        check.True("Giao dịch loại RECEIPT", receipts.Count > 0 && receipts.All(r => r.TxType == "RECEIPT"), string.Join(", ", receipts.Select(r => r.TxType)));
        check.Assert();
    }

    [Fact(DisplayName = "INT-FIN-04-02 | Receipt above debt")]
    public async Task INT_FIN_04_02_ReceiptAboveDebt()
    {
        var (a, _) = await ArrangeCustomerDebtAsync();
        var res = await PostAsync(a, $"/api/customers/{Ids.KhHm01}/payments", new CreateCustomerPaymentRequest(5_000_001m, null, "CASH", null, null));

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", "Số tiền thu (5.000.001) vượt quá nợ hiện tại của khách (5.000.000).", res);
        check.Equal("Dư nợ không đổi", 5_000_000m, await DebtAsync(Ids.KhHm01));
        check.Assert();
    }

    [Fact(DisplayName = "INT-FIN-04-03 | Allocation above invoice remaining")]
    public async Task INT_FIN_04_03_AllocationAbove()
    {
        var (a, hd1) = await ArrangeCustomerDebtAsync();
        var res = await PostAsync(a, $"/api/customers/{Ids.KhHm01}/payments",
            new CreateCustomerPaymentRequest(1_000_000m, null, "CASH", null, new() { new CustomerPaymentAllocationRequest(hd1, 6_000_000m) }));

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", "Tổng tiền phân bổ vượt quá số tiền thu.", res);
        check.Assert();
    }

    [Fact(DisplayName = "INT-FIN-04-04 | Cancel a receipt")]
    public async Task INT_FIN_04_04_CancelReceipt()
    {
        var (a, hd1) = await ArrangeCustomerDebtAsync();
        var code = await ArrangeReceiptAsync(a, hd1, 2_000_000m);

        var res = await PostAsync(a, $"/api/customers/{Ids.KhHm01}/receipts/{code}/cancel");

        var check = new Checks(Output);
        check.Success(res);
        var r = await QueryAsync(db => db.TrxFinancialTransactions.Where(t => t.TxCode == code).ToListAsync());
        check.True("Phiếu thu CANCELLED", r.Count > 0 && r.All(x => x.Status == "CANCELLED"), string.Join(", ", r.Select(x => x.Status)));
        check.Equal("Dư nợ trở lại 5.000.000", 5_000_000m, await DebtAsync(Ids.KhHm01));
        check.Assert();
    }

    [Fact(DisplayName = "INT-FIN-04-05 | Cancel twice")]
    public async Task INT_FIN_04_05_CancelTwice()
    {
        var (a, hd1) = await ArrangeCustomerDebtAsync();
        var code = await ArrangeReceiptAsync(a, hd1, 2_000_000m);
        Assert.True((await PostAsync(a, $"/api/customers/{Ids.KhHm01}/receipts/{code}/cancel")).IsSuccess);

        var res = await PostAsync(a, $"/api/customers/{Ids.KhHm01}/receipts/{code}/cancel");

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", $"Không tìm thấy phiếu thu {code} hoặc phiếu đã hủy.", res);
        check.Equal("Dư nợ chỉ cộng lại một lần", 5_000_000m, await DebtAsync(Ids.KhHm01));
        check.Assert();
    }

    [Fact(DisplayName = "INT-FIN-04-06 | Debt adjustment")]
    public async Task INT_FIN_04_06_DebtAdjustment()
    {
        var (a, _) = await ArrangeCustomerDebtAsync();
        var res = await PostAsync(a, $"/api/customers/{Ids.KhHm01}/debt-adjustments",
            new AdjustCustomerDebtRequest { NewDebt = 4_500_000m, Description = "Đối chiếu" });

        var check = new Checks(Output);
        check.Success(res);
        var adj = await QueryAsync(db => db.TrxFinancialTransactions.Where(t => t.TxType == "DEBT_ADJUST").ToListAsync());
        Actual("Phiếu điều chỉnh", adj.Select(x => new { x.TxCode, x.TxType, x.Amount }));
        check.True("Phiếu DCxxxx, giao dịch DEBT_ADJUST", adj.Count == 1 && adj[0].TxCode!.StartsWith("DC"), $"{adj.Count} dòng");
        check.Equal("Dư nợ 4.500.000", 4_500_000m, await DebtAsync(Ids.KhHm01));
        check.Assert();
    }

    // ───────── Supplier Payments & Payable ─────────

    /// <summary>NCC-01 nợ cần trả 10.000.000 từ phiếu nhập NH0001 (P-TEST × 1.000 @ 10.000, chưa trả).</summary>
    private async Task<(HttpClient A, int Nh1)> ArrangePayableAsync()
    {
        await SetStockAsync(K001, Ids.PTest, 100, 10_000m);
        var a = await ClientAsync(TestDataSeeder.OpsK001);
        var nh1 = await ArrangePurchaseAsync(a, K001, "COMPLETED", (Ids.PTest, 1_000m, 10_000m));
        Assert.Equal(10_000_000m, await SupplierPayableAsync());
        return (a, nh1);
    }

    private Task<ApiResult> PaySupplierAsync(HttpClient a, decimal amount, int? receiptId = null) =>
        PostAsync(a, $"/api/suppliers/{Ids.Ncc01}/payments", new CreateSupplierPaymentRequest(amount, null, "CASH", null,
            receiptId.HasValue ? new() { new SupplierPaymentAllocationRequest(receiptId.Value, amount) } : null));

    [Fact(DisplayName = "INT-FIN-05-01 | Pay part of the payable")]
    public async Task INT_FIN_05_01_PayPart()
    {
        var (a, nh1) = await ArrangePayableAsync();
        var res = await PaySupplierAsync(a, 4_000_000m, nh1);

        var check = new Checks(Output);
        check.Success(res);
        var pays = await QueryAsync(db => db.TrxFinancialTransactions.Where(t => t.TxType == "SUPPLIER_PAYMENT").ToListAsync());
        Actual("Phiếu chi", pays.Select(p => new { p.TxCode, p.TxType, p.Amount }));
        check.True("Phiếu PCxxxx, giao dịch SUPPLIER_PAYMENT", pays.Count > 0 && pays.All(p => p.TxCode!.StartsWith("PC")), $"{pays.Count} dòng");
        check.Equal("Nợ cần trả NCC", 6_000_000m, await SupplierPayableAsync());
        check.Assert();
    }

    [Fact(DisplayName = "INT-FIN-05-02 | Pay the full payable")]
    public async Task INT_FIN_05_02_PayFull()
    {
        var (a, nh1) = await ArrangePayableAsync();
        Assert.True((await PaySupplierAsync(a, 4_000_000m, nh1)).IsSuccess); // còn 6.000.000

        var res = await PaySupplierAsync(a, 6_000_000m);

        var check = new Checks(Output);
        check.Success(res);
        check.Equal("Nợ cần trả NCC = 0", 0m, await SupplierPayableAsync());
        check.Assert();
    }

    [Fact(DisplayName = "INT-FIN-05-03 | Overpay")]
    public async Task INT_FIN_05_03_Overpay()
    {
        var (a, _) = await ArrangePayableAsync();
        var res = await PaySupplierAsync(a, 10_000_001m);

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", "Số tiền thanh toán (10.000.001) vượt quá nợ hiện tại của nhà cung cấp (10.000.000).", res);
        check.Equal("Nợ không đổi", 10_000_000m, await SupplierPayableAsync());
        check.Assert();
    }

    [Fact(DisplayName = "INT-FIN-05-04 | Receipt paid cannot be cancelled")]
    public async Task INT_FIN_05_04_PaidReceiptCannotBeCancelled()
    {
        var (a, nh1) = await ArrangePayableAsync();
        Assert.True((await PaySupplierAsync(a, 4_000_000m, nh1)).IsSuccess);
        var stock = await StockAsync(K001, Ids.PTest);

        var res = await SendAsync(a, HttpMethod.Patch, $"/api/purchases/{nh1}/cancel", new CancelPurchaseRequest("Hủy"));

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", "Phiếu nhập đã được thanh toán bằng phiếu chi ...", res);
        check.Equal("Tồn không đổi", stock, await StockAsync(K001, Ids.PTest));
        check.Equal("Nợ không đổi", 6_000_000m, await SupplierPayableAsync());
        check.Assert();
    }

    [Fact(DisplayName = "INT-FIN-05-05 | Supplier debt adjustment")]
    public async Task INT_FIN_05_05_SameValueAdjustment()
    {
        var (a, _) = await ArrangePayableAsync();
        var res = await PostAsync(a, $"/api/suppliers/{Ids.Ncc01}/debt-adjustments", new AdjustSupplierDebtRequest { NewDebt = 10_000_000m, Description = "Đối chiếu" });

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", "Giá trị nợ điều chỉnh bằng nợ cần trả hiện tại — không có gì thay đổi.", res);
        check.Assert();
    }

    // ───────── Credit Limit Request & Approval ─────────

    private async Task<(HttpClient S, HttpClient M)> ArrangeCreditAsync()
    {
        await SetStockAsync(K001, Ids.PTest, 100);
        await SetDebtAsync(Ids.KhHm01, 9_000_000m); // hạn mức 10.000.000, nợ 9.000.000
        return (await ClientAsync(TestDataSeeder.SalesK001), await ClientAsync(TestDataSeeder.OpsK001));
    }

    private static CreateCreditRequestRequest CreditRequest(int partnerId, decimal expectedNewDebt) =>
        new() { PartnerId = partnerId, ExpectedNewDebt = expectedNewDebt, RequestedLimit = 12_000_000m, Reason = "Khách quen" };

    private async Task<int> ArrangeCreditRequestAsync(HttpClient s)
    {
        var res = await PostAsync(s, "/api/credit-requests", CreditRequest(Ids.KhHm01, 2_000_000m));
        Assert.True(res.IsSuccess, $"Arrange yêu cầu hạn mức: {res.StatusCode} {res.Body}");
        return await QueryAsync(db => db.TrxCreditLimitRequests.OrderByDescending(r => r.RequestId).Select(r => r.RequestId).FirstAsync());
    }

    /// <summary>Body duyệt hợp lệ theo API thật (chỉ còn loại NEW_LIMIT – nâng hạn mức).</summary>
    private static ApproveCreditRequestRequest NewLimit(decimal limit) => new() { ApprovalType = "NEW_LIMIT", ApprovedLimit = limit };

    private Task<decimal> CreditLimitAsync(int partnerId) => QueryAsync(async db => (await db.MstBusinessPartners.SingleAsync(p => p.PartnerId == partnerId)).CreditLimit ?? 0);

    [Fact(DisplayName = "INT-CRD-06-01 | POS blocked over the limit")]
    public async Task INT_CRD_06_01_PosBlocked()
    {
        var (s, _) = await ArrangeCreditAsync();
        var res = await PostAsync(s, "/api/orders/pos", Pos(Ids.KhHm01, K001, "DEBT", 0m, new[] { (Ids.PTest, 20m, PTestPrice) }));

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Contains("Mã CUS-009", "CUS-009", res);
        check.Message("Thông báo", "Khoản nợ 2.000.000 đ vượt quá hạn mức tín dụng còn lại ...", res);
        check.Equal("Không tạo hóa đơn", 0, await CountOrdersAsync("INVOICE"));
        check.Assert();
    }

    [Fact(DisplayName = "INT-CRD-06-02 | Send a request")]
    public async Task INT_CRD_06_02_SendRequest()
    {
        var (s, _) = await ArrangeCreditAsync();
        var res = await PostAsync(s, "/api/credit-requests", CreditRequest(Ids.KhHm01, 2_000_000m));
        var mine = await GetAsync(s, "/api/credit-requests/mine");

        var check = new Checks(Output);
        check.Success(res);
        Actual("Phản hồi (MSG23)", res.Body);
        var req = await QueryAsync(db => db.TrxCreditLimitRequests.OrderByDescending(r => r.RequestId).FirstOrDefaultAsync());
        check.Equal("Yêu cầu PENDING", "PENDING", req?.Status);
        check.True("GET /mine có yêu cầu", mine.IsSuccess && mine.Items.Count >= 1, $"{mine.StatusCode}, {mine.Items.Count} dòng");
        check.Assert();
    }

    [Fact(DisplayName = "INT-CRD-06-03 | Request not needed")]
    public async Task INT_CRD_06_03_RequestNotNeeded()
    {
        var (s, _) = await ArrangeCreditAsync();
        var res = await PostAsync(s, "/api/credit-requests", CreditRequest(Ids.KhHm01, 500_000m));

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", "Khoản nợ dự kiến chưa vượt hạn mức ... (BR-12).", res);
        check.Assert();
    }

    [Fact(DisplayName = "INT-CRD-06-04 | Manager approves")]
    public async Task INT_CRD_06_04_ManagerApproves()
    {
        var (s, m) = await ArrangeCreditAsync();
        var id = await ArrangeCreditRequestAsync(s);

        // v1.1: chỉ duyệt nâng hạn mức (BR-13 – bỏ ngoại lệ một lần): body { approvalType: NEW_LIMIT, approvedLimit }
        var res = await PostAsync(m, $"/api/credit-requests/{id}/approve", NewLimit(12_000_000m));

        var check = new Checks(Output);
        check.Success(res);
        Actual("Phản hồi (MSG56)", res.Body);
        check.Equal("Trạng thái APPROVED", "APPROVED", (await QueryAsync(db => db.TrxCreditLimitRequests.SingleAsync(r => r.RequestId == id))).Status);
        check.Equal("Hạn mức 12.000.000", 12_000_000m, await CreditLimitAsync(Ids.KhHm01));
        var history = await QueryAsync(db => db.TrxCreditLimitHistories.Where(h => h.PartnerId == Ids.KhHm01).ToListAsync());
        Actual("Lịch sử hạn mức", history.Select(h => new { h.OldLimit, h.NewLimit, h.Source, h.RequestId }));
        check.True("1 dòng lịch sử gắn yêu cầu", history.Count == 1 && history[0].RequestId == id, string.Join(", ", history.Select(h => h.Source)));
        check.Assert();
    }

    [Fact(DisplayName = "INT-CRD-06-05 | POS after approval")]
    public async Task INT_CRD_06_05_PosAfterApproval()
    {
        var (s, m) = await ArrangeCreditAsync();
        var id = await ArrangeCreditRequestAsync(s);
        var approve = await PostAsync(m, $"/api/credit-requests/{id}/approve", NewLimit(12_000_000m)); // Precondition: Manager đã duyệt
        Assert.True(approve.IsSuccess, approve.Body);

        var res = await PostAsync(s, "/api/orders/pos", Pos(Ids.KhHm01, K001, "DEBT", 0m, new[] { (Ids.PTest, 20m, PTestPrice) }));

        var check = new Checks(Output);
        check.Success(res);
        check.Equal("Hóa đơn COMPLETED", "COMPLETED", (await OrderAsync(res.IsSuccess ? res.Int("orderId") : 0))?.Status);
        check.Equal("Dư nợ 11.000.000", 11_000_000m, await DebtAsync(Ids.KhHm01));
        check.Assert();
    }

    [Fact(DisplayName = "INT-CRD-06-06 | Reject without reason")]
    public async Task INT_CRD_06_06_RejectWithoutReason()
    {
        var (s, m) = await ArrangeCreditAsync();
        var id = await ArrangeCreditRequestAsync(s);

        var res = await PostAsync(m, $"/api/credit-requests/{id}/reject", new RejectCreditRequestRequest { Reason = "" });

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", "Vui lòng nhập lý do từ chối (E62.1).", res);
        check.Equal("Yêu cầu vẫn PENDING", "PENDING", (await QueryAsync(db => db.TrxCreditLimitRequests.SingleAsync(r => r.RequestId == id))).Status);
        check.Assert();
    }

    [Fact(DisplayName = "INT-CRD-06-07 | Decision twice")]
    public async Task INT_CRD_06_07_DecisionTwice()
    {
        var (s, m) = await ArrangeCreditAsync();
        var id = await ArrangeCreditRequestAsync(s);
        var m2 = await ClientAsync(TestDataSeeder.Manager); // Manager thứ hai

        using var gate = new SemaphoreSlim(0);
        async Task<ApiResult> Approve(HttpClient c) { await gate.WaitAsync(); return await PostAsync(c, $"/api/credit-requests/{id}/approve", NewLimit(12_000_000m)); }
        var t1 = Approve(m);
        var t2 = Approve(m2);
        gate.Release(2);
        var results = await Task.WhenAll(t1, t2);

        var check = new Checks(Output);
        check.Equal("Đúng 1 request thành công", 1, results.Count(r => r.IsSuccess));
        var failed = results.FirstOrDefault(r => !r.IsSuccess);
        check.Message("Request còn lại", "Yêu cầu này đã được xử lý (MSG57).", failed ?? new ApiResult(System.Net.HttpStatusCode.OK, "{}"));
        check.Equal("Chỉ 1 dòng lịch sử", 1, await QueryAsync(db => db.TrxCreditLimitHistories.CountAsync(h => h.PartnerId == Ids.KhHm01)));
        check.Assert();
    }

    // ───────── Credit Limit Settings & History ─────────

    [Fact(DisplayName = "INT-CRD-07-01 | Set a limit")]
    public async Task INT_CRD_07_01_SetLimit()
    {
        var m = await ClientAsync(TestDataSeeder.OpsK001);
        // API nhận { newLimit, reason } (workbook ghi {mode SET, value})
        var res = await SendAsync(m, HttpMethod.Patch, $"/api/customers/{Ids.KhHm01}/credit-limit",
            new UpdateCustomerCreditLimitRequest { NewLimit = 15_000_000m, Reason = "Tăng doanh số" });
        var history = await GetAsync(m, $"/api/customers/{Ids.KhHm01}/credit-limit-history");

        var check = new Checks(Output);
        check.Success(res);
        check.Equal("Hạn mức", 15_000_000m, await CreditLimitAsync(Ids.KhHm01));
        var row = history.Items.FirstOrDefault();
        Actual("Lịch sử", history.Body);
        check.True("Lịch sử có giá trị cũ, mới, người, lý do",
            row != null && history.Body.Contains("10000000") && history.Body.Contains("15000000") && history.Body.Contains("Tăng doanh số"), history.Body.Length > 300 ? history.Body[..300] : history.Body);
        check.Assert();
    }

    [Fact(DisplayName = "INT-CRD-07-02 | Batch percent")]
    public async Task INT_CRD_07_02_BatchPercent()
    {
        var m = await ClientAsync(TestDataSeeder.OpsK001);
        await ArrangeDbAsync(async db => (await db.MstBusinessPartners.SingleAsync(p => p.PartnerId == Ids.KhZero)).CreditLimit = 2_000_000m);
        var ids = new List<int> { Ids.KhHm01, Ids.KhAbc, Ids.KhZero };
        var before = new Dictionary<int, decimal>();
        foreach (var id in ids) before[id] = await CreditLimitAsync(id);

        var res = await SendAsync(m, HttpMethod.Patch, "/api/customers/credit-limit/batch",
            new BatchUpdateCustomerCreditLimitRequest { PartnerIds = ids, Mode = "PERCENT", Value = 10m, Reason = "Quý 4" });

        var check = new Checks(Output);
        check.Success(res);
        foreach (var id in ids) check.Equal($"Hạn mức khách {id} × 1,10", before[id] * 1.10m, await CreditLimitAsync(id));
        check.Equal("3 dòng lịch sử", 3, await QueryAsync(db => db.TrxCreditLimitHistories.CountAsync(h => ids.Contains(h.PartnerId))));
        check.Assert();
    }

    [Fact(DisplayName = "INT-CRD-07-03 | Missing reason")]
    public async Task INT_CRD_07_03_MissingReason()
    {
        var m = await ClientAsync(TestDataSeeder.OpsK001);
        var res = await SendAsync(m, HttpMethod.Patch, $"/api/customers/{Ids.KhHm01}/credit-limit", new UpdateCustomerCreditLimitRequest { NewLimit = 15_000_000m });

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", "Vui lòng nhập lý do điều chỉnh hạn mức.", res);
        check.Equal("Hạn mức không đổi", 10_000_000m, await CreditLimitAsync(Ids.KhHm01));
        check.Assert();
    }

    private async Task<ApiResult> PutDebtWarningAsync(HttpClient m, Action<JsonObject> change)
    {
        var current = await GetAsync(m, "/api/settings/debt-warning");
        Assert.True(current.IsSuccess, current.Body);
        var body = (JsonObject)current.Node!;
        change(body);
        return await PutAsync(m, "/api/settings/debt-warning", body);
    }

    [Fact(DisplayName = "INT-CRD-07-04 | Default limit for new customers")]
    public async Task INT_CRD_07_04_DefaultLimitForNewCustomers()
    {
        var m = await ClientAsync(TestDataSeeder.OpsK001);
        var put = await PutDebtWarningAsync(m, b => b["defaultCreditLimit"] = 50_000_000);
        var create = await PostAsync(m, "/api/customers", new CreateCustomerRequest { Name = "Khách mới IT", Phone = "0912345678" });

        var check = new Checks(Output);
        check.Success(put);
        check.Success(create);
        var c = await QueryAsync(db => db.MstBusinessPartners.FirstOrDefaultAsync(p => p.PartnerName == "Khách mới IT"));
        check.Equal("Hạn mức khách mới", 50_000_000m, c?.CreditLimit);
        check.Assert();
    }

    [Fact(DisplayName = "INT-CRD-07-05 | Invalid warning days")]
    public async Task INT_CRD_07_05_InvalidWarningDays()
    {
        var m = await ClientAsync(TestDataSeeder.OpsK001);
        var res = await PutDebtWarningAsync(m, b => b["debtDaysThreshold"] = 4000);

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", "Số ngày nợ cảnh báo phải trong khoảng 0 – 3650 ngày.", res);
        check.Assert();
    }
}
