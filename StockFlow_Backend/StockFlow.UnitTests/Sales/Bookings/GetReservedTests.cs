using StockFlow.Application.Features.SalesBookings.Common;
using StockFlow.Application.Features.SalesBookings.Queries;
using StockFlow.UnitTests.Common;
using Xunit;

namespace StockFlow.UnitTests.Sales.Bookings;

/// <summary>
/// Report 5.1 – sheet GetReserved (SF-FUNC-106): số lượng từng hàng đang giữ cho các đơn đặt còn mở tại một kho
/// (POS dùng để tính tồn khả dụng).
/// </summary>
public class GetReservedTests
{
    private const string Function = "SF-FUNC-106";

    private static (TestStockFlowDbContext Db, SalesBookingQueryHandler Handler) Arrange(params int[] userWarehouses)
    {
        var db = TestStockFlowDbContext.Create();
        TestData.SeedMasterData(db);
        SalesData.SeedCustomers(db);
        var user = CurrentUser.WithWarehouses(TestData.UserId, userWarehouses.Length == 0 ? new[] { TestData.K001 } : userWarehouses);
        return (db, new SalesBookingQueryHandler(db, user.Object));
    }

    private static void Book(TestStockFlowDbContext db, string code, decimal qty, string status = SalesBookingOps.Draft) =>
        SalesData.AddBooking(db, code, SalesData.KhHm01, TestData.K001, status, new[] { (TestData.PTest, qty, SalesData.PTestPrice) });

    [Fact(DisplayName = "GetReserved/UTCID01 – 2 đơn mở tại K001 giữ P-TEST 5 và 3: P-TEST = 8")]
    [Trait("Function", Function)]
    [Trait("UTCID", "GetReserved/UTCID01")]
    [Trait("Type", "N")]
    public async Task UTCID01_TwoOpenBookings_SumsReservedQuantity()
    {
        // Arrange
        var (db, handler) = Arrange();
        Book(db, "DH0001", 5);
        Book(db, "DH0002", 3);

        // Act
        var result = await handler.Handle(new GetReservedQuantitiesQuery(TestData.K001), CancellationToken.None);

        // Assert
        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(8, result.Value![TestData.PTest]);
    }

    [Fact(DisplayName = "GetReserved/UTCID02 – đơn giữ P-TEST 5 đã CANCELLED: không tính")]
    [Trait("Function", Function)]
    [Trait("UTCID", "GetReserved/UTCID02")]
    [Trait("Type", "N")]
    public async Task UTCID02_CancelledBooking_IsNotCounted()
    {
        // Arrange – thêm 1 đơn mở giữ 3 để thấy rõ chỉ đơn hủy bị loại
        var (db, handler) = Arrange();
        Book(db, "DH0001", 5, SalesBookingOps.Cancelled);
        Book(db, "DH0002", 3);

        // Act
        var result = await handler.Handle(new GetReservedQuantitiesQuery(TestData.K001), CancellationToken.None);

        // Assert
        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(3, result.Value![TestData.PTest]);
    }

    [Fact(DisplayName = "GetReserved/UTCID03 – không có đơn mở: danh sách rỗng")]
    [Trait("Function", Function)]
    [Trait("UTCID", "GetReserved/UTCID03")]
    [Trait("Type", "B")]
    public async Task UTCID03_NoOpenBooking_ReturnsEmpty()
    {
        // Arrange
        var (_, handler) = Arrange();

        // Act
        var result = await handler.Handle(new GetReservedQuantitiesQuery(TestData.K001), CancellationToken.None);

        // Assert
        Assert.True(result.IsSuccess, result.Error);
        Assert.Empty(result.Value!);
    }

    [Fact(DisplayName = "GetReserved/UTCID04 – người dùng chỉ có quyền K002, hỏi K001: không trả dữ liệu K001 (BR-04)")]
    [Trait("Function", Function)]
    [Trait("UTCID", "GetReserved/UTCID04")]
    [Trait("Type", "A")]
    public async Task UTCID04_NoAccessToWarehouse_ReturnsNoData()
    {
        // Arrange
        var (db, handler) = Arrange(TestData.K002);
        Book(db, "DH0001", 5);

        // Act
        var result = await handler.Handle(new GetReservedQuantitiesQuery(TestData.K001), CancellationToken.None);

        // Assert
        Assert.True(result.IsSuccess, result.Error);
        Assert.Empty(result.Value!);
    }
}
