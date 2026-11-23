using MediatR;
using Microsoft.EntityFrameworkCore;
using Moq;
using StockFlow.Application.Common;
using StockFlow.Application.Features.Orders.Commands;
using StockFlow.Application.Features.Orders.DTOs;
using StockFlow.Application.Features.Orders.Queries;
using StockFlow.UnitTests.Common;
using Xunit;

namespace StockFlow.UnitTests.Sales.Orders;

/// <summary>
/// Report 5.1 – sheet UpdateOrder (SF-FUNC-103): sửa thông tin hóa đơn (người bán, ghi chú, loại chứng từ), không đổi tồn / tiền;
/// không đổi qua lại INVOICE ↔ BOOKING. Precondition chung: hóa đơn HD0001 của K001.
/// Handler gọi lại GetOrderDetailQuery qua IMediator để trả chi tiết → mock IMediator, kiểm dữ liệu đã lưu trong DB.
/// </summary>
public class UpdateOrderTests
{
    private const string Function = "SF-FUNC-103";

    private static (TestStockFlowDbContext Db, UpdateOrderCommandHandler Handler, Mock<IMediator> Mediator) Arrange(params int[] userWarehouses)
    {
        var db = TestStockFlowDbContext.Create();
        TestData.SeedMasterData(db);
        SalesData.SeedCustomers(db);
        TestData.SetStock(db, TestData.K001, TestData.PTest, 48, 10_000m);
        SalesData.AddInvoice(db, "HD0001", SalesData.KhHm01, TestData.K001, "COMPLETED", TestData.PTest, 2, SalesData.PTestPrice,
            withStockIssue: true, paid: 200_000);
        var user = CurrentUser.WithWarehouses(TestData.UserId, userWarehouses.Length == 0 ? new[] { TestData.K001 } : userWarehouses);
        var mediator = new Mock<IMediator>();
        mediator.Setup(m => m.Send(It.IsAny<GetOrderDetailQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result.Success(new OrderDetailDto()));
        var handler = new UpdateOrderCommandHandler(db, user.Object, mediator.Object, Permissions.WithFeatures().Object);
        return (db, handler, mediator);
    }

    [Fact(DisplayName = "UpdateOrder/UTCID01 – ghi chú \"Giao buổi chiều\", người bán \"Lan\": lưu [Người bán: Lan], tồn không đổi")]
    [Trait("Function", Function)]
    [Trait("UTCID", "UpdateOrder/UTCID01")]
    [Trait("Type", "N")]
    public async Task UTCID01_UpdateNotesAndSeller_SavesNotesWithoutStockChange()
    {
        // Arrange
        var (db, handler, mediator) = Arrange();

        // Act
        var result = await handler.Handle(
            new UpdateOrderCommand("HD0001", new UpdateOrderDto { Notes = "Giao buổi chiều", SalesRepName = "Lan" }), CancellationToken.None);

        // Assert
        Assert.True(result.IsSuccess, result.Error);
        var order = await db.TrxOrders.AsNoTracking().SingleAsync();
        Assert.Contains("[Người bán: Lan]", order.Notes);
        Assert.Contains("Giao buổi chiều", order.Notes);
        Assert.Equal(48, TestData.StockOf(db, TestData.K001));
        mediator.Verify(m => m.Send(It.Is<GetOrderDetailQuery>(q => q.OrderId == order.OrderId), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact(DisplayName = "UpdateOrder/UTCID02 – đổi loại sang BOOKING")]
    [Trait("Function", Function)]
    [Trait("UTCID", "UpdateOrder/UTCID02")]
    [Trait("Type", "A")]
    public async Task UTCID02_ChangeInvoiceToBooking_ReturnsError()
    {
        // Arrange
        var (_, handler, _) = Arrange();

        // Act
        var result = await handler.Handle(new UpdateOrderCommand("HD0001", new UpdateOrderDto { OrderType = "BOOKING" }), CancellationToken.None);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("Không đổi được loại chứng từ giữa hóa đơn và đơn đặt hàng.", result.Error);
    }

    [Fact(DisplayName = "UpdateOrder/UTCID03 – loại đơn \"RETURN\" không hợp lệ")]
    [Trait("Function", Function)]
    [Trait("UTCID", "UpdateOrder/UTCID03")]
    [Trait("Type", "A")]
    public async Task UTCID03_InvalidOrderType_ReturnsError()
    {
        // Arrange
        var (_, handler, _) = Arrange();

        // Act
        var result = await handler.Handle(new UpdateOrderCommand("HD0001", new UpdateOrderDto { OrderType = "RETURN" }), CancellationToken.None);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("Loại đơn hàng không hợp lệ. Chỉ chấp nhận 'INVOICE' (Hóa đơn) hoặc 'BOOKING' (Đặt hàng).", result.Error);
    }

    [Fact(DisplayName = "UpdateOrder/UTCID04 – người dùng chỉ có quyền K002 (BR-04)")]
    [Trait("Function", Function)]
    [Trait("UTCID", "UpdateOrder/UTCID04")]
    [Trait("Type", "A")]
    public async Task UTCID04_NoAccessToInvoiceWarehouse_ReturnsError()
    {
        // Arrange
        var (db, handler, _) = Arrange(TestData.K002);

        // Act
        var result = await handler.Handle(new UpdateOrderCommand("HD0001", new UpdateOrderDto { Notes = "x" }), CancellationToken.None);

        // Assert – nhóm chốt 24/11/2026 giữ câu của code ("đơn hàng"): HD0001 là hóa đơn, không phải đơn đặt hàng
        Assert.False(result.IsSuccess);
        Assert.Equal("Bạn không có quyền sửa đơn hàng của chi nhánh này.", result.Error);
        Assert.Null((await db.TrxOrders.AsNoTracking().SingleAsync()).Notes);
    }

    [Fact(DisplayName = "UpdateOrder/UTCID05 – mã đơn HD9999 không tồn tại")]
    [Trait("Function", Function)]
    [Trait("UTCID", "UpdateOrder/UTCID05")]
    [Trait("Type", "A")]
    public async Task UTCID05_UnknownOrder_ReturnsError()
    {
        // Arrange
        var (_, handler, _) = Arrange();

        // Act
        var result = await handler.Handle(new UpdateOrderCommand("HD9999", new UpdateOrderDto { Notes = "x" }), CancellationToken.None);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("Không tìm thấy đơn hàng #HD9999.", result.Error);
    }
}
