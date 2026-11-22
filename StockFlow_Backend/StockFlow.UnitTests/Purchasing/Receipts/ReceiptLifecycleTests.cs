using Microsoft.EntityFrameworkCore;
using Moq;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Common.Inventory;
using StockFlow.Application.Features.Purchases.Commands;
using StockFlow.Application.Features.Purchases.DTOs;
using StockFlow.Domain.Entities;
using StockFlow.UnitTests.Common;
using Xunit;

namespace StockFlow.UnitTests.Purchasing.Receipts;

/// <summary>Phiếu nhập mẫu dùng chung cho Update / Complete / Cancel.</summary>
internal static class ReceiptSetup
{
    public static readonly (int, decimal, decimal)[] TenAt6000 = { (TestData.PTest, 10m, 6000m) };

    public static Mock<ICurrentUserService> User() => CurrentUser.WithWarehouses(TestData.UserId, TestData.K001);
    public static Mock<ICurrentUserService> OtherWarehouseUser() => CurrentUser.WithWarehouses(TestData.UserId, TestData.K002);

    /// <summary>Phiếu tạm PN000001: P-TEST 10 × 6.000 tại K001, NCC-01.</summary>
    public static (TestStockFlowDbContext Db, int GrId) Draft(int? poId = null, (int, decimal, decimal)[]? lines = null)
    {
        var db = PurchaseData.Db();
        var (grId, _) = PurchaseData.AddReceipt(db, "PN000001", "DRAFT", lines ?? TenAt6000, poId: poId);
        return (db, grId);
    }

    /// <summary>
    /// Phiếu đã nhập PN000001: P-TEST 10 × 6.000 tại K001, chưa trả tiền. Trạng thái sau khi nhập: tồn K001 = 10 giá 6.000,
    /// công nợ NCC-01 = 60.000. Trả về (Db, GrId, GrItemId).
    /// </summary>
    public static (TestStockFlowDbContext Db, int GrId, int GrItemId) Completed(int? poId = null, TestStockFlowDbContext? db = null)
    {
        db ??= PurchaseData.Db(supplier1Payable: 60_000);
        TestData.SetStock(db, TestData.K001, TestData.PTest, 10, 6000);
        var (grId, itemId) = PurchaseData.AddReceipt(db, "PN000001", "COMPLETED", TenAt6000, poId: poId);
        return (db, grId, itemId);
    }

    public static TrxGoodsReceipt Receipt(TestStockFlowDbContext db, int grId) =>
        db.TrxGoodsReceipts.AsNoTracking().Include(r => r.DtlGoodsReceiptItems).Single(r => r.GrId == grId);
}

/// <summary>
/// Report 5.1 – sheet UpdatePurchase (LucDT): sửa phiếu tạm hoặc phiếu đã nhập (phiếu đã nhập được đảo rồi nhập lại tồn, công nợ).
/// Ca "Success" kiểm theo D.2; UTCID12 theo câu chữ mới ở D.1.
/// </summary>
public class UpdatePurchaseTests
{
    private const string Function = "UpdatePurchase";

    private static UpdatePurchaseRequest Req(int partnerId = PurchaseData.Supplier1, decimal qty = 15, decimal price = 6000,
        int productId = TestData.PTest, bool noItems = false) =>
        new(partnerId, null, null, null,
            noItems ? new List<CreatePurchaseItemRequest>() : new List<CreatePurchaseItemRequest> { new(productId, qty, price) });

    private static Task<Result<PurchaseDetailDto>> Update(TestStockFlowDbContext db, int grId, UpdatePurchaseRequest req,
        Mock<ICurrentUserService>? user = null) =>
        new UpdatePurchaseCommandHandler(db, (user ?? ReceiptSetup.User()).Object)
            .Handle(new UpdatePurchaseCommand(grId, req), CancellationToken.None);

    private static async Task AssertRejected(TestStockFlowDbContext db, int grId, UpdatePurchaseRequest req, string message,
        Mock<ICurrentUserService>? user = null)
    {
        var before = ReceiptSetup.Receipt(db, grId);
        var r = await Update(db, grId, req, user);
        Assert.False(r.IsSuccess);
        Assert.Equal(message, r.Error);
        var after = ReceiptSetup.Receipt(db, grId);
        Assert.Equal(before.PartnerId, after.PartnerId);
        Assert.Equal(before.DtlGoodsReceiptItems.Sum(i => i.AcceptedQty), after.DtlGoodsReceiptItems.Sum(i => i.AcceptedQty));
    }

