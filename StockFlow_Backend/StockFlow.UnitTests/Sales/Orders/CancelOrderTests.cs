using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Features.Orders.Commands;
using StockFlow.Application.Features.SalesBookings.Common;
using StockFlow.UnitTests.Common;
using Xunit;

namespace StockFlow.UnitTests.Sales.Orders;

/// <summary>
/// Report 5.1 – sheet CancelOrder (SF-FUNC-104): hủy hóa đơn hoàn thành, hoàn tồn (ISSUE_SALE_CANCEL), bỏ công nợ và phiếu thu;
/// từ chối khi đã có phiếu trả hàng đang hiệu lực. Precondition chung: HD0001 (P-TEST SL 2) COMPLETED, đã xuất kho K001 (tồn còn 48).
/// </summary>
public class CancelOrderTests
{
    private const string Function = "SF-FUNC-104";

    private static (TestStockFlowDbContext Db, CancelOrderCommandHandler Handler, int InvoiceId, int OrderItemId) Arrange(
        string invoiceStatus = "COMPLETED", params int[] userWarehouses)
    {
        var db = TestStockFlowDbContext.Create();
        TestData.SeedMasterData(db);
        SalesData.SeedCustomers(db);
        TestData.SetStock(db, TestData.K001, TestData.PTest, 48, 10_000m);
        var (invoiceId, itemId) = SalesData.AddInvoice(db, "HD0001", SalesData.KhHm01, TestData.K001, invoiceStatus,
            TestData.PTest, 2, SalesData.PTestPrice, withStockIssue: true, paid: 200_000);
        var user = CurrentUser.WithWarehouses(TestData.UserId, userWarehouses.Length == 0 ? new[] { TestData.K001 } : userWarehouses);
        return (db, new CancelOrderCommandHandler(db, user.Object, Permissions.WithFeatures().Object), invoiceId, itemId);
    }

    [Fact(DisplayName = "CancelOrder/UTCID01 – hủy HD0001: CANCELLED, K001 +2, thẻ kho ISSUE_SALE_CANCEL")]
    [Trait("Function", Function)]
    [Trait("UTCID", "CancelOrder/UTCID01")]
    [Trait("Type", "N")]
    public async Task UTCID01_CompletedInvoice_CancelsAndRestoresStock()
    {
        // Arrange
        var (db, handler, invoiceId, _) = Arrange();

        // Act
        var result = await handler.Handle(new CancelOrderCommand(invoiceId), CancellationToken.None);

        // Assert
        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal("CANCELLED", (await db.TrxOrders.AsNoTracking().SingleAsync()).Status);
        Assert.Equal(50, TestData.StockOf(db, TestData.K001));
        var card = Assert.Single(db.TrxInventoryTransactions.AsNoTracking().ToList());
        Assert.Equal(CancelOrderCommandHandler.CancelTransactionType, card.TransactionType);
        Assert.Equal(2, card.Quantity);
    }

    [Fact(DisplayName = "CancelOrder/UTCID02 – HD0001 đã hủy")]
    [Trait("Function", Function)]
    [Trait("UTCID", "CancelOrder/UTCID02")]
    [Trait("Type", "A")]
    public async Task UTCID02_AlreadyCancelled_ReturnsError()
    {
        // Arrange
        var (_, handler, invoiceId, _) = Arrange("CANCELLED");

        // Act
        var result = await handler.Handle(new CancelOrderCommand(invoiceId), CancellationToken.None);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("Hóa đơn HD0001 đã hủy trước đó.", result.Error);
    }

    [Fact(DisplayName = "CancelOrder/UTCID03 – HD0001 đã có phiếu trả hàng TH0001")]
    [Trait("Function", Function)]
    [Trait("UTCID", "CancelOrder/UTCID03")]
    [Trait("Type", "A")]
    public async Task UTCID03_HasActiveReturn_ReturnsError()
    {
        // Arrange
        var (db, handler, invoiceId, itemId) = Arrange();
        SalesData.AddReturn(db, "TH0001", invoiceId, itemId, TestData.PTest, 1);

        // Act
        var result = await handler.Handle(new CancelOrderCommand(invoiceId), CancellationToken.None);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("Hóa đơn HD0001 đã có phiếu trả hàng TH0001 — hủy phiếu trả hàng trước.", result.Error);
        Assert.Equal(48, TestData.StockOf(db, TestData.K001));
    }

    [Fact(DisplayName = "CancelOrder/UTCID04 – hủy đơn đặt hàng DH0001 ở màn hóa đơn")]
    [Trait("Function", Function)]
    [Trait("UTCID", "CancelOrder/UTCID04")]
    [Trait("Type", "A")]
    public async Task UTCID04_Booking_ReturnsError()
    {
        // Arrange
        var (db, handler, _, _) = Arrange();
        var bookingId = SalesData.AddBooking(db, "DH0001", SalesData.KhHm01, TestData.K001, SalesBookingOps.Draft,
            new[] { (TestData.PTest, 5m, SalesData.PTestPrice) });

        // Act
        var result = await handler.Handle(new CancelOrderCommand(bookingId), CancellationToken.None);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("Đây là đơn đặt hàng — hủy ở màn Đặt hàng.", result.Error);
    }

    [Fact(DisplayName = "CancelOrder/UTCID05 – người dùng chỉ có quyền K002")]
    [Trait("Function", Function)]
    [Trait("UTCID", "CancelOrder/UTCID05")]
    [Trait("Type", "A")]
    public async Task UTCID05_NoAccessToInvoiceWarehouse_ReturnsError()
    {
        // Arrange
        var (db, handler, invoiceId, _) = Arrange("COMPLETED", TestData.K002);

        // Act
        var result = await handler.Handle(new CancelOrderCommand(invoiceId), CancellationToken.None);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("Bạn không có quyền hủy hóa đơn của chi nhánh này.", result.Error);
        Assert.Equal("COMPLETED", (await db.TrxOrders.AsNoTracking().SingleAsync()).Status);
    }
}
