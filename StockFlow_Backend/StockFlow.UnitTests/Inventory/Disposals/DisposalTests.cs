using Microsoft.EntityFrameworkCore;
using Moq;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Common.Inventory;
using StockFlow.Application.Features.Disposals.Commands;
using StockFlow.Application.Features.Disposals.DTOs;
using StockFlow.Domain.Entities;
using StockFlow.UnitTests.Common;
using Xunit;

namespace StockFlow.UnitTests.Inventory.Disposals;

/// <summary>Dựng chung cho 3 sheet xuất hủy (LucDT): P-TEST tồn K001 = 10.</summary>
internal static class DisposalSetup
{
    public static TestStockFlowDbContext Db(decimal stock = 10)
    {
        var db = TestStockFlowDbContext.Create();
        TestData.SeedMasterData(db);
        TestData.SetStock(db, TestData.K001, TestData.PTest, stock, 10_000m);
        return db;
    }

    public static Mock<ICurrentUserService> User(params int[] warehouses) =>
        CurrentUser.WithWarehouses(TestData.UserId, warehouses.Length == 0 ? new[] { TestData.K001 } : warehouses);

    public static SaveDisposalRequest Req(string status, decimal qty, string? reason = "Hàng vỡ", int warehouseId = TestData.K001) =>
        new(warehouseId, null, reason, status, new List<DisposalItemRequest> { new(TestData.PTest, qty, null) });

    public static List<TrxInventoryTransaction> Cards(TestStockFlowDbContext db) => db.TrxInventoryTransactions.AsNoTracking()
        .Where(t => t.ReferenceType == "DISPOSAL").OrderBy(t => t.TransactionId).ToList();
}

/// <summary>
/// Report 5.1 – sheet CreateDisposal (LucDT, chưa có mã SF-FUNC): lập phiếu xuất hủy DRAFT hoặc COMPLETED ngay (trừ tồn, thẻ kho DISPOSAL);
/// hoàn thành cần lý do, không hủy vượt tồn, bị chặn khi đang kiểm kho (BR-42). UTCID05, 06 là luật của SaveDisposalRequestValidator.
/// </summary>
public class CreateDisposalTests
{
    private const string Function = "CreateDisposal";

    private static CreateDisposalCommandHandler Handler(TestStockFlowDbContext db, Mock<ICurrentUserService>? user = null) =>
        new(db, (user ?? DisposalSetup.User()).Object, new InventoryLedger(db));

    [Fact(DisplayName = "CreateDisposal/UTCID01 – DRAFT, P-TEST 3: phiếu DRAFT, tồn không đổi")]
    [Trait("Function", Function)][Trait("UTCID", "CreateDisposal/UTCID01")][Trait("Type", "N")]
    public async Task UTCID01_Draft_DoesNotChangeStock()
    {
        var db = DisposalSetup.Db();
        var r = await Handler(db).Handle(new CreateDisposalCommand(DisposalSetup.Req(DisposalStatus.Draft, 3)), CancellationToken.None);
        Assert.True(r.IsSuccess, r.Error);
        Assert.StartsWith("XH", r.Value!.Summary.DisposalCode);
        Assert.Equal(DisposalStatus.Draft, (await db.TrxInventoryDisposals.AsNoTracking().SingleAsync()).Status);
        Assert.Equal(10, TestData.StockOf(db, TestData.K001));
        Assert.Empty(DisposalSetup.Cards(db));
    }

    [Fact(DisplayName = "CreateDisposal/UTCID02 – COMPLETED, P-TEST 3, lý do \"Hàng vỡ\": tồn 7, thẻ kho DISPOSAL −3")]
    [Trait("Function", Function)][Trait("UTCID", "CreateDisposal/UTCID02")][Trait("Type", "N")]
    public async Task UTCID02_Completed_DeductsStock()
    {
        var db = DisposalSetup.Db();
        var r = await Handler(db).Handle(new CreateDisposalCommand(DisposalSetup.Req(DisposalStatus.Completed, 3)), CancellationToken.None);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(DisposalStatus.Completed, (await db.TrxInventoryDisposals.AsNoTracking().SingleAsync()).Status);
        Assert.Equal(7, TestData.StockOf(db, TestData.K001));
        var card = Assert.Single(DisposalSetup.Cards(db));
        Assert.Equal("DISPOSAL", card.TransactionType);
        Assert.Equal(-3, card.Quantity);
    }

