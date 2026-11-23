using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Features.SalesBookings.Commands;
using StockFlow.Application.Features.SalesBookings.Common;
using StockFlow.UnitTests.Common;
using Xunit;
using static StockFlow.UnitTests.Sales.Bookings.BookingTestBase;

namespace StockFlow.UnitTests.Sales.Bookings;

/// <summary>
/// Report 5.1 – sheet CancelBooking (SF-FUNC-111): hủy đơn đặt còn mở. KeepDeposit = false hủy phiếu thu (hoàn tiền);
/// true giữ tiền thành khoản khách trả trước. Precondition chung: DH0001 DRAFT trả trước 200.000 (nợ khách = −200.000).
/// </summary>
public class CancelBookingTests
{
    private const string Function = "SF-FUNC-111";

    private static int AddDepositBooking(TestStockFlowDbContext db, string code = "DH0001", string status = SalesBookingOps.Draft)
    {
        var id = SalesData.AddBooking(db, code, SalesData.KhHm01, TestData.K001, status, new[] { (TestData.PTest, 5m, SalesData.PTestPrice) }, paid: 200_000);
        // Thu tiền trả trước đã giảm nợ khách (như AddDepositAsync)
        var customer = db.MstBusinessPartners.Single(p => p.PartnerId == SalesData.KhHm01);
        customer.CurrentDebt = -200_000m;
        TestData.SaveAndDetach(db);
        return id;
    }

    [Fact(DisplayName = "CancelBooking/UTCID01 – hủy, KeepDeposit = false: CANCELLED, phiếu thu CANCELLED, PaidAmount 0")]
    [Trait("Function", Function)]
    [Trait("UTCID", "CancelBooking/UTCID01")]
    [Trait("Type", "N")]
    public async Task UTCID01_CancelWithRefund_CancelsDepositReceipt()
    {
        // Arrange
        var (db, handler) = Arrange();
        var id = AddDepositBooking(db);

        // Act
        var result = await handler.Handle(new SalesBookingActionCommand(id, "CANCEL", KeepDeposit: false), CancellationToken.None);

        // Assert
        Assert.True(result.IsSuccess, result.Error);
        Assert.True(result.Value);
        var booking = await db.TrxOrders.AsNoTracking().SingleAsync(o => o.OrderId == id);
        Assert.Equal(SalesBookingOps.Cancelled, booking.Status);
        Assert.Equal(0m, booking.PaidAmount);
        Assert.Equal("CANCELLED", (await db.TrxFinancialTransactions.AsNoTracking().SingleAsync()).Status);
        Assert.Equal(0m, (await db.MstBusinessPartners.AsNoTracking().SingleAsync(p => p.PartnerId == SalesData.KhHm01)).CurrentDebt);
    }

    [Fact(DisplayName = "CancelBooking/UTCID02 – hủy, KeepDeposit = true: CANCELLED, giữ tiền trả trước cho khách")]
    [Trait("Function", Function)]
    [Trait("UTCID", "CancelBooking/UTCID02")]
    [Trait("Type", "N")]
    public async Task UTCID02_CancelKeepingDeposit_KeepsMoneyForCustomer()
    {
        // Arrange
        var (db, handler) = Arrange();
        var id = AddDepositBooking(db);

        // Act
        var result = await handler.Handle(new SalesBookingActionCommand(id, "CANCEL", KeepDeposit: true), CancellationToken.None);

        // Assert
        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(SalesBookingOps.Cancelled, (await db.TrxOrders.AsNoTracking().SingleAsync(o => o.OrderId == id)).Status);
        var receipt = await db.TrxFinancialTransactions.AsNoTracking().SingleAsync();
        Assert.Equal("COMPLETED", receipt.Status);
        Assert.Null(receipt.ReferenceId);
        Assert.Equal(-200_000m, (await db.MstBusinessPartners.AsNoTracking().SingleAsync(p => p.PartnerId == SalesData.KhHm01)).CurrentDebt);
    }

    [Fact(DisplayName = "CancelBooking/UTCID03 – DH0002 đã CANCELLED")]
    [Trait("Function", Function)]
    [Trait("UTCID", "CancelBooking/UTCID03")]
    [Trait("Type", "A")]
    public async Task UTCID03_AlreadyCancelled_ReturnsError()
    {
        // Arrange
        var (db, handler) = Arrange();
        var id = SalesData.AddBooking(db, "DH0002", SalesData.KhHm01, TestData.K001, SalesBookingOps.Cancelled, new[] { (TestData.PTest, 5m, SalesData.PTestPrice) });

        // Act
        var result = await handler.Handle(new SalesBookingActionCommand(id, "CANCEL"), CancellationToken.None);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("Đơn DH0002 đã hoàn thành hoặc đã hủy.", result.Error);
    }

    [Fact(DisplayName = "CancelBooking/UTCID04 – DH0003 đã tạo hóa đơn giao hàng")]
    [Trait("Function", Function)]
    [Trait("UTCID", "CancelBooking/UTCID04")]
    [Trait("Type", "A")]
    public async Task UTCID04_InvoicedBooking_ReturnsError()
    {
        // Arrange – đơn còn DRAFT nhưng có hóa đơn COMPLETED trỏ tới (xem ghi chú ở UpdateBooking/UTCID03)
        var (db, handler) = Arrange();
        var id = SalesData.AddBooking(db, "DH0003", SalesData.KhHm01, TestData.K001, SalesBookingOps.Draft, new[] { (TestData.PTest, 5m, SalesData.PTestPrice) });
        SalesData.AddInvoice(db, "HD0003", SalesData.KhHm01, TestData.K001, "COMPLETED", TestData.PTest, 5, SalesData.PTestPrice, bookingId: id);

        // Act
        var result = await handler.Handle(new SalesBookingActionCommand(id, "CANCEL"), CancellationToken.None);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("Đơn DH0003 đã tạo hóa đơn giao hàng. Dùng \"Kết thúc\" để dừng giao phần còn lại.", result.Error);
    }

    [Fact(DisplayName = "CancelBooking/UTCID05 – người dùng chỉ có quyền K002")]
    [Trait("Function", Function)]
    [Trait("UTCID", "CancelBooking/UTCID05")]
    [Trait("Type", "A")]
    public async Task UTCID05_NoAccessToBookingWarehouse_ReturnsError()
    {
        // Arrange
        var (db, handler) = Arrange(TestData.K002);
        var id = SalesData.AddBooking(db, "DH0001", SalesData.KhHm01, TestData.K001, SalesBookingOps.Draft, new[] { (TestData.PTest, 5m, SalesData.PTestPrice) });

        // Act
        var result = await handler.Handle(new SalesBookingActionCommand(id, "CANCEL"), CancellationToken.None);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("Bạn không có quyền thao tác đơn đặt hàng của chi nhánh này.", result.Error);
        Assert.Equal(SalesBookingOps.Draft, (await db.TrxOrders.AsNoTracking().SingleAsync(o => o.OrderId == id)).Status);
    }
}
