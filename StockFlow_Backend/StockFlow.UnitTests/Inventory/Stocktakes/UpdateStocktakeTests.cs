using Microsoft.EntityFrameworkCore;
using Moq;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Stocktakes.Commands;
using StockFlow.Application.Features.Stocktakes.DTOs;
using StockFlow.Application.Features.Stocktakes.Helpers;
using StockFlow.UnitTests.Common;
using Xunit;

namespace StockFlow.UnitTests.Inventory.Stocktakes;

/// <summary>
/// Report 5.1 – sheet UpdateStocktake (SF-FUNC-097, LucDT): sửa phiếu kiểm DRAFT và (tùy chọn) cân bằng kho (UC-39, UC-40, BR-43).
/// Precondition chung: phiếu kiểm DRAFT tại K001, tồn hệ thống P-TEST = 100. Ca N/B chỉ ghi "Success" → kiểm theo Expected bổ sung ở D.2 (P-03).
/// UTCID17 lỗi thời (P-01, quyết định O2 bỏ lý do từng dòng chênh lệch).
/// </summary>
public class UpdateStocktakeTests
{
    private const string Function = "SF-FUNC-097";

    private static (TestStockFlowDbContext Db, int Id) Arrange(string status = StocktakeLogic.Draft, int warehouseId = TestData.K001)
    {
        var db = TestStockFlowDbContext.Create();
        TestData.SeedMasterData(db);
        TestData.SetStock(db, warehouseId, TestData.PTest, 100, 10_000m);
        var id = InventoryData.AddStocktake(db, status, systemQty: 100, actualQty: 100, warehouseId: warehouseId);
        return (db, id);
    }

    private static StocktakeCommandHandler Handler(TestStockFlowDbContext db, Mock<ICurrentUserService>? user = null) =>
        new(db, (user ?? CurrentUser.WithWarehouses(TestData.UserId, TestData.K001, TestData.InactiveWarehouse)).Object);

    private static SaveStocktakeRequest Req(string status, string? code = null, params (int ProductId, decimal Actual)[] items) => new()
    {
        Status = status,
        StocktakeCode = code,
        // BR-43: dòng lệch phải có lý do khi hoàn thành
        Items = items.Select(i => new StocktakeItemRequest { ProductId = i.ProductId, ActualQty = i.Actual, Reason = "Lệch khi kiểm đếm" }).ToList(),
    };

    private static List<StockFlow.Domain.Entities.TrxInventoryTransaction> Cards(TestStockFlowDbContext db, int id) =>
        TestData.CardEntries(db, StocktakeLogic.ReferenceType, id);

    [Fact(DisplayName = "UpdateStocktake/UTCID01 – lưu tạm, thực tế 105: DRAFT, chênh +5, tồn không đổi")]
    [Trait("Function", Function)][Trait("UTCID", "UpdateStocktake/UTCID01")][Trait("Type", "N")]
    public async Task UTCID01_SaveDraft_RecordsDiscrepancyOnly()
    {
        var (db, id) = Arrange();
        var r = await Handler(db).Handle(new UpdateStocktakeCommand(id, Req("DRAFT", null, (TestData.PTest, 105))), CancellationToken.None);
        Assert.True(r.IsSuccess, r.Error);
        var line = await db.DtlStocktakeItems.AsNoTracking().SingleAsync();
        Assert.Equal(StocktakeLogic.Draft, (await db.TrxStocktakes.AsNoTracking().SingleAsync()).Status);
        Assert.Equal(100, line.SystemQty);
        Assert.Equal(105, line.ActualQty);
        Assert.Equal(5, line.Discrepancy);
        Assert.Equal(100, TestData.StockOf(db, TestData.K001));
    }

    [Fact(DisplayName = "UpdateStocktake/UTCID02 – hoàn thành, thực tế 105: BALANCED, tồn 105, STOCKTAKE_IN +5")]
    [Trait("Function", Function)][Trait("UTCID", "UpdateStocktake/UTCID02")][Trait("Type", "N")]
    public async Task UTCID02_BalanceSurplus_AddsStock()
    {
        var (db, id) = Arrange();
        var r = await Handler(db).Handle(new UpdateStocktakeCommand(id, Req("BALANCED", null, (TestData.PTest, 105))), CancellationToken.None);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(StocktakeLogic.Balanced, (await db.TrxStocktakes.AsNoTracking().SingleAsync()).Status);
        Assert.Equal(105, TestData.StockOf(db, TestData.K001));
        var card = Assert.Single(Cards(db, id));
        Assert.Equal("STOCKTAKE_IN", card.TransactionType);
        Assert.Equal(5, card.Quantity);
    }

    [Fact(DisplayName = "UpdateStocktake/UTCID03 – hoàn thành, thực tế 97: BALANCED, tồn 97, STOCKTAKE_OUT −3")]
    [Trait("Function", Function)][Trait("UTCID", "UpdateStocktake/UTCID03")][Trait("Type", "N")]
    public async Task UTCID03_BalanceShortage_DeductsStock()
    {
        var (db, id) = Arrange();
        var r = await Handler(db).Handle(new UpdateStocktakeCommand(id, Req("BALANCED", null, (TestData.PTest, 97))), CancellationToken.None);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(97, TestData.StockOf(db, TestData.K001));
        var card = Assert.Single(Cards(db, id));
        Assert.Equal("STOCKTAKE_OUT", card.TransactionType);
        Assert.Equal(-3, card.Quantity);
    }