    [Fact(DisplayName = "CreateDisposal/UTCID03 – COMPLETED hủy hết 10: tồn 0")]
    [Trait("Function", Function)][Trait("UTCID", "CreateDisposal/UTCID03")][Trait("Type", "B")]
    public async Task UTCID03_DisposeAllStock_StockBecomesZero()
    {
        var db = DisposalSetup.Db();
        var r = await Handler(db).Handle(new CreateDisposalCommand(DisposalSetup.Req(DisposalStatus.Completed, 10, "Hết hạn")), CancellationToken.None);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(0, TestData.StockOf(db, TestData.K001));
    }

    [Fact(DisplayName = "CreateDisposal/UTCID04 – COMPLETED hủy 11 > tồn 10")]
    [Trait("Function", Function)][Trait("UTCID", "CreateDisposal/UTCID04")][Trait("Type", "A")]
    public async Task UTCID04_DisposeAboveStock_ReturnsError()
    {
        using var _ = new VietnameseCulture();
        var db = DisposalSetup.Db();
        var r = await Handler(db).Handle(new CreateDisposalCommand(DisposalSetup.Req(DisposalStatus.Completed, 11)), CancellationToken.None);
        // Expected theo D.1 đã duyệt: thay <name> bằng tên hàng trong dữ liệu test
        Assert.False(r.IsSuccess);
        Assert.Equal("Hàng P-TEST - Sản phẩm test chỉ còn 10 trong kho, không thể hủy 11.", r.Error);
        Assert.Equal(10, TestData.StockOf(db, TestData.K001));
    }

    [Fact(DisplayName = "CreateDisposal/UTCID05 – COMPLETED không có lý do (validator)")]
    [Trait("Function", Function)][Trait("UTCID", "CreateDisposal/UTCID05")][Trait("Type", "A")]
    public void UTCID05_CompletedWithoutReason_ValidatorRejects()
    {
        var r = new CreateDisposalCommandValidator().Validate(new CreateDisposalCommand(DisposalSetup.Req(DisposalStatus.Completed, 3, "")));
        Assert.Contains("Vui lòng nhập lý do xuất hủy trước khi hoàn thành phiếu.", r.Errors.Select(e => e.ErrorMessage));
    }

    [Fact(DisplayName = "CreateDisposal/UTCID06 – SL 0,001 (validator)")]
    [Trait("Function", Function)][Trait("UTCID", "CreateDisposal/UTCID06")][Trait("Type", "A")]
    public void UTCID06_ThreeDecimals_ValidatorRejects()
    {
        var r = new CreateDisposalCommandValidator().Validate(new CreateDisposalCommand(DisposalSetup.Req(DisposalStatus.Draft, 0.001m)));
        Assert.Contains("Số lượng hủy có tối đa 2 chữ số thập phân.", r.Errors.Select(e => e.ErrorMessage));
    }

    [Fact(DisplayName = "CreateDisposal/UTCID07 – người dùng chỉ có quyền K002, lập phiếu K001")]
    [Trait("Function", Function)][Trait("UTCID", "CreateDisposal/UTCID07")][Trait("Type", "A")]
    public async Task UTCID07_NoWarehouseAccess_ReturnsError()
    {
        var db = DisposalSetup.Db();
        var name = (await db.MstWarehouses.AsNoTracking().SingleAsync(w => w.WarehouseId == TestData.K001)).WarehouseName;
        var r = await Handler(db, DisposalSetup.User(TestData.K002)).Handle(new CreateDisposalCommand(DisposalSetup.Req(DisposalStatus.Draft, 3)), CancellationToken.None);
        // Workbook ghi 'Kho Gia Lâm'; tên kho K001 trong dữ liệu seed là "Kho Tổng Gia Lâm"
        Assert.False(r.IsSuccess);
        Assert.Equal($"Bạn không có quyền xuất hủy hàng của kho '{name}'.", r.Error);
    }

    [Fact(DisplayName = "CreateDisposal/UTCID08 – phiếu kiểm K001 đang mở có P-TEST (BR-42)")]
    [Trait("Function", Function)][Trait("UTCID", "CreateDisposal/UTCID08")][Trait("Type", "A")]
    public async Task UTCID08_ActiveStocktake_BlocksDisposal()
    {
        var db = DisposalSetup.Db();
        InventoryData.AddStocktake(db, "DRAFT", 10, 10, code: "KK0001");
        var r = await Handler(db).Handle(new CreateDisposalCommand(DisposalSetup.Req(DisposalStatus.Completed, 3)), CancellationToken.None);
        // Expected theo D.1 đã duyệt
        Assert.False(r.IsSuccess);
        Assert.Equal("Mặt hàng P-TEST đang được kiểm kho (phiếu KK0001). Không thể xác nhận giao dịch cho đến khi phiếu kiểm kho kết thúc.", r.Error);
        Assert.Equal(10, TestData.StockOf(db, TestData.K001));
    }
}

