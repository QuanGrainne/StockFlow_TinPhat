using Microsoft.EntityFrameworkCore;
using Moq;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.PurchaseOrders.Commands;
using StockFlow.Application.Features.PurchaseOrders.DTOs;
using StockFlow.Domain.Entities;
using StockFlow.UnitTests.Common;
using Xunit;

namespace StockFlow.UnitTests.Purchasing.PurchaseOrders;

internal static class PoSetup
{
    public static readonly (int, decimal, decimal)[] OneLine = { (TestData.PTest, 10m, 5000m) };

    public static PurchaseOrderCommandHandler Handler(TestStockFlowDbContext db, Mock<ICurrentUserService> user) => new(db, user.Object);

    /// <summary>Người dùng 1 có quyền K001, K002 (authorized = [3, 4]); thêm kho khác qua tham số.</summary>
    public static Mock<ICurrentUserService> User(params int[] extra) =>
        CurrentUser.WithWarehouses(TestData.UserId, new[] { TestData.K001, TestData.K002 }.Concat(extra).ToArray());

    public static CreatePurchaseOrderRequest Req(
        int? warehouseId = TestData.K001, int partnerId = PurchaseData.Supplier1, string status = "DRAFT", string? code = null,
        decimal discount = 0, List<PurchaseOrderItemRequest>? items = null) =>
        new(warehouseId, partnerId, null, status, null,
            items ?? new List<PurchaseOrderItemRequest> { new(TestData.PTest, 10, 5000) }, code, discount);

    public static List<PurchaseOrderItemRequest> Line(decimal qty = 10, decimal price = 5000, int productId = TestData.PTest) =>
        new() { new(productId, qty, price) };
}

/// <summary>Report 5.1 – sheet CreatePurchaseOrder (LucDT): lập phiếu đặt hàng nhập (UC-30, BR-04, BR-22). Ca "Success" kiểm theo D.2.</summary>
public class CreatePurchaseOrderTests
{
    private const string Function = "CreatePurchaseOrder";

    private static async Task<(TestStockFlowDbContext Db, Result<int> R)> Run(
        CreatePurchaseOrderRequest req, Mock<ICurrentUserService>? user = null)
    {
        var db = PurchaseData.Db();
        var r = await PoSetup.Handler(db, user ?? PoSetup.User()).Handle(new CreatePurchaseOrderCommand(req), CancellationToken.None);
        return (db, r);
    }

    private static async Task<TrxPurchaseOrder> Saved(TestStockFlowDbContext db, int id) =>
        await db.TrxPurchaseOrders.AsNoTracking().Include(p => p.DtlPurchaseOrderItems).SingleAsync(p => p.PoId == id);

    private static async Task AssertFails(CreatePurchaseOrderRequest req, string message, Mock<ICurrentUserService>? user = null)
    {
        var (db, r) = await Run(req, user);
        Assert.False(r.IsSuccess);
        Assert.Equal(message, r.Error);
        Assert.Empty(db.TrxPurchaseOrders.AsNoTracking());
    }

