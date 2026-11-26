using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common.Inventory;
using StockFlow.Application.Features.Stocktakes.Commands;
using StockFlow.Application.Features.Stocktakes.DTOs;
using StockFlow.UnitTests.Common;
using Xunit;

namespace StockFlow.UnitTests.Inventory.Stocktakes;

/// <summary>
/// Trang Functions dòng 73 – CreateStocktake (SF-FUNC-141, In charge NinhHQ). Chưa có sheet test case trong workbook;
/// ca duy nhất đã duyệt là CreateStocktake/UTCID01 ở mục H (luồng chính) của báo cáo review.
/// </summary>
public class CreateStocktakeTests
{
    private const string Function = "SF-FUNC-141";

    [Fact(DisplayName = "CreateStocktake/UTCID01 (mục H) – tạo phiếu kiểm K001, P-TEST tồn 100: DRAFT, SystemQty 100, tồn không đổi, giao dịch bị chặn (BR-42)")]
    [Trait("Function", Function)]
    [Trait("UTCID", "CreateStocktake/UTCID01")]
    [Trait("Type", "N")]
    [Trait("Source", "Review mục H")]
    public async Task UTCID01_CreateDraftStocktake_SnapshotsStockAndLocksTransactions()
    {
        // Arrange
        var db = TestStockFlowDbContext.Create();
        TestData.SeedMasterData(db);
        TestData.SetStock(db, TestData.K001, TestData.PTest, 100, 10_000m);
        var handler = new StocktakeCommandHandler(db, CurrentUser.WithWarehouses(TestData.UserId, TestData.K001).Object);
        var request = new SaveStocktakeRequest
        {
            WarehouseId = TestData.K001,
            Status = "DRAFT",
            Items = new List<StocktakeItemRequest> { new() { ProductId = TestData.PTest, ActualQty = 100 } },
        };

        // Act
        var result = await handler.Handle(new CreateStocktakeCommand(request), CancellationToken.None);

        // Assert
        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal("DRAFT", result.Value!.Summary.Status);
        Assert.StartsWith("KK", result.Value.Summary.StocktakeCode);
        var line = await db.DtlStocktakeItems.AsNoTracking().SingleAsync();
        Assert.Equal(100, line.SystemQty);
        Assert.Equal(100, TestData.StockOf(db, TestData.K001));
        Assert.Empty(db.TrxInventoryTransactions.AsNoTracking());
        // BR-42: phiếu kiểm đang mở chặn xuất NVL / nhập TP / xuất hủy của hàng tại kho này
        var guard = await StocktakeGuard.CheckAsync(db, TestData.K001, new[] { TestData.PTest }, CancellationToken.None);
        Assert.Equal(
            $"Mặt hàng P-TEST đang được kiểm kho (phiếu {result.Value.Summary.StocktakeCode}). Không thể xác nhận giao dịch cho đến khi phiếu kiểm kho kết thúc.",
            guard);
    }

    // ----- UTCID02–07: tạo mới cho sheet CreateStocktake (chức năng chưa có test case trong workbook, theo yêu cầu 22/11) -----

    private static (TestStockFlowDbContext Db, StocktakeCommandHandler Handler) Arrange(params int[] userWarehouses)
    {
        var db = TestStockFlowDbContext.Create();
        TestData.SeedMasterData(db);
        TestData.SetStock(db, TestData.K001, TestData.PTest, 100, 10_000m);
        var user = CurrentUser.WithWarehouses(TestData.UserId, userWarehouses.Length == 0 ? new[] { TestData.K001, TestData.InactiveWarehouse } : userWarehouses);
        return (db, new StocktakeCommandHandler(db, user.Object));
    }

    private static SaveStocktakeRequest Req(int? warehouseId, string status = "DRAFT", string? code = null, params (int ProductId, decimal Actual)[] items) => new()
    {
        WarehouseId = warehouseId,
        Status = status,
        StocktakeCode = code,
        // BR-43: dòng lệch phải có lý do khi hoàn thành
        Items = items.Select(i => new StocktakeItemRequest { ProductId = i.ProductId, ActualQty = i.Actual, Reason = "Lệch khi kiểm đếm" }).ToList(),
    };

    [Fact(DisplayName = "CreateStocktake/UTCID02 – tạo và cân bằng ngay, thực tế 95: BALANCED, tồn 95, STOCKTAKE_OUT −5")]
    [Trait("Function", Function)][Trait("UTCID", "CreateStocktake/UTCID02")][Trait("Type", "N")]
    public async Task UTCID02_CreateBalanced_AdjustsStock()
    {
        var (db, h) = Arrange();
        var r = await h.Handle(new CreateStocktakeCommand(Req(TestData.K001, "BALANCED", null, (TestData.PTest, 95))), CancellationToken.None);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal("BALANCED", r.Value!.Summary.Status);
        Assert.Equal(95, TestData.StockOf(db, TestData.K001));
        var card = Assert.Single(db.TrxInventoryTransactions.AsNoTracking().ToList());
        Assert.Equal("STOCKTAKE_OUT", card.TransactionType);
        Assert.Equal(-5, card.Quantity);
    }

