using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Features.Transfers.Commands;
using StockFlow.Application.Features.Transfers.Helpers;
using StockFlow.Domain.Entities;
using StockFlow.UnitTests.Common;
using Xunit;

namespace StockFlow.UnitTests.Inventory.Transfers;

/// <summary>
/// Report 5.1 – sheet CancelTransfer (SF-FUNC-122): hủy phiếu ở mọi trạng thái. Quyết định nhóm: đã xuất thì hoàn tồn kho xuất;
/// đã nhận thì trừ lại cả tồn kho nhận (người dùng phải quản lý kho nhận).
/// UTCID03 (hủy phiếu RECEIVED) đang chờ chốt Q1 – mặc định theo code và quyết định nhóm.
/// </summary>
public class CancelTransferTests
{
    private const string Function = "SF-FUNC-122";

    private static (TestStockFlowDbContext Db, CancelTransferCommandHandler Handler, int TransferId) Arrange(
        string status, decimal sourceStock, decimal destStock, params int[] userWarehouses)
    {
        var db = TestStockFlowDbContext.Create();
        TestData.SeedMasterData(db);
        TestData.SetStock(db, TestData.K001, TestData.PTest, sourceStock, 10_000m);
        if (destStock != 0) TestData.SetStock(db, TestData.K002, TestData.PTest, destStock, 10_000m);
        var dispatched = status is TransferStatus.InTransit or TransferStatus.Received;
        var id = TestData.AddTransfer(db, status, 30,
            issuedQuantity: dispatched ? 30 : 0,
            receivedQuantity: status == TransferStatus.Received ? 30 : null,
            unitCost: dispatched ? 10_000m : null);
        var user = CurrentUser.WithWarehouses(TestData.UserId, userWarehouses);
        return (db, new CancelTransferCommandHandler(db, user.Object), id);
    }

    [Fact(DisplayName = "CancelTransfer/UTCID01 – hủy phiếu DRAFT: CANCELLED, không đổi tồn")]
    [Trait("Function", Function)]
    [Trait("UTCID", "CancelTransfer/UTCID01")]
    [Trait("Type", "N")]
    public async Task UTCID01_DraftTransfer_CancelsWithoutStockChange()
    {
        // Arrange
        var (db, handler, id) = Arrange(TransferStatus.Draft, sourceStock: 100, destStock: 0, TestData.K001);

        // Act
        var result = await handler.Handle(new CancelTransferCommand(id, null, TestData.UserId), CancellationToken.None);

        // Assert
        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(TransferStatus.Cancelled, (await db.TrxStockTransfers.AsNoTracking().SingleAsync()).Status);
        Assert.Equal(100, TestData.StockOf(db, TestData.K001));
        Assert.Empty(db.TrxInventoryTransactions.AsNoTracking());
    }

    [Fact(DisplayName = "CancelTransfer/UTCID02 – hủy phiếu IN_TRANSIT 30, K001 70: K001 = 100, thẻ kho TRANSFER_CANCEL_IN +30")]
    [Trait("Function", Function)]
    [Trait("UTCID", "CancelTransfer/UTCID02")]
    [Trait("Type", "N")]
    public async Task UTCID02_InTransitTransfer_RestoresSourceStock()
    {
        // Arrange
        var (db, handler, id) = Arrange(TransferStatus.InTransit, sourceStock: 70, destStock: 0, TestData.K001);

        // Act
        var result = await handler.Handle(new CancelTransferCommand(id, null, TestData.UserId), CancellationToken.None);

        // Assert
        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(TransferStatus.Cancelled, (await db.TrxStockTransfers.AsNoTracking().SingleAsync()).Status);
        Assert.Equal(100, TestData.StockOf(db, TestData.K001));
        var card = Assert.Single(TestData.CardEntries(db, TransferStockOps.ReferenceType, id));
        Assert.Equal("TRANSFER_CANCEL_IN", card.TransactionType);
        Assert.Equal(30, card.Quantity);
        Assert.Equal(TestData.K001, card.WarehouseId);
    }