/// <summary>Report 5.1 – sheet UpdateDisposal (LucDT): sửa phiếu DRAFT; gửi COMPLETED thì hoàn thành và trừ tồn. Không đổi kho, không sửa phiếu đã hoàn thành.</summary>
public class UpdateDisposalTests
{
    private const string Function = "UpdateDisposal";

    private static UpdateDisposalCommandHandler Handler(TestStockFlowDbContext db, Mock<ICurrentUserService>? user = null) =>
        new(db, (user ?? DisposalSetup.User()).Object, new InventoryLedger(db));

    [Fact(DisplayName = "UpdateDisposal/UTCID01 – XH0001 DRAFT 3 → 4, vẫn DRAFT: lưu phiếu, tồn 10")]
    [Trait("Function", Function)][Trait("UTCID", "UpdateDisposal/UTCID01")][Trait("Type", "N")]
    public async Task UTCID01_EditDraft_SavesWithoutStockChange()
    {
        var db = DisposalSetup.Db();
        var id = InventoryData.AddDisposal(db, "XH0001", DisposalStatus.Draft, 3);
        var r = await Handler(db).Handle(new UpdateDisposalCommand(id, DisposalSetup.Req(DisposalStatus.Draft, 4)), CancellationToken.None);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(4, (await db.DtlInventoryDisposalItems.AsNoTracking().SingleAsync()).Quantity);
        Assert.Equal(10, TestData.StockOf(db, TestData.K001));
    }

    [Fact(DisplayName = "UpdateDisposal/UTCID02 – XH0001 gửi COMPLETED, lý do \"Hàng vỡ\": tồn 7, thẻ kho DISPOSAL")]
    [Trait("Function", Function)][Trait("UTCID", "UpdateDisposal/UTCID02")][Trait("Type", "N")]
    public async Task UTCID02_CompleteDraft_DeductsStock()
    {
        var db = DisposalSetup.Db();
        var id = InventoryData.AddDisposal(db, "XH0001", DisposalStatus.Draft, 3);
        var r = await Handler(db).Handle(new UpdateDisposalCommand(id, DisposalSetup.Req(DisposalStatus.Completed, 3)), CancellationToken.None);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(DisposalStatus.Completed, (await db.TrxInventoryDisposals.AsNoTracking().SingleAsync()).Status);
        Assert.Equal(7, TestData.StockOf(db, TestData.K001));
        Assert.Equal("DISPOSAL", Assert.Single(DisposalSetup.Cards(db)).TransactionType);
    }

    [Fact(DisplayName = "UpdateDisposal/UTCID03 – XH0002 đã COMPLETED")]
    [Trait("Function", Function)][Trait("UTCID", "UpdateDisposal/UTCID03")][Trait("Type", "A")]
    public async Task UTCID03_CompletedNote_ReturnsError()
    {
        var db = DisposalSetup.Db(7);
        var id = InventoryData.AddDisposal(db, "XH0002", DisposalStatus.Completed, 3);
        var r = await Handler(db).Handle(new UpdateDisposalCommand(id, DisposalSetup.Req(DisposalStatus.Draft, 1)), CancellationToken.None);
        Assert.False(r.IsSuccess);
        Assert.Equal("Phiếu XH0002 đã hoàn thành, không sửa được.", r.Error);
    }

    [Fact(DisplayName = "UpdateDisposal/UTCID04 – đổi kho sang K002")]
    [Trait("Function", Function)][Trait("UTCID", "UpdateDisposal/UTCID04")][Trait("Type", "A")]
    public async Task UTCID04_ChangeWarehouse_ReturnsError()
    {
        var db = DisposalSetup.Db();
        var id = InventoryData.AddDisposal(db, "XH0001", DisposalStatus.Draft, 3);
        var r = await Handler(db).Handle(new UpdateDisposalCommand(id, DisposalSetup.Req(DisposalStatus.Draft, 3, warehouseId: TestData.K002)), CancellationToken.None);
        Assert.False(r.IsSuccess);
        Assert.Equal("Không đổi được kho của phiếu xuất hủy đã lập.", r.Error);
    }

    [Fact(DisplayName = "UpdateDisposal/UTCID05 – người dùng chỉ có quyền K002")]
    [Trait("Function", Function)][Trait("UTCID", "UpdateDisposal/UTCID05")][Trait("Type", "A")]
    public async Task UTCID05_NoWarehouseAccess_ReturnsError()
    {
        var db = DisposalSetup.Db();
        var id = InventoryData.AddDisposal(db, "XH0001", DisposalStatus.Draft, 3);
        var r = await Handler(db, DisposalSetup.User(TestData.K002)).Handle(new UpdateDisposalCommand(id, DisposalSetup.Req(DisposalStatus.Draft, 4)), CancellationToken.None);
        Assert.False(r.IsSuccess);
        Assert.Equal("Bạn không có quyền thao tác phiếu xuất hủy của kho này.", r.Error);
    }
}

