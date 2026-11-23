using Microsoft.EntityFrameworkCore;
using Moq;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Common.Inventory;
using StockFlow.Application.Features.Purchases.Commands;
using StockFlow.Application.Features.Purchases.DTOs;
using StockFlow.Application.Features.PurchaseOrders.Queries;
using StockFlow.Domain.Entities;
using StockFlow.UnitTests.Common;
using Xunit;

namespace StockFlow.UnitTests.Purchasing.Receipts;

/// <summary>
/// Report 5.1 – sheet CreatePurchase (LucDT): lưu phiếu tạm hoặc nhập hàng (UC-31, BR-23, BR-25, BR-29).
/// Người dùng 1 có quyền K001 (authorized = [3]). Ca "Success" kiểm theo D.2; UTCID15 theo câu chữ mới ở D.1.
/// UTCID28: nhóm chốt 24/11/2026 chấp nhận nhập lệch SL đặt (tiền phiếu đặt theo SL đã nhập).
/// UTCID29: đã sửa ISS-01 (chỉ nhận đối tác là nhà cung cấp).
/// </summary>
public class CreatePurchaseTests
{
    private const string Function = "CreatePurchase";
    private const string PaymentTx = "SUPPLIER_PAYMENT";

    private static CreatePurchaseRequest Req(
        string status = "COMPLETED", decimal paid = 0, int? warehouseId = TestData.K001, int partnerId = PurchaseData.Supplier1,
        int? poId = null, string? code = null, List<CreatePurchaseItemRequest>? items = null) =>
        new(warehouseId, partnerId, null, null, status, paid, null, null,
            items ?? Line(), code, 0, poId);

    private static List<CreatePurchaseItemRequest> Line(decimal qty = 10, decimal price = 6000, int productId = TestData.PTest) =>
        new() { new(productId, qty, price) };

    private static async Task<(TestStockFlowDbContext Db, Result<PurchaseDetailDto> R)> Run(
        CreatePurchaseRequest req, Mock<ICurrentUserService>? user = null, Action<TestStockFlowDbContext>? arrange = null)
    {
        var db = PurchaseData.Db();
        arrange?.Invoke(db);
        var u = (user ?? CurrentUser.WithWarehouses(TestData.UserId, TestData.K001)).Object;
        var r = await new CreatePurchaseCommandHandler(db, u, new InventoryLedger(db)).Handle(new CreatePurchaseCommand(req), CancellationToken.None);
        return (db, r);
    }

    private static async Task AssertRejected(CreatePurchaseRequest req, string message, Mock<ICurrentUserService>? user = null,
        Action<TestStockFlowDbContext>? arrange = null)
    {
        var (db, r) = await Run(req, user, arrange);
        Assert.False(r.IsSuccess);
        Assert.Equal(message, r.Error);
        AssertNothingPosted(db);
    }

    private static void AssertNothingPosted(TestStockFlowDbContext db)
    {
        Assert.Empty(db.TrxGoodsReceipts.AsNoTracking());
        Assert.Empty(db.TrxInventoryTransactions.AsNoTracking());
        Assert.Equal(0m, PurchaseData.Payable(db));
    }

    private static List<TrxFinancialTransaction> Payments(TestStockFlowDbContext db) =>
        db.TrxFinancialTransactions.AsNoTracking().Where(t => t.TxType == PaymentTx).ToList();

