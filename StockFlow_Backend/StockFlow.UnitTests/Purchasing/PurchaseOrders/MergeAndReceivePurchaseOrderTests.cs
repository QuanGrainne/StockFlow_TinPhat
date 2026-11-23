using MediatR;
using Microsoft.EntityFrameworkCore;
using Moq;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Common.Inventory;
using StockFlow.Application.Features.PurchaseOrders.Commands;
using StockFlow.Application.Features.PurchaseOrders.DTOs;
using StockFlow.Application.Features.PurchaseOrders.Queries;
using StockFlow.Application.Features.Purchases.Commands;
using StockFlow.Application.Features.Purchases.DTOs;
using StockFlow.UnitTests.Common;
using Xunit;

namespace StockFlow.UnitTests.Purchasing.PurchaseOrders;

/// <summary>
/// Report 5.1 – sheet MergePurchaseOrders (LucDT): gộp các phiếu cùng NCC, cùng kho, chưa có phiếu nhập.
/// PoIds [1, 2] của workbook = 2 phiếu PDN000001, PDN000002 tạo ở bước Arrange. Ca "Success" kiểm theo D.2.
/// </summary>
public class MergePurchaseOrdersTests
{
    private const string Function = "MergePurchaseOrders";

    private static TestStockFlowDbContext Db()
    {
        var db = PurchaseData.Db();
        db.SetSequence("stockflow.seq_purchase_order", 100); // mã phiếu gộp PDN000101, không trùng phiếu nguồn
        return db;
    }

    private static (int, decimal, decimal)[] L(int productId, decimal qty = 10, decimal price = 5000) => new[] { (productId, qty, price) };

    private static Task<Result<int>> Merge(TestStockFlowDbContext db, Mock<ICurrentUserService> user, params int[] ids) =>
        PoSetup.Handler(db, user).Handle(new MergePurchaseOrdersCommand(ids.ToList()), CancellationToken.None);

    /// <summary>2 phiếu nguồn cùng NCC-01, kho K001: phiếu 1 có P-TEST, phiếu 2 có P-TEST2.</summary>
    private static (TestStockFlowDbContext Db, int Po1, int Po2) TwoDrafts(string status2 = "DRAFT")
    {
        var db = Db();
        var po1 = PurchaseData.AddPo(db, "PDN000001", "DRAFT", L(TestData.PTest));
        var po2 = PurchaseData.AddPo(db, "PDN000002", status2, L(SalesData.PTest2));
        return (db, po1, po2);
    }

    private static async Task AssertMergeFails(TestStockFlowDbContext db, Result<int> r, string message)
    {
        Assert.False(r.IsSuccess);
        Assert.Equal(message, r.Error);
        Assert.DoesNotContain(await db.TrxPurchaseOrders.AsNoTracking().ToListAsync(), p => p.Status == "CANCELLED" && p.MergedIntoPoId != null);
    }

