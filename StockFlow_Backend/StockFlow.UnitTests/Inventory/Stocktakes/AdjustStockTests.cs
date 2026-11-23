using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Features.Products.Commands;
using StockFlow.Application.Features.Products.DTOs;
using StockFlow.Application.Features.Stocktakes.Helpers;
using StockFlow.UnitTests.Common;
using Xunit;

namespace StockFlow.UnitTests.Inventory.Stocktakes;

/// <summary>
/// Report 5.1 – sheet AdjustStock (SF-FUNC-038, DatTD): sửa tồn 1 hàng tại 1 kho từ danh mục hàng hóa. ADD cộng thêm, SET đặt tồn thực tế;
/// mỗi thay đổi tạo phiếu kiểm kho cân bằng ngay (STOCKTAKE_IN / STOCKTAKE_OUT). Precondition chung: P-TEST tồn K001 = 100.
/// </summary>
public class AdjustStockTests
{
    private const string Function = "SF-FUNC-038";

    private static (TestStockFlowDbContext Db, AdjustProductStockHandler Handler) Arrange(params int[] userWarehouses)
    {
        var db = TestStockFlowDbContext.Create();
        TestData.SeedMasterData(db);
        TestData.SetStock(db, TestData.K001, TestData.PTest, 100, 10_000m);
        var user = CurrentUser.WithWarehouses(TestData.UserId, userWarehouses.Length == 0 ? new[] { TestData.K001 } : userWarehouses);
        return (db, new AdjustProductStockHandler(db, user.Object));
    }

    private static Task<StockFlow.Application.Common.Result<ProductStockAdjustmentDto>> Run(AdjustProductStockHandler h, string mode, decimal qty) =>
        h.Handle(new AdjustProductStockCommand(TestData.PTest, new AdjustProductStockRequest(TestData.K001, qty, mode)), CancellationToken.None);

    private static List<StockFlow.Domain.Entities.TrxInventoryTransaction> Cards(TestStockFlowDbContext db) =>
        db.TrxInventoryTransactions.AsNoTracking().Where(t => t.ReferenceType == StocktakeLogic.ReferenceType).ToList();

    [Fact(DisplayName = "AdjustStock/UTCID01 – ADD 20: tồn 120, phiếu kiểm BALANCED, thẻ kho STOCKTAKE_IN +20")]
    [Trait("Function", Function)][Trait("UTCID", "AdjustStock/UTCID01")][Trait("Type", "N")]
    public async Task UTCID01_AddQuantity_CreatesBalancedStocktake()
    {
        // Arrange
        var (db, h) = Arrange();
        // Act
        var r = await Run(h, "ADD", 20);
        // Assert
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(120, TestData.StockOf(db, TestData.K001));
        Assert.Equal(StocktakeLogic.Balanced, (await db.TrxStocktakes.AsNoTracking().SingleAsync()).Status);
        var card = Assert.Single(Cards(db));
        Assert.Equal("STOCKTAKE_IN", card.TransactionType);
        Assert.Equal(20, card.Quantity);
    }

    [Fact(DisplayName = "AdjustStock/UTCID02 – SET 80: tồn 80, phiếu kiểm BALANCED, thẻ kho STOCKTAKE_OUT −20")]
    [Trait("Function", Function)][Trait("UTCID", "AdjustStock/UTCID02")][Trait("Type", "N")]
    public async Task UTCID02_SetLowerQuantity_CreatesStocktakeOut()
    {
        var (db, h) = Arrange();
        var r = await Run(h, "SET", 80);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(80, TestData.StockOf(db, TestData.K001));
        Assert.Equal(StocktakeLogic.Balanced, (await db.TrxStocktakes.AsNoTracking().SingleAsync()).Status);
        var card = Assert.Single(Cards(db));
        Assert.Equal("STOCKTAKE_OUT", card.TransactionType);
        Assert.Equal(-20, card.Quantity);
    }