    [Fact(DisplayName = "UpdatePurchase/UTCID01 – phiếu tạm, SL 10 → 15: vẫn DRAFT, tiền hàng 90.000, không đổi tồn")]
    [Trait("Function", Function)][Trait("UTCID", "UpdatePurchase/UTCID01")][Trait("Type", "N")]
    public async Task UTCID01_Draft_LinesReplaced()
    {
        var (db, grId) = ReceiptSetup.Draft();
        var r = await Update(db, grId, Req());
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(90_000m, r.Value!.TotalAmount);
        var gr = ReceiptSetup.Receipt(db, grId);
        Assert.Equal("DRAFT", gr.Status);
        Assert.Equal(15m, Assert.Single(gr.DtlGoodsReceiptItems).AcceptedQty);
        Assert.Empty(db.TrxInventoryBalances.AsNoTracking());
    }

    [Fact(DisplayName = "UpdatePurchase/UTCID02 – phiếu tạm đổi sang NCC-02")]
    [Trait("Function", Function)][Trait("UTCID", "UpdatePurchase/UTCID02")][Trait("Type", "N")]
    public async Task UTCID02_Draft_ChangeSupplier()
    {
        var (db, grId) = ReceiptSetup.Draft();
        var r = await Update(db, grId, Req(partnerId: PurchaseData.Supplier2));
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(PurchaseData.Supplier2, ReceiptSetup.Receipt(db, grId).PartnerId);
    }

    [Fact(DisplayName = "UpdatePurchase/UTCID03 – phiếu đã nhập 10 → 15: tồn +5 (EDIT_OUT −10, EDIT_IN +15), công nợ +30.000")]
    [Trait("Function", Function)][Trait("UTCID", "UpdatePurchase/UTCID03")][Trait("Type", "N")]
    public async Task UTCID03_Completed_RepostsStockAndPayable()
    {
        var (db, grId, _) = ReceiptSetup.Completed();
        var r = await Update(db, grId, Req());
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(15, TestData.StockOf(db, TestData.K001));
        var cards = TestData.CardEntries(db, "GOODS_RECEIPT", grId);
        Assert.Equal(new[] { "INBOUND_RECEIPT_EDIT_OUT", "INBOUND_RECEIPT_EDIT_IN" }, cards.Select(c => c.TransactionType));
        Assert.Equal(new decimal?[] { -10, 15 }, cards.Select(c => c.Quantity));
        Assert.Equal(90_000m, PurchaseData.Payable(db));
    }

    [Fact(DisplayName = "UpdatePurchase/UTCID04 – phiếu đã nhập theo phiếu đặt SL 20, sửa SL 10 → 20: phiếu đặt COMPLETED")]
    [Trait("Function", Function)][Trait("UTCID", "UpdatePurchase/UTCID04")][Trait("Type", "N")]
    public async Task UTCID04_CompletedWithPo_PoRecalculated()
    {
        var db = PurchaseData.Db(supplier1Payable: 60_000);
        var poId = PurchaseData.AddPo(db, "PDN000001", "PARTIAL", new[] { (TestData.PTest, 20m, 6000m) });
        var (_, grId, _) = ReceiptSetup.Completed(poId, db);
        var r = await Update(db, grId, Req(qty: 20));
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal("COMPLETED", PurchaseData.Po(db, poId).Status);
    }

    [Fact(DisplayName = "UpdatePurchase/UTCID05 – phiếu đã hủy")]
    [Trait("Function", Function)][Trait("UTCID", "UpdatePurchase/UTCID05")][Trait("Type", "A")]
    public async Task UTCID05_Cancelled_ReturnsError()
    {
        var db = PurchaseData.Db();
        var (grId, _) = PurchaseData.AddReceipt(db, "PN000001", "CANCELLED", ReceiptSetup.TenAt6000);
        await AssertRejected(db, grId, Req(), "Phiếu nhập đã hủy, không thể chỉnh sửa.");
    }

