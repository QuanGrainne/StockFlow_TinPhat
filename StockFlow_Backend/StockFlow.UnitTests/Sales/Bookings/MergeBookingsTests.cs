using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Features.SalesBookings.Commands;
using StockFlow.Application.Features.SalesBookings.Common;
using StockFlow.UnitTests.Common;
using Xunit;
using static StockFlow.UnitTests.Sales.Bookings.BookingTestBase;

namespace StockFlow.UnitTests.Sales.Bookings;

/// <summary>
/// Report 5.1 – sheet MergeBookings (SF-FUNC-113): gộp ≥ 2 đơn DRAFT cùng khách, cùng chi nhánh thành 1 đơn DRAFT mới;
/// đơn gốc CANCELLED, tiền trả trước chuyển sang đơn mới. (Workbook ghi BR-09; Report 3 bản sao là BR-10.)
/// </summary>
public class MergeBookingsTests
{
    private const string Function = "SF-FUNC-113";

    private static int Add(TestStockFlowDbContext db, string code, int partnerId = SalesData.KhHm01, int warehouseId = TestData.K001,
        string status = SalesBookingOps.Draft, int productId = TestData.PTest, decimal paid = 0) =>
        SalesData.AddBooking(db, code, partnerId, warehouseId, status, new[] { (productId, 5m, SalesData.PTestPrice) }, paid);

    [Fact(DisplayName = "MergeBookings/UTCID01 – gộp DH0001 (trả trước 100.000) và DH0002: đơn mới DRAFT đủ dòng, PaidAmount 100.000, đơn gốc CANCELLED")]
    [Trait("Function", Function)]
    [Trait("UTCID", "MergeBookings/UTCID01")]
    [Trait("Type", "N")]
    public async Task UTCID01_TwoDraftBookings_MergesIntoNewDraft()
    {
        // Arrange
        var (db, handler) = Arrange();
        var id1 = Add(db, "DH0001", paid: 100_000);
        var id2 = Add(db, "DH0002", productId: SalesData.PTest2);

        // Act
        var result = await handler.Handle(new MergeSalesBookingsCommand(new List<int> { id1, id2 }), CancellationToken.None);

        // Assert
        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(SalesBookingOps.Draft, result.Value!.Status);
        Assert.Equal(100_000m, result.Value.PaidAmount);
        var merged = await db.TrxOrders.AsNoTracking().Include(o => o.DtlOrderItems).SingleAsync(o => o.OrderId == result.Value.OrderId);
        Assert.Equal(2, merged.DtlOrderItems.Count);
        foreach (var id in new[] { id1, id2 })
        {
            var source = await db.TrxOrders.AsNoTracking().SingleAsync(o => o.OrderId == id);
            Assert.Equal(SalesBookingOps.Cancelled, source.Status);
            Assert.Equal(merged.OrderId, source.ConsolidatedIntoOrderId);
        }
        Assert.Equal(merged.OrderId, (await db.TrxFinancialTransactions.AsNoTracking().SingleAsync()).ReferenceId);
    }

    [Fact(DisplayName = "MergeBookings/UTCID02 – chỉ chọn DH0001")]
    [Trait("Function", Function)]
    [Trait("UTCID", "MergeBookings/UTCID02")]
    [Trait("Type", "A")]
    public async Task UTCID02_SingleBooking_ReturnsError()
    {
        // Arrange
        var (db, handler) = Arrange();
        var id1 = Add(db, "DH0001");

        // Act
        var result = await handler.Handle(new MergeSalesBookingsCommand(new List<int> { id1 }), CancellationToken.None);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("Cần chọn ít nhất 2 đơn đặt hàng để gộp.", result.Error);
    }

    [Fact(DisplayName = "MergeBookings/UTCID03 – 2 đơn của 2 khách khác nhau")]
    [Trait("Function", Function)]
    [Trait("UTCID", "MergeBookings/UTCID03")]
    [Trait("Type", "A")]
    public async Task UTCID03_DifferentCustomers_ReturnsError()
    {
        // Arrange
        var (db, handler) = Arrange();
        var id1 = Add(db, "DH0001");
        var id2 = Add(db, "DH0002", partnerId: SalesData.KhHm02);

        // Act
        var result = await handler.Handle(new MergeSalesBookingsCommand(new List<int> { id1, id2 }), CancellationToken.None);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("Chỉ gộp được các đơn của cùng 1 khách hàng (BR-09).", result.Error);
    }

    [Fact(DisplayName = "MergeBookings/UTCID04 – đơn của K001 và K002")]
    [Trait("Function", Function)]
    [Trait("UTCID", "MergeBookings/UTCID04")]
    [Trait("Type", "A")]
    public async Task UTCID04_DifferentBranches_ReturnsError()
    {
        // Arrange
        var (db, handler) = Arrange();
        var id1 = Add(db, "DH0001");
        var id2 = Add(db, "DH0002", warehouseId: TestData.K002);

        // Act
        var result = await handler.Handle(new MergeSalesBookingsCommand(new List<int> { id1, id2 }), CancellationToken.None);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("Chỉ gộp được các đơn cùng chi nhánh xử lý.", result.Error);
    }

    [Fact(DisplayName = "MergeBookings/UTCID05 – DH0002 đã CANCELLED")]
    [Trait("Function", Function)]
    [Trait("UTCID", "MergeBookings/UTCID05")]
    [Trait("Type", "A")]
    public async Task UTCID05_CancelledSource_ReturnsError()
    {
        // Arrange
        var (db, handler) = Arrange();
        var id1 = Add(db, "DH0001");
        var id2 = Add(db, "DH0002", status: SalesBookingOps.Cancelled);

        // Act
        var result = await handler.Handle(new MergeSalesBookingsCommand(new List<int> { id1, id2 }), CancellationToken.None);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("Đơn DH0002 không gộp được: chỉ gộp đơn ở trạng thái Phiếu tạm.", result.Error);
    }
}
