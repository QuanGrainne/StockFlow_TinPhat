using Microsoft.EntityFrameworkCore;
using Moq;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Customers.Commands;
using StockFlow.Application.Features.Customers.DTOs;
using StockFlow.Domain.Entities;
using StockFlow.UnitTests.Common;
using Xunit;

namespace StockFlow.UnitTests.Finance;

internal static class ReceiptData
{
    public static Mock<ICurrentUserService> User() => CurrentUser.WithWarehouses(TestData.UserId, TestData.K001);

    /// <summary>Kho, người dùng, P-TEST; KH-HM01 dư nợ theo tham số, KH-HM02 dư nợ 0.</summary>
    public static TestStockFlowDbContext Db(decimal debt)
    {
        var db = TestStockFlowDbContext.Create();
        TestData.SeedMasterData(db);
        SalesData.SeedCustomers(db, creditLimit: 10_000_000m, currentDebt: debt);
        return db;
    }

    public static decimal Debt(TestStockFlowDbContext db, int partnerId = SalesData.KhHm01) =>
        db.MstBusinessPartners.AsNoTracking().Single(p => p.PartnerId == partnerId).CurrentDebt ?? 0;

    /// <summary>Phiếu thu (RECEIPT) của KH-HM01; refOrderId = phiếu thu gắn hóa đơn / đơn đặt (SALES_ORDER).</summary>
    public static int AddReceipt(TestStockFlowDbContext db, string code, decimal amount, string status = "COMPLETED", int? refOrderId = null)
    {
        var tx = new TrxFinancialTransaction
        {
            PartnerId = SalesData.KhHm01, TxType = "RECEIPT", TxCode = code, Amount = amount, PaymentMethod = "CASH",
            ReferenceType = refOrderId.HasValue ? "SALES_ORDER" : null, ReferenceId = refOrderId,
            TransactionDate = VietnamTime.Now.AddDays(-2), CreatedBy = TestData.UserId, Status = status, Description = "Ghi chú cũ",
        };
        db.TrxFinancialTransactions.Add(tx);
        TestData.SaveAndDetach(db);
        return tx.TxId;
    }

    public static TrxFinancialTransaction Tx(TestStockFlowDbContext db, string code) =>
        db.TrxFinancialTransactions.AsNoTracking().Single(t => t.TxCode == code);
}

/// <summary>Report 5.1 – sheet CreateCustomerPayment (DatTD): lập phiếu thu giảm nợ khách (UC-25, UC-84, BR-15, BR-46). Dư nợ khách 5.000.000.</summary>
public class CreateCustomerPaymentTests
{
    private const string Function = "CreateCustomerPayment";

    private static Task<Result<CustomerPaymentResultDto>> Pay(TestStockFlowDbContext db, decimal amount,
        List<CustomerPaymentAllocationRequest>? allocations = null) =>
        new CreateCustomerPaymentCommandHandler(db, ReceiptData.User().Object)
            .Handle(new CreateCustomerPaymentCommand(SalesData.KhHm01, new CreateCustomerPaymentRequest(amount, null, null, null, allocations)),
                CancellationToken.None);

    private static async Task AssertRejected(TestStockFlowDbContext db, Result<CustomerPaymentResultDto> r, string message)
    {
        Assert.False(r.IsSuccess);
        Assert.Equal(message, r.Error);
        Assert.Equal(5_000_000m, ReceiptData.Debt(db));
        Assert.Empty(await db.TrxFinancialTransactions.AsNoTracking().ToListAsync());
    }

    [Fact(DisplayName = "CreateCustomerPayment/UTCID01 – thu 2.000.000 không phân bổ: phiếu PTxxxx, dư nợ 3.000.000, giao dịch RECEIPT")]
    [Trait("Function", Function)][Trait("UTCID", "CreateCustomerPayment/UTCID01")][Trait("Type", "N")]
    public async Task UTCID01_Receipt_ReducesDebt()
    {
        var db = ReceiptData.Db(5_000_000);
        var r = await Pay(db, 2_000_000);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal("PT000001", r.Value!.VoucherCode);
        Assert.Equal(3_000_000m, ReceiptData.Debt(db));
        var tx = ReceiptData.Tx(db, "PT000001");
        Assert.Equal("RECEIPT", tx.TxType);
        Assert.Equal(2_000_000m, tx.Amount);
    }