    [Fact(DisplayName = "UpdatePurchase/UTCID06 – phiếu 999 không tồn tại")]
    [Trait("Function", Function)][Trait("UTCID", "UpdatePurchase/UTCID06")][Trait("Type", "A")]
    public async Task UTCID06_UnknownReceipt_ReturnsError()
    {
        var db = PurchaseData.Db();
        var r = await Update(db, 999, Req());
        Assert.False(r.IsSuccess);
        Assert.Equal("Không tìm thấy phiếu nhập hàng #999.", r.Error);
    }

    [Fact(DisplayName = "UpdatePurchase/UTCID07 – không có quyền kho của phiếu")]
    [Trait("Function", Function)][Trait("UTCID", "UpdatePurchase/UTCID07")][Trait("Type", "A")]
    public async Task UTCID07_NoWarehouseAccess_ReturnsError()
    {
        var (db, grId) = ReceiptSetup.Draft();
        await AssertRejected(db, grId, Req(), "Bạn không có quyền truy cập phiếu nhập của kho này.", ReceiptSetup.OtherWarehouseUser());
    }

    [Fact(DisplayName = "UpdatePurchase/UTCID08 – phiếu đã có phiếu trả hàng nhập THN000001")]
    [Trait("Function", Function)][Trait("UTCID", "UpdatePurchase/UTCID08")][Trait("Type", "A")]
    public async Task UTCID08_HasActiveReturn_ReturnsError()
    {
        var (db, grId, itemId) = ReceiptSetup.Completed();
        PurchaseData.AddReturn(db, "THN000001", "COMPLETED", 2, 6000, grId, itemId);
        await AssertRejected(db, grId, Req(),
            "Phiếu nhập đã có phiếu trả hàng nhập THN000001. Vui lòng hủy phiếu trả hàng trước khi sửa.");
        Assert.Equal(10, TestData.StockOf(db, TestData.K001));
    }

    [Fact(DisplayName = "UpdatePurchase/UTCID09 – phiếu đã nhập, đổi sang NCC-02")]
    [Trait("Function", Function)][Trait("UTCID", "UpdatePurchase/UTCID09")][Trait("Type", "A")]
    public async Task UTCID09_CompletedChangeSupplier_ReturnsError()
    {
        var (db, grId, _) = ReceiptSetup.Completed();
        await AssertRejected(db, grId, Req(partnerId: PurchaseData.Supplier2),
            "Không thể đổi nhà cung cấp của phiếu đã nhập hàng. Vui lòng hủy phiếu và lập phiếu mới.");
    }

    [Fact(DisplayName = "UpdatePurchase/UTCID10 – phiếu đã nhập, không xác định người dùng")]
    [Trait("Function", Function)][Trait("UTCID", "UpdatePurchase/UTCID10")][Trait("Type", "A")]
    public async Task UTCID10_CompletedNoUser_ReturnsError()
    {
        var (db, grId, _) = ReceiptSetup.Completed();
        await AssertRejected(db, grId, Req(), "Không xác định được người dùng đăng nhập.", CurrentUser.WithoutUser(TestData.K001));
        Assert.Equal(10, TestData.StockOf(db, TestData.K001));
    }

    [Fact(DisplayName = "UpdatePurchase/UTCID11 – không có mặt hàng")]
    [Trait("Function", Function)][Trait("UTCID", "UpdatePurchase/UTCID11")][Trait("Type", "A")]
    public async Task UTCID11_NoItems_ReturnsError()
    {
        var (db, grId) = ReceiptSetup.Draft();
        await AssertRejected(db, grId, Req(noItems: true), "Phiếu nhập hàng phải có ít nhất 1 mặt hàng.");
    }

    [Fact(DisplayName = "UpdatePurchase/UTCID12 – SL đạt 0, SL lỗi 0 (câu chữ D.1)")]
    [Trait("Function", Function)][Trait("UTCID", "UpdatePurchase/UTCID12")][Trait("Type", "B")]
    public async Task UTCID12_ZeroQty_ReturnsError()
    {
        var (db, grId) = ReceiptSetup.Draft();
        await AssertRejected(db, grId, Req(qty: 0), "Số lượng nhận của sản phẩm ID #1 phải lớn hơn 0.");
    }

    [Fact(DisplayName = "UpdatePurchase/UTCID13 – đơn giá −1")]
    [Trait("Function", Function)][Trait("UTCID", "UpdatePurchase/UTCID13")][Trait("Type", "A")]
    public async Task UTCID13_NegativePrice_ReturnsError()
    {
        var (db, grId) = ReceiptSetup.Draft();
        await AssertRejected(db, grId, Req(price: -1), "Đơn giá nhập của sản phẩm ID #1 không được âm.");
    }