    [Fact(DisplayName = "CreatePurchase/UTCID01 – lưu phiếu tạm: tồn, thẻ kho, công nợ không đổi")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchase/UTCID01")][Trait("Type", "N")]
    public async Task UTCID01_Draft_NoPosting()
    {
        var (db, r) = await Run(Req(status: "DRAFT"));
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal("DRAFT", (await db.TrxGoodsReceipts.AsNoTracking().SingleAsync()).Status);
        Assert.Empty(db.TrxInventoryBalances.AsNoTracking());
        Assert.Empty(db.TrxInventoryTransactions.AsNoTracking());
        Assert.Equal(0m, PurchaseData.Payable(db));
    }

    [Fact(DisplayName = "CreatePurchase/UTCID02 – nhập 10 × 6.000: tồn 10, giá vốn 6.000, INBOUND_RECEIPT +10, công nợ +60.000")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchase/UTCID02")][Trait("Type", "N")]
    public async Task UTCID02_Completed_PostsStockCostCardPayable()
    {
        var (db, r) = await Run(Req());
        Assert.True(r.IsSuccess, r.Error);
        var gr = await db.TrxGoodsReceipts.AsNoTracking().SingleAsync();
        Assert.Equal("COMPLETED", gr.Status);
        Assert.Equal(10, TestData.StockOf(db, TestData.K001));
        Assert.Equal(6000m, PurchaseData.UnitCost(db));
        var card = Assert.Single(TestData.CardEntries(db, "GOODS_RECEIPT", gr.GrId));
        Assert.Equal("INBOUND_RECEIPT", card.TransactionType);
        Assert.Equal(10, card.Quantity);
        Assert.Equal(60_000m, PurchaseData.Payable(db));
    }

    [Fact(DisplayName = "CreatePurchase/UTCID03 – tồn 10 giá 4.000, nhập 10 × 6.000: tồn 20, giá vốn BQ 5.000 (BR-29)")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchase/UTCID03")][Trait("Type", "N")]
    public async Task UTCID03_ExistingStock_MovingAverageCost()
    {
        var (db, r) = await Run(Req(), arrange: d => TestData.SetStock(d, TestData.K001, TestData.PTest, 10, 4000));
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(20, TestData.StockOf(db, TestData.K001));
        Assert.Equal(5000m, PurchaseData.UnitCost(db));
        Assert.Equal(60_000m, PurchaseData.Payable(db));
    }

    [Fact(DisplayName = "CreatePurchase/UTCID04 – trả trước 20.000: công nợ +40.000, SUPPLIER_PAYMENT 20.000 CASH")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchase/UTCID04")][Trait("Type", "N")]
    public async Task UTCID04_PartialPayment_RecordsPayment()
    {
        var (db, r) = await Run(Req(paid: 20_000));
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(40_000m, PurchaseData.Payable(db));
        var pay = Assert.Single(Payments(db));
        Assert.Equal(20_000m, pay.Amount);
        Assert.Equal("CASH", pay.PaymentMethod);
    }

    [Fact(DisplayName = "CreatePurchase/UTCID05 – trả đủ 60.000: công nợ +0, SUPPLIER_PAYMENT 60.000")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchase/UTCID05")][Trait("Type", "N")]
    public async Task UTCID05_FullPayment_NoPayable()
    {
        var (db, r) = await Run(Req(paid: 60_000));
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(0m, PurchaseData.Payable(db));
        Assert.Equal(60_000m, Assert.Single(Payments(db)).Amount);
    }

    [Fact(DisplayName = "CreatePurchase/UTCID06 – theo phiếu đặt ORDERED SL 20, nhập 10: phiếu đặt PARTIAL")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchase/UTCID06")][Trait("Type", "N")]
    public async Task UTCID06_PartOfPo_PoPartial()
    {
        var db = PurchaseData.Db();
        var poId = PurchaseData.AddPo(db, "PDN000001", "ORDERED", new[] { (TestData.PTest, 20m, 6000m) });
        var u = CurrentUser.WithWarehouses(TestData.UserId, TestData.K001).Object;
        var r = await new CreatePurchaseCommandHandler(db, u, new InventoryLedger(db)).Handle(new CreatePurchaseCommand(Req(poId: poId)), CancellationToken.None);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal("PARTIAL", PurchaseData.Po(db, poId).Status);
    }

    [Fact(DisplayName = "CreatePurchase/UTCID07 – theo phiếu đặt ORDERED SL 10, nhập đủ 10: phiếu đặt COMPLETED")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchase/UTCID07")][Trait("Type", "N")]
    public async Task UTCID07_WholePo_PoCompleted()
    {
        var db = PurchaseData.Db();
        var poId = PurchaseData.AddPo(db, "PDN000001", "ORDERED", new[] { (TestData.PTest, 10m, 6000m) });
        var u = CurrentUser.WithWarehouses(TestData.UserId, TestData.K001).Object;
        var r = await new CreatePurchaseCommandHandler(db, u, new InventoryLedger(db)).Handle(new CreatePurchaseCommand(Req(poId: poId)), CancellationToken.None);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal("COMPLETED", PurchaseData.Po(db, poId).Status);
    }

    [Fact(DisplayName = "CreatePurchase/UTCID08 – không chọn kho: nhập vào kho đầu tiên được phân quyền (3)")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchase/UTCID08")][Trait("Type", "N")]
    public async Task UTCID08_NoWarehouse_UsesFirstAuthorized()
    {
        var (db, r) = await Run(Req(warehouseId: null));
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(TestData.K001, (await db.TrxGoodsReceipts.AsNoTracking().SingleAsync()).WarehouseId);
        Assert.Equal(10, TestData.StockOf(db, TestData.K001));
    }

    [Fact(DisplayName = "CreatePurchase/UTCID09 – SL 0,01: tồn 0,01, giá vốn 6.000, công nợ +60")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchase/UTCID09")][Trait("Type", "B")]
    public async Task UTCID09_SmallQty_Posted()
    {
        var (db, r) = await Run(Req(items: Line(qty: 0.01m)));
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(0.01m, TestData.StockOf(db, TestData.K001));
        Assert.Equal(6000m, PurchaseData.UnitCost(db));
        Assert.Equal(60m, PurchaseData.Payable(db));
    }

    [Fact(DisplayName = "CreatePurchase/UTCID10 – đơn giá 0: tồn 10, giá vốn 0, công nợ +0")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchase/UTCID10")][Trait("Type", "B")]
    public async Task UTCID10_ZeroPrice_Posted()
    {
        var (db, r) = await Run(Req(items: Line(price: 0)));
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(10, TestData.StockOf(db, TestData.K001));
        Assert.Equal(0m, PurchaseData.UnitCost(db));
        Assert.Equal(0m, PurchaseData.Payable(db));
    }

    [Fact(DisplayName = "CreatePurchase/UTCID11 – tồn trước −5 giá 4.000: giá vốn mới = giá nhập 6.000, tồn sau 5")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchase/UTCID11")][Trait("Type", "B")]
    public async Task UTCID11_NegativeStock_TakesIncomingPrice()
    {
        var (db, r) = await Run(Req(), arrange: d => TestData.SetStock(d, TestData.K001, TestData.PTest, -5, 4000));
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(5, TestData.StockOf(db, TestData.K001));
        Assert.Equal(6000m, PurchaseData.UnitCost(db));
    }

    [Fact(DisplayName = "CreatePurchase/UTCID12 – trả trước 70.000 > 60.000: chặn còn 60.000, công nợ +0")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchase/UTCID12")][Trait("Type", "B")]
    public async Task UTCID12_OverPayment_Clamped()
    {
        var (db, r) = await Run(Req(paid: 70_000));
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(60_000m, Assert.Single(Payments(db)).Amount);
        Assert.Equal(0m, PurchaseData.Payable(db));
    }

    [Fact(DisplayName = "CreatePurchase/UTCID13 – không xác định người dùng")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchase/UTCID13")][Trait("Type", "A")]
    public Task UTCID13_NoUser_ReturnsError() =>
        AssertRejected(Req(), "Không xác định được người dùng đăng nhập.", CurrentUser.WithoutUser(TestData.K001));

    [Fact(DisplayName = "CreatePurchase/UTCID14 – không có mặt hàng")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchase/UTCID14")][Trait("Type", "A")]
    public Task UTCID14_NoItems_ReturnsError() =>
        AssertRejected(Req(items: new List<CreatePurchaseItemRequest>()), "Phiếu nhập hàng phải có ít nhất 1 mặt hàng.");

    [Fact(DisplayName = "CreatePurchase/UTCID15 – SL đạt 0, SL lỗi 0 (câu chữ D.1)")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchase/UTCID15")][Trait("Type", "B")]
    public Task UTCID15_ZeroQty_ReturnsError() =>
        AssertRejected(Req(items: Line(qty: 0)), "Số lượng nhận của sản phẩm ID #1 phải lớn hơn 0.");

    [Fact(DisplayName = "CreatePurchase/UTCID16 – đơn giá −1")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchase/UTCID16")][Trait("Type", "A")]
    public Task UTCID16_NegativePrice_ReturnsError() =>
        AssertRejected(Req(items: Line(price: -1)), "Đơn giá nhập của sản phẩm ID #1 không được âm.");

    [Fact(DisplayName = "CreatePurchase/UTCID17 – không chọn kho, chưa được phân quyền kho nào")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchase/UTCID17")][Trait("Type", "A")]
    public Task UTCID17_NoAuthorizedWarehouse_ReturnsError() =>
        AssertRejected(Req(warehouseId: null), "Bạn chưa được phân quyền kho nào để nhập hàng.", CurrentUser.WithWarehouses(TestData.UserId));

    [Fact(DisplayName = "CreatePurchase/UTCID18 – không có quyền kho 3")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchase/UTCID18")][Trait("Type", "A")]
    public Task UTCID18_NoWarehouseAccess_ReturnsError() =>
        AssertRejected(Req(), "Bạn không có quyền nhập hàng vào kho này.", CurrentUser.WithWarehouses(TestData.UserId, TestData.K002));

    [Fact(DisplayName = "CreatePurchase/UTCID19 – kho 999 không tồn tại")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchase/UTCID19")][Trait("Type", "A")]
    public Task UTCID19_UnknownWarehouse_ReturnsError() =>
        AssertRejected(Req(warehouseId: 999), "Không tìm thấy kho hàng ID #999.", CurrentUser.WithWarehouses(TestData.UserId, TestData.K001, 999));

    [Fact(DisplayName = "CreatePurchase/UTCID20 – nhà cung cấp 999 không tồn tại")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchase/UTCID20")][Trait("Type", "A")]
    public Task UTCID20_UnknownPartner_ReturnsError() =>
        AssertRejected(Req(partnerId: 999), "Không tìm thấy nhà cung cấp ID #999.");

    [Fact(DisplayName = "CreatePurchase/UTCID21 – phiếu đặt không tồn tại")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchase/UTCID21")][Trait("Type", "A")]
    public Task UTCID21_UnknownPo_ReturnsError() =>
        AssertRejected(Req(poId: 999), "Không tìm thấy phiếu đặt hàng nhập.");

    [Fact(DisplayName = "CreatePurchase/UTCID22 – phiếu đặt PDN000001 đang DRAFT")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchase/UTCID22")][Trait("Type", "A")]
    public async Task UTCID22_DraftPo_ReturnsError()
    {
        var db = PurchaseData.Db();
        var poId = PurchaseData.AddPo(db, "PDN000001", "DRAFT", new[] { (TestData.PTest, 10m, 6000m) });
        var u = CurrentUser.WithWarehouses(TestData.UserId, TestData.K001).Object;
        var r = await new CreatePurchaseCommandHandler(db, u, new InventoryLedger(db)).Handle(new CreatePurchaseCommand(Req(poId: poId)), CancellationToken.None);
        Assert.False(r.IsSuccess);
        Assert.Equal("Phiếu đặt hàng nhập PDN000001 không ở trạng thái chờ nhập hàng.", r.Error);
        AssertNothingPosted(db);
    }

    [Fact(DisplayName = "CreatePurchase/UTCID23 – phiếu đặt PDN000001 của nhà cung cấp khác")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchase/UTCID23")][Trait("Type", "A")]
    public async Task UTCID23_PoOfOtherSupplier_ReturnsError()
    {
        var db = PurchaseData.Db();
        var poId = PurchaseData.AddPo(db, "PDN000001", "ORDERED", new[] { (TestData.PTest, 10m, 6000m) }, partnerId: PurchaseData.Supplier2);
        var u = CurrentUser.WithWarehouses(TestData.UserId, TestData.K001).Object;
        var r = await new CreatePurchaseCommandHandler(db, u, new InventoryLedger(db)).Handle(new CreatePurchaseCommand(Req(poId: poId)), CancellationToken.None);
        Assert.False(r.IsSuccess);
        Assert.Equal("Nhà cung cấp và kho nhập phải trùng với phiếu đặt hàng nhập PDN000001.", r.Error);
        AssertNothingPosted(db);
    }

    [Fact(DisplayName = "CreatePurchase/UTCID24 – sản phẩm không tồn tại")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchase/UTCID24")][Trait("Type", "A")]
    public Task UTCID24_UnknownProduct_ReturnsError() =>
        AssertRejected(Req(items: Line(productId: 999)), "Một số sản phẩm trong phiếu nhập không tồn tại trong danh mục.");

    [Fact(DisplayName = "CreatePurchase/UTCID25 – mã PN-EXIST đã dùng")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchase/UTCID25")][Trait("Type", "A")]
    public async Task UTCID25_DuplicateCode_ReturnsError()
    {
        var (db, r) = await Run(Req(code: "PN-EXIST"),
            arrange: d => PurchaseData.AddReceipt(d, "PN-EXIST", "DRAFT", new[] { (TestData.PTest, 1m, 6000m) }));
        Assert.False(r.IsSuccess);
        Assert.Equal("Mã phiếu nhập 'PN-EXIST' đã tồn tại trong hệ thống.", r.Error);
        Assert.Single(db.TrxGoodsReceipts.AsNoTracking());
    }

    [Fact(DisplayName = "CreatePurchase/UTCID26 – phiếu tạm SL 0,01: lưu, không đổi tồn")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchase/UTCID26")][Trait("Type", "B")]
    public async Task UTCID26_DraftSmallQty_Saved()
    {
        var (db, r) = await Run(Req(status: "DRAFT", items: Line(qty: 0.01m)));
        Assert.True(r.IsSuccess, r.Error);
        var line = await db.DtlGoodsReceiptItems.AsNoTracking().SingleAsync();
        Assert.Equal(0.01m, line.AcceptedQty);
        Assert.Empty(db.TrxInventoryBalances.AsNoTracking());
    }

    [Fact(DisplayName = "CreatePurchase/UTCID27 – phiếu tạm đơn giá 0: lưu, không đổi tồn")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchase/UTCID27")][Trait("Type", "B")]
    public async Task UTCID27_DraftZeroPrice_Saved()
    {
        var (db, r) = await Run(Req(status: "DRAFT", items: Line(price: 0)));
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(0m, (await db.DtlGoodsReceiptItems.AsNoTracking().SingleAsync()).UnitPrice);
        Assert.Empty(db.TrxInventoryBalances.AsNoTracking());
    }

    [Fact(DisplayName = "CreatePurchase/UTCID30 (mục H) – tồn 1 @ 1.000, nhập 2 @ 1.001: giá vốn MAC = 3.002 / 3 = 1.000,667 (3 chữ số thập phân)")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchase/UTCID30")][Trait("Type", "B")][Trait("Source", "Review mục H")]
    public async Task UTCID30_MacRoundedToThreeDecimals()
    {
        var (db, r) = await Run(Req(items: Line(qty: 2, price: 1001)),
            arrange: d => TestData.SetStock(d, TestData.K001, TestData.PTest, 1, 1000));
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(3, TestData.StockOf(db, TestData.K001));
        Assert.Equal(1000.667m, PurchaseData.UnitCost(db));
        Assert.Equal(1000.667m, db.MstProducts.AsNoTracking().Single(p => p.ProductId == TestData.PTest).MovingAverageCost);
    }

    [Fact(DisplayName = "CreatePurchase/UTCID28 – nhập 11 khi phiếu đặt chỉ đặt 10: chấp nhận nhập lệch, tiền phiếu đặt theo SL đã nhập")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchase/UTCID28")][Trait("Type", "B")]
    public async Task UTCID28_OverOrderedQty_AcceptedAndAmountByReceived()
    {
        var db = PurchaseData.Db();
        var poId = PurchaseData.AddPo(db, "PDN000001", "ORDERED", new[] { (TestData.PTest, 10m, 6000m) });
        var u = CurrentUser.WithWarehouses(TestData.UserId, TestData.K001).Object;
        var r = await new CreatePurchaseCommandHandler(db, u, new InventoryLedger(db))
            .Handle(new CreatePurchaseCommand(Req(poId: poId, items: Line(qty: 11))), CancellationToken.None);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(11, TestData.StockOf(db, TestData.K001));

        // Phiếu đặt hiển thị tiền theo SL đã nhập: 11 × 6.000 = 66.000 (giá trị đặt lưu trong DB vẫn 60.000)
        var po = await new PurchaseOrderQueryHandler(db, u).Handle(new GetPurchaseOrderByIdQuery(poId), CancellationToken.None);
        Assert.True(po.IsSuccess, po.Error);
        Assert.Equal("COMPLETED", po.Value!.Status);
        Assert.Equal(66_000m, Assert.Single(po.Value.Items).LineTotal);
        Assert.Equal(66_000m, po.Value.TotalAmount);
    }

    [Fact(DisplayName = "CreatePurchase/UTCID29 – đối tác là khách hàng: phải bị từ chối")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchase/UTCID29")][Trait("Type", "A")]
    public async Task UTCID29_CustomerPartner_Rejected()
    {
        var (db, r) = await Run(Req(partnerId: PurchaseData.Customer));
        Assert.False(r.IsSuccess, "Workbook mong bị từ chối: đối tác không phải nhà cung cấp. Code không kiểm PartnerType (ISS-01).");
        Assert.Empty(db.TrxGoodsReceipts.AsNoTracking());
    }
}