    [Fact(DisplayName = "UpdateStocktake/UTCID04 – hoàn thành, thực tế 100: BALANCED, chênh 0, không ghi thẻ kho")]
    [Trait("Function", Function)][Trait("UTCID", "UpdateStocktake/UTCID04")][Trait("Type", "B")]
    public async Task UTCID04_BalanceNoDiscrepancy_NoStockCard()
    {
        var (db, id) = Arrange();
        var r = await Handler(db).Handle(new UpdateStocktakeCommand(id, Req("BALANCED", null, (TestData.PTest, 100))), CancellationToken.None);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(StocktakeLogic.Balanced, (await db.TrxStocktakes.AsNoTracking().SingleAsync()).Status);
        Assert.Equal(0, (await db.DtlStocktakeItems.AsNoTracking().SingleAsync()).Discrepancy);
        Assert.Empty(Cards(db, id));
    }

    [Fact(DisplayName = "UpdateStocktake/UTCID05 – hoàn thành, thực tế 0: tồn 0, STOCKTAKE_OUT −100")]
    [Trait("Function", Function)][Trait("UTCID", "UpdateStocktake/UTCID05")][Trait("Type", "B")]
    public async Task UTCID05_BalanceToZero_RemovesAllStock()
    {
        var (db, id) = Arrange();
        var r = await Handler(db).Handle(new UpdateStocktakeCommand(id, Req("BALANCED", null, (TestData.PTest, 0))), CancellationToken.None);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(0, TestData.StockOf(db, TestData.K001));
        Assert.Equal(-100, Assert.Single(Cards(db, id)).Quantity);
    }

    [Fact(DisplayName = "UpdateStocktake/UTCID06 – P-TEST nhập 2 lần (90 rồi 105): 1 dòng, lấy 105")]
    [Trait("Function", Function)][Trait("UTCID", "UpdateStocktake/UTCID06")][Trait("Type", "N")]
    public async Task UTCID06_DuplicateLines_KeepsLastActual()
    {
        var (db, id) = Arrange();
        var r = await Handler(db).Handle(new UpdateStocktakeCommand(id, Req("DRAFT", null, (TestData.PTest, 90), (TestData.PTest, 105))), CancellationToken.None);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(105, (await db.DtlStocktakeItems.AsNoTracking().SingleAsync()).ActualQty);
    }

    [Fact(DisplayName = "UpdateStocktake/UTCID07 – UserId = null")]
    [Trait("Function", Function)][Trait("UTCID", "UpdateStocktake/UTCID07")][Trait("Type", "A")]
    public async Task UTCID07_NoUser_ReturnsError()
    {
        var (db, id) = Arrange();
        var r = await Handler(db, CurrentUser.WithoutUser(TestData.K001)).Handle(new UpdateStocktakeCommand(id, Req("DRAFT", null, (TestData.PTest, 105))), CancellationToken.None);
        Assert.False(r.IsSuccess);
        Assert.Equal("Không xác định được người dùng đăng nhập.", r.Error);
    }

    [Fact(DisplayName = "UpdateStocktake/UTCID08 – phiếu #999 không tồn tại")]
    [Trait("Function", Function)][Trait("UTCID", "UpdateStocktake/UTCID08")][Trait("Type", "A")]
    public async Task UTCID08_UnknownStocktake_ReturnsError()
    {
        var (db, _) = Arrange();
        var r = await Handler(db).Handle(new UpdateStocktakeCommand(999, Req("DRAFT", null, (TestData.PTest, 105))), CancellationToken.None);
        Assert.False(r.IsSuccess);
        Assert.Equal("Không tìm thấy phiếu kiểm kho #999.", r.Error);
    }

    [Fact(DisplayName = "UpdateStocktake/UTCID09 – phiếu đã BALANCED")]
    [Trait("Function", Function)][Trait("UTCID", "UpdateStocktake/UTCID09")][Trait("Type", "A")]
    public async Task UTCID09_BalancedStocktake_ReturnsError()
    {
        var (db, id) = Arrange(StocktakeLogic.Balanced);
        var r = await Handler(db).Handle(new UpdateStocktakeCommand(id, Req("DRAFT", null, (TestData.PTest, 105))), CancellationToken.None);
        Assert.False(r.IsSuccess);
        Assert.Equal("Chỉ sửa được phiếu kiểm kho ở trạng thái Phiếu tạm.", r.Error);
    }

    [Fact(DisplayName = "UpdateStocktake/UTCID10 – phiếu đã CANCELLED")]
    [Trait("Function", Function)][Trait("UTCID", "UpdateStocktake/UTCID10")][Trait("Type", "A")]
    public async Task UTCID10_CancelledStocktake_ReturnsError()
    {
        var (db, id) = Arrange(StocktakeLogic.Cancelled);
        var r = await Handler(db).Handle(new UpdateStocktakeCommand(id, Req("DRAFT", null, (TestData.PTest, 105))), CancellationToken.None);
        Assert.False(r.IsSuccess);
        Assert.Equal("Chỉ sửa được phiếu kiểm kho ở trạng thái Phiếu tạm.", r.Error);
    }