    [Fact(DisplayName = "UpdatePurchase/UTCID14 – nhà cung cấp 999 không tồn tại")]
    [Trait("Function", Function)][Trait("UTCID", "UpdatePurchase/UTCID14")][Trait("Type", "A")]
    public async Task UTCID14_UnknownPartner_ReturnsError()
    {
        var (db, grId) = ReceiptSetup.Draft();
        await AssertRejected(db, grId, Req(partnerId: 999), "Không tìm thấy nhà cung cấp ID #999.");
    }

    [Fact(DisplayName = "UpdatePurchase/UTCID15 – sản phẩm không tồn tại")]
    [Trait("Function", Function)][Trait("UTCID", "UpdatePurchase/UTCID15")][Trait("Type", "A")]
    public async Task UTCID15_UnknownProduct_ReturnsError()
    {
        var (db, grId) = ReceiptSetup.Draft();
        await AssertRejected(db, grId, Req(productId: 999), "Một số sản phẩm trong danh sách không tồn tại trong danh mục.");
    }
}

/// <summary>Report 5.1 – sheet CompletePurchase (LucDT): hoàn thành phiếu tạm – tồn, giá vốn BQ (BR-29), thẻ kho, công nợ NCC.</summary>
public class CompletePurchaseTests
{
    private const string Function = "CompletePurchase";

    private static Task<Result<PurchaseDetailDto>> Complete(TestStockFlowDbContext db, int grId, decimal paid = 0,
        Mock<ICurrentUserService>? user = null) =>
        new CompletePurchaseCommandHandler(db, (user ?? ReceiptSetup.User()).Object, new InventoryLedger(db))
            .Handle(new CompletePurchaseCommand(grId, new CompletePurchaseRequest(paid)), CancellationToken.None);

    private static async Task AssertRejected(TestStockFlowDbContext db, int grId, string message, Mock<ICurrentUserService>? user = null)
    {
        var r = await Complete(db, grId, user: user);
        Assert.False(r.IsSuccess);
        Assert.Equal(message, r.Error);
        Assert.Empty(db.TrxInventoryTransactions.AsNoTracking());
        Assert.Equal(0m, PurchaseData.Payable(db));
    }

    [Fact(DisplayName = "CompletePurchase/UTCID01 – phiếu tạm 10 × 6.000: COMPLETED, tồn 10, giá vốn 6.000, INBOUND_RECEIPT +10, công nợ +60.000")]
    [Trait("Function", Function)][Trait("UTCID", "CompletePurchase/UTCID01")][Trait("Type", "N")]
    public async Task UTCID01_Draft_Completed()
    {
        var (db, grId) = ReceiptSetup.Draft();
        var r = await Complete(db, grId);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal("COMPLETED", ReceiptSetup.Receipt(db, grId).Status);
        Assert.Equal(10, TestData.StockOf(db, TestData.K001));
        Assert.Equal(6000m, PurchaseData.UnitCost(db));
        var card = Assert.Single(TestData.CardEntries(db, "GOODS_RECEIPT", grId));
        Assert.Equal("INBOUND_RECEIPT", card.TransactionType);
        Assert.Equal(10, card.Quantity);
        Assert.Equal(60_000m, PurchaseData.Payable(db));
    }

    [Fact(DisplayName = "CompletePurchase/UTCID02 – tồn 10 giá 4.000: tồn 20, giá vốn BQ 5.000")]
    [Trait("Function", Function)][Trait("UTCID", "CompletePurchase/UTCID02")][Trait("Type", "N")]
    public async Task UTCID02_ExistingStock_MovingAverageCost()
    {
        var (db, grId) = ReceiptSetup.Draft();
        TestData.SetStock(db, TestData.K001, TestData.PTest, 10, 4000);
        var r = await Complete(db, grId);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(20, TestData.StockOf(db, TestData.K001));
        Assert.Equal(5000m, PurchaseData.UnitCost(db));
    }

