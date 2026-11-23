using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Features.Transfers.Commands;
using StockFlow.Application.Features.Transfers.Helpers;
using StockFlow.Domain.Entities;
using StockFlow.UnitTests.Common;
using Xunit;

namespace StockFlow.UnitTests.Inventory.Transfers;

/// <summary>
/// Report 5.1 – sheet CompleteTransfer (SF-FUNC-120): xuất chuyển phiếu DRAFT, trừ tồn kho xuất (TRANSFER_OUT),
/// chuyển IN_TRANSIT. Quyết định nhóm 10/11/2026: cho xuất vượt tồn, tồn kho xuất có thể âm.
/// </summary>
public class CompleteTransferTests
{
    private const string Function = "SF-FUNC-120";

    private static (TestStockFlowDbContext Db, CompleteTransferCommandHandler Handler, int TransferId) Arrange(
        decimal stock, decimal transferQty, string status = TransferStatus.Draft, params int[] userWarehouses) =>
        Arrange(stock, transferQty, allowNegativeTransfer: null, status, userWarehouses);

    /// <param name="allowNegativeTransfer">null = chưa có dòng cài đặt (mặc định cho phép); có giá trị = lưu cài đặt "chuyển hàng khi âm kho"</param>
    private static (TestStockFlowDbContext Db, CompleteTransferCommandHandler Handler, int TransferId) Arrange(
        decimal stock, decimal transferQty, bool? allowNegativeTransfer, string status = TransferStatus.Draft, params int[] userWarehouses)
    {
        var db = TestStockFlowDbContext.Create();
        TestData.SeedMasterData(db);
        if (allowNegativeTransfer.HasValue) SalesData.SeedOrderSettings(db, s => s.AllowNegativeStockTransfer = allowNegativeTransfer.Value);
        TestData.SetStock(db, TestData.K001, TestData.PTest, stock, 10_000m);
        var id = TestData.AddTransfer(db, status, transferQty);
        var user = CurrentUser.WithWarehouses(TestData.UserId, userWarehouses.Length == 0 ? new[] { TestData.K001 } : userWarehouses);
        return (db, new CompleteTransferCommandHandler(db, user.Object), id);
    }

    [Fact(DisplayName = "CompleteTransfer/UTCID01 – tồn K001 100, chuyển 30: IN_TRANSIT, K001 còn 70, thẻ kho TRANSFER_OUT −30")]
    [Trait("Function", Function)]
    [Trait("UTCID", "CompleteTransfer/UTCID01")]
    [Trait("Type", "N")]
    public async Task UTCID01_DraftTransfer_DeductsSourceStockAndSetsInTransit()
    {
        // Arrange
        var (db, handler, id) = Arrange(stock: 100, transferQty: 30);

        // Act
        var result = await handler.Handle(new CompleteTransferCommand(id, TestData.UserId), CancellationToken.None);

        // Assert
        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(TransferStatus.InTransit, result.Value!.Status);
        Assert.Equal(70, TestData.StockOf(db, TestData.K001));
        var card = Assert.Single(TestData.CardEntries(db, TransferStockOps.ReferenceType, id));
        Assert.Equal("TRANSFER_OUT", card.TransactionType);
        Assert.Equal(-30, card.Quantity);
        Assert.Equal(TestData.K001, card.WarehouseId);
        var line = await db.DtlStockTransferItems.AsNoTracking().SingleAsync();
        Assert.Equal(30, line.IssuedQuantity);
        Assert.Equal(10_000m, line.UnitCost);
    }

    [Fact(DisplayName = "CompleteTransfer/UTCID02 – tồn 10, chuyển đúng 10: IN_TRANSIT, K001 = 0")]
    [Trait("Function", Function)]
    [Trait("UTCID", "CompleteTransfer/UTCID02")]
    [Trait("Type", "B")]
    public async Task UTCID02_TransferAllStock_SourceStockBecomesZero()
    {
        // Arrange
        var (db, handler, id) = Arrange(stock: 10, transferQty: 10);

        // Act
        var result = await handler.Handle(new CompleteTransferCommand(id, TestData.UserId), CancellationToken.None);

        // Assert
        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(TransferStatus.InTransit, result.Value!.Status);
        Assert.Equal(0, TestData.StockOf(db, TestData.K001));
    }

