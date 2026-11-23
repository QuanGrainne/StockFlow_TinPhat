using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Features.Transfers.Commands;
using StockFlow.Application.Features.Transfers.DTOs;
using StockFlow.Application.Features.Transfers.Helpers;
using StockFlow.Domain.Entities;
using StockFlow.UnitTests.Common;
using Xunit;

namespace StockFlow.UnitTests.Inventory.Transfers;

/// <summary>
/// Report 5.1 – sheet ReceiveTransfer (SF-FUNC-121): nhận phiếu IN_TRANSIT tại kho nhận, cộng SL nhận (TRANSFER_IN)
/// theo giá vốn lúc xuất; nhận thiếu phải có ghi chú (BR-41); thời gian nhận phải sau thời gian chuyển.
/// Precondition chung: phiếu K001 → K002 SL 30 IN_TRANSIT (giá vốn lúc xuất 10.000), tồn K002 = 20 (giá vốn 12.000).
/// </summary>
public class ReceiveTransferTests
{
    private const string Function = "SF-FUNC-121";

    private static (TestStockFlowDbContext Db, ReceiveTransferCommandHandler Handler, int TransferId, DateTime TransferDate) Arrange(
        string status = TransferStatus.InTransit, params int[] userWarehouses)
    {
        var db = TestStockFlowDbContext.Create();
        TestData.SeedMasterData(db);
        TestData.SetStock(db, TestData.K001, TestData.PTest, 70, 10_000m);
        TestData.SetStock(db, TestData.K002, TestData.PTest, 20, 12_000m);
        var transferDate = VietnamTime.Now.AddHours(-2);
        var inTransit = status == TransferStatus.InTransit;
        var id = TestData.AddTransfer(db, status, 30,
            issuedQuantity: inTransit ? 30 : 0, unitCost: inTransit ? 10_000m : null, transferDate: transferDate);
        var user = CurrentUser.WithWarehouses(TestData.UserId, userWarehouses.Length == 0 ? new[] { TestData.K002 } : userWarehouses);
        return (db, new ReceiveTransferCommandHandler(db, user.Object), id, transferDate);
    }

    private static ReceiveTransferRequest Received(decimal quantity, string? notes = null, DateTime? receivedDate = null) => new()
    {
        Notes = notes,
        ReceivedDate = receivedDate,
        Items = new List<ReceiveTransferItemRequest> { new() { ProductId = TestData.PTest, ReceivedQuantity = quantity } },
    };

    [Fact(DisplayName = "ReceiveTransfer/UTCID01 – nhận đủ 30: RECEIVED, K002 = 50, thẻ kho TRANSFER_IN +30")]
    [Trait("Function", Function)]
    [Trait("UTCID", "ReceiveTransfer/UTCID01")]
    [Trait("Type", "N")]
    public async Task UTCID01_ReceiveFullQuantity_AddsDestinationStock()
    {
        // Arrange
        var (db, handler, id, _) = Arrange();

        // Act
        var result = await handler.Handle(new ReceiveTransferCommand(id, Received(30), TestData.UserId), CancellationToken.None);

        // Assert
        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(TransferStatus.Received, result.Value!.Status);
        Assert.Equal(50, TestData.StockOf(db, TestData.K002));
        var card = Assert.Single(TestData.CardEntries(db, TransferStockOps.ReferenceType, id));
        Assert.Equal("TRANSFER_IN", card.TransactionType);
        Assert.Equal(30, card.Quantity);
        Assert.Equal(TestData.K002, card.WarehouseId);
        // Giá vốn kho nhận tính lại bình quân: (20 × 12.000 + 30 × 10.000) / 50 = 10.800
        var destCost = (await db.TrxInventoryBalances.AsNoTracking()
            .FirstAsync(b => b.WarehouseId == TestData.K002 && b.ProductId == TestData.PTest)).UnitCost;
        Assert.Equal(10_800m, destCost);
    }

    [Fact(DisplayName = "ReceiveTransfer/UTCID02 – nhận 25, ghi chú \"Thiếu 5 cái\": RECEIVED, K002 = 45, lưu ghi chú")]
    [Trait("Function", Function)]
    [Trait("UTCID", "ReceiveTransfer/UTCID02")]
    [Trait("Type", "N")]
    public async Task UTCID02_ShortReceiptWithNote_AddsReceivedQuantityAndSavesNote()
    {
        // Arrange
        var (db, handler, id, _) = Arrange();

        // Act
        var result = await handler.Handle(new ReceiveTransferCommand(id, Received(25, "Thiếu 5 cái"), TestData.UserId), CancellationToken.None);

        // Assert
        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(TransferStatus.Received, result.Value!.Status);
        Assert.Equal(45, TestData.StockOf(db, TestData.K002));
        var saved = await db.TrxStockTransfers.AsNoTracking().Include(t => t.DtlStockTransferItems).SingleAsync(t => t.StockTransferId == id);
        Assert.Equal("Thiếu 5 cái", saved.ReceiveNotes);
        Assert.Equal(25, saved.DtlStockTransferItems.Single().ReceivedQuantity);
    }