    [Fact(DisplayName = "CompletePurchase/UTCID03 – trả 20.000: công nợ +40.000, SUPPLIER_PAYMENT 20.000")]
    [Trait("Function", Function)][Trait("UTCID", "CompletePurchase/UTCID03")][Trait("Type", "N")]
    public async Task UTCID03_PartialPayment()
    {
        var (db, grId) = ReceiptSetup.Draft();
        var r = await Complete(db, grId, paid: 20_000);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(40_000m, PurchaseData.Payable(db));
        Assert.Equal(20_000m, (await db.TrxFinancialTransactions.AsNoTracking().SingleAsync(t => t.TxType == "SUPPLIER_PAYMENT")).Amount);
    }

    [Fact(DisplayName = "CompletePurchase/UTCID04 – trả đủ 60.000: công nợ +0, SUPPLIER_PAYMENT 60.000")]
    [Trait("Function", Function)][Trait("UTCID", "CompletePurchase/UTCID04")][Trait("Type", "N")]
    public async Task UTCID04_FullPayment()
    {
        var (db, grId) = ReceiptSetup.Draft();
        var r = await Complete(db, grId, paid: 60_000);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(0m, PurchaseData.Payable(db));
        Assert.Equal(60_000m, (await db.TrxFinancialTransactions.AsNoTracking().SingleAsync(t => t.TxType == "SUPPLIER_PAYMENT")).Amount);
    }

    [Fact(DisplayName = "CompletePurchase/UTCID05 – phiếu theo phiếu đặt SL 10: phiếu đặt COMPLETED")]
    [Trait("Function", Function)][Trait("UTCID", "CompletePurchase/UTCID05")][Trait("Type", "N")]
    public async Task UTCID05_LinkedPo_Completed()
    {
        var db = PurchaseData.Db();
        var poId = PurchaseData.AddPo(db, "PDN000001", "ORDERED", new[] { (TestData.PTest, 10m, 6000m) });
        var (grId, _) = PurchaseData.AddReceipt(db, "PN000001", "DRAFT", ReceiptSetup.TenAt6000, poId: poId);
        var r = await Complete(db, grId);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal("COMPLETED", PurchaseData.Po(db, poId).Status);
    }

    [Fact(DisplayName = "CompletePurchase/UTCID06 – tồn 3 giá 1.000, nhập 7 × 1.001: giá vốn BQ 1.000,700 (3 chữ số thập phân)")]
    [Trait("Function", Function)][Trait("UTCID", "CompletePurchase/UTCID06")][Trait("Type", "B")]
    public async Task UTCID06_CostRoundedToThreeDecimals()
    {
        var (db, grId) = ReceiptSetup.Draft(lines: new[] { (TestData.PTest, 7m, 1001m) });
        TestData.SetStock(db, TestData.K001, TestData.PTest, 3, 1000);
        var r = await Complete(db, grId);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(10, TestData.StockOf(db, TestData.K001));
        Assert.Equal(1000.700m, PurchaseData.UnitCost(db));
    }

    [Fact(DisplayName = "CompletePurchase/UTCID07 – tồn trước −5 giá 4.000: giá vốn 6.000, tồn sau 5")]
    [Trait("Function", Function)][Trait("UTCID", "CompletePurchase/UTCID07")][Trait("Type", "B")]
    public async Task UTCID07_NegativeStock_TakesIncomingPrice()
    {
        var (db, grId) = ReceiptSetup.Draft();
        TestData.SetStock(db, TestData.K001, TestData.PTest, -5, 4000);
        var r = await Complete(db, grId);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(5, TestData.StockOf(db, TestData.K001));
        Assert.Equal(6000m, PurchaseData.UnitCost(db));
    }

    [Fact(DisplayName = "CompletePurchase/UTCID08 – trả 70.000 > 60.000: chặn còn 60.000, công nợ +0")]
    [Trait("Function", Function)][Trait("UTCID", "CompletePurchase/UTCID08")][Trait("Type", "B")]
    public async Task UTCID08_OverPayment_Clamped()
    {
        var (db, grId) = ReceiptSetup.Draft();
        var r = await Complete(db, grId, paid: 70_000);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(60_000m, (await db.TrxFinancialTransactions.AsNoTracking().SingleAsync(t => t.TxType == "SUPPLIER_PAYMENT")).Amount);
        Assert.Equal(0m, PurchaseData.Payable(db));
    }

