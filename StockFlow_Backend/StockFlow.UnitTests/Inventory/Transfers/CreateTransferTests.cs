using Microsoft.EntityFrameworkCore;
using Moq;
using StockFlow.Application.Features.Transfers.Commands;
using StockFlow.Application.Features.Transfers.DTOs;
using StockFlow.Domain.Entities;
using StockFlow.UnitTests.Common;
using Xunit;

namespace StockFlow.UnitTests.Inventory.Transfers;

/// <summary>
/// Report 5.1 – sheet CreateTransfer (SF-FUNC-117): lập phiếu chuyển DRAFT từ kho xuất sang kho nhận khác,
/// người dùng phải có quyền kho xuất, không đổi tồn kho (UC-37, BR-40).
/// Precondition "User has STOCK_CREATE" là quyền tầng API ([RequirePermission]) nên không mô phỏng.
/// </summary>
public class CreateTransferTests
{
    private const string Function = "SF-FUNC-117";

    private static CreateTransferRequest Request(int source, int dest, params (int ProductId, decimal Quantity)[] items) => new()
    {
        SourceWarehouseId = source,
        DestWarehouseId = dest,
        Items = items.Select(i => new CreateTransferItemRequest { ProductId = i.ProductId, Quantity = i.Quantity }).ToList(),
    };

    private static (TestStockFlowDbContext Db, CreateTransferCommandHandler Handler) Arrange(params int[] userWarehouses)
    {
        var db = TestStockFlowDbContext.Create();
        TestData.SeedMasterData(db);
        TestData.SetStock(db, TestData.K001, TestData.PTest, 100, 10_000m);
        var user = CurrentUser.WithWarehouses(TestData.UserId, userWarehouses);
        return (db, new CreateTransferCommandHandler(db, user.Object));
    }

    [Fact(DisplayName = "CreateTransfer/UTCID01 – K001 → K002, P-TEST 30: phiếu DRAFT, tồn không đổi")]
    [Trait("Function", Function)]
    [Trait("UTCID", "CreateTransfer/UTCID01")]
    [Trait("Type", "N")]
    public async Task UTCID01_ValidRequest_CreatesDraftTransferWithoutStockChange()
    {
        // Arrange
        var (db, handler) = Arrange(TestData.K001);
        var request = Request(TestData.K001, TestData.K002, (TestData.PTest, 30));

        // Act
        var result = await handler.Handle(new CreateTransferCommand(request, TestData.UserId), CancellationToken.None);

        // Assert
        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(TransferStatus.Draft, result.Value!.Status);
        // Workbook ghi "CHxxxx"; tiền tố mặc định trong cấu hình là "CK" (migration 20261102171433) – xem báo cáo
        Assert.False(string.IsNullOrWhiteSpace(result.Value.TransferCode));
        var saved = await db.TrxStockTransfers.AsNoTracking().Include(t => t.DtlStockTransferItems).SingleAsync();
        Assert.Equal(TransferStatus.Draft, saved.Status);
        var line = Assert.Single(saved.DtlStockTransferItems);
        Assert.Equal(30, line.Quantity);
        Assert.Equal(0, line.IssuedQuantity);
        Assert.Equal(100, TestData.StockOf(db, TestData.K001));
        Assert.Equal(0, TestData.StockOf(db, TestData.K002));
        Assert.Empty(db.TrxInventoryTransactions.AsNoTracking());
        db.Transactions.Single().Verify(t => t.CommitAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact(DisplayName = "CreateTransfer/UTCID02 – kho nhận trùng kho xuất")]
    [Trait("Function", Function)]
    [Trait("UTCID", "CreateTransfer/UTCID02")]
    [Trait("Type", "A")]
    public async Task UTCID02_SameSourceAndDestination_ReturnsError()
    {
        // Arrange
        var (db, handler) = Arrange(TestData.K001);
        var request = Request(TestData.K001, TestData.K001, (TestData.PTest, 30));

        // Act
        var result = await handler.Handle(new CreateTransferCommand(request, TestData.UserId), CancellationToken.None);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("Chi nhánh nhận hàng phải khác chi nhánh chuyển đi.", result.Error);
        Assert.Empty(db.TrxStockTransfers.AsNoTracking());
    }

    [Fact(DisplayName = "CreateTransfer/UTCID03 – không chọn kho nhận")]
    [Trait("Function", Function)]
    [Trait("UTCID", "CreateTransfer/UTCID03")]
    [Trait("Type", "A")]
    public async Task UTCID03_NoDestination_ReturnsError()
    {
        // Arrange
        var (db, handler) = Arrange(TestData.K001);
        var request = Request(TestData.K001, 0, (TestData.PTest, 30));

        // Act
        var result = await handler.Handle(new CreateTransferCommand(request, TestData.UserId), CancellationToken.None);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("Vui lòng chọn chi nhánh kho nhận hàng.", result.Error);
        Assert.Empty(db.TrxStockTransfers.AsNoTracking());
    }

    [Fact(DisplayName = "CreateTransfer/UTCID04 – không có mặt hàng")]
    [Trait("Function", Function)]
    [Trait("UTCID", "CreateTransfer/UTCID04")]
    [Trait("Type", "A")]
    public async Task UTCID04_NoItems_ReturnsError()
    {
        // Arrange
        var (db, handler) = Arrange(TestData.K001);
        var request = Request(TestData.K001, TestData.K002);

        // Act
        var result = await handler.Handle(new CreateTransferCommand(request, TestData.UserId), CancellationToken.None);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("Vui lòng chọn ít nhất 1 mặt hàng cần chuyển.", result.Error);
        Assert.Empty(db.TrxStockTransfers.AsNoTracking());
    }

    [Fact(DisplayName = "CreateTransfer/UTCID05 – số lượng chuyển = 0")]
    [Trait("Function", Function)]
    [Trait("UTCID", "CreateTransfer/UTCID05")]
    [Trait("Type", "A")]
    public async Task UTCID05_ZeroQuantity_ReturnsError()
    {
        // Arrange
        var (db, handler) = Arrange(TestData.K001);
        var request = Request(TestData.K001, TestData.K002, (TestData.PTest, 0));

        // Act
        var result = await handler.Handle(new CreateTransferCommand(request, TestData.UserId), CancellationToken.None);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("Số lượng chuyển của các mặt hàng phải lớn hơn 0.", result.Error);
        Assert.Empty(db.TrxStockTransfers.AsNoTracking());
    }

    [Fact(DisplayName = "CreateTransfer/UTCID06 – người dùng chỉ có quyền K002, lập phiếu từ K001")]
    [Trait("Function", Function)]
    [Trait("UTCID", "CreateTransfer/UTCID06")]
    [Trait("Type", "A")]
    public async Task UTCID06_NoAccessToSourceWarehouse_ReturnsError()
    {
        // Arrange
        var (db, handler) = Arrange(TestData.K002);
        var request = Request(TestData.K001, TestData.K002, (TestData.PTest, 30));

        // Act
        var result = await handler.Handle(new CreateTransferCommand(request, TestData.UserId), CancellationToken.None);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("Bạn không có quyền lập phiếu chuyển hàng từ kho này.", result.Error);
        Assert.Empty(db.TrxStockTransfers.AsNoTracking());
    }
}