    [Fact(DisplayName = "CancelTransfer/UTCID03 – hủy phiếu RECEIVED 30 (K001 70, K002 50): K001 = 100, K002 = 20")]
    [Trait("Function", Function)]
    [Trait("UTCID", "CancelTransfer/UTCID03")]
    [Trait("Type", "N")]
    public async Task UTCID03_ReceivedTransfer_ReversesBothWarehouses()
    {
        // Arrange
        var (db, handler, id) = Arrange(TransferStatus.Received, sourceStock: 70, destStock: 50, TestData.K001, TestData.K002);

        // Act
        var result = await handler.Handle(new CancelTransferCommand(id, null, TestData.UserId), CancellationToken.None);

        // Assert
        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(TransferStatus.Cancelled, (await db.TrxStockTransfers.AsNoTracking().SingleAsync()).Status);
        Assert.Equal(100, TestData.StockOf(db, TestData.K001));
        Assert.Equal(20, TestData.StockOf(db, TestData.K002));
        var cards = TestData.CardEntries(db, TransferStockOps.ReferenceType, id);
        Assert.Contains(cards, c => c.TransactionType == "TRANSFER_CANCEL_OUT" && c.WarehouseId == TestData.K002 && c.Quantity == -30);
        Assert.Contains(cards, c => c.TransactionType == "TRANSFER_CANCEL_IN" && c.WarehouseId == TestData.K001 && c.Quantity == 30);
    }

    [Fact(DisplayName = "CancelTransfer/UTCID04 – phiếu đã CANCELLED")]
    [Trait("Function", Function)]
    [Trait("UTCID", "CancelTransfer/UTCID04")]
    [Trait("Type", "A")]
    public async Task UTCID04_AlreadyCancelled_ReturnsError()
    {
        // Arrange
        var (db, handler, id) = Arrange(TransferStatus.Cancelled, sourceStock: 100, destStock: 0, TestData.K001);

        // Act
        var result = await handler.Handle(new CancelTransferCommand(id, null, TestData.UserId), CancellationToken.None);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("Phiếu chuyển hàng này đã bị hủy trước đó.", result.Error);
        Assert.Empty(db.TrxInventoryTransactions.AsNoTracking());
    }

    [Fact(DisplayName = "CancelTransfer/UTCID05 – phiếu RECEIVED, người dùng chỉ có quyền K001")]
    [Trait("Function", Function)]
    [Trait("UTCID", "CancelTransfer/UTCID05")]
    [Trait("Type", "A")]
    public async Task UTCID05_ReceivedTransferWithoutDestinationAccess_ReturnsError()
    {
        // Arrange
        var (db, handler, id) = Arrange(TransferStatus.Received, sourceStock: 70, destStock: 50, TestData.K001);

        // Act
        var result = await handler.Handle(new CancelTransferCommand(id, null, TestData.UserId), CancellationToken.None);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("Bạn không có quyền hủy phiếu đã nhận vì không quản lý kho nhận hàng.", result.Error);
        Assert.Equal(70, TestData.StockOf(db, TestData.K001));
        Assert.Equal(50, TestData.StockOf(db, TestData.K002));
    }

    [Fact(DisplayName = "CancelTransfer/UTCID06 – phiếu DRAFT, người dùng chỉ có quyền K002")]
    [Trait("Function", Function)]
    [Trait("UTCID", "CancelTransfer/UTCID06")]
    [Trait("Type", "A")]
    public async Task UTCID06_NoAccessToSourceWarehouse_ReturnsError()
    {
        // Arrange
        var (db, handler, id) = Arrange(TransferStatus.Draft, sourceStock: 100, destStock: 0, TestData.K002);

        // Act
        var result = await handler.Handle(new CancelTransferCommand(id, null, TestData.UserId), CancellationToken.None);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("Bạn không có quyền hủy phiếu chuyển hàng của kho xuất này.", result.Error);
        Assert.Equal(TransferStatus.Draft, (await db.TrxStockTransfers.AsNoTracking().SingleAsync()).Status);
    }
}