    [Fact(DisplayName = "CompletePurchase/UTCID09 – phiếu đã hoàn thành")]
    [Trait("Function", Function)][Trait("UTCID", "CompletePurchase/UTCID09")][Trait("Type", "A")]
    public async Task UTCID09_AlreadyCompleted_ReturnsError()
    {
        var db = PurchaseData.Db();
        var (grId, _) = PurchaseData.AddReceipt(db, "PN000001", "COMPLETED", ReceiptSetup.TenAt6000);
        await AssertRejected(db, grId, "Phiếu nhập hàng này đã ở trạng thái Hoàn thành trước đó.");
    }

    [Fact(DisplayName = "CompletePurchase/UTCID10 – phiếu đã hủy")]
    [Trait("Function", Function)][Trait("UTCID", "CompletePurchase/UTCID10")][Trait("Type", "A")]
    public async Task UTCID10_Cancelled_ReturnsError()
    {
        var db = PurchaseData.Db();
        var (grId, _) = PurchaseData.AddReceipt(db, "PN000001", "CANCELLED", ReceiptSetup.TenAt6000);
        await AssertRejected(db, grId, "Phiếu nhập hàng này đã bị hủy, không thể hoàn thành.");
    }

    [Fact(DisplayName = "CompletePurchase/UTCID11 – phiếu tạm không có dòng hàng")]
    [Trait("Function", Function)][Trait("UTCID", "CompletePurchase/UTCID11")][Trait("Type", "A")]
    public async Task UTCID11_NoLines_ReturnsError()
    {
        var (db, grId) = ReceiptSetup.Draft(lines: Array.Empty<(int, decimal, decimal)>());
        await AssertRejected(db, grId, "Phiếu nhập hàng không có mặt hàng nào để nhập kho.");
    }

    [Fact(DisplayName = "CompletePurchase/UTCID12 – phiếu 999 không tồn tại")]
    [Trait("Function", Function)][Trait("UTCID", "CompletePurchase/UTCID12")][Trait("Type", "A")]
    public async Task UTCID12_UnknownReceipt_ReturnsError()
    {
        var db = PurchaseData.Db();
        await AssertRejected(db, 999, "Không tìm thấy phiếu nhập hàng #999.");
    }

    [Fact(DisplayName = "CompletePurchase/UTCID13 – không có quyền kho của phiếu")]
    [Trait("Function", Function)][Trait("UTCID", "CompletePurchase/UTCID13")][Trait("Type", "A")]
    public async Task UTCID13_NoWarehouseAccess_ReturnsError()
    {
        var (db, grId) = ReceiptSetup.Draft();
        await AssertRejected(db, grId, "Bạn không có quyền nhập hàng vào kho này.", ReceiptSetup.OtherWarehouseUser());
        Assert.Equal("DRAFT", ReceiptSetup.Receipt(db, grId).Status);
    }

    [Fact(DisplayName = "CompletePurchase/UTCID14 – không xác định người dùng")]
    [Trait("Function", Function)][Trait("UTCID", "CompletePurchase/UTCID14")][Trait("Type", "A")]
    public async Task UTCID14_NoUser_ReturnsError()
    {
        var (db, grId) = ReceiptSetup.Draft();
        await AssertRejected(db, grId, "Không xác định được người dùng đăng nhập.", CurrentUser.WithoutUser(TestData.K001));
        Assert.Equal("DRAFT", ReceiptSetup.Receipt(db, grId).Status);
    }
}

/// <summary>Report 5.1 – sheet CancelPurchase (LucDT): hủy phiếu nhập, đảo tồn, công nợ và khoản trả lúc nhập.</summary>
public class CancelPurchaseTests
{
    private const string Function = "CancelPurchase";

    private static Task<Result<bool>> Cancel(TestStockFlowDbContext db, int grId, string? reason = null,
        Mock<ICurrentUserService>? user = null) =>
        new CancelPurchaseCommandHandler(db, (user ?? ReceiptSetup.User()).Object)
            .Handle(new CancelPurchaseCommand(grId, new CancelPurchaseRequest(reason)), CancellationToken.None);

    [Fact(DisplayName = "CancelPurchase/UTCID01 – phiếu tạm: CANCELLED, không đổi tồn, không ghi thẻ kho")]
    [Trait("Function", Function)][Trait("UTCID", "CancelPurchase/UTCID01")][Trait("Type", "N")]
    public async Task UTCID01_Draft_Cancelled()
    {
        var (db, grId) = ReceiptSetup.Draft();
        var r = await Cancel(db, grId);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal("CANCELLED", ReceiptSetup.Receipt(db, grId).Status);
        Assert.Empty(db.TrxInventoryTransactions.AsNoTracking());
        Assert.Empty(db.TrxInventoryBalances.AsNoTracking());
    }