    [Fact(DisplayName = "CreateStocktake/UTCID08 – hoàn thành, thực tế 95 nhưng không nhập lý do: MSG51, không tạo phiếu, tồn không đổi (BR-43)")]
    [Trait("Function", Function)][Trait("UTCID", "CreateStocktake/UTCID08")][Trait("Type", "A")]
    public async Task UTCID08_BalanceVarianceWithoutReason_ReturnsError()
    {
        var (db, h) = Arrange();
        var req = new SaveStocktakeRequest
        {
            WarehouseId = TestData.K001,
            Status = "BALANCED",
            Items = new List<StocktakeItemRequest> { new() { ProductId = TestData.PTest, ActualQty = 95, Reason = "  " } },
        };
        var r = await h.Handle(new CreateStocktakeCommand(req), CancellationToken.None);
        Assert.False(r.IsSuccess);
        Assert.Equal("Vui lòng nhập lý do cho mọi dòng có chênh lệch (P-TEST).", r.Error);
        Assert.Equal(100, TestData.StockOf(db, TestData.K001));
        Assert.Empty(db.TrxInventoryTransactions.AsNoTracking());
    }

    [Fact(DisplayName = "CreateStocktake/UTCID09 – hoàn thành có lý do: lưu lý do trên dòng và trả về trong chi tiết (BR-43)")]
    [Trait("Function", Function)][Trait("UTCID", "CreateStocktake/UTCID09")][Trait("Type", "N")]
    public async Task UTCID09_BalanceVarianceWithReason_StoresReason()
    {
        var (db, h) = Arrange();
        var r = await h.Handle(new CreateStocktakeCommand(Req(TestData.K001, "BALANCED", null, (TestData.PTest, 95))), CancellationToken.None);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal("Lệch khi kiểm đếm", Assert.Single(r.Value!.Items).Reason);
        Assert.Equal("Lệch khi kiểm đếm", (await db.DtlStocktakeItems.AsNoTracking().SingleAsync()).DiscrepancyReason);
    }

    [Fact(DisplayName = "CreateStocktake/UTCID03 – kho ngừng hoạt động")]
    [Trait("Function", Function)][Trait("UTCID", "CreateStocktake/UTCID03")][Trait("Type", "A")]
    public async Task UTCID03_InactiveWarehouse_ReturnsError()
    {
        var (db, h) = Arrange();
        var r = await h.Handle(new CreateStocktakeCommand(Req(TestData.InactiveWarehouse, "DRAFT", null, (TestData.PTest, 100))), CancellationToken.None);
        Assert.False(r.IsSuccess);
        Assert.Equal("Vui lòng chọn kho kiểm (kho đang hoạt động).", r.Error);
        Assert.Empty(db.TrxStocktakes.AsNoTracking());
    }

    [Fact(DisplayName = "CreateStocktake/UTCID04 – người dùng chỉ có quyền K002, kiểm K001")]
    [Trait("Function", Function)][Trait("UTCID", "CreateStocktake/UTCID04")][Trait("Type", "A")]
    public async Task UTCID04_NoWarehouseAccess_ReturnsError()
    {
        var (db, h) = Arrange(TestData.K002);
        var r = await h.Handle(new CreateStocktakeCommand(Req(TestData.K001, "DRAFT", null, (TestData.PTest, 100))), CancellationToken.None);
        Assert.False(r.IsSuccess);
        Assert.Equal("Bạn không có quyền kiểm kho tại Kho Tổng Gia Lâm.", r.Error);
        Assert.Empty(db.TrxStocktakes.AsNoTracking());
    }

    [Fact(DisplayName = "CreateStocktake/UTCID05 – mã \"KK-EXIST\" đã dùng")]
    [Trait("Function", Function)][Trait("UTCID", "CreateStocktake/UTCID05")][Trait("Type", "A")]
    public async Task UTCID05_DuplicateCode_ReturnsError()
    {
        var (db, h) = Arrange();
        InventoryData.AddStocktake(db, "BALANCED", 100, 100, code: "KK-EXIST");
        var r = await h.Handle(new CreateStocktakeCommand(Req(TestData.K001, "DRAFT", "kk-exist", (TestData.PTest, 100))), CancellationToken.None);
        Assert.False(r.IsSuccess);
        Assert.Equal("Mã kiểm kho 'KK-EXIST' đã tồn tại.", r.Error);
    }

    [Fact(DisplayName = "CreateStocktake/UTCID06 – không có hàng nào")]
    [Trait("Function", Function)][Trait("UTCID", "CreateStocktake/UTCID06")][Trait("Type", "A")]
    public async Task UTCID06_NoItems_ReturnsError()
    {
        var (db, h) = Arrange();
        var r = await h.Handle(new CreateStocktakeCommand(Req(TestData.K001)), CancellationToken.None);
        Assert.False(r.IsSuccess);
        Assert.Equal("Vui lòng chọn ít nhất 1 hàng hóa để kiểm kho.", r.Error);
        Assert.Empty(db.TrxStocktakes.AsNoTracking());
    }

    [Fact(DisplayName = "CreateStocktake/UTCID07 – số thực tế −1")]
    [Trait("Function", Function)][Trait("UTCID", "CreateStocktake/UTCID07")][Trait("Type", "B")]
    public async Task UTCID07_NegativeActual_ReturnsError()
    {
        var (db, h) = Arrange();
        var r = await h.Handle(new CreateStocktakeCommand(Req(TestData.K001, "DRAFT", null, (TestData.PTest, -1))), CancellationToken.None);
        Assert.False(r.IsSuccess);
        Assert.Equal("Số lượng thực tế không được âm.", r.Error);
    }
}