    [Fact(DisplayName = "UpdateStocktake/UTCID11 – phiếu DRAFT ở kho ngừng hoạt động")]
    [Trait("Function", Function)][Trait("UTCID", "UpdateStocktake/UTCID11")][Trait("Type", "A")]
    public async Task UTCID11_InactiveWarehouse_ReturnsError()
    {
        var (db, id) = Arrange(warehouseId: TestData.InactiveWarehouse);
        var r = await Handler(db).Handle(new UpdateStocktakeCommand(id, Req("DRAFT", null, (TestData.PTest, 105))), CancellationToken.None);
        Assert.False(r.IsSuccess);
        Assert.Equal("Vui lòng chọn kho kiểm (kho đang hoạt động).", r.Error);
    }

    [Fact(DisplayName = "UpdateStocktake/UTCID12 – không có quyền kho K001")]
    [Trait("Function", Function)][Trait("UTCID", "UpdateStocktake/UTCID12")][Trait("Type", "A")]
    public async Task UTCID12_NoWarehouseAccess_ReturnsError()
    {
        var (db, id) = Arrange();
        var r = await Handler(db, CurrentUser.WithWarehouses(TestData.UserId, TestData.K002)).Handle(new UpdateStocktakeCommand(id, Req("DRAFT", null, (TestData.PTest, 105))), CancellationToken.None);
        Assert.False(r.IsSuccess);
        Assert.Equal("Bạn không có quyền kiểm kho tại Kho Tổng Gia Lâm.", r.Error);
    }

    [Fact(DisplayName = "UpdateStocktake/UTCID13 – mã \"KK-EXIST\" đã dùng")]
    [Trait("Function", Function)][Trait("UTCID", "UpdateStocktake/UTCID13")][Trait("Type", "A")]
    public async Task UTCID13_DuplicateCode_ReturnsError()
    {
        var (db, id) = Arrange();
        InventoryData.AddStocktake(db, StocktakeLogic.Balanced, 100, 100, code: "KK-EXIST");
        var r = await Handler(db).Handle(new UpdateStocktakeCommand(id, Req("DRAFT", "KK-EXIST", (TestData.PTest, 105))), CancellationToken.None);
        Assert.False(r.IsSuccess);
        Assert.Equal("Mã kiểm kho 'KK-EXIST' đã tồn tại.", r.Error);
    }

    [Fact(DisplayName = "UpdateStocktake/UTCID14 – danh sách hàng rỗng")]
    [Trait("Function", Function)][Trait("UTCID", "UpdateStocktake/UTCID14")][Trait("Type", "A")]
    public async Task UTCID14_NoItems_ReturnsError()
    {
        var (db, id) = Arrange();
        var r = await Handler(db).Handle(new UpdateStocktakeCommand(id, Req("DRAFT")), CancellationToken.None);
        Assert.False(r.IsSuccess);
        Assert.Equal("Vui lòng chọn ít nhất 1 hàng hóa để kiểm kho.", r.Error);
    }

    [Fact(DisplayName = "UpdateStocktake/UTCID15 – số thực tế −1")]
    [Trait("Function", Function)][Trait("UTCID", "UpdateStocktake/UTCID15")][Trait("Type", "B")]
    public async Task UTCID15_NegativeActual_ReturnsError()
    {
        var (db, id) = Arrange();
        var r = await Handler(db).Handle(new UpdateStocktakeCommand(id, Req("DRAFT", null, (TestData.PTest, -1))), CancellationToken.None);
        Assert.False(r.IsSuccess);
        Assert.Equal("Số lượng thực tế không được âm.", r.Error);
    }

    [Fact(DisplayName = "UpdateStocktake/UTCID16 – hàng #999 không tồn tại")]
    [Trait("Function", Function)][Trait("UTCID", "UpdateStocktake/UTCID16")][Trait("Type", "A")]
    public async Task UTCID16_UnknownProduct_ReturnsError()
    {
        var (db, id) = Arrange();
        var r = await Handler(db).Handle(new UpdateStocktakeCommand(id, Req("DRAFT", null, (999, 105))), CancellationToken.None);
        Assert.False(r.IsSuccess);
        Assert.Equal("Không tìm thấy hàng hóa #999.", r.Error);
    }

    [Fact(DisplayName = "UpdateStocktake/UTCID17 – OBSOLETE: dòng chênh lệch không có lý do",
        Skip = "OBSOLETE (P-01): quyết định O2 ngày 19/11 bỏ lý do từng dòng chênh lệch (BR-43 mới); code không kiểm tra lý do. Giữ ca trong workbook, ghi Obsolete.")]
    [Trait("Function", Function)][Trait("UTCID", "UpdateStocktake/UTCID17")][Trait("Type", "A")]
    public void UTCID17_VarianceWithoutReason_Obsolete()
    {
    }
}