    [Fact(DisplayName = "CancelPurchase/UTCID02 – phiếu đã nhập 60.000 chưa trả: tồn −10 (INBOUND_RECEIPT_CANCEL), công nợ −60.000")]
    [Trait("Function", Function)][Trait("UTCID", "CancelPurchase/UTCID02")][Trait("Type", "N")]
    public async Task UTCID02_CompletedUnpaid_Reversed()
    {
        var (db, grId, _) = ReceiptSetup.Completed();
        var r = await Cancel(db, grId);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal("CANCELLED", ReceiptSetup.Receipt(db, grId).Status);
        Assert.Equal(0, TestData.StockOf(db, TestData.K001));
        var card = Assert.Single(TestData.CardEntries(db, "GOODS_RECEIPT", grId));
        Assert.Equal("INBOUND_RECEIPT_CANCEL", card.TransactionType);
        Assert.Equal(-10, card.Quantity);
        Assert.Equal(0m, PurchaseData.Payable(db));
    }

    [Fact(DisplayName = "CancelPurchase/UTCID03 – đã trả 20.000 lúc nhập: công nợ −40.000, khoản trả bị hủy")]
    [Trait("Function", Function)][Trait("UTCID", "CancelPurchase/UTCID03")][Trait("Type", "N")]
    public async Task UTCID03_CompletedPartlyPaid_PaymentCancelled()
    {
        var db = PurchaseData.Db(supplier1Payable: 40_000);
        var (_, grId, _) = ReceiptSetup.Completed(db: db);
        PurchaseData.AddPayment(db, grId, 20_000);
        var r = await Cancel(db, grId);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(0m, PurchaseData.Payable(db));
        Assert.Equal("CANCELLED", (await db.TrxFinancialTransactions.AsNoTracking().SingleAsync()).Status);
    }

    [Fact(DisplayName = "CancelPurchase/UTCID04 – phiếu theo phiếu đặt: phiếu đặt tính lại về ORDERED")]
    [Trait("Function", Function)][Trait("UTCID", "CancelPurchase/UTCID04")][Trait("Type", "N")]
    public async Task UTCID04_LinkedPo_Recalculated()
    {
        var db = PurchaseData.Db(supplier1Payable: 60_000);
        var poId = PurchaseData.AddPo(db, "PDN000001", "COMPLETED", new[] { (TestData.PTest, 10m, 6000m) });
        var (_, grId, _) = ReceiptSetup.Completed(poId, db);
        var r = await Cancel(db, grId);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal("ORDERED", PurchaseData.Po(db, poId).Status);
    }

    [Fact(DisplayName = "CancelPurchase/UTCID05 – lý do \"Nhập sai\": ghi chú có \"[Lý do hủy]: Nhập sai\"")]
    [Trait("Function", Function)][Trait("UTCID", "CancelPurchase/UTCID05")][Trait("Type", "N")]
    public async Task UTCID05_Reason_AppendedToNotes()
    {
        var (db, grId) = ReceiptSetup.Draft();
        var r = await Cancel(db, grId, "Nhập sai");
        Assert.True(r.IsSuccess, r.Error);
        Assert.Contains("[Lý do hủy]: Nhập sai", ReceiptSetup.Receipt(db, grId).Notes);
    }

    [Fact(DisplayName = "CancelPurchase/UTCID06 – phiếu tạm, UserId = null: vẫn hủy được")]
    [Trait("Function", Function)][Trait("UTCID", "CancelPurchase/UTCID06")][Trait("Type", "B")]
    public async Task UTCID06_DraftWithoutUser_Cancelled()
    {
        var (db, grId) = ReceiptSetup.Draft();
        var r = await Cancel(db, grId, user: CurrentUser.WithoutUser(TestData.K001));
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal("CANCELLED", ReceiptSetup.Receipt(db, grId).Status);
    }