    [Fact(DisplayName = "CreateCustomerPayment/UTCID02 – phân bổ 1.000.000 vào HD0001 còn 1.500.000: HD0001 còn 500.000")]
    [Trait("Function", Function)][Trait("UTCID", "CreateCustomerPayment/UTCID02")][Trait("Type", "N")]
    public async Task UTCID02_Allocation_ReducesInvoiceOutstanding()
    {
        var db = ReceiptData.Db(5_000_000);
        var (invoiceId, _) = SalesData.AddInvoice(db, "HD0001", SalesData.KhHm01, TestData.K001, "COMPLETED", TestData.PTest, 15, SalesData.PTestPrice);
        var r = await Pay(db, 1_000_000, new() { new(invoiceId, 1_000_000) });
        Assert.True(r.IsSuccess, r.Error);
        var invoice = await db.TrxOrders.AsNoTracking().SingleAsync(o => o.OrderId == invoiceId);
        Assert.Equal(500_000m, invoice.OutstandingAmount);
        Assert.Equal(1_000_000m, ReceiptData.Tx(db, "TTHD0001").Amount);
        Assert.Equal(4_000_000m, ReceiptData.Debt(db));
    }

    [Fact(DisplayName = "CreateCustomerPayment/UTCID03 – thu đúng bằng dư nợ 5.000.000: dư nợ 0")]
    [Trait("Function", Function)][Trait("UTCID", "CreateCustomerPayment/UTCID03")][Trait("Type", "B")]
    public async Task UTCID03_FullDebt_Zero()
    {
        var db = ReceiptData.Db(5_000_000);
        var r = await Pay(db, 5_000_000);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(0m, ReceiptData.Debt(db));
    }

    [Fact(DisplayName = "CreateCustomerPayment/UTCID04 – số tiền 0 (validator)")]
    [Trait("Function", Function)][Trait("UTCID", "CreateCustomerPayment/UTCID04")][Trait("Type", "A")]
    public void UTCID04_ZeroAmount_ValidatorRejects()
    {
        var r = new CreateCustomerPaymentCommandValidator().Validate(
            new CreateCustomerPaymentCommand(SalesData.KhHm01, new CreateCustomerPaymentRequest(0, null, null, null, null)));
        Assert.Contains("Số tiền thu phải lớn hơn 0.", r.Errors.Select(e => e.ErrorMessage));
    }

    [Fact(DisplayName = "CreateCustomerPayment/UTCID05 – thu 5.000.001 > dư nợ 5.000.000")]
    [Trait("Function", Function)][Trait("UTCID", "CreateCustomerPayment/UTCID05")][Trait("Type", "A")]
    public async Task UTCID05_AboveDebt_ReturnsError()
    {
        var db = ReceiptData.Db(5_000_000);
        await AssertRejected(db, await Pay(db, 5_000_001), "Số tiền thu (5.000.001) vượt quá nợ hiện tại của khách (5.000.000).");
    }

    [Fact(DisplayName = "CreateCustomerPayment/UTCID06 – thu 1.000.000, phân bổ 1.200.000")]
    [Trait("Function", Function)][Trait("UTCID", "CreateCustomerPayment/UTCID06")][Trait("Type", "A")]
    public async Task UTCID06_AllocationAboveAmount_ReturnsError()
    {
        var db = ReceiptData.Db(5_000_000);
        var (invoiceId, _) = SalesData.AddInvoice(db, "HD0001", SalesData.KhHm01, TestData.K001, "COMPLETED", TestData.PTest, 15, SalesData.PTestPrice);
        await AssertRejected(db, await Pay(db, 1_000_000, new() { new(invoiceId, 1_200_000) }), "Tổng tiền phân bổ vượt quá số tiền thu.");
    }

    [Fact(DisplayName = "CreateCustomerPayment/UTCID07 – phân bổ vào hóa đơn của khách khác")]
    [Trait("Function", Function)][Trait("UTCID", "CreateCustomerPayment/UTCID07")][Trait("Type", "A")]
    public async Task UTCID07_ForeignInvoice_ReturnsError()
    {
        var db = ReceiptData.Db(5_000_000);
        var (invoiceId, _) = SalesData.AddInvoice(db, "HD0002", SalesData.KhHm02, TestData.K001, "COMPLETED", TestData.PTest, 15, SalesData.PTestPrice);
        await AssertRejected(db, await Pay(db, 1_000_000, new() { new(invoiceId, 1_000_000) }),
            $"Hóa đơn #{invoiceId} không thuộc khách hàng này hoặc chưa hoàn thành.");
    }
}