    [Fact(DisplayName = "MergePurchaseOrders/UTCID01 – 2 phiếu DRAFT khác mặt hàng: phiếu mới DRAFT 2 dòng, nguồn CANCELLED")]
    [Trait("Function", Function)][Trait("UTCID", "MergePurchaseOrders/UTCID01")][Trait("Type", "N")]
    public async Task UTCID01_TwoDrafts_Merged()
    {
        var (db, po1, po2) = TwoDrafts();
        var r = await Merge(db, PoSetup.User(), po1, po2);
        Assert.True(r.IsSuccess, r.Error);
        var merged = PurchaseData.Po(db, r.Value);
        Assert.Equal("DRAFT", merged.Status);
        Assert.Equal(2, merged.DtlPurchaseOrderItems.Count);
        foreach (var id in new[] { po1, po2 })
        {
            var source = PurchaseData.Po(db, id);
            Assert.Equal("CANCELLED", source.Status);
            Assert.Equal(r.Value, source.MergedIntoPoId);
        }
        Assert.Single(db.Transactions);
        db.Transactions[0].Verify(t => t.CommitAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact(DisplayName = "MergePurchaseOrders/UTCID02 – nguồn DRAFT + ORDERED: phiếu mới ORDERED")]
    [Trait("Function", Function)][Trait("UTCID", "MergePurchaseOrders/UTCID02")][Trait("Type", "N")]
    public async Task UTCID02_DraftAndOrdered_MergedAsOrdered()
    {
        var (db, po1, po2) = TwoDrafts("ORDERED");
        var r = await Merge(db, PoSetup.User(), po1, po2);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal("ORDERED", PurchaseData.Po(db, r.Value).Status);
        Assert.Equal("CANCELLED", PurchaseData.Po(db, po1).Status);
        Assert.Equal("CANCELLED", PurchaseData.Po(db, po2).Status);
    }

    [Fact(DisplayName = "MergePurchaseOrders/UTCID03 – cùng mặt hàng 10 + 10, cùng giá 5.000: 1 dòng SL 20 giá 5.000")]
    [Trait("Function", Function)][Trait("UTCID", "MergePurchaseOrders/UTCID03")][Trait("Type", "N")]
    public async Task UTCID03_SameProductSamePrice_Summed()
    {
        var db = Db();
        var po1 = PurchaseData.AddPo(db, "PDN000001", "DRAFT", L(TestData.PTest));
        var po2 = PurchaseData.AddPo(db, "PDN000002", "DRAFT", L(TestData.PTest));
        var r = await Merge(db, PoSetup.User(), po1, po2);
        Assert.True(r.IsSuccess, r.Error);
        var line = Assert.Single(PurchaseData.Po(db, r.Value).DtlPurchaseOrderItems);
        Assert.Equal(20m, line.OrderedQty);
        Assert.Equal(5000m, line.UnitPrice);
    }

    [Fact(DisplayName = "MergePurchaseOrders/UTCID04 – cùng mặt hàng, giá 5.000 và 7.000: đơn giá bình quân 6.000")]
    [Trait("Function", Function)][Trait("UTCID", "MergePurchaseOrders/UTCID04")][Trait("Type", "N")]
    public async Task UTCID04_SameProductDifferentPrice_AveragePrice()
    {
        var db = Db();
        var po1 = PurchaseData.AddPo(db, "PDN000001", "DRAFT", L(TestData.PTest, price: 5000));
        var po2 = PurchaseData.AddPo(db, "PDN000002", "DRAFT", L(TestData.PTest, price: 7000));
        var r = await Merge(db, PoSetup.User(), po1, po2);
        Assert.True(r.IsSuccess, r.Error);
        var line = Assert.Single(PurchaseData.Po(db, r.Value).DtlPurchaseOrderItems);
        Assert.Equal(20m, line.OrderedQty);
        Assert.Equal(6000m, line.UnitPrice);
    }

    [Fact(DisplayName = "MergePurchaseOrders/UTCID05 – giảm giá 1.000 + 2.000, ghi chú A và B: giảm 3.000, ghi chú \"A; B\"")]
    [Trait("Function", Function)][Trait("UTCID", "MergePurchaseOrders/UTCID05")][Trait("Type", "N")]
    public async Task UTCID05_DiscountsAndNotes_Combined()
    {
        var db = Db();
        var po1 = PurchaseData.AddPo(db, "PDN000001", "DRAFT", L(TestData.PTest), discount: 1000, notes: "A");
        var po2 = PurchaseData.AddPo(db, "PDN000002", "DRAFT", L(SalesData.PTest2), discount: 2000, notes: "B");
        var r = await Merge(db, PoSetup.User(), po1, po2);
        Assert.True(r.IsSuccess, r.Error);
        var merged = PurchaseData.Po(db, r.Value);
        Assert.Equal(3000m, merged.DiscountAmount);
        Assert.Equal("A; B", merged.Notes);
    }

    [Fact(DisplayName = "MergePurchaseOrders/UTCID06 – gộp 3 phiếu: 1 phiếu mới, 3 phiếu nguồn CANCELLED")]
    [Trait("Function", Function)][Trait("UTCID", "MergePurchaseOrders/UTCID06")][Trait("Type", "B")]
    public async Task UTCID06_ThreeOrders_Merged()
    {
        var db = Db();
        var ids = new[]
        {
            PurchaseData.AddPo(db, "PDN000001", "DRAFT", L(TestData.PTest)),
            PurchaseData.AddPo(db, "PDN000002", "DRAFT", L(SalesData.PTest2)),
            PurchaseData.AddPo(db, "PDN000003", "DRAFT", L(TestData.PTest, qty: 5)),
        };
        var r = await Merge(db, PoSetup.User(), ids);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(4, await db.TrxPurchaseOrders.CountAsync());
        Assert.All(ids, id => Assert.Equal("CANCELLED", PurchaseData.Po(db, id).Status));
    }

    [Fact(DisplayName = "MergePurchaseOrders/UTCID07 – ghi chú ghép dài hơn 500 ký tự: cắt còn 500")]
    [Trait("Function", Function)][Trait("UTCID", "MergePurchaseOrders/UTCID07")][Trait("Type", "B")]
    public async Task UTCID07_LongNotes_Truncated()
    {
        var db = Db();
        var po1 = PurchaseData.AddPo(db, "PDN000001", "DRAFT", L(TestData.PTest), notes: new string('a', 300));
        var po2 = PurchaseData.AddPo(db, "PDN000002", "DRAFT", L(SalesData.PTest2), notes: new string('b', 300));
        var r = await Merge(db, PoSetup.User(), po1, po2);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(500, PurchaseData.Po(db, r.Value).Notes!.Length);
    }

    [Fact(DisplayName = "MergePurchaseOrders/UTCID08 – không xác định người dùng")]
    [Trait("Function", Function)][Trait("UTCID", "MergePurchaseOrders/UTCID08")][Trait("Type", "A")]
    public async Task UTCID08_NoUser_ReturnsError()
    {
        var (db, po1, po2) = TwoDrafts();
        var r = await Merge(db, CurrentUser.WithoutUser(TestData.K001), po1, po2);
        await AssertMergeFails(db, r, "Không xác định được người dùng đăng nhập.");
    }

    [Fact(DisplayName = "MergePurchaseOrders/UTCID09 – PoIds [1, 1]")]
    [Trait("Function", Function)][Trait("UTCID", "MergePurchaseOrders/UTCID09")][Trait("Type", "B")]
    public async Task UTCID09_DuplicateIds_ReturnsError()
    {
        var (db, po1, _) = TwoDrafts();
        var r = await Merge(db, PoSetup.User(), po1, po1);
        await AssertMergeFails(db, r, "Cần chọn ít nhất 2 phiếu để gộp.");
    }

    [Fact(DisplayName = "MergePurchaseOrders/UTCID10 – PoIds [1]")]
    [Trait("Function", Function)][Trait("UTCID", "MergePurchaseOrders/UTCID10")][Trait("Type", "B")]
    public async Task UTCID10_SingleId_ReturnsError()
    {
        var (db, po1, _) = TwoDrafts();
        var r = await Merge(db, PoSetup.User(), po1);
        await AssertMergeFails(db, r, "Cần chọn ít nhất 2 phiếu để gộp.");
    }

    [Fact(DisplayName = "MergePurchaseOrders/UTCID11 – PoIds [1, 999]")]
    [Trait("Function", Function)][Trait("UTCID", "MergePurchaseOrders/UTCID11")][Trait("Type", "A")]
    public async Task UTCID11_UnknownId_ReturnsError()
    {
        var (db, po1, _) = TwoDrafts();
        var r = await Merge(db, PoSetup.User(), po1, 999);
        await AssertMergeFails(db, r, "Không tìm thấy một số phiếu đã chọn.");
    }

    [Fact(DisplayName = "MergePurchaseOrders/UTCID12 – không có quyền kho của PDN000001")]
    [Trait("Function", Function)][Trait("UTCID", "MergePurchaseOrders/UTCID12")][Trait("Type", "A")]
    public async Task UTCID12_NoWarehouseAccess_ReturnsError()
    {
        var (db, po1, po2) = TwoDrafts();
        var r = await Merge(db, CurrentUser.WithWarehouses(TestData.UserId, TestData.K002), po1, po2);
        await AssertMergeFails(db, r, "Bạn không có quyền thao tác trên kho của phiếu PDN000001.");
    }

    [Fact(DisplayName = "MergePurchaseOrders/UTCID13 – PDN000001 đang PARTIAL")]
    [Trait("Function", Function)][Trait("UTCID", "MergePurchaseOrders/UTCID13")][Trait("Type", "A")]
    public async Task UTCID13_PartialSource_ReturnsError()
    {
        var db = Db();
        var po1 = PurchaseData.AddPo(db, "PDN000001", "PARTIAL", L(TestData.PTest));
        var po2 = PurchaseData.AddPo(db, "PDN000002", "DRAFT", L(SalesData.PTest2));
        var r = await Merge(db, PoSetup.User(), po1, po2);
        await AssertMergeFails(db, r, "Phiếu PDN000001 không gộp được: chỉ gộp phiếu tạm hoặc phiếu đã đặt hàng chưa nhập.");
    }

    [Fact(DisplayName = "MergePurchaseOrders/UTCID14 – PDN000002 đã có phiếu nhập còn hiệu lực")]
    [Trait("Function", Function)][Trait("UTCID", "MergePurchaseOrders/UTCID14")][Trait("Type", "A")]
    public async Task UTCID14_SourceWithReceipt_ReturnsError()
    {
        var (db, po1, po2) = TwoDrafts();
        PurchaseData.AddReceipt(db, "PN000001", "DRAFT", L(SalesData.PTest2), poId: po2);
        var r = await Merge(db, PoSetup.User(), po1, po2);
        await AssertMergeFails(db, r, "Phiếu PDN000002 đã có phiếu nhập liên kết, không gộp được.");
    }

    [Fact(DisplayName = "MergePurchaseOrders/UTCID15 – khác nhà cung cấp")]
    [Trait("Function", Function)][Trait("UTCID", "MergePurchaseOrders/UTCID15")][Trait("Type", "A")]
    public async Task UTCID15_DifferentSuppliers_ReturnsError()
    {
        var db = Db();
        var po1 = PurchaseData.AddPo(db, "PDN000001", "DRAFT", L(TestData.PTest));
        var po2 = PurchaseData.AddPo(db, "PDN000002", "DRAFT", L(SalesData.PTest2), partnerId: PurchaseData.Supplier2);
        var r = await Merge(db, PoSetup.User(), po1, po2);
        await AssertMergeFails(db, r, "Chỉ gộp được các phiếu cùng nhà cung cấp.");
    }

    [Fact(DisplayName = "MergePurchaseOrders/UTCID16 – khác kho nhận hàng")]
    [Trait("Function", Function)][Trait("UTCID", "MergePurchaseOrders/UTCID16")][Trait("Type", "A")]
    public async Task UTCID16_DifferentWarehouses_ReturnsError()
    {
        var db = Db();
        var po1 = PurchaseData.AddPo(db, "PDN000001", "DRAFT", L(TestData.PTest));
        var po2 = PurchaseData.AddPo(db, "PDN000002", "DRAFT", L(SalesData.PTest2), warehouseId: TestData.K002);
        var r = await Merge(db, PoSetup.User(), po1, po2);
        await AssertMergeFails(db, r, "Chỉ gộp được các phiếu cùng chi nhánh nhận hàng.");
    }
}

/// <summary>
/// Report 5.1 – sheet ReceivePurchaseOrder (LucDT): nhập hàng ngay trên phiếu đặt (UC-31/UC-32). Handler gửi
/// CreatePurchaseCommand và GetPurchaseOrderByIdQuery qua ISender; mock ISender chuyển tiếp sang handler thật
/// (CreatePurchaseCommandHandler + InventoryLedger, PurchaseOrderQueryHandler) nên tồn kho, thẻ kho, trạng thái phiếu đặt được kiểm thật.
/// UTCID05 lỗi thời (P-01) – thay bằng UTCID09.
/// </summary>
public class ReceivePurchaseOrderTests
{
    private const string Function = "ReceivePurchaseOrder";

