using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Features.Stocktakes.Commands;
using StockFlow.Application.Features.Stocktakes.Helpers;
using StockFlow.UnitTests.Common;
using Xunit;

namespace StockFlow.UnitTests.Inventory.Stocktakes;

/// <summary>
/// Report 5.1 – sheet CancelStocktake (SF-FUNC-098, LucDT): hủy phiếu kiểm; phiếu đã cân bằng thì đảo tồn.
/// Ca N/B chỉ ghi "Success" → kiểm theo Expected bổ sung ở D.2 (P-03).
/// </summary>
public class CancelStocktakeTests
{
    private const string Function = "SF-FUNC-098";

    /// <summary>stock: tồn hiện tại; phiếu BALANCED ghi chênh lệch actual − system.</summary>
    private static (TestStockFlowDbContext Db, int Id) Arrange(string status, decimal stock = 100, decimal system = 100, decimal actual = 100)
    {
        var db = TestStockFlowDbContext.Create();
        TestData.SeedMasterData(db);
        TestData.SetStock(db, TestData.K001, TestData.PTest, stock, 10_000m);
        return (db, InventoryData.AddStocktake(db, status, system, actual));
    }

    private static StocktakeCommandHandler Handler(TestStockFlowDbContext db, Moq.Mock<StockFlow.Application.Common.Interfaces.ICurrentUserService>? user = null) =>
        new(db, (user ?? CurrentUser.WithWarehouses(TestData.UserId, TestData.K001)).Object);

    [Fact(DisplayName = "CancelStocktake/UTCID01 – hủy phiếu DRAFT: CANCELLED, không đổi tồn")]
    [Trait("Function", Function)][Trait("UTCID", "CancelStocktake/UTCID01")][Trait("Type", "N")]
    public async Task UTCID01_Draft_CancelsWithoutStockChange()
    {
        var (db, id) = Arrange(StocktakeLogic.Draft);
        var r = await Handler(db).Handle(new CancelStocktakeCommand(id), CancellationToken.None);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(StocktakeLogic.Cancelled, (await db.TrxStocktakes.AsNoTracking().SingleAsync()).Status);
        Assert.Equal(100, TestData.StockOf(db, TestData.K001));
        Assert.Empty(db.TrxInventoryTransactions.AsNoTracking());
    }

    [Fact(DisplayName = "CancelStocktake/UTCID02 – phiếu BALANCED chênh +5, tồn 105: tồn về 100, STOCKTAKE_CANCEL_OUT −5")]
    [Trait("Function", Function)][Trait("UTCID", "CancelStocktake/UTCID02")][Trait("Type", "N")]
    public async Task UTCID02_BalancedSurplus_ReversesStock()
    {
        var (db, id) = Arrange(StocktakeLogic.Balanced, stock: 105, system: 100, actual: 105);
        var r = await Handler(db).Handle(new CancelStocktakeCommand(id), CancellationToken.None);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(100, TestData.StockOf(db, TestData.K001));
        var card = Assert.Single(TestData.CardEntries(db, StocktakeLogic.ReferenceType, id));
        Assert.Equal("STOCKTAKE_CANCEL_OUT", card.TransactionType);
        Assert.Equal(-5, card.Quantity);
    }

    [Fact(DisplayName = "CancelStocktake/UTCID03 – phiếu BALANCED chênh −3, tồn 97: tồn về 100, STOCKTAKE_CANCEL_IN +3")]
    [Trait("Function", Function)][Trait("UTCID", "CancelStocktake/UTCID03")][Trait("Type", "N")]
    public async Task UTCID03_BalancedShortage_ReversesStock()
    {
        var (db, id) = Arrange(StocktakeLogic.Balanced, stock: 97, system: 100, actual: 97);
        var r = await Handler(db).Handle(new CancelStocktakeCommand(id), CancellationToken.None);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(100, TestData.StockOf(db, TestData.K001));
        var card = Assert.Single(TestData.CardEntries(db, StocktakeLogic.ReferenceType, id));
        Assert.Equal("STOCKTAKE_CANCEL_IN", card.TransactionType);
        Assert.Equal(3, card.Quantity);
    }

    [Fact(DisplayName = "CancelStocktake/UTCID04 – phiếu BALANCED chênh 0: CANCELLED, không ghi thẻ kho")]
    [Trait("Function", Function)][Trait("UTCID", "CancelStocktake/UTCID04")][Trait("Type", "B")]
    public async Task UTCID04_BalancedNoDiscrepancy_NoStockCard()
    {
        var (db, id) = Arrange(StocktakeLogic.Balanced);
        var r = await Handler(db).Handle(new CancelStocktakeCommand(id), CancellationToken.None);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(StocktakeLogic.Cancelled, (await db.TrxStocktakes.AsNoTracking().SingleAsync()).Status);
        Assert.Empty(db.TrxInventoryTransactions.AsNoTracking());
    }

    [Fact(DisplayName = "CancelStocktake/UTCID05 – phiếu đã CANCELLED")]
    [Trait("Function", Function)][Trait("UTCID", "CancelStocktake/UTCID05")][Trait("Type", "A")]
    public async Task UTCID05_AlreadyCancelled_ReturnsError()
    {
        var (db, id) = Arrange(StocktakeLogic.Cancelled);
        var r = await Handler(db).Handle(new CancelStocktakeCommand(id), CancellationToken.None);
        Assert.False(r.IsSuccess);
        Assert.Equal("Phiếu kiểm kho đã bị hủy trước đó.", r.Error);
    }

    [Fact(DisplayName = "CancelStocktake/UTCID06 – phiếu #999 không tồn tại")]
    [Trait("Function", Function)][Trait("UTCID", "CancelStocktake/UTCID06")][Trait("Type", "A")]
    public async Task UTCID06_Unknown_ReturnsError()
    {
        var (db, _) = Arrange(StocktakeLogic.Draft);
        var r = await Handler(db).Handle(new CancelStocktakeCommand(999), CancellationToken.None);
        Assert.False(r.IsSuccess);
        Assert.Equal("Không tìm thấy phiếu kiểm kho #999.", r.Error);
    }

    [Fact(DisplayName = "CancelStocktake/UTCID07 – không có quyền kho")]
    [Trait("Function", Function)][Trait("UTCID", "CancelStocktake/UTCID07")][Trait("Type", "A")]
    public async Task UTCID07_NoWarehouseAccess_ReturnsError()
    {
        var (db, id) = Arrange(StocktakeLogic.Draft);
        var r = await Handler(db, CurrentUser.WithWarehouses(TestData.UserId, TestData.K002)).Handle(new CancelStocktakeCommand(id), CancellationToken.None);
        Assert.False(r.IsSuccess);
        Assert.Equal("Bạn không có quyền hủy phiếu kiểm của kho này.", r.Error);
    }

    [Fact(DisplayName = "CancelStocktake/UTCID08 – UserId = null")]
    [Trait("Function", Function)][Trait("UTCID", "CancelStocktake/UTCID08")][Trait("Type", "A")]
    public async Task UTCID08_NoUser_ReturnsError()
    {
        var (db, id) = Arrange(StocktakeLogic.Draft);
        var r = await Handler(db, CurrentUser.WithoutUser(TestData.K001)).Handle(new CancelStocktakeCommand(id), CancellationToken.None);
        Assert.False(r.IsSuccess);
        Assert.Equal("Không xác định được người dùng đăng nhập.", r.Error);
    }
}