/// <summary>Report 5.1 – sheet UpdateCustomerReceipt (DatTD): sửa ngày, ghi chú phiếu thu chưa hủy; ngày không ở tương lai (BR-46).</summary>
public class UpdateCustomerReceiptTests
{
    private const string Function = "UpdateCustomerReceipt";

    private static Task<Result<bool>> Update(TestStockFlowDbContext db, string code, DateTime? date, string? notes) =>
        new UpdateCustomerReceiptCommandHandler(db, ReceiptData.User().Object)
            .Handle(new UpdateCustomerReceiptCommand(SalesData.KhHm01, code, new UpdateCustomerReceiptRequest(date, null, notes)),
                CancellationToken.None);

    [Fact(DisplayName = "UpdateCustomerReceipt/UTCID01 – ghi chú mới, ngày hôm qua: lưu ghi chú và ngày")]
    [Trait("Function", Function)][Trait("UTCID", "UpdateCustomerReceipt/UTCID01")][Trait("Type", "N")]
    public async Task UTCID01_NoteAndDate_Saved()
    {
        var db = ReceiptData.Db(0);
        ReceiptData.AddReceipt(db, "PT0001", 1_000_000);
        var yesterday = DateTime.UtcNow.AddDays(-1);
        var r = await Update(db, "PT0001", yesterday, "Ghi chú mới");
        Assert.True(r.IsSuccess, r.Error);
        var tx = ReceiptData.Tx(db, "PT0001");
        Assert.Equal("Ghi chú mới", tx.Description);
        Assert.Equal(VietnamTime.From(yesterday), tx.TransactionDate);
    }

    [Fact(DisplayName = "UpdateCustomerReceipt/UTCID02 – ngày = thời điểm hiện tại: lưu được")]
    [Trait("Function", Function)][Trait("UTCID", "UpdateCustomerReceipt/UTCID02")][Trait("Type", "B")]
    public async Task UTCID02_Now_Saved()
    {
        var db = ReceiptData.Db(0);
        ReceiptData.AddReceipt(db, "PT0001", 1_000_000);
        var now = DateTime.UtcNow;
        var r = await Update(db, "PT0001", now, "Ghi chú");
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(VietnamTime.From(now), ReceiptData.Tx(db, "PT0001").TransactionDate);
    }

    [Fact(DisplayName = "UpdateCustomerReceipt/UTCID03 – ngày mai")]
    [Trait("Function", Function)][Trait("UTCID", "UpdateCustomerReceipt/UTCID03")][Trait("Type", "A")]
    public async Task UTCID03_Tomorrow_ReturnsError()
    {
        var db = ReceiptData.Db(0);
        ReceiptData.AddReceipt(db, "PT0001", 1_000_000);
        var r = await Update(db, "PT0001", DateTime.UtcNow.AddDays(1), "Ghi chú");
        Assert.False(r.IsSuccess);
        Assert.Equal("Thời gian phiếu thu không được ở tương lai.", r.Error);
        Assert.Equal("Ghi chú cũ", ReceiptData.Tx(db, "PT0001").Description);
    }

    [Fact(DisplayName = "UpdateCustomerReceipt/UTCID04 – phiếu thu PT0002 đã hủy")]
    [Trait("Function", Function)][Trait("UTCID", "UpdateCustomerReceipt/UTCID04")][Trait("Type", "A")]
    public async Task UTCID04_Cancelled_ReturnsError()
    {
        var db = ReceiptData.Db(0);
        ReceiptData.AddReceipt(db, "PT0002", 1_000_000, status: "CANCELLED");
        var r = await Update(db, "PT0002", null, "Ghi chú mới");
        Assert.False(r.IsSuccess);
        Assert.Equal("Phiếu thu PT0002 đã hủy, không thể sửa.", r.Error);
    }

    [Fact(DisplayName = "UpdateCustomerReceipt/UTCID05 – phiếu thu PT9999 không tồn tại")]
    [Trait("Function", Function)][Trait("UTCID", "UpdateCustomerReceipt/UTCID05")][Trait("Type", "A")]
    public async Task UTCID05_Unknown_ReturnsError()
    {
        var r = await Update(ReceiptData.Db(0), "PT9999", null, "Ghi chú mới");
        Assert.False(r.IsSuccess);
        Assert.Equal("Không tìm thấy phiếu thu PT9999.", r.Error);
    }
}

