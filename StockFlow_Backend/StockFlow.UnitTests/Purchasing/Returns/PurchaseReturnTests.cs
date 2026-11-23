using Microsoft.EntityFrameworkCore;
using Moq;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.PurchaseReturns.Commands;
using StockFlow.Application.Features.PurchaseReturns.DTOs;
using StockFlow.Domain.Entities;
using StockFlow.UnitTests.Common;
using StockFlow.UnitTests.Purchasing.Receipts;
using Xunit;

namespace StockFlow.UnitTests.Purchasing.Returns;

/// <summary>
/// Report 5.1 – sheet CreatePurchaseReturn (LucDT): lập phiếu trả hàng nhập theo phiếu nhập hoặc trả tự do (UC-33).
/// Phiếu nhập gốc: PN000001 COMPLETED, dòng P-TEST 10 × 6.000 tại K001 (tồn 10, công nợ NCC-01 = 60.000). Ca "Success" kiểm theo D.2.
/// </summary>
public class CreatePurchaseReturnTests
{
    private const string Function = "CreatePurchaseReturn";

    private static Mock<ICurrentUserService> User() => ReceiptSetup.User();

    private static SavePurchaseReturnRequest Req(int? grId, int? grItemId, decimal qty = 4, decimal price = 6000, string status = "DRAFT",
        decimal discount = 0, decimal refund = 0, int? warehouseId = null, int partnerId = PurchaseData.Supplier1, string? code = null,
        int productId = TestData.PTest, bool noItems = false) =>
        new(partnerId,
            noItems ? new List<PurchaseReturnItemRequest>() : new List<PurchaseReturnItemRequest> { new(productId, qty, price, grItemId) },
            warehouseId, grId, code, null, status, discount, refund);

    private static Task<Result<PurchaseReturnDetailDto>> Save(TestStockFlowDbContext db, SavePurchaseReturnRequest req,
        Mock<ICurrentUserService>? user = null) =>
        new SavePurchaseReturnHandler(db, (user ?? User()).Object).Handle(new CreatePurchaseReturnCommand(req), CancellationToken.None);

    private static async Task AssertRejected(TestStockFlowDbContext db, SavePurchaseReturnRequest req, string message,
        Mock<ICurrentUserService>? user = null, int existingReturns = 0)
    {
        var r = await Save(db, req, user);
        Assert.False(r.IsSuccess);
        Assert.Equal(message, r.Error);
        Assert.Equal(existingReturns, await db.TrxPurchaseReturns.CountAsync());
    }

    private static TrxPurchaseReturn Saved(TestStockFlowDbContext db, int id) =>
        db.TrxPurchaseReturns.AsNoTracking().Include(r => r.DtlPurchaseReturnItems).Single(r => r.PurchaseReturnId == id);

