using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Features.SalesBookings.Commands;
using StockFlow.Application.Features.SalesBookings.Common;
using StockFlow.UnitTests.Common;
using Xunit;
using static StockFlow.UnitTests.Sales.Bookings.BookingTestBase;

namespace StockFlow.UnitTests.Sales.Bookings;

/// <summary>
/// Report 5.1 – sheet UpdateBooking (chưa có mã SF-FUNC): sửa đơn đặt DRAFT (hàng, số lượng, giá).
/// Cùng SalesBookingCommandHandler với CreateBooking, gọi SaveSalesBookingCommand có OrderId.
/// </summary>
public class UpdateBookingTests
{
    private const string Function = "UpdateBooking";

    [Fact(DisplayName = "UpdateBooking/UTCID01 – DH0001 DRAFT, đổi P-TEST 5 → 8: lưu SL 8, tính lại tổng")]
    [Trait("Function", Function)]
    [Trait("UTCID", "UpdateBooking/UTCID01")]
    [Trait("Type", "N")]
    public async Task UTCID01_DraftBooking_SavesNewQuantityAndTotal()
    {
        // Arrange
        var (db, handler) = Arrange();
        var id = SalesData.AddBooking(db, "DH0001", SalesData.KhHm01, TestData.K001, SalesBookingOps.Draft, new[] { (TestData.PTest, 5m, SalesData.PTestPrice) });

        // Act
        var result = await handler.Handle(new SaveSalesBookingCommand(id, Booking(SalesData.KhHm01, 8)), CancellationToken.None);

        // Assert
        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(800_000m, result.Value!.TotalAmount);
        var booking = await db.TrxOrders.AsNoTracking().Include(o => o.DtlOrderItems).SingleAsync(o => o.OrderId == id);
        Assert.Equal(8, Assert.Single(booking.DtlOrderItems).Quantity);
        Assert.Equal(800_000m, booking.TotalAmount);
    }

    [Fact(DisplayName = "UpdateBooking/UTCID02 – DH0002 đã CANCELLED")]
    [Trait("Function", Function)]
    [Trait("UTCID", "UpdateBooking/UTCID02")]
    [Trait("Type", "A")]
    public async Task UTCID02_CancelledBooking_ReturnsError()
    {
        // Arrange
        var (db, handler) = Arrange();
        var id = SalesData.AddBooking(db, "DH0002", SalesData.KhHm01, TestData.K001, SalesBookingOps.Cancelled, new[] { (TestData.PTest, 5m, SalesData.PTestPrice) });

        // Act
        var result = await handler.Handle(new SaveSalesBookingCommand(id, Booking(SalesData.KhHm01, 8)), CancellationToken.None);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("Đơn DH0002 đang ở trạng thái không cho phép sửa.", result.Error);
    }

    [Fact(DisplayName = "UpdateBooking/UTCID03 – DH0003 đã tạo hóa đơn giao hàng")]
    [Trait("Function", Function)]
    [Trait("UTCID", "UpdateBooking/UTCID03")]
    [Trait("Type", "A")]
    public async Task UTCID03_InvoicedBooking_ReturnsError()
    {
        // Arrange – đơn còn DRAFT nhưng đã có hóa đơn COMPLETED trỏ tới (code hiện tại chuyển đơn sang FINISHED khi lập hóa đơn,
        // nên nhánh này chỉ gặp với dữ liệu cũ; dựng đúng điều kiện để chạy tới thông báo của workbook)
        var (db, handler) = Arrange();
        var id = SalesData.AddBooking(db, "DH0003", SalesData.KhHm01, TestData.K001, SalesBookingOps.Draft, new[] { (TestData.PTest, 5m, SalesData.PTestPrice) });
        SalesData.AddInvoice(db, "HD0003", SalesData.KhHm01, TestData.K001, "COMPLETED", TestData.PTest, 5, SalesData.PTestPrice, bookingId: id);

        // Act
        var result = await handler.Handle(new SaveSalesBookingCommand(id, Booking(SalesData.KhHm01, 8)), CancellationToken.None);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("Đơn DH0003 đã tạo hóa đơn giao hàng, không sửa được.", result.Error);
    }

    [Fact(DisplayName = "UpdateBooking/UTCID04 – DH0001 có trả trước 200.000, đổi khách hàng")]
    [Trait("Function", Function)]
    [Trait("UTCID", "UpdateBooking/UTCID04")]
    [Trait("Type", "A")]
    public async Task UTCID04_ChangeCustomerWithDeposit_ReturnsError()
    {
        // Arrange
        var (db, handler) = Arrange();
        var id = SalesData.AddBooking(db, "DH0001", SalesData.KhHm01, TestData.K001, SalesBookingOps.Draft,
            new[] { (TestData.PTest, 5m, SalesData.PTestPrice) }, paid: 200_000);

        // Act
        var result = await handler.Handle(new SaveSalesBookingCommand(id, Booking(SalesData.KhHm02, 5)), CancellationToken.None);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("Đơn đã có tiền khách trả trước, không đổi được khách hàng.", result.Error);
    }

    [Fact(DisplayName = "UpdateBooking/UTCID05 – người dùng chỉ có quyền K002")]
    [Trait("Function", Function)]
    [Trait("UTCID", "UpdateBooking/UTCID05")]
    [Trait("Type", "A")]
    public async Task UTCID05_NoAccessToBookingWarehouse_ReturnsError()
    {
        // Arrange
        var (db, handler) = Arrange(TestData.K002);
        var id = SalesData.AddBooking(db, "DH0001", SalesData.KhHm01, TestData.K001, SalesBookingOps.Draft, new[] { (TestData.PTest, 5m, SalesData.PTestPrice) });

        // Act
        var result = await handler.Handle(new SaveSalesBookingCommand(id, Booking(SalesData.KhHm01, 8)), CancellationToken.None);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("Bạn không có quyền sửa đơn đặt hàng của chi nhánh này.", result.Error);
    }
}