/// <summary>Report 5.1 – sheet CancelCustomerReceipt (DatTD): hủy phiếu thu, cộng lại dư nợ (BR-15); tiền cọc đã trừ vào hóa đơn thì không hủy được.</summary>
public class CancelCustomerReceiptTests
{
    private const string Function = "CancelCustomerReceipt";

    private static Task<Result<bool>> Cancel(TestStockFlowDbContext db, string code) =>
        new CancelCustomerReceiptCommandHandler(db, ReceiptData.User().Object)
            .Handle(new CancelCustomerReceiptCommand(SalesData.KhHm01, code), CancellationToken.None);

    [Fact(DisplayName = "CancelCustomerReceipt/UTCID01 – hủy PT0001 2.000.000, dư nợ 3.000.000: CANCELLED, dư nợ 5.000.000")]
    [Trait("Function", Function)][Trait("UTCID", "CancelCustomerReceipt/UTCID01")][Trait("Type", "N")]
    public async Task UTCID01_Cancel_RestoresDebt()
    {
        var db = ReceiptData.Db(3_000_000);
        ReceiptData.AddReceipt(db, "PT0001", 2_000_000);
        var r = await Cancel(db, "PT0001");
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal("CANCELLED", ReceiptData.Tx(db, "PT0001").Status);
        Assert.Equal(5_000_000m, ReceiptData.Debt(db));
    }

    [Fact(DisplayName = "CancelCustomerReceipt/UTCID02 – hủy lại PT0001 đã hủy")]
    [Trait("Function", Function)][Trait("UTCID", "CancelCustomerReceipt/UTCID02")][Trait("Type", "A")]
    public async Task UTCID02_AlreadyCancelled_ReturnsError()
    {
        var db = ReceiptData.Db(3_000_000);
        ReceiptData.AddReceipt(db, "PT0001", 2_000_000, status: "CANCELLED");
        var r = await Cancel(db, "PT0001");
        Assert.False(r.IsSuccess);
        Assert.Equal("Không tìm thấy phiếu thu PT0001 hoặc phiếu đã hủy.", r.Error);
        Assert.Equal(3_000_000m, ReceiptData.Debt(db));
    }

    [Fact(DisplayName = "CancelCustomerReceipt/UTCID03 – phiếu thu của hóa đơn đã hủy")]
    [Trait("Function", Function)][Trait("UTCID", "CancelCustomerReceipt/UTCID03")][Trait("Type", "A")]
    public async Task UTCID03_CancelledInvoice_ReturnsError()
    {
        var db = ReceiptData.Db(3_000_000);
        var (invoiceId, _) = SalesData.AddInvoice(db, "HD0001", SalesData.KhHm01, TestData.K001, "CANCELLED", TestData.PTest, 10, SalesData.PTestPrice);
        ReceiptData.AddReceipt(db, "TTHD0001", 500_000, refOrderId: invoiceId);
        var r = await Cancel(db, "TTHD0001");
        Assert.False(r.IsSuccess);
        Assert.Equal("Hóa đơn của phiếu thu này đã hủy.", r.Error);
        Assert.Equal("COMPLETED", ReceiptData.Tx(db, "TTHD0001").Status);
    }

    [Fact(DisplayName = "CancelCustomerReceipt/UTCID04 – tiền cọc của đơn đặt đã lập hóa đơn giao hàng")]
    [Trait("Function", Function)][Trait("UTCID", "CancelCustomerReceipt/UTCID04")][Trait("Type", "A")]
    public async Task UTCID04_UsedDeposit_ReturnsError()
    {
        var db = ReceiptData.Db(3_000_000);
        var bookingId = SalesData.AddBooking(db, "DH0001", SalesData.KhHm01, TestData.K001, "COMPLETED",
            new[] { (TestData.PTest, 10m, SalesData.PTestPrice) }, paid: 300_000);
        SalesData.AddInvoice(db, "HD0001", SalesData.KhHm01, TestData.K001, "COMPLETED", TestData.PTest, 10, SalesData.PTestPrice, bookingId: bookingId);
        var r = await Cancel(db, "TTDH0001");
        Assert.False(r.IsSuccess);
        Assert.Equal("Tiền trả trước của đơn đặt hàng đã được trừ vào hóa đơn giao hàng, không hủy phiếu thu được.", r.Error);
        Assert.Equal("COMPLETED", ReceiptData.Tx(db, "TTDH0001").Status);
    }
}