    private static ISender Sender(TestStockFlowDbContext db, ICurrentUserService user)
    {
        var sender = new Mock<ISender>();
        sender.Setup(s => s.Send(It.IsAny<CreatePurchaseCommand>(), It.IsAny<CancellationToken>()))
            .Returns((IRequest<Result<PurchaseDetailDto>> c, CancellationToken ct) =>
                new CreatePurchaseCommandHandler(db, user, new InventoryLedger(db)).Handle((CreatePurchaseCommand)c, ct));
        sender.Setup(s => s.Send(It.IsAny<GetPurchaseOrderByIdQuery>(), It.IsAny<CancellationToken>()))
            .Returns((IRequest<Result<PurchaseOrderDetailDto>> q, CancellationToken ct) =>
                new PurchaseOrderQueryHandler(db, user).Handle((GetPurchaseOrderByIdQuery)q, ct));
        return sender.Object;
    }

    /// <summary>PDN0001 ORDERED: P-TEST 100 × 10.000 tại K001; người dùng có quyền theo tham số (mặc định K001).</summary>
    private static async Task<(TestStockFlowDbContext Db, int PoId, Result<PurchaseOrderDetailDto> R)> Run(
        List<ReceivePurchaseOrderLine> lines, string poStatus = "ORDERED", string poCode = "PDN0001", int? userWarehouse = null)
    {
        var db = PurchaseData.Db();
        var poId = PurchaseData.AddPo(db, poCode, poStatus, new[] { (TestData.PTest, 100m, 10_000m) });
        var user = CurrentUser.WithWarehouses(TestData.UserId, userWarehouse ?? TestData.K001).Object;
        var handler = new ReceivePurchaseOrderCommandHandler(db, user, Sender(db, user));
        var r = await handler.Handle(
            new ReceivePurchaseOrderCommand(poId, new ReceivePurchaseOrderRequest(null, 0, null, null, lines)), CancellationToken.None);
        return (db, poId, r);
    }

