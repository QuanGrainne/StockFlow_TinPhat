using Microsoft.EntityFrameworkCore;
using StockFlow.Domain.Entities;
using StockFlow.IntegrationTests.Infrastructure;
using Xunit;
using Xunit.Abstractions;

namespace StockFlow.IntegrationTests.Sales.Bookings;

/// <summary>
/// Report 5.2 – sheet "Merge Sales Bookings" (chức năng 12, UC-23, UC-24, BR-09 / Report 3 hiện hành BR-10).
/// Precondition: User S có SALES_UPDATE, quyền kho K001; DH0001 (P-TEST x2, trả trước 100.000) và DH0002 (P-TEST2 x3)
/// của KH-HM01 tại K001, DRAFT. Hai đơn được tạo bằng API đặt hàng thật (POST /api/sales-bookings).
/// Bảng: trx_orders (consolidated_into_order_id), dtl_order_items, trx_financial_transactions.reference_id.
/// </summary>
public sealed class MergeSalesBookingsTests : SalesTestBase
{
    public MergeSalesBookingsTests(IntegrationTestFixture fixture, ITestOutputHelper output) : base(fixture, output) { }

    private async Task<(HttpClient S, int Dh1, int Dh2)> ArrangeAsync()
    {
        await SetStockAsync(K001, Ids.PTest, 50);
        await SetStockAsync(K001, Ids.PTest2, 50);
        var s = await ClientAsync(TestDataSeeder.SalesK001);
        var dh1 = await ArrangeBookingAsync(s, Booking(Ids.KhHm01, K001, new[] { (Ids.PTest, 2m, PTestPrice) }, paid: 100_000m), "DH0001 (P-TEST x2, trả trước 100.000)");
        var dh2 = await ArrangeBookingAsync(s, Booking(Ids.KhHm01, K001, new[] { (Ids.PTest2, 3m, PTest2Price) }), "DH0002 (P-TEST2 x3)");
        return (s, dh1.Id, dh2.Id);
    }

    [Fact(DisplayName = "INT-SBK-12-01 | Merge two bookings")]
    public async Task INT_SBK_12_01_MergeTwoBookings()
    {
        var (s, dh1, dh2) = await ArrangeAsync();

        var res = await PostAsync(s, "/api/sales-bookings/merge", new { orderIds = new[] { dh1, dh2 } });

        var check = new Checks(Output);
        check.Success(res);
        var mergedId = res.IsSuccess ? res.Int("orderId") : 0;
        var merged = await OrderAsync(mergedId);
        check.Equal("Đơn mới DRAFT", "DRAFT", merged?.Status);
        check.Equal("Đơn mới có 2 dòng", 2, merged?.DtlOrderItems.Count ?? 0);
        check.Equal("PaidAmount đơn mới", 100_000m, merged?.PaidAmount);
        foreach (var (label, id) in new[] { ("DH0001", dh1), ("DH0002", dh2) })
        {
            var src = await OrderAsync(id);
            check.Equal($"{label} CANCELLED", "CANCELLED", src?.Status);
            check.Equal($"{label} consolidated_into_order_id", (int?)mergedId, src?.ConsolidatedIntoOrderId);
        }
        var deposit = await QueryAsync(db => db.TrxFinancialTransactions.Where(t => t.TxType == "RECEIPT").ToListAsync());
        Actual("Phiếu thu trả trước", deposit.Select(d => new { d.TxCode, d.ReferenceType, d.ReferenceId, d.Status }));
        check.True("Phiếu thu trả trước trỏ sang đơn mới", deposit.Count == 1 && deposit[0].ReferenceId == mergedId,
            string.Join(", ", deposit.Select(d => $"{d.TxCode} → {d.ReferenceId}")));
        check.Assert();
    }

    [Fact(DisplayName = "INT-SBK-12-02 | Different customers")]
    public async Task INT_SBK_12_02_DifferentCustomers()
    {
        var (s, dh1, _) = await ArrangeAsync();
        var abc = await ArrangeBookingAsync(s, Booking(Ids.KhAbc, K001, new[] { (Ids.PTest, 1m, PTestPrice) }), "Đơn đặt của KH-ABC");

        var res = await PostAsync(s, "/api/sales-bookings/merge", new { orderIds = new[] { dh1, abc.Id } });

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", "Chỉ gộp được các đơn của cùng 1 khách hàng (BR-09).", res.Message);
        check.Equal("DH0001 vẫn DRAFT", "DRAFT", (await OrderAsync(dh1))?.Status);
        check.Assert();
    }