    [Fact(DisplayName = "ReceiveTransfer/UTCID03 – nhận 29, không ghi chú")]
    [Trait("Function", Function)]
    [Trait("UTCID", "ReceiveTransfer/UTCID03")]
    [Trait("Type", "B")]
    public async Task UTCID03_ShortReceiptWithoutNote_ReturnsError()
    {
        // Arrange
        var (db, handler, id, _) = Arrange();

        // Act
        var result = await handler.Handle(new ReceiveTransferCommand(id, Received(29), TestData.UserId), CancellationToken.None);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("Phát hiện nhận thiếu hàng! Bắt buộc phải nhập ghi chú lý do thiếu hàng trước khi xác nhận Nhận hàng.", result.Error);
        Assert.Equal(20, TestData.StockOf(db, TestData.K002));
        Assert.Equal(TransferStatus.InTransit, (await db.TrxStockTransfers.AsNoTracking().SingleAsync()).Status);
    }

    [Fact(DisplayName = "ReceiveTransfer/UTCID04 – phiếu còn DRAFT")]
    [Trait("Function", Function)]
    [Trait("UTCID", "ReceiveTransfer/UTCID04")]
    [Trait("Type", "A")]
    public async Task UTCID04_DraftTransfer_ReturnsError()
    {
        // Arrange
        var (db, handler, id, _) = Arrange(TransferStatus.Draft);

        // Act
        var result = await handler.Handle(new ReceiveTransferCommand(id, Received(30), TestData.UserId), CancellationToken.None);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("Chỉ phiếu ở trạng thái 'Đang chuyển' mới có thể nhận hàng. Trạng thái hiện tại: DRAFT.", result.Error);
        Assert.Equal(20, TestData.StockOf(db, TestData.K002));
    }

    [Fact(DisplayName = "ReceiveTransfer/UTCID05 – thời gian nhận trước thời gian chuyển")]
    [Trait("Function", Function)]
    [Trait("UTCID", "ReceiveTransfer/UTCID05")]
    [Trait("Type", "A")]
    public async Task UTCID05_ReceivedBeforeTransferDate_ReturnsError()
    {
        // Arrange
        var (db, handler, id, transferDate) = Arrange();
        var receivedDate = transferDate.AddDays(-1);

        // Act
        var result = await handler.Handle(new ReceiveTransferCommand(id, Received(30, receivedDate: receivedDate), TestData.UserId), CancellationToken.None);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal(
            $"Thời gian nhận hàng ({receivedDate:dd/MM/yyyy HH:mm}) phải lớn hơn thời gian chuyển hàng ({transferDate:dd/MM/yyyy HH:mm}).",
            result.Error);
        Assert.Equal(20, TestData.StockOf(db, TestData.K002));
    }

    [Fact(DisplayName = "ReceiveTransfer/UTCID06 – người dùng chỉ có quyền K001 (không quản lý kho nhận)")]
    [Trait("Function", Function)]
    [Trait("UTCID", "ReceiveTransfer/UTCID06")]
    [Trait("Type", "A")]
    public async Task UTCID06_NoAccessToDestinationWarehouse_ReturnsError()
    {
        // Arrange
        var (db, handler, id, _) = Arrange(TransferStatus.InTransit, TestData.K001);

        // Act
        var result = await handler.Handle(new ReceiveTransferCommand(id, Received(30), TestData.UserId), CancellationToken.None);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("Bạn không có quyền xác nhận nhận hàng cho kho nhận này.", result.Error);
        Assert.Equal(20, TestData.StockOf(db, TestData.K002));
    }

    [Fact(DisplayName = "ReceiveTransfer/UTCID07 – nhận 31 > 30 đã xuất: bị chặn, kho nhận giữ 20")]
    [Trait("Function", Function)]
    [Trait("UTCID", "ReceiveTransfer/UTCID07")]
    [Trait("Type", "A")]
    public async Task UTCID07_ReceiveAboveDispatched_ReturnsError()
    {
        // Arrange
        var (db, handler, id, _) = Arrange();

        // Act
        var result = await handler.Handle(new ReceiveTransferCommand(id, Received(31), TestData.UserId), CancellationToken.None);

        // Assert – chốt lại 24/11/2026: số lượng nhận không được lớn hơn số lượng chuyển
        Assert.False(result.IsSuccess);
        Assert.Equal("Hàng P-TEST - Sản phẩm test: số lượng nhận (31) không được lớn hơn số lượng chuyển (30).", result.Error);
        Assert.Equal(20, TestData.StockOf(db, TestData.K002));
        var saved = await db.TrxStockTransfers.AsNoTracking().SingleAsync(t => t.StockTransferId == id);
        Assert.Equal(TransferStatus.InTransit, saved.Status);
    }

    [Fact(DisplayName = "ReceiveTransfer/UTCID08 – số lượng nhận âm: bị chặn, kho nhận giữ 20")]
    [Trait("Function", Function)]
    [Trait("UTCID", "ReceiveTransfer/UTCID08")]
    [Trait("Type", "A")]
    public async Task UTCID08_NegativeReceivedQuantity_ReturnsError()
    {
        // Arrange
        var (db, handler, id, _) = Arrange();

        // Act
        var result = await handler.Handle(new ReceiveTransferCommand(id, Received(-5, "Ghi chú"), TestData.UserId), CancellationToken.None);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("Hàng P-TEST - Sản phẩm test: số lượng nhận không được âm.", result.Error);
        Assert.Equal(20, TestData.StockOf(db, TestData.K002));
    }
}