    private static List<ReceivePurchaseOrderLine> Line(decimal accepted, decimal defect = 0, int productId = TestData.PTest) =>
        new() { new(productId, accepted, defect) };

    private static async Task AssertRejected(TestStockFlowDbContext db, Result<PurchaseOrderDetailDto> r, string message)
    {
        Assert.False(r.IsSuccess);
        Assert.Equal(message, r.Error);
        Assert.Empty(await db.TrxGoodsReceipts.AsNoTracking().ToListAsync());
        Assert.Equal(0, TestData.StockOf(db, TestData.K001));
    }

    [Fact(DisplayName = "ReceivePurchaseOrder/UTCID01 – nhận đủ 100: phiếu nhập COMPLETED, tồn +100, phiếu đặt COMPLETED")]
    [Trait("Function", Function)][Trait("UTCID", "ReceivePurchaseOrder/UTCID01")][Trait("Type", "N")]
    public async Task UTCID01_ReceiveAll_PoCompleted()
    {
        var (db, poId, r) = await Run(Line(100));
        Assert.True(r.IsSuccess, r.Error);
        var gr = await db.TrxGoodsReceipts.AsNoTracking().SingleAsync();
        Assert.Equal("COMPLETED", gr.Status);
        Assert.Equal(poId, gr.PurchaseOrderId);
        Assert.Equal(100, TestData.StockOf(db, TestData.K001));
        Assert.Equal("COMPLETED", PurchaseData.Po(db, poId).Status);
    }