    [Fact(DisplayName = "CompleteTransfer/UTCID03 – tồn 10, chuyển 15: IN_TRANSIT, K001 = −5 (quyết định nhóm)")]
    [Trait("Function", Function)]
    [Trait("UTCID", "CompleteTransfer/UTCID03")]
    [Trait("Type", "B")]
    public async Task UTCID03_TransferAboveStock_SourceStockGoesNegative()
    {
        // Arrange
        var (db, handler, id) = Arrange(stock: 10, transferQty: 15);

        // Act
        var result = await handler.Handle(new CompleteTransferCommand(id, TestData.UserId), CancellationToken.None);

        // Assert
        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(TransferStatus.InTransit, result.Value!.Status);
        Assert.Equal(-5, TestData.StockOf(db, TestData.K001));
        Assert.Equal(-15, TestData.CardEntries(db, TransferStockOps.ReferenceType, id)
            .Where(c => c.TransactionType == "TRANSFER_OUT").Sum(c => c.Quantity ?? 0));
    }

    [Fact(DisplayName = "CompleteTransfer/UTCID04 – phiếu đã IN_TRANSIT")]
    [Trait("Function", Function)]
    [Trait("UTCID", "CompleteTransfer/UTCID04")]
    [Trait("Type", "A")]
    public async Task UTCID04_AlreadyInTransit_ReturnsError()
    {
        // Arrange
        var (db, handler, id) = Arrange(stock: 100, transferQty: 30, status: TransferStatus.InTransit);

        // Act
        var result = await handler.Handle(new CompleteTransferCommand(id, TestData.UserId), CancellationToken.None);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("Chỉ phiếu ở trạng thái 'Phiếu tạm' mới có thể xuất chuyển đi. Trạng thái hiện tại: IN_TRANSIT.", result.Error);
        Assert.Equal(100, TestData.StockOf(db, TestData.K001));
    }

    [Fact(DisplayName = "CompleteTransfer/UTCID05 – người dùng chỉ có quyền K002")]
    [Trait("Function", Function)]
    [Trait("UTCID", "CompleteTransfer/UTCID05")]
    [Trait("Type", "A")]
    public async Task UTCID05_NoAccessToSourceWarehouse_ReturnsError()
    {
        // Arrange
        var (db, handler, id) = Arrange(stock: 100, transferQty: 30, status: TransferStatus.Draft, TestData.K002);

        // Act
        var result = await handler.Handle(new CompleteTransferCommand(id, TestData.UserId), CancellationToken.None);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("Bạn không có quyền xuất hàng chuyển kho từ kho này.", result.Error);
        Assert.Equal(100, TestData.StockOf(db, TestData.K001));
        Assert.Empty(db.TrxInventoryTransactions.AsNoTracking());
    }

    [Fact(DisplayName = "CompleteTransfer/UTCID06 – tắt \"chuyển hàng khi âm kho\", tồn K001 10, chuyển 15: bị chặn, tồn không đổi")]
    [Trait("Function", Function)]
    [Trait("UTCID", "CompleteTransfer/UTCID06")]
    [Trait("Type", "A")]
    public async Task UTCID06_NegativeTransferDisabled_AboveStock_ReturnsError()
    {
        var (db, handler, id) = Arrange(stock: 10, transferQty: 15, allowNegativeTransfer: false);
        var result = await handler.Handle(new CompleteTransferCommand(id, TestData.UserId), CancellationToken.None);
        Assert.False(result.IsSuccess);
        Assert.Equal("Hàng P-TEST - Sản phẩm test chỉ còn tồn 10 tại kho xuất, không đủ chuyển 15. Cài đặt hiện không cho chuyển hàng khi âm kho.", result.Error);
        Assert.Equal(10, TestData.StockOf(db, TestData.K001));
    }

    [Fact(DisplayName = "CompleteTransfer/UTCID07 – tắt \"chuyển hàng khi âm kho\", tồn K001 10, chuyển 10: vẫn xuất được, tồn 0")]
    [Trait("Function", Function)]
    [Trait("UTCID", "CompleteTransfer/UTCID07")]
    [Trait("Type", "B")]
    public async Task UTCID07_NegativeTransferDisabled_WithinStock_Succeeds()
    {
        var (db, handler, id) = Arrange(stock: 10, transferQty: 10, allowNegativeTransfer: false);
        var result = await handler.Handle(new CompleteTransferCommand(id, TestData.UserId), CancellationToken.None);
        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(TransferStatus.InTransit, result.Value!.Status);
        Assert.Equal(0, TestData.StockOf(db, TestData.K001));
    }
}