    [Fact(DisplayName = "CreatePurchaseOrder/UTCID01 – DRAFT, 10 × 5.000: tổng 50.000, mã sinh từ sequence")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchaseOrder/UTCID01")][Trait("Type", "N")]
    public async Task UTCID01_Draft_Created()
    {
        var (db, r) = await Run(PoSetup.Req());
        Assert.True(r.IsSuccess, r.Error);
        Assert.True(r.Value > 0);
        var po = await Saved(db, r.Value);
        Assert.Equal("DRAFT", po.Status);
        Assert.Equal("PDN000001", po.PoCode);
        Assert.Equal(50_000m, po.TotalAmount);
        Assert.Equal(0m, po.DiscountAmount);
        var line = Assert.Single(po.DtlPurchaseOrderItems);
        Assert.Equal(10m, line.OrderedQty);
        Assert.Equal(5000m, line.UnitPrice);
    }

    [Fact(DisplayName = "CreatePurchaseOrder/UTCID02 – Status ORDERED")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchaseOrder/UTCID02")][Trait("Type", "N")]
    public async Task UTCID02_Ordered_Created()
    {
        var (db, r) = await Run(PoSetup.Req(status: "ORDERED"));
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal("ORDERED", (await Saved(db, r.Value)).Status);
    }

    [Fact(DisplayName = "CreatePurchaseOrder/UTCID03 – mã \" pdn-new \": lưu PDN-NEW")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchaseOrder/UTCID03")][Trait("Type", "N")]
    public async Task UTCID03_CustomCode_TrimmedUpper()
    {
        var (db, r) = await Run(PoSetup.Req(code: " pdn-new "));
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal("PDN-NEW", (await Saved(db, r.Value)).PoCode);
    }

    [Fact(DisplayName = "CreatePurchaseOrder/UTCID04 – không chọn kho: lấy kho đầu tiên được phân quyền (3)")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchaseOrder/UTCID04")][Trait("Type", "N")]
    public async Task UTCID04_NoWarehouse_UsesFirstAuthorized()
    {
        var (db, r) = await Run(PoSetup.Req(warehouseId: null));
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(TestData.K001, (await Saved(db, r.Value)).WarehouseId);
    }

    [Fact(DisplayName = "CreatePurchaseOrder/UTCID05 – đối tác loại BOTH")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchaseOrder/UTCID05")][Trait("Type", "N")]
    public async Task UTCID05_BothPartner_Accepted()
    {
        var (db, r) = await Run(PoSetup.Req(partnerId: PurchaseData.BothPartner));
        Assert.True(r.IsSuccess, r.Error);
        var po = await Saved(db, r.Value);
        Assert.Equal(PurchaseData.BothPartner, po.PartnerId);
        Assert.Equal("DRAFT", po.Status);
    }

    [Fact(DisplayName = "CreatePurchaseOrder/UTCID06 – giảm giá 10.000: tổng 40.000")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchaseOrder/UTCID06")][Trait("Type", "N")]
    public async Task UTCID06_Discount_Applied()
    {
        var (db, r) = await Run(PoSetup.Req(discount: 10_000));
        Assert.True(r.IsSuccess, r.Error);
        var po = await Saved(db, r.Value);
        Assert.Equal(10_000m, po.DiscountAmount);
        Assert.Equal(40_000m, po.TotalAmount);
    }

    [Fact(DisplayName = "CreatePurchaseOrder/UTCID07 – SL 0,01: tổng 50 (làm tròn đồng)")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchaseOrder/UTCID07")][Trait("Type", "B")]
    public async Task UTCID07_SmallQty_Rounded()
    {
        var (db, r) = await Run(PoSetup.Req(items: PoSetup.Line(qty: 0.01m)));
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(50m, (await Saved(db, r.Value)).TotalAmount);
    }

    [Fact(DisplayName = "CreatePurchaseOrder/UTCID08 – đơn giá 0: tổng 0, phiếu vẫn lưu")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchaseOrder/UTCID08")][Trait("Type", "B")]
    public async Task UTCID08_ZeroPrice_Saved()
    {
        var (db, r) = await Run(PoSetup.Req(items: PoSetup.Line(price: 0)));
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(0m, (await Saved(db, r.Value)).TotalAmount);
    }

    [Fact(DisplayName = "CreatePurchaseOrder/UTCID09 – giảm giá 9.000 > tiền hàng 5.000: giảm giá chặn 5.000, tổng 0")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchaseOrder/UTCID09")][Trait("Type", "B")]
    public async Task UTCID09_DiscountAboveGoods_Clamped()
    {
        var (db, r) = await Run(PoSetup.Req(discount: 9000, items: PoSetup.Line(qty: 1)));
        Assert.True(r.IsSuccess, r.Error);
        var po = await Saved(db, r.Value);
        Assert.Equal(5000m, po.DiscountAmount);
        Assert.Equal(0m, po.TotalAmount);
    }

    [Fact(DisplayName = "CreatePurchaseOrder/UTCID10 – Status \"ABC\": lưu thành phiếu tạm (DRAFT)")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchaseOrder/UTCID10")][Trait("Type", "A")]
    public async Task UTCID10_UnknownStatus_SavedAsDraft()
    {
        var (db, r) = await Run(PoSetup.Req(status: "ABC"));
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal("DRAFT", (await Saved(db, r.Value)).Status);
    }

    [Fact(DisplayName = "CreatePurchaseOrder/UTCID11 – không xác định người dùng")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchaseOrder/UTCID11")][Trait("Type", "A")]
    public Task UTCID11_NoUser_ReturnsError() =>
        AssertFails(PoSetup.Req(), "Không xác định được người dùng đăng nhập.", CurrentUser.WithoutUser(TestData.K001, TestData.K002));

    [Fact(DisplayName = "CreatePurchaseOrder/UTCID12 – không có mặt hàng")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchaseOrder/UTCID12")][Trait("Type", "A")]
    public Task UTCID12_NoItems_ReturnsError() =>
        AssertFails(PoSetup.Req(items: new List<PurchaseOrderItemRequest>()), "Phiếu đặt hàng nhập phải có ít nhất 1 mặt hàng.");

    [Fact(DisplayName = "CreatePurchaseOrder/UTCID13 – SL 0")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchaseOrder/UTCID13")][Trait("Type", "B")]
    public Task UTCID13_ZeroQty_ReturnsError() =>
        AssertFails(PoSetup.Req(items: PoSetup.Line(qty: 0)), "Số lượng đặt phải lớn hơn 0.");

    [Fact(DisplayName = "CreatePurchaseOrder/UTCID14 – đơn giá −1")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchaseOrder/UTCID14")][Trait("Type", "A")]
    public Task UTCID14_NegativePrice_ReturnsError() =>
        AssertFails(PoSetup.Req(items: PoSetup.Line(price: -1)), "Đơn giá không được âm.");

    [Fact(DisplayName = "CreatePurchaseOrder/UTCID15 – 2 dòng cùng mặt hàng")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchaseOrder/UTCID15")][Trait("Type", "A")]
    public Task UTCID15_DuplicateProduct_ReturnsError() =>
        AssertFails(PoSetup.Req(items: new List<PurchaseOrderItemRequest> { new(TestData.PTest, 10, 5000), new(TestData.PTest, 5, 5000) }),
            "Một mặt hàng chỉ được xuất hiện 1 dòng trong phiếu.");

    [Fact(DisplayName = "CreatePurchaseOrder/UTCID16 – không chọn kho, chưa được phân quyền kho nào")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchaseOrder/UTCID16")][Trait("Type", "A")]
    public Task UTCID16_NoAuthorizedWarehouse_ReturnsError() =>
        AssertFails(PoSetup.Req(warehouseId: null), "Bạn chưa được phân quyền kho nào.", CurrentUser.WithWarehouses(TestData.UserId));

    [Fact(DisplayName = "CreatePurchaseOrder/UTCID17 – không có quyền kho 3")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchaseOrder/UTCID17")][Trait("Type", "A")]
    public Task UTCID17_NoWarehouseAccess_ReturnsError() =>
        AssertFails(PoSetup.Req(), "Bạn không có quyền đặt hàng cho kho này.", CurrentUser.WithWarehouses(TestData.UserId, TestData.K002));

    [Fact(DisplayName = "CreatePurchaseOrder/UTCID18 – kho 999 không tồn tại")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchaseOrder/UTCID18")][Trait("Type", "A")]
    public Task UTCID18_UnknownWarehouse_ReturnsError() =>
        AssertFails(PoSetup.Req(warehouseId: 999), "Không tìm thấy kho hàng ID #999.", PoSetup.User(999));

    [Fact(DisplayName = "CreatePurchaseOrder/UTCID19 – đối tác loại CUSTOMER")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchaseOrder/UTCID19")][Trait("Type", "A")]
    public Task UTCID19_CustomerPartner_ReturnsError() =>
        AssertFails(PoSetup.Req(partnerId: PurchaseData.Customer), "Không tìm thấy nhà cung cấp.");

    [Fact(DisplayName = "CreatePurchaseOrder/UTCID20 – nhà cung cấp không tồn tại")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchaseOrder/UTCID20")][Trait("Type", "A")]
    public Task UTCID20_UnknownPartner_ReturnsError() =>
        AssertFails(PoSetup.Req(partnerId: 999), "Không tìm thấy nhà cung cấp.");

    [Fact(DisplayName = "CreatePurchaseOrder/UTCID21 – hàng hóa không tồn tại")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchaseOrder/UTCID21")][Trait("Type", "A")]
    public Task UTCID21_UnknownProduct_ReturnsError() =>
        AssertFails(PoSetup.Req(items: PoSetup.Line(productId: 999)), "Một số hàng hóa trong phiếu không tồn tại trong danh mục.");

    [Fact(DisplayName = "CreatePurchaseOrder/UTCID22 – mã PDN-EXIST đã dùng")]
    [Trait("Function", Function)][Trait("UTCID", "CreatePurchaseOrder/UTCID22")][Trait("Type", "A")]
    public async Task UTCID22_DuplicateCode_ReturnsError()
    {
        var db = PurchaseData.Db();
        PurchaseData.AddPo(db, "PDN-EXIST", "DRAFT", PoSetup.OneLine);
        var r = await PoSetup.Handler(db, PoSetup.User()).Handle(new CreatePurchaseOrderCommand(PoSetup.Req(code: "PDN-EXIST")), CancellationToken.None);
        Assert.False(r.IsSuccess);
        Assert.Equal("Mã phiếu đặt hàng nhập 'PDN-EXIST' đã tồn tại.", r.Error);
        Assert.Single(db.TrxPurchaseOrders.AsNoTracking());
    }
}

/// <summary>Report 5.1 – sheet CancelPurchaseOrder (LucDT): hủy phiếu đặt chưa có phiếu nhập còn hiệu lực (BR-22).</summary>
public class CancelPurchaseOrderTests
{
    private const string Function = "CancelPurchaseOrder";

    private static async Task<(TestStockFlowDbContext Db, int PoId, Result<bool> R)> Run(
        string status, string? receiptStatus = null, Mock<ICurrentUserService>? user = null, bool missing = false)
    {
        var db = PurchaseData.Db();
        var poId = PurchaseData.AddPo(db, "PDN000001", status, PoSetup.OneLine);
        if (receiptStatus != null)
            PurchaseData.AddReceipt(db, "PN000001", receiptStatus, new[] { (TestData.PTest, 10m, 5000m) }, poId: poId);
        var r = await PoSetup.Handler(db, user ?? PoSetup.User())
            .Handle(new CancelPurchaseOrderCommand(missing ? 999 : poId), CancellationToken.None);
        return (db, poId, r);
    }

    private static async Task AssertCancelled(string status)
    {
        var (db, poId, r) = await Run(status);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal("CANCELLED", PurchaseData.Po(db, poId).Status);
    }

    [Fact(DisplayName = "CancelPurchaseOrder/UTCID01 – phiếu DRAFT chưa có phiếu nhập: CANCELLED")]
    [Trait("Function", Function)][Trait("UTCID", "CancelPurchaseOrder/UTCID01")][Trait("Type", "N")]
    public Task UTCID01_Draft_Cancelled() => AssertCancelled("DRAFT");

    [Fact(DisplayName = "CancelPurchaseOrder/UTCID02 – phiếu ORDERED chưa có phiếu nhập: CANCELLED")]
    [Trait("Function", Function)][Trait("UTCID", "CancelPurchaseOrder/UTCID02")][Trait("Type", "N")]
    public Task UTCID02_Ordered_Cancelled() => AssertCancelled("ORDERED");

    [Fact(DisplayName = "CancelPurchaseOrder/UTCID03 – chỉ có phiếu nhập đã hủy: vẫn hủy được")]
    [Trait("Function", Function)][Trait("UTCID", "CancelPurchaseOrder/UTCID03")][Trait("Type", "B")]
    public async Task UTCID03_OnlyCancelledReceipts_Cancelled()
    {
        var (db, poId, r) = await Run("ORDERED", receiptStatus: "CANCELLED");
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal("CANCELLED", PurchaseData.Po(db, poId).Status);
    }

    [Fact(DisplayName = "CancelPurchaseOrder/UTCID04 – phiếu đã hủy")]
    [Trait("Function", Function)][Trait("UTCID", "CancelPurchaseOrder/UTCID04")][Trait("Type", "A")]
    public async Task UTCID04_AlreadyCancelled_ReturnsError()
    {
        var (_, _, r) = await Run("CANCELLED");
        Assert.False(r.IsSuccess);
        Assert.Equal("Phiếu đã hủy trước đó.", r.Error);
    }

    [Fact(DisplayName = "CancelPurchaseOrder/UTCID05 – có phiếu nhập còn hiệu lực")]
    [Trait("Function", Function)][Trait("UTCID", "CancelPurchaseOrder/UTCID05")][Trait("Type", "A")]
    public async Task UTCID05_ActiveReceipt_ReturnsError()
    {
        var (db, poId, r) = await Run("ORDERED", receiptStatus: "COMPLETED");
        Assert.False(r.IsSuccess);
        Assert.Equal("Phiếu đã có phiếu nhập liên kết. Hãy hủy các phiếu nhập đó trước.", r.Error);
        Assert.Equal("ORDERED", PurchaseData.Po(db, poId).Status);
    }

    [Fact(DisplayName = "CancelPurchaseOrder/UTCID06 – phiếu không tồn tại")]
    [Trait("Function", Function)][Trait("UTCID", "CancelPurchaseOrder/UTCID06")][Trait("Type", "A")]
    public async Task UTCID06_UnknownPo_ReturnsError()
    {
        var (_, _, r) = await Run("DRAFT", missing: true);
        Assert.False(r.IsSuccess);
        Assert.Equal("Không tìm thấy phiếu đặt hàng nhập.", r.Error);
    }

    [Fact(DisplayName = "CancelPurchaseOrder/UTCID07 – không có quyền kho của phiếu")]
    [Trait("Function", Function)][Trait("UTCID", "CancelPurchaseOrder/UTCID07")][Trait("Type", "A")]
    public async Task UTCID07_NoWarehouseAccess_ReturnsError()
    {
        var (db, poId, r) = await Run("DRAFT", user: CurrentUser.WithWarehouses(TestData.UserId, TestData.K002));
        Assert.False(r.IsSuccess);
        Assert.Equal("Bạn không có quyền thao tác trên kho của phiếu này.", r.Error);
        Assert.Equal("DRAFT", PurchaseData.Po(db, poId).Status);
    }
}

/// <summary>Report 5.1 – sheet FinishPurchaseOrder (LucDT): kết thúc phiếu đang nhập một phần.</summary>
public class FinishPurchaseOrderTests
{
    private const string Function = "FinishPurchaseOrder";

    private static async Task<(TestStockFlowDbContext Db, int PoId, Result<bool> R)> Run(
        string status, Mock<ICurrentUserService>? user = null, bool missing = false)
    {
        var db = PurchaseData.Db();
        var poId = PurchaseData.AddPo(db, "PDN000001", status, PoSetup.OneLine);
        var r = await PoSetup.Handler(db, user ?? PoSetup.User())
            .Handle(new FinishPurchaseOrderCommand(missing ? 999 : poId), CancellationToken.None);
        return (db, poId, r);
    }

    [Fact(DisplayName = "FinishPurchaseOrder/UTCID01 – phiếu PARTIAL: COMPLETED, dòng giữ nguyên")]
    [Trait("Function", Function)][Trait("UTCID", "FinishPurchaseOrder/UTCID01")][Trait("Type", "N")]
    public async Task UTCID01_Partial_Completed()
    {
        var (db, poId, r) = await Run("PARTIAL");
        Assert.True(r.IsSuccess, r.Error);
        var po = PurchaseData.Po(db, poId);
        Assert.Equal("COMPLETED", po.Status);
        Assert.Equal(10m, Assert.Single(po.DtlPurchaseOrderItems).OrderedQty);
    }

    private static async Task AssertNotPartial(string status)
    {
        var (db, poId, r) = await Run(status);
        Assert.False(r.IsSuccess);
        Assert.Equal("Chỉ kết thúc được phiếu đang nhập một phần.", r.Error);
        Assert.Equal(status, PurchaseData.Po(db, poId).Status);
    }

    [Fact(DisplayName = "FinishPurchaseOrder/UTCID02 – phiếu DRAFT")]
    [Trait("Function", Function)][Trait("UTCID", "FinishPurchaseOrder/UTCID02")][Trait("Type", "A")]
    public Task UTCID02_Draft_ReturnsError() => AssertNotPartial("DRAFT");

    [Fact(DisplayName = "FinishPurchaseOrder/UTCID03 – phiếu ORDERED")]
    [Trait("Function", Function)][Trait("UTCID", "FinishPurchaseOrder/UTCID03")][Trait("Type", "A")]
    public Task UTCID03_Ordered_ReturnsError() => AssertNotPartial("ORDERED");

    [Fact(DisplayName = "FinishPurchaseOrder/UTCID04 – phiếu COMPLETED")]
    [Trait("Function", Function)][Trait("UTCID", "FinishPurchaseOrder/UTCID04")][Trait("Type", "A")]
    public Task UTCID04_Completed_ReturnsError() => AssertNotPartial("COMPLETED");

    [Fact(DisplayName = "FinishPurchaseOrder/UTCID05 – phiếu CANCELLED")]
    [Trait("Function", Function)][Trait("UTCID", "FinishPurchaseOrder/UTCID05")][Trait("Type", "A")]
    public Task UTCID05_Cancelled_ReturnsError() => AssertNotPartial("CANCELLED");

    [Fact(DisplayName = "FinishPurchaseOrder/UTCID06 – phiếu không tồn tại")]
    [Trait("Function", Function)][Trait("UTCID", "FinishPurchaseOrder/UTCID06")][Trait("Type", "A")]
    public async Task UTCID06_UnknownPo_ReturnsError()
    {
        var (_, _, r) = await Run("PARTIAL", missing: true);
        Assert.False(r.IsSuccess);
        Assert.Equal("Không tìm thấy phiếu đặt hàng nhập.", r.Error);
    }

    [Fact(DisplayName = "FinishPurchaseOrder/UTCID07 – không có quyền kho của phiếu")]
    [Trait("Function", Function)][Trait("UTCID", "FinishPurchaseOrder/UTCID07")][Trait("Type", "A")]
    public async Task UTCID07_NoWarehouseAccess_ReturnsError()
    {
        var (_, _, r) = await Run("PARTIAL", CurrentUser.WithWarehouses(TestData.UserId, TestData.K002));
        Assert.False(r.IsSuccess);
        Assert.Equal("Bạn không có quyền thao tác trên kho của phiếu này.", r.Error);
    }
}
