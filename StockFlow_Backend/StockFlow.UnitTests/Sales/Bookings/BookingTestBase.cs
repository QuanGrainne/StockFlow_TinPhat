using StockFlow.Application.Features.SalesBookings.Commands;
using StockFlow.Application.Features.SalesBookings.DTOs;
using StockFlow.Infrastructure.Services;
using StockFlow.UnitTests.Common;

namespace StockFlow.UnitTests.Sales.Bookings;

/// <summary>Dựng chung cho các sheet đặt hàng (SalesBookingCommandHandler xử lý tạo / sửa / hủy / gộp).</summary>
internal static class BookingTestBase
{
    public static (TestStockFlowDbContext Db, SalesBookingCommandHandler Handler) Arrange(params int[] userWarehouses)
    {
        var db = TestStockFlowDbContext.Create();
        TestData.SeedMasterData(db);
        SalesData.SeedCustomers(db);
        SalesData.SeedSecondProduct(db);
        TestData.SetStock(db, TestData.K001, TestData.PTest, 50, 10_000m);
        var user = CurrentUser.WithWarehouses(TestData.UserId, userWarehouses.Length == 0 ? new[] { TestData.K001 } : userWarehouses);
        return (db, new SalesBookingCommandHandler(db, new TransactionCodeGenerator(db), user.Object));
    }

    public static SaveSalesBookingRequest Booking(int partnerId, decimal quantity, decimal paid = 0, string paymentMethod = "CASH") => new()
    {
        PartnerId = partnerId,
        WarehouseId = TestData.K001,
        PaidAmount = paid,
        PaymentMethod = paymentMethod,
        Items = new List<SalesBookingLineRequest>
        {
            new() { ProductId = TestData.PTest, Quantity = quantity, OriginalPrice = SalesData.PTestPrice },
        },
    };
}
