using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Features.SalesBookings.Commands;
using StockFlow.Application.Features.SalesBookings.Common;
using StockFlow.UnitTests.Common;
using Xunit;
using static StockFlow.UnitTests.Sales.Bookings.BookingTestBase;

namespace StockFlow.UnitTests.Sales.Bookings;

/// <summary>
/// Report 5.1 – sheet CreateBooking (SF-FUNC-108): tạo đơn đặt hàng DRAFT, không trừ tồn (BR-08); tiền trả trước tạo phiếu thu.
/// UTCID03, 04, 06 là luật của SaveSalesBookingCommandValidator nên test lớp validator.
/// </summary>
public class CreateBookingTests
{
    private const string Function = "SF-FUNC-108";

    [Fact(DisplayName = "CreateBooking/UTCID01 – KH-HM01, K001, P-TEST 5, không trả trước: DRAFT, UNPAID, tồn không đổi")]
    [Trait("Function", Function)]
    [Trait("UTCID", "CreateBooking/UTCID01")]
    [Trait("Type", "N")]
    public async Task UTCID01_NoDeposit_CreatesDraftUnpaidWithoutStockChange()
    {
        // Arrange
        var (db, handler) = Arrange();

        // Act
        var result = await handler.Handle(new SaveSalesBookingCommand(null, Booking(SalesData.KhHm01, 5)), CancellationToken.None);

        // Assert
        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(SalesBookingOps.Draft, result.Value!.Status);
        Assert.StartsWith("DH", result.Value.OrderCode);
        var booking = await db.TrxOrders.AsNoTracking().SingleAsync();
        Assert.Equal(SalesBookingOps.OrderType, booking.OrderType);
        Assert.Equal("UNPAID", booking.PaymentStatus);
        Assert.Equal(50, TestData.StockOf(db, TestData.K001));
        Assert.Empty(db.TrxInventoryTransactions.AsNoTracking());
    }

    [Fact(DisplayName = "CreateBooking/UTCID02 – như UTCID01, trả trước 200.000 tiền mặt: PaidAmount 200.000, PARTIAL")]
    [Trait("Function", Function)]
    [Trait("UTCID", "CreateBooking/UTCID02")]
    [Trait("Type", "N")]
    public async Task UTCID02_WithDeposit_SetsPaidAmountAndPartialStatus()
    {
        // Arrange
        var (db, handler) = Arrange();

        // Act
        var result = await handler.Handle(new SaveSalesBookingCommand(null, Booking(SalesData.KhHm01, 5, paid: 200_000)), CancellationToken.None);

        // Assert
        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(SalesBookingOps.Draft, result.Value!.Status);
        Assert.Equal(200_000m, result.Value.PaidAmount);
        var booking = await db.TrxOrders.AsNoTracking().SingleAsync();
        Assert.Equal("PARTIAL", booking.PaymentStatus);
        var receipt = Assert.Single(db.TrxFinancialTransactions.AsNoTracking().ToList());
        Assert.Equal(200_000m, receipt.Amount);
        Assert.Equal(booking.OrderId, receipt.ReferenceId);
    }

    [Fact(DisplayName = "CreateBooking/UTCID03 – không chọn khách hàng (validator)")]
    [Trait("Function", Function)]
    [Trait("UTCID", "CreateBooking/UTCID03")]
    [Trait("Type", "A")]
    public void UTCID03_NoCustomer_ValidatorRejects()
    {
        // Arrange
        var command = new SaveSalesBookingCommand(null, Booking(0, 5));

        // Act
        var result = new SaveSalesBookingCommandValidator().Validate(command);

        // Assert
        Assert.Contains("Vui lòng chọn khách hàng đặt hàng.", result.Errors.Select(e => e.ErrorMessage));
    }

    [Fact(DisplayName = "CreateBooking/UTCID04 – số lượng 100.001 (validator)")]
    [Trait("Function", Function)]
    [Trait("UTCID", "CreateBooking/UTCID04")]
    [Trait("Type", "A")]
    public void UTCID04_QuantityAboveLimit_ValidatorRejects()
    {
        // Arrange
        var command = new SaveSalesBookingCommand(null, Booking(SalesData.KhHm01, 100_001));

        // Act
        var result = new SaveSalesBookingCommandValidator().Validate(command);

        // Assert
        Assert.Contains("Số lượng đặt vượt quá giới hạn 100.000.", result.Errors.Select(e => e.ErrorMessage));
    }

    [Fact(DisplayName = "CreateBooking/UTCID05 – tổng 500.000, trả trước 600.000")]
    [Trait("Function", Function)]
    [Trait("UTCID", "CreateBooking/UTCID05")]
    [Trait("Type", "A")]
    public async Task UTCID05_DepositAboveTotal_ReturnsError()
    {
        // Arrange
        using var _ = new VietnameseCulture();
        var (db, handler) = Arrange();

        // Act
        var result = await handler.Handle(new SaveSalesBookingCommand(null, Booking(SalesData.KhHm01, 5, paid: 600_000)), CancellationToken.None);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("Tiền khách trả trước (600.000) vượt quá giá trị đơn (500.000).", result.Error);
        Assert.Empty(db.TrxOrders.AsNoTracking());
    }

    [Fact(DisplayName = "CreateBooking/UTCID06 – phương thức thanh toán \"DEBT\" (validator)")]
    [Trait("Function", Function)]
    [Trait("UTCID", "CreateBooking/UTCID06")]
    [Trait("Type", "A")]
    public void UTCID06_DebtPaymentMethod_ValidatorRejects()
    {
        // Arrange
        var command = new SaveSalesBookingCommand(null, Booking(SalesData.KhHm01, 5, paymentMethod: "DEBT"));

        // Act
        var result = new SaveSalesBookingCommandValidator().Validate(command);

        // Assert
        Assert.Contains("Phương thức thanh toán chỉ gồm Tiền mặt hoặc Chuyển khoản.", result.Errors.Select(e => e.ErrorMessage));
    }
}