    [Fact(DisplayName = "CreatePurchaseReturn/UTCID01 – phiếu tạm theo phiếu nhập, trả 4: không đổi tồn, không đổi công nợ")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchaseReturn/UTCID01")][Trait("Type", "N")]
    public async Task UTCID01_Draft_NoPosting()
    {
        var (db, grId, itemId) = ReceiptSetup.Completed();
        var r = await Save(db, Req(grId, itemId));
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal("DRAFT", Saved(db, r.Value!.PurchaseReturnId).Status);
        Assert.Equal(10, TestData.StockOf(db, TestData.K001));
        Assert.Equal(60_000m, PurchaseData.Payable(db));
        Assert.Empty(db.TrxInventoryTransactions.AsNoTracking());
    }

    [Fact(DisplayName = "CreatePurchaseReturn/UTCID02 – hoàn thành trả 4 × 6.000: tồn −4 (OUTBOUND_PURCHASE_RETURN), tổng 24.000, công nợ −24.000")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchaseReturn/UTCID02")][Trait("Type", "N")]
    public async Task UTCID02_Completed_PostsStockAndPayable()
    {
        var (db, grId, itemId) = ReceiptSetup.Completed();
        var r = await Save(db, Req(grId, itemId, status: "COMPLETED"));
        Assert.True(r.IsSuccess, r.Error);
        var ret = Saved(db, r.Value!.PurchaseReturnId);
        Assert.Equal("COMPLETED", ret.Status);
        Assert.Equal(24_000m, ret.TotalAmount);
        Assert.Equal(6, TestData.StockOf(db, TestData.K001));
        var card = Assert.Single(TestData.CardEntries(db, "PURCHASE_RETURN", ret.PurchaseReturnId));
        Assert.Equal("OUTBOUND_PURCHASE_RETURN", card.TransactionType);
        Assert.Equal(-4, card.Quantity);
        Assert.Equal(36_000m, PurchaseData.Payable(db));
    }

    [Fact(DisplayName = "CreatePurchaseReturn/UTCID03 – NCC trả lại 10.000: RefundAmount 10.000, công nợ −14.000")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchaseReturn/UTCID03")][Trait("Type", "N")]
    public async Task UTCID03_WithRefund_PayableReducedByNet()
    {
        var (db, grId, itemId) = ReceiptSetup.Completed();
        var r = await Save(db, Req(grId, itemId, status: "COMPLETED", refund: 10_000));
        Assert.True(r.IsSuccess, r.Error);
        var ret = Saved(db, r.Value!.PurchaseReturnId);
        Assert.Equal(10_000m, ret.RefundAmount);
        Assert.Equal(46_000m, PurchaseData.Payable(db));
        Assert.Equal(10_000m, (await db.TrxFinancialTransactions.AsNoTracking().SingleAsync(t => t.TxType == "SUPPLIER_REFUND")).Amount);
    }

    [Fact(DisplayName = "CreatePurchaseReturn/UTCID04 – trả tự do tại kho 3: phiếu tạm")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchaseReturn/UTCID04")][Trait("Type", "N")]
    public async Task UTCID04_FreeReturn_Draft()
    {
        var (db, _, _) = ReceiptSetup.Completed();
        var r = await Save(db, Req(null, null, warehouseId: TestData.K001));
        Assert.True(r.IsSuccess, r.Error);
        var ret = Saved(db, r.Value!.PurchaseReturnId);
        Assert.Equal("DRAFT", ret.Status);
        Assert.Null(ret.GrId);
        Assert.Equal(TestData.K001, ret.WarehouseId);
    }

    [Fact(DisplayName = "CreatePurchaseReturn/UTCID05 – trả tự do không chọn kho: lấy kho được phân quyền (3)")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchaseReturn/UTCID05")][Trait("Type", "N")]
    public async Task UTCID05_FreeReturnNoWarehouse_UsesAuthorized()
    {
        var (db, _, _) = ReceiptSetup.Completed();
        var r = await Save(db, Req(null, null));
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(TestData.K001, Saved(db, r.Value!.PurchaseReturnId).WarehouseId);
    }

    [Fact(DisplayName = "CreatePurchaseReturn/UTCID06 – trả hết 10: tồn 0, công nợ −60.000, dòng phiếu nhập không còn SL trả")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchaseReturn/UTCID06")][Trait("Type", "B")]
    public async Task UTCID06_ReturnAll_NothingLeft()
    {
        var (db, grId, itemId) = ReceiptSetup.Completed();
        var r = await Save(db, Req(grId, itemId, qty: 10, status: "COMPLETED"));
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(0, TestData.StockOf(db, TestData.K001));
        Assert.Equal(0m, PurchaseData.Payable(db));
        var again = await Save(db, Req(grId, itemId, qty: 1));
        Assert.False(again.IsSuccess);
        Assert.Equal("Mặt hàng P-TEST chỉ còn được trả tối đa 0 (đã nhập 10).", again.Error);
    }

    [Fact(DisplayName = "CreatePurchaseReturn/UTCID07 – giá trả 0: phiếu tạm, tổng 0")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchaseReturn/UTCID07")][Trait("Type", "B")]
    public async Task UTCID07_ZeroPrice_TotalZero()
    {
        var (db, grId, itemId) = ReceiptSetup.Completed();
        var r = await Save(db, Req(grId, itemId, price: 0));
        Assert.True(r.IsSuccess, r.Error);
        var ret = Saved(db, r.Value!.PurchaseReturnId);
        Assert.Equal("DRAFT", ret.Status);
        Assert.Equal(0m, ret.TotalAmount);
    }

    [Fact(DisplayName = "CreatePurchaseReturn/UTCID08 – giảm giá và tiền trả 99.999.999: giảm giá chặn 24.000, tổng 0, refund 0, công nợ không đổi")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchaseReturn/UTCID08")][Trait("Type", "B")]
    public async Task UTCID08_HugeAmounts_Clamped()
    {
        var (db, grId, itemId) = ReceiptSetup.Completed();
        var r = await Save(db, Req(grId, itemId, status: "COMPLETED", discount: 99_999_999, refund: 99_999_999));
        Assert.True(r.IsSuccess, r.Error);
        var ret = Saved(db, r.Value!.PurchaseReturnId);
        Assert.Equal(24_000m, ret.DiscountAmount);
        Assert.Equal(0m, ret.TotalAmount);
        Assert.Equal(0m, ret.RefundAmount);
        Assert.Equal(60_000m, PurchaseData.Payable(db));
    }

    [Fact(DisplayName = "CreatePurchaseReturn/UTCID09 – không xác định người dùng")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchaseReturn/UTCID09")][Trait("Type", "A")]
    public async Task UTCID09_NoUser_ReturnsError()
    {
        var (db, grId, itemId) = ReceiptSetup.Completed();
        await AssertRejected(db, Req(grId, itemId), "Không xác định được người dùng đăng nhập.", CurrentUser.WithoutUser(TestData.K001));
    }

    [Fact(DisplayName = "CreatePurchaseReturn/UTCID10 – không có mặt hàng")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchaseReturn/UTCID10")][Trait("Type", "A")]
    public async Task UTCID10_NoItems_ReturnsError()
    {
        var (db, grId, itemId) = ReceiptSetup.Completed();
        await AssertRejected(db, Req(grId, itemId, noItems: true), "Phiếu trả hàng nhập phải có ít nhất 1 mặt hàng.");
    }

    [Fact(DisplayName = "CreatePurchaseReturn/UTCID11 – SL trả 0")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchaseReturn/UTCID11")][Trait("Type", "B")]
    public async Task UTCID11_ZeroQty_ReturnsError()
    {
        var (db, grId, itemId) = ReceiptSetup.Completed();
        await AssertRejected(db, Req(grId, itemId, qty: 0), "Số lượng trả của mỗi mặt hàng phải lớn hơn 0.");
    }

    [Fact(DisplayName = "CreatePurchaseReturn/UTCID12 – giá trả −1")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchaseReturn/UTCID12")][Trait("Type", "A")]
    public async Task UTCID12_NegativePrice_ReturnsError()
    {
        var (db, grId, itemId) = ReceiptSetup.Completed();
        await AssertRejected(db, Req(grId, itemId, price: -1), "Giá trả lại không được âm.");
    }

    [Fact(DisplayName = "CreatePurchaseReturn/UTCID13 – phiếu nhập 999 không tồn tại")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchaseReturn/UTCID13")][Trait("Type", "A")]
    public async Task UTCID13_UnknownReceipt_ReturnsError()
    {
        var (db, _, itemId) = ReceiptSetup.Completed();
        await AssertRejected(db, Req(999, itemId), "Không tìm thấy phiếu nhập #999.");
    }

    [Fact(DisplayName = "CreatePurchaseReturn/UTCID14 – phiếu nhập gốc còn là phiếu tạm")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchaseReturn/UTCID14")][Trait("Type", "A")]
    public async Task UTCID14_DraftReceipt_ReturnsError()
    {
        var db = PurchaseData.Db();
        var (grId, itemId) = PurchaseData.AddReceipt(db, "PN000001", "DRAFT", ReceiptSetup.TenAt6000);
        await AssertRejected(db, Req(grId, itemId), "Chỉ trả hàng được cho phiếu nhập đã nhập hàng.");
    }

    [Fact(DisplayName = "CreatePurchaseReturn/UTCID15 – trả tự do, không chọn kho, chưa được phân quyền kho nào")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchaseReturn/UTCID15")][Trait("Type", "A")]
    public async Task UTCID15_NoAuthorizedWarehouse_ReturnsError()
    {
        var (db, _, _) = ReceiptSetup.Completed();
        await AssertRejected(db, Req(null, null), "Bạn chưa được phân quyền kho nào.", CurrentUser.WithWarehouses(TestData.UserId));
    }

    [Fact(DisplayName = "CreatePurchaseReturn/UTCID16 – không có quyền kho của phiếu nhập")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchaseReturn/UTCID16")][Trait("Type", "A")]
    public async Task UTCID16_NoWarehouseAccess_ReturnsError()
    {
        var (db, grId, itemId) = ReceiptSetup.Completed();
        await AssertRejected(db, Req(grId, itemId), "Bạn không có quyền trả hàng từ kho này.", ReceiptSetup.OtherWarehouseUser());
    }

    [Fact(DisplayName = "CreatePurchaseReturn/UTCID17 – trả tự do, nhà cung cấp không tồn tại")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchaseReturn/UTCID17")][Trait("Type", "A")]
    public async Task UTCID17_UnknownPartner_ReturnsError()
    {
        var (db, _, _) = ReceiptSetup.Completed();
        await AssertRejected(db, Req(null, null, warehouseId: TestData.K001, partnerId: 999), "Vui lòng chọn nhà cung cấp.");
    }

    [Fact(DisplayName = "CreatePurchaseReturn/UTCID18 – mặt hàng không tồn tại")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchaseReturn/UTCID18")][Trait("Type", "A")]
    public async Task UTCID18_UnknownProduct_ReturnsError()
    {
        var (db, grId, itemId) = ReceiptSetup.Completed();
        await AssertRejected(db, Req(grId, itemId, productId: 999), "Một số mặt hàng không tồn tại trong danh mục.");
    }

    [Fact(DisplayName = "CreatePurchaseReturn/UTCID19 – GrItemId không thuộc phiếu nhập")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchaseReturn/UTCID19")][Trait("Type", "A")]
    public async Task UTCID19_ForeignGrItem_ReturnsError()
    {
        var (db, grId, _) = ReceiptSetup.Completed();
        await AssertRejected(db, Req(grId, 999), "Mặt hàng trả không thuộc phiếu nhập gốc.");
    }

    [Fact(DisplayName = "CreatePurchaseReturn/UTCID20 – mặt hàng khác với dòng phiếu nhập")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchaseReturn/UTCID20")][Trait("Type", "A")]
    public async Task UTCID20_ProductMismatch_ReturnsError()
    {
        var (db, grId, itemId) = ReceiptSetup.Completed();
        await AssertRejected(db, Req(grId, itemId, productId: SalesData.PTest2), "Mặt hàng trả không khớp với dòng phiếu nhập gốc.");
    }

    [Fact(DisplayName = "CreatePurchaseReturn/UTCID21 – đã trả 4, trả tiếp 7: chỉ còn 6")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchaseReturn/UTCID21")][Trait("Type", "B")]
    public async Task UTCID21_AboveRemaining_ReturnsError()
    {
        var (db, grId, itemId) = ReceiptSetup.Completed();
        PurchaseData.AddReturn(db, "THN000001", "COMPLETED", 4, 6000, grId, itemId);
        await AssertRejected(db, Req(grId, itemId, qty: 7), "Mặt hàng P-TEST chỉ còn được trả tối đa 6 (đã nhập 10).", existingReturns: 1);
    }

    [Fact(DisplayName = "CreatePurchaseReturn/UTCID22 – mã THN-EXIST đã dùng")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchaseReturn/UTCID22")][Trait("Type", "A")]
    public async Task UTCID22_DuplicateCode_ReturnsError()
    {
        var (db, grId, itemId) = ReceiptSetup.Completed();
        PurchaseData.AddReturn(db, "THN-EXIST", "CANCELLED", 1, 6000);
        await AssertRejected(db, Req(grId, itemId, code: "THN-EXIST"), "Mã phiếu trả hàng nhập 'THN-EXIST' đã tồn tại.", existingReturns: 1);
    }
}

/// <summary>Report 5.1 – sheet CancelPurchaseReturn (LucDT): hủy phiếu trả, nhập lại kho, cộng lại công nợ, hủy khoản NCC trả.</summary>
public class CancelPurchaseReturnTests
{
    private const string Function = "CancelPurchaseReturn";

    /// <summary>Phiếu trả tự do THN000001: P-TEST 4 × 6.000 (tổng 24.000) tại K001; tồn sau khi trả = 6.</summary>
    private static (TestStockFlowDbContext Db, int Id) Arrange(string status, decimal refund = 0, decimal payable = 36_000)
    {
        var db = PurchaseData.Db(supplier1Payable: payable);
        TestData.SetStock(db, TestData.K001, TestData.PTest, 6, 6000);
        return (db, PurchaseData.AddReturn(db, "THN000001", status, 4, 6000, refund: refund));
    }

    private static Task<Result<bool>> Cancel(TestStockFlowDbContext db, int id, Mock<ICurrentUserService>? user = null) =>
        new CancelPurchaseReturnHandler(db, (user ?? ReceiptSetup.User()).Object)
            .Handle(new CancelPurchaseReturnCommand(id), CancellationToken.None);

    private static string StatusOf(TestStockFlowDbContext db, int id) =>
        db.TrxPurchaseReturns.AsNoTracking().Single(r => r.PurchaseReturnId == id).Status!;

    [Fact(DisplayName = "CancelPurchaseReturn/UTCID01 – phiếu tạm: CANCELLED, không đổi tồn")]
    [Trait("Function", Function)][Trait("UTCID", "CancelPurchaseReturn/UTCID01")][Trait("Type", "N")]
    public async Task UTCID01_Draft_Cancelled()
    {
        var (db, id) = Arrange("DRAFT");
        var r = await Cancel(db, id);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal("CANCELLED", StatusOf(db, id));
        Assert.Equal(6, TestData.StockOf(db, TestData.K001));
        Assert.Empty(db.TrxInventoryTransactions.AsNoTracking());
    }

    [Fact(DisplayName = "CancelPurchaseReturn/UTCID02 – phiếu hoàn thành 24.000: tồn +4 (PURCHASE_RETURN_CANCEL), công nợ +24.000")]
    [Trait("Function", Function)][Trait("UTCID", "CancelPurchaseReturn/UTCID02")][Trait("Type", "N")]
    public async Task UTCID02_Completed_Reversed()
    {
        var (db, id) = Arrange("COMPLETED");
        var r = await Cancel(db, id);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal("CANCELLED", StatusOf(db, id));
        Assert.Equal(10, TestData.StockOf(db, TestData.K001));
        var card = Assert.Single(TestData.CardEntries(db, "PURCHASE_RETURN", id));
        Assert.Equal("PURCHASE_RETURN_CANCEL", card.TransactionType);
        Assert.Equal(4, card.Quantity);
        Assert.Equal(60_000m, PurchaseData.Payable(db));
    }

    [Fact(DisplayName = "CancelPurchaseReturn/UTCID03 – NCC đã trả 10.000: công nợ +14.000, khoản trả bị hủy")]
    [Trait("Function", Function)][Trait("UTCID", "CancelPurchaseReturn/UTCID03")][Trait("Type", "N")]
    public async Task UTCID03_CompletedWithRefund_RefundCancelled()
    {
        var (db, id) = Arrange("COMPLETED", refund: 10_000, payable: 46_000);
        var r = await Cancel(db, id);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(60_000m, PurchaseData.Payable(db));
        Assert.Equal("CANCELLED", (await db.TrxFinancialTransactions.AsNoTracking().SingleAsync(t => t.TxType == "SUPPLIER_REFUND")).Status);
    }

    [Fact(DisplayName = "CancelPurchaseReturn/UTCID04 – phiếu đã hủy")]
    [Trait("Function", Function)][Trait("UTCID", "CancelPurchaseReturn/UTCID04")][Trait("Type", "A")]
    public async Task UTCID04_AlreadyCancelled_ReturnsError()
    {
        var (db, id) = Arrange("CANCELLED");
        var r = await Cancel(db, id);
        Assert.False(r.IsSuccess);
        Assert.Equal("Phiếu trả hàng nhập này đã bị hủy trước đó.", r.Error);
    }

    [Fact(DisplayName = "CancelPurchaseReturn/UTCID05 – phiếu 999 không tồn tại")]
    [Trait("Function", Function)][Trait("UTCID", "CancelPurchaseReturn/UTCID05")][Trait("Type", "A")]
    public async Task UTCID05_UnknownReturn_ReturnsError()
    {
        var (db, _) = Arrange("DRAFT");
        var r = await Cancel(db, 999);
        Assert.False(r.IsSuccess);
        Assert.Equal("Không tìm thấy phiếu trả hàng nhập #999.", r.Error);
    }

    [Fact(DisplayName = "CancelPurchaseReturn/UTCID06 – không có quyền kho của phiếu")]
    [Trait("Function", Function)][Trait("UTCID", "CancelPurchaseReturn/UTCID06")][Trait("Type", "A")]
    public async Task UTCID06_NoWarehouseAccess_ReturnsError()
    {
        var (db, id) = Arrange("DRAFT");
        var r = await Cancel(db, id, ReceiptSetup.OtherWarehouseUser());
        Assert.False(r.IsSuccess);
        Assert.Equal("Bạn không có quyền truy cập phiếu trả hàng của kho này.", r.Error);
        Assert.Equal("DRAFT", StatusOf(db, id));
    }

    [Fact(DisplayName = "CancelPurchaseReturn/UTCID07 – không xác định người dùng")]
    [Trait("Function", Function)][Trait("UTCID", "CancelPurchaseReturn/UTCID07")][Trait("Type", "A")]
    public async Task UTCID07_NoUser_ReturnsError()
    {
        var (db, id) = Arrange("DRAFT");
        var r = await Cancel(db, id, CurrentUser.WithoutUser(TestData.K001));
        Assert.False(r.IsSuccess);
        Assert.Equal("Không xác định được người dùng đăng nhập.", r.Error);
        Assert.Equal("DRAFT", StatusOf(db, id));
    }
}

/// <summary>
/// Report 5.1 – sheet CreateRefund (LucDT): ghi nhận NCC trả tiền cho phiếu trả hàng nhập đã hoàn thành.
/// Workbook "mock remaining = 24.000" → phiếu trả tự do THN000001 tổng 24.000, chưa trả (không có phiếu nhập gốc nên không bù trừ).
/// </summary>
public class CreateRefundTests
{
    private const string Function = "CreateRefund";

    private static (TestStockFlowDbContext Db, int Id) Arrange(string status = "COMPLETED", int partnerId = PurchaseData.Supplier1)
    {
        var db = PurchaseData.Db();
        return (db, PurchaseData.AddReturn(db, "THN000001", status, 4, 6000, partnerId: partnerId));
    }

    private static Task<Result<PurchaseReturnDetailDto>> Refund(TestStockFlowDbContext db, int id, decimal amount, string? method = null,
        Mock<ICurrentUserService>? user = null) =>
        new CreateSupplierRefundHandler(db, (user ?? ReceiptSetup.User()).Object)
            .Handle(new CreateSupplierRefundCommand(id, new CreateSupplierRefundRequest(amount, method)), CancellationToken.None);

    private static List<TrxFinancialTransaction> Refunds(TestStockFlowDbContext db) =>
        db.TrxFinancialTransactions.AsNoTracking().Where(t => t.TxType == "SUPPLIER_REFUND").ToList();

    private static async Task AssertRejected(TestStockFlowDbContext db, int id, decimal amount, string message,
        Mock<ICurrentUserService>? user = null)
    {
        var r = await Refund(db, id, amount, user: user);
        Assert.False(r.IsSuccess);
        Assert.Equal(message, r.Error);
        Assert.Empty(Refunds(db));
    }

    [Fact(DisplayName = "CreateRefund/UTCID01 – NCC trả 10.000: SUPPLIER_REFUND 10.000 CASH, công nợ +10.000")]
    [Trait("Function", Function)][Trait("UTCID", "CreateRefund/UTCID01")][Trait("Type", "N")]
    public async Task UTCID01_Refund_Recorded()
    {
        var (db, id) = Arrange();
        var r = await Refund(db, id, 10_000);
        Assert.True(r.IsSuccess, r.Error);
        var tx = Assert.Single(Refunds(db));
        Assert.Equal(10_000m, tx.Amount);
        Assert.Equal("CASH", tx.PaymentMethod);
        Assert.StartsWith("PT", tx.TxCode);
        Assert.Equal(10_000m, PurchaseData.Payable(db));
    }

    [Fact(DisplayName = "CreateRefund/UTCID02 – phương thức \" bank_transfer \": BANK_TRANSFER")]
    [Trait("Function", Function)][Trait("UTCID", "CreateRefund/UTCID02")][Trait("Type", "N")]
    public async Task UTCID02_PaymentMethod_Normalized()
    {
        var (db, id) = Arrange();
        var r = await Refund(db, id, 10_000, " bank_transfer ");
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal("BANK_TRANSFER", Assert.Single(Refunds(db)).PaymentMethod);
    }

    [Fact(DisplayName = "CreateRefund/UTCID03 – số tiền 1.000,4: làm tròn 1.000")]
    [Trait("Function", Function)][Trait("UTCID", "CreateRefund/UTCID03")][Trait("Type", "N")]
    public async Task UTCID03_Amount_Rounded()
    {
        var (db, id) = Arrange();
        var r = await Refund(db, id, 1000.4m);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(1000m, Assert.Single(Refunds(db)).Amount);
    }

    [Fact(DisplayName = "CreateRefund/UTCID04 – thu đủ 24.000: số còn phải trả = 0")]
    [Trait("Function", Function)][Trait("UTCID", "CreateRefund/UTCID04")][Trait("Type", "B")]
    public async Task UTCID04_FullRemaining_Settled()
    {
        var (db, id) = Arrange();
        var r = await Refund(db, id, 24_000);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(24_000m, db.TrxPurchaseReturns.AsNoTracking().Single().RefundAmount);
        var more = await Refund(db, id, 1);
        Assert.False(more.IsSuccess);
        Assert.Equal("Số tiền vượt quá số nhà cung cấp còn phải trả (0).", more.Error);
    }

    [Fact(DisplayName = "CreateRefund/UTCID05 – số tiền 0")]
    [Trait("Function", Function)][Trait("UTCID", "CreateRefund/UTCID05")][Trait("Type", "B")]
    public async Task UTCID05_Zero_ReturnsError()
    {
        var (db, id) = Arrange();
        await AssertRejected(db, id, 0, "Số tiền nhà cung cấp trả phải lớn hơn 0.");
    }

    [Fact(DisplayName = "CreateRefund/UTCID06 – số tiền −1")]
    [Trait("Function", Function)][Trait("UTCID", "CreateRefund/UTCID06")][Trait("Type", "A")]
    public async Task UTCID06_Negative_ReturnsError()
    {
        var (db, id) = Arrange();
        await AssertRejected(db, id, -1, "Số tiền nhà cung cấp trả phải lớn hơn 0.");
    }

    [Fact(DisplayName = "CreateRefund/UTCID07 – số tiền 24.001 > 24.000 còn phải trả")]
    [Trait("Function", Function)][Trait("UTCID", "CreateRefund/UTCID07")][Trait("Type", "B")]
    public async Task UTCID07_AboveRemaining_ReturnsError()
    {
        var (db, id) = Arrange();
        await AssertRejected(db, id, 24_001, "Số tiền vượt quá số nhà cung cấp còn phải trả (24.000).");
    }

    [Fact(DisplayName = "CreateRefund/UTCID08 – phiếu trả còn là phiếu tạm")]
    [Trait("Function", Function)][Trait("UTCID", "CreateRefund/UTCID08")][Trait("Type", "A")]
    public async Task UTCID08_Draft_ReturnsError()
    {
        var (db, id) = Arrange("DRAFT");
        await AssertRejected(db, id, 10_000, "Chỉ thu tiền được cho phiếu trả hàng nhập đã hoàn thành.");
    }

    [Fact(DisplayName = "CreateRefund/UTCID09 – phiếu trả đã hủy")]
    [Trait("Function", Function)][Trait("UTCID", "CreateRefund/UTCID09")][Trait("Type", "A")]
    public async Task UTCID09_Cancelled_ReturnsError()
    {
        var (db, id) = Arrange("CANCELLED");
        await AssertRejected(db, id, 10_000, "Chỉ thu tiền được cho phiếu trả hàng nhập đã hoàn thành.");
    }

    [Fact(DisplayName = "CreateRefund/UTCID10 – phiếu trả 999 không tồn tại")]
    [Trait("Function", Function)][Trait("UTCID", "CreateRefund/UTCID10")][Trait("Type", "A")]
    public async Task UTCID10_UnknownReturn_ReturnsError()
    {
        var (db, _) = Arrange();
        await AssertRejected(db, 999, 10_000, "Không tìm thấy phiếu trả hàng nhập #999.");
    }

    [Fact(DisplayName = "CreateRefund/UTCID11 – không có quyền kho của phiếu")]
    [Trait("Function", Function)][Trait("UTCID", "CreateRefund/UTCID11")][Trait("Type", "A")]
    public async Task UTCID11_NoWarehouseAccess_ReturnsError()
    {
        var (db, id) = Arrange();
        await AssertRejected(db, id, 10_000, "Bạn không có quyền truy cập phiếu trả hàng của kho này.", ReceiptSetup.OtherWarehouseUser());
    }

    [Fact(DisplayName = "CreateRefund/UTCID12 – không xác định người dùng")]
    [Trait("Function", Function)][Trait("UTCID", "CreateRefund/UTCID12")][Trait("Type", "A")]
    public async Task UTCID12_NoUser_ReturnsError()
    {
        var (db, id) = Arrange();
        await AssertRejected(db, id, 10_000, "Không xác định được người dùng đăng nhập.", CurrentUser.WithoutUser(TestData.K001));
    }

    [Fact(DisplayName = "CreateRefund/UTCID13 – không còn dòng nhà cung cấp của phiếu trả")]
    [Trait("Function", Function)][Trait("UTCID", "CreateRefund/UTCID13")][Trait("Type", "A")]
    public async Task UTCID13_MissingSupplier_ReturnsError()
    {
        var (db, id) = Arrange(partnerId: 999);
        await AssertRejected(db, id, 10_000, "Không tìm thấy nhà cung cấp của phiếu trả.");
    }
}