    [Fact(DisplayName = "ReceivePurchaseOrder/UTCID02 – đạt 60, lỗi 5: tồn +60, ghi nhận lỗi 5, phiếu đặt PARTIAL")]
    [Trait("Function", Function)][Trait("UTCID", "ReceivePurchaseOrder/UTCID02")][Trait("Type", "N")]
    public async Task UTCID02_PartialWithDefect_PoPartial()
    {
        var (db, poId, r) = await Run(Line(60, 5));
        Assert.True(r.IsSuccess, r.Error);
        var gr = await db.TrxGoodsReceipts.AsNoTracking().Include(g => g.DtlGoodsReceiptItems).SingleAsync();
        Assert.Equal("COMPLETED", gr.Status);
        var line = Assert.Single(gr.DtlGoodsReceiptItems);
        Assert.Equal(60m, line.AcceptedQty);
        Assert.Equal(5m, line.DefectiveQty);
        Assert.Equal(60, TestData.StockOf(db, TestData.K001));
        Assert.Equal("PARTIAL", PurchaseData.Po(db, poId).Status);
    }

    [Fact(DisplayName = "ReceivePurchaseOrder/UTCID03 – không dòng nào có số lượng")]
    [Trait("Function", Function)][Trait("UTCID", "ReceivePurchaseOrder/UTCID03")][Trait("Type", "A")]
    public async Task UTCID03_NoQuantity_ReturnsError()
    {
        var (db, _, r) = await Run(Line(0));
        await AssertRejected(db, r, "Vui lòng nhập số lượng nhận của ít nhất 1 mặt hàng.");
    }