    [Fact(DisplayName = "INT-SBK-12-03 | Different branches")]
    public async Task INT_SBK_12_03_DifferentBranches()
    {
        var (s, dh1, _) = await ArrangeAsync();
        await SetStockAsync(K002, Ids.PTest, 50);
        // Đơn của K002: tạo bằng tài khoản có quyền kho K002 (User S chỉ có K001)
        var k002 = await ClientAsync(TestDataSeeder.SalesK002);
        var other = await ArrangeBookingAsync(k002, Booking(Ids.KhHm01, K002, new[] { (Ids.PTest, 1m, PTestPrice) }), "Đơn đặt KH-HM01 tại K002");

        var res = await PostAsync(s, "/api/sales-bookings/merge", new { orderIds = new[] { dh1, other.Id } });

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", "Chỉ gộp được các đơn cùng chi nhánh xử lý.", res.Message);
        check.Equal("DH0001 vẫn DRAFT", "DRAFT", (await OrderAsync(dh1))?.Status);
        check.Assert();
    }

    [Fact(DisplayName = "INT-SBK-12-04 | Only one booking")]
    public async Task INT_SBK_12_04_OnlyOneBooking()
    {
        var (s, dh1, _) = await ArrangeAsync();

        var res = await PostAsync(s, "/api/sales-bookings/merge", new { orderIds = new[] { dh1 } });

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", "Cần chọn ít nhất 2 đơn đặt hàng để gộp.", res.Message);
        check.Equal("Không tạo đơn mới (vẫn 2 đơn đặt)", 2, await CountOrdersAsync("BOOKING"));
        check.Assert();
    }

    [Fact(DisplayName = "INT-SBK-12-05 | Booking already invoiced")]
    public async Task INT_SBK_12_05_BookingAlreadyInvoiced()
    {
        var (s, dh1, dh2) = await ArrangeAsync();
        // 1. Create a delivery invoice from DH0002 (POS với bookingOrderId, trả đủ 450.000)
        await ArrangeInvoiceAsync(s, Pos(Ids.KhHm01, K001, "CASH", 450_000m, new[] { (Ids.PTest2, 3m, PTest2Price) }, bookingOrderId: dh2),
            "Hóa đơn giao hàng từ DH0002");
        Actual("Trạng thái DH0002 sau khi tạo hóa đơn", (await OrderAsync(dh2))?.Status);

        // 2. Merge DH0001, DH0002
        var res = await PostAsync(s, "/api/sales-bookings/merge", new { orderIds = new[] { dh1, dh2 } });

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        // v1.1: tạo hóa đơn giao hàng đưa DH0002 về Hoàn thành → bị chặn ở luật chỉ gộp đơn Phiếu tạm (BR-09, MSG17)
        check.Contains("Thông báo", "không gộp được: chỉ gộp đơn ở trạng thái Phiếu tạm.", res.Message);
        check.Equal("DH0001 vẫn DRAFT", "DRAFT", (await OrderAsync(dh1))?.Status);
        check.Assert();
    }

    /// <summary>
    /// Ca BỔ SUNG – yêu cầu 11: gộp đơn ghi 2 lần trong 1 transaction (tạo đơn mới, rồi hủy đơn gốc + chuyển phiếu thu).
    /// Gây lỗi ở lần ghi thứ hai → đơn mới phải biến mất, đơn gốc vẫn DRAFT, phiếu thu vẫn trỏ về DH0001.
    /// </summary>
    [Fact(DisplayName = "INT-SBK-12-S01 | (Bổ sung) Lỗi khi hủy đơn gốc lúc gộp → rollback")]
    public async Task INT_SBK_12_S01_RollbackOnMergeFailure()
    {
        var (s, dh1, dh2) = await ArrangeAsync();
        Fx.Faults.Arm(ctx => ctx.ChangeTracker.Entries<TrxOrder>()
                .Any(e => e.State == EntityState.Modified && e.Entity.Status == "CANCELLED"),
            "lỗi khi lưu trạng thái hủy của đơn gốc");

        var res = await PostAsync(s, "/api/sales-bookings/merge", new { orderIds = new[] { dh1, dh2 } });

        var check = new Checks(Output);
        check.Equal("Đã kích hoạt lỗi giữa chừng", 1, Fx.Faults.FiredCount);
        check.Equal("HTTP status", 500, res.StatusCode);
        check.Equal("Không có đơn gộp (vẫn 2 đơn đặt)", 2, await CountOrdersAsync("BOOKING"));
        check.Equal("DH0001 vẫn DRAFT", "DRAFT", (await OrderAsync(dh1))?.Status);
        check.Equal("DH0002 vẫn DRAFT", "DRAFT", (await OrderAsync(dh2))?.Status);
        var deposit = await FinancialAsync("SALES_ORDER", dh1);
        check.Equal("Phiếu thu trả trước vẫn thuộc DH0001", 1, deposit.Count);
        check.Equal("PaidAmount DH0001", 100_000m, (await OrderAsync(dh1))?.PaidAmount);
        check.Assert();
    }
}