    [Fact(DisplayName = "AdjustStock/UTCID03 – SET 100 (bằng tồn): thành công, không tạo phiếu kiểm")]
    [Trait("Function", Function)][Trait("UTCID", "AdjustStock/UTCID03")][Trait("Type", "B")]
    public async Task UTCID03_SetSameQuantity_NoStocktake()
    {
        var (db, h) = Arrange();
        var r = await Run(h, "SET", 100);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(0, r.Value!.Delta);
        Assert.Null(r.Value.StocktakeCode);
        Assert.Empty(db.TrxStocktakes.AsNoTracking());
        Assert.Equal(100, TestData.StockOf(db, TestData.K001));
    }

    [Fact(DisplayName = "AdjustStock/UTCID04 – SET 0: tồn 0, thẻ kho STOCKTAKE_OUT −100")]
    [Trait("Function", Function)][Trait("UTCID", "AdjustStock/UTCID04")][Trait("Type", "B")]
    public async Task UTCID04_SetZero_RemovesAllStock()
    {
        var (db, h) = Arrange();
        var r = await Run(h, "SET", 0);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(0, TestData.StockOf(db, TestData.K001));
        var card = Assert.Single(Cards(db));
        Assert.Equal("STOCKTAKE_OUT", card.TransactionType);
        Assert.Equal(-100, card.Quantity);
    }

    [Fact(DisplayName = "AdjustStock/UTCID05 – ADD 0")]
    [Trait("Function", Function)][Trait("UTCID", "AdjustStock/UTCID05")][Trait("Type", "A")]
    public async Task UTCID05_AddZero_ReturnsError()
    {
        var (db, h) = Arrange();
        var r = await Run(h, "ADD", 0);
        Assert.False(r.IsSuccess);
        Assert.Equal("Số lượng nhập thêm phải lớn hơn 0.", r.Error);
        Assert.Equal(100, TestData.StockOf(db, TestData.K001));
    }

    [Fact(DisplayName = "AdjustStock/UTCID06 – SET −1")]
    [Trait("Function", Function)][Trait("UTCID", "AdjustStock/UTCID06")][Trait("Type", "A")]
    public async Task UTCID06_SetNegative_ReturnsError()
    {
        var (_, h) = Arrange();
        var r = await Run(h, "SET", -1);
        Assert.False(r.IsSuccess);
        Assert.Equal("Tồn kho thực tế không được âm.", r.Error);
    }

    [Fact(DisplayName = "AdjustStock/UTCID07 – kiểu điều chỉnh \"MOVE\"")]
    [Trait("Function", Function)][Trait("UTCID", "AdjustStock/UTCID07")][Trait("Type", "A")]
    public async Task UTCID07_InvalidMode_ReturnsError()
    {
        var (_, h) = Arrange();
        var r = await Run(h, "MOVE", 20);
        Assert.False(r.IsSuccess);
        Assert.Equal("Kiểu điều chỉnh không hợp lệ (ADD hoặc SET).", r.Error);
    }

    [Fact(DisplayName = "AdjustStock/UTCID08 – người dùng chỉ có quyền K002, sửa tồn K001")]
    [Trait("Function", Function)][Trait("UTCID", "AdjustStock/UTCID08")][Trait("Type", "A")]
    public async Task UTCID08_NoAccessToWarehouse_ReturnsError()
    {
        // Arrange
        var (db, h) = Arrange(TestData.K002);
        var name = (await db.MstWarehouses.AsNoTracking().SingleAsync(w => w.WarehouseId == TestData.K001)).WarehouseName;
        // Act
        var r = await Run(h, "ADD", 20);
        // Assert – workbook ghi "Kho Gia Lâm"; tên kho K001 trong dữ liệu seed là "Kho Tổng Gia Lâm"
        Assert.False(r.IsSuccess);
        Assert.Equal($"Bạn không có quyền điều chỉnh tồn kho tại {name}.", r.Error);
    }
}