    [Fact(DisplayName = "ReceivePurchaseOrder/UTCID04 – SL đạt −1")]
    [Trait("Function", Function)][Trait("UTCID", "ReceivePurchaseOrder/UTCID04")][Trait("Type", "A")]
    public async Task UTCID04_NegativeQuantity_ReturnsError()
    {
        var (db, _, r) = await Run(Line(-1));
        await AssertRejected(db, r, "Số lượng đạt / lỗi không được âm.");
    }

    [Fact(DisplayName = "ReceivePurchaseOrder/UTCID05 – SL đạt 0, lỗi 5 (lỗi thời)",
        Skip = "OBSOLETE (P-01): code cho phép dòng toàn hàng lỗi (ReceivePurchaseOrderCommand.cs:60); thay bằng UTCID09.")]
    [Trait("Function", Function)][Trait("UTCID", "ReceivePurchaseOrder/UTCID05")][Trait("Type", "B")]
    public void UTCID05_Obsolete() { }

    [Fact(DisplayName = "ReceivePurchaseOrder/UTCID06 – mặt hàng không có trong phiếu đặt")]
    [Trait("Function", Function)][Trait("UTCID", "ReceivePurchaseOrder/UTCID06")][Trait("Type", "A")]
    public async Task UTCID06_ProductNotInPo_ReturnsError()
    {
        var (db, _, r) = await Run(Line(10, productId: SalesData.PTest2));
        await AssertRejected(db, r, "Mặt hàng không có trong phiếu đặt hàng nhập.");
    }

    [Fact(DisplayName = "ReceivePurchaseOrder/UTCID07 – PDN0002 đã hủy")]
    [Trait("Function", Function)][Trait("UTCID", "ReceivePurchaseOrder/UTCID07")][Trait("Type", "A")]
    public async Task UTCID07_CancelledPo_ReturnsError()
    {
        var (db, _, r) = await Run(Line(10), poStatus: "CANCELLED", poCode: "PDN0002");
        await AssertRejected(db, r, "Phiếu đặt hàng nhập PDN0002 không ở trạng thái chờ nhập hàng.");
    }

    [Fact(DisplayName = "ReceivePurchaseOrder/UTCID08 – người dùng chỉ có quyền K002")]
    [Trait("Function", Function)][Trait("UTCID", "ReceivePurchaseOrder/UTCID08")][Trait("Type", "A")]
    public async Task UTCID08_NoWarehouseAccess_ReturnsError()
    {
        var (db, _, r) = await Run(Line(10), userWarehouse: TestData.K002);
        await AssertRejected(db, r, "Bạn không có quyền nhập hàng vào kho của phiếu đặt này.");
    }

    [Fact(DisplayName = "ReceivePurchaseOrder/UTCID09 (thay UTCID05) – dòng toàn hàng lỗi: đạt 0 / lỗi 5, tồn không đổi, không ghi thẻ kho")]
    [Trait("Function", Function)][Trait("UTCID", "ReceivePurchaseOrder/UTCID09")][Trait("Type", "B")][Trait("Source", "Review P-01")]
    public async Task UTCID09_AllDefective_NoStockChange()
    {
        var (db, _, r) = await Run(Line(0, 5));
        Assert.True(r.IsSuccess, r.Error);
        var gr = await db.TrxGoodsReceipts.AsNoTracking().Include(g => g.DtlGoodsReceiptItems).SingleAsync();
        Assert.Equal("COMPLETED", gr.Status);
        var line = Assert.Single(gr.DtlGoodsReceiptItems);
        Assert.Equal(0m, line.AcceptedQty);
        Assert.Equal(5m, line.DefectiveQty);
        Assert.Equal(0, TestData.StockOf(db, TestData.K001));
        Assert.Empty(db.TrxInventoryTransactions.AsNoTracking());
    }
}