/// <summary>Report 5.1 – sheet CancelDisposal (LucDT): hủy phiếu xuất hủy; phiếu COMPLETED hoàn lại tồn (DISPOSAL_CANCEL).</summary>
public class CancelDisposalTests
{
    private const string Function = "CancelDisposal";

    private static CancelDisposalCommandHandler Handler(TestStockFlowDbContext db, Mock<ICurrentUserService>? user = null) =>
        new(db, (user ?? DisposalSetup.User()).Object, new InventoryLedger(db));

    [Fact(DisplayName = "CancelDisposal/UTCID01 – XH0001 DRAFT: CANCELLED, không đổi tồn")]
    [Trait("Function", Function)][Trait("UTCID", "CancelDisposal/UTCID01")][Trait("Type", "N")]
    public async Task UTCID01_Draft_CancelsWithoutStockChange()
    {
        var db = DisposalSetup.Db();
        var id = InventoryData.AddDisposal(db, "XH0001", DisposalStatus.Draft, 3);
        var r = await Handler(db).Handle(new CancelDisposalCommand(id), CancellationToken.None);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(DisposalStatus.Cancelled, (await db.TrxInventoryDisposals.AsNoTracking().SingleAsync()).Status);
        Assert.Equal(10, TestData.StockOf(db, TestData.K001));
    }

    [Fact(DisplayName = "CancelDisposal/UTCID02 – XH0002 COMPLETED 3, tồn 7: CANCELLED, tồn 10, thẻ kho DISPOSAL_CANCEL +3")]
    [Trait("Function", Function)][Trait("UTCID", "CancelDisposal/UTCID02")][Trait("Type", "N")]
    public async Task UTCID02_Completed_RestoresStock()
    {
        var db = DisposalSetup.Db(7);
        var id = InventoryData.AddDisposal(db, "XH0002", DisposalStatus.Completed, 3);
        var r = await Handler(db).Handle(new CancelDisposalCommand(id), CancellationToken.None);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(DisposalStatus.Cancelled, (await db.TrxInventoryDisposals.AsNoTracking().SingleAsync()).Status);
        Assert.Equal(10, TestData.StockOf(db, TestData.K001));
        var card = DisposalSetup.Cards(db).Last();
        Assert.Equal("DISPOSAL_CANCEL", card.TransactionType);
        Assert.Equal(3, card.Quantity);
    }

    [Fact(DisplayName = "CancelDisposal/UTCID03 – XH0003 đã CANCELLED")]
    [Trait("Function", Function)][Trait("UTCID", "CancelDisposal/UTCID03")][Trait("Type", "A")]
    public async Task UTCID03_AlreadyCancelled_ReturnsError()
    {
        var db = DisposalSetup.Db();
        var id = InventoryData.AddDisposal(db, "XH0003", DisposalStatus.Cancelled, 3);
        var r = await Handler(db).Handle(new CancelDisposalCommand(id), CancellationToken.None);
        Assert.False(r.IsSuccess);
        Assert.Equal("Phiếu XH0003 đã hủy trước đó.", r.Error);
    }

    [Fact(DisplayName = "CancelDisposal/UTCID04 – người dùng chỉ có quyền K002")]
    [Trait("Function", Function)][Trait("UTCID", "CancelDisposal/UTCID04")][Trait("Type", "A")]
    public async Task UTCID04_NoWarehouseAccess_ReturnsError()
    {
        var db = DisposalSetup.Db();
        var id = InventoryData.AddDisposal(db, "XH0001", DisposalStatus.Draft, 3);
        var r = await Handler(db, DisposalSetup.User(TestData.K002)).Handle(new CancelDisposalCommand(id), CancellationToken.None);
        Assert.False(r.IsSuccess);
        Assert.Equal("Bạn không có quyền hủy phiếu xuất hủy của kho này.", r.Error);
    }

    [Fact(DisplayName = "CancelDisposal/UTCID05 – phiếu id 999999 không tồn tại")]
    [Trait("Function", Function)][Trait("UTCID", "CancelDisposal/UTCID05")][Trait("Type", "A")]
    public async Task UTCID05_Unknown_ReturnsError()
    {
        var db = DisposalSetup.Db();
        var r = await Handler(db).Handle(new CancelDisposalCommand(999_999), CancellationToken.None);
        Assert.False(r.IsSuccess);
        Assert.Equal("Không tìm thấy phiếu xuất hủy.", r.Error);
    }
}