    [Fact(DisplayName = "CancelPurchase/UTCID07 – phiếu đã hủy")]
    [Trait("Function", Function)][Trait("UTCID", "CancelPurchase/UTCID07")][Trait("Type", "A")]
    public async Task UTCID07_AlreadyCancelled_ReturnsError()
    {
        var db = PurchaseData.Db();
        var (grId, _) = PurchaseData.AddReceipt(db, "PN000001", "CANCELLED", ReceiptSetup.TenAt6000);
        var r = await Cancel(db, grId);
        Assert.False(r.IsSuccess);
        Assert.Equal("Phiếu nhập hàng này đã ở trạng thái Đã hủy trước đó.", r.Error);
    }

    [Fact(DisplayName = "CancelPurchase/UTCID08 – phiếu 999 không tồn tại")]
    [Trait("Function", Function)][Trait("UTCID", "CancelPurchase/UTCID08")][Trait("Type", "A")]
    public async Task UTCID08_UnknownReceipt_ReturnsError()
    {
        var r = await Cancel(PurchaseData.Db(), 999);
        Assert.False(r.IsSuccess);
        Assert.Equal("Không tìm thấy phiếu nhập hàng #999.", r.Error);
    }

    [Fact(DisplayName = "CancelPurchase/UTCID09 – không có quyền kho của phiếu")]
    [Trait("Function", Function)][Trait("UTCID", "CancelPurchase/UTCID09")][Trait("Type", "A")]
    public async Task UTCID09_NoWarehouseAccess_ReturnsError()
    {
        var (db, grId) = ReceiptSetup.Draft();
        var r = await Cancel(db, grId, user: ReceiptSetup.OtherWarehouseUser());
        Assert.False(r.IsSuccess);
        Assert.Equal("Bạn không có quyền truy cập phiếu nhập của kho này.", r.Error);
        Assert.Equal("DRAFT", ReceiptSetup.Receipt(db, grId).Status);
    }

    [Fact(DisplayName = "CancelPurchase/UTCID10 – phiếu đã có phiếu trả hàng nhập THN000001")]
    [Trait("Function", Function)][Trait("UTCID", "CancelPurchase/UTCID10")][Trait("Type", "A")]
    public async Task UTCID10_HasActiveReturn_ReturnsError()
    {
        var (db, grId, itemId) = ReceiptSetup.Completed();
        PurchaseData.AddReturn(db, "THN000001", "COMPLETED", 2, 6000, grId, itemId);
        var r = await Cancel(db, grId);
        Assert.False(r.IsSuccess);
        Assert.Equal("Phiếu nhập đã có phiếu trả hàng nhập THN000001. Vui lòng hủy phiếu trả hàng trước.", r.Error);
        Assert.Equal(10, TestData.StockOf(db, TestData.K001));
    }

    [Fact(DisplayName = "CancelPurchase/UTCID11 – phiếu đã thanh toán bằng phiếu chi PC000001")]
    [Trait("Function", Function)][Trait("UTCID", "CancelPurchase/UTCID11")][Trait("Type", "A")]
    public async Task UTCID11_PaidByVoucher_ReturnsError()
    {
        var (db, grId, _) = ReceiptSetup.Completed();
        PurchaseData.AddPayment(db, grId, 60_000, txCode: "PC000001");
        var r = await Cancel(db, grId);
        Assert.False(r.IsSuccess);
        Assert.Equal("Phiếu nhập đã được thanh toán bằng phiếu chi PC000001. Không thể hủy phiếu nhập này.", r.Error);
        Assert.Equal("COMPLETED", ReceiptSetup.Receipt(db, grId).Status);
        Assert.Equal(10, TestData.StockOf(db, TestData.K001));
    }

    [Fact(DisplayName = "CancelPurchase/UTCID12 – phiếu đã nhập, không xác định người dùng")]
    [Trait("Function", Function)][Trait("UTCID", "CancelPurchase/UTCID12")][Trait("Type", "A")]
    public async Task UTCID12_CompletedNoUser_ReturnsError()
    {
        var (db, grId, _) = ReceiptSetup.Completed();
        var r = await Cancel(db, grId, user: CurrentUser.WithoutUser(TestData.K001));
        Assert.False(r.IsSuccess);
        Assert.Equal("Không xác định được người dùng đăng nhập.", r.Error);
        Assert.Equal("COMPLETED", ReceiptSetup.Receipt(db, grId).Status);
        Assert.Equal(10, TestData.StockOf(db, TestData.K001));
    }
}
