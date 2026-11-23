using Microsoft.EntityFrameworkCore;
using Moq;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.PriceBooks.Commands;
using StockFlow.Application.Features.Products.Commands;
using StockFlow.Application.Features.Products.DTOs;
using StockFlow.Domain.Entities;
using StockFlow.UnitTests.Common;
using Xunit;

namespace StockFlow.UnitTests.MasterData;

/// <summary>
/// Report 5.1 – sheet ImportProducts (DatTD): nhập danh sách hàng hóa đọc từ Excel. Không có ảnh nên IImageStorage (mock) không được gọi.
/// UTCID05 (403 khi thiếu GOODS_CREATE) kiểm ở tầng phân quyền – xem Authorization/ApiPermissionTests.
/// </summary>
public class ImportProductsTests
{
    private const string Function = "ImportProducts";

    private static TestStockFlowDbContext Db()
    {
        var db = TestStockFlowDbContext.Create();
        TestData.SeedMasterData(db);
        return db;
    }

    private static void AddLantern(TestStockFlowDbContext db)
    {
        db.MstProducts.Add(new MstProduct
        {
            ProductId = 60, ProductCode = "SP-IMP-01", ProductName = "Đèn lồng đỏ", CategoryId = TestData.CategoryId, BaseUnitId = TestData.UnitId,
            ProductType = "FINISHED", StandardPrice = 50_000, IsActive = true,
        });
        TestData.SaveAndDetach(db);
    }

    private static Task<Result<ImportProductsResultDto>> Import(TestStockFlowDbContext db, params ImportProductItemRequest[] rows) =>
        new ImportProductsCommandHandler(db, new Mock<IImageStorage>(MockBehavior.Strict).Object)
            .Handle(new ImportProductsCommand(new ImportProductsRequest { Products = rows.ToList() }), CancellationToken.None);

    [Fact(DisplayName = "ImportProducts/UTCID01 – 2 dòng mới SP-IMP-01, SP-IMP-02: tạo 2, cập nhật 0")]
    [Trait("Function", Function)][Trait("UTCID", "ImportProducts/UTCID01")][Trait("Type", "N")]
    public async Task UTCID01_NewRows_Created()
    {
        var db = Db();
        var r = await Import(db,
            new ImportProductItemRequest { Code = "SP-IMP-01", Name = "Đèn lồng đỏ", StandardPrice = 50_000 },
            new ImportProductItemRequest { Code = "SP-IMP-02", Name = "Đèn lồng vàng", StandardPrice = 60_000 });
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(2, r.Value!.ImportedCount);
        Assert.Equal(0, r.Value.UpdatedCount);
        Assert.Equal(2, await db.MstProducts.CountAsync(p => p.ProductCode!.StartsWith("SP-IMP-")));
    }

    [Fact(DisplayName = "ImportProducts/UTCID02 – SP-IMP-01 \"Đèn lồng đỏ\" đã có, dòng cùng tên giá mới: tạo 0, cập nhật 1")]
    [Trait("Function", Function)][Trait("UTCID", "ImportProducts/UTCID02")][Trait("Type", "N")]
    public async Task UTCID02_ExistingSameName_Updated()
    {
        var db = Db();
        AddLantern(db);
        var r = await Import(db, new ImportProductItemRequest { Code = "SP-IMP-01", Name = "Đèn lồng đỏ", StandardPrice = 55_000 });
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(0, r.Value!.ImportedCount);
        Assert.Equal(1, r.Value.UpdatedCount);
        Assert.Equal(55_000m, (await db.MstProducts.AsNoTracking().SingleAsync(p => p.ProductId == 60)).StandardPrice);
    }

    [Fact(DisplayName = "ImportProducts/UTCID03 – danh sách trống")]
    [Trait("Function", Function)][Trait("UTCID", "ImportProducts/UTCID03")][Trait("Type", "A")]
    public async Task UTCID03_Empty_ReturnsError()
    {
        var r = await Import(Db());
        Assert.False(r.IsSuccess);
        Assert.Equal("Danh sách sản phẩm import trống.", r.Error);
    }

    [Fact(DisplayName = "ImportProducts/UTCID04 – SP-IMP-01 đã có tên \"Đèn lồng đỏ\", dòng 1 ghi \"Đèn lồng xanh\"")]
    [Trait("Function", Function)][Trait("UTCID", "ImportProducts/UTCID04")][Trait("Type", "A")]
    public async Task UTCID04_SameCodeDifferentName_ReturnsError()
    {
        var db = Db();
        AddLantern(db);
        var r = await Import(db, new ImportProductItemRequest { Code = "SP-IMP-01", Name = "Đèn lồng xanh" });
        Assert.False(r.IsSuccess);
        Assert.Equal("Dòng 1: Trùng mã hàng 'SP-IMP-01' nhưng khác tên hàng hóa ('Đèn lồng đỏ' vs 'Đèn lồng xanh').", r.Error);
        Assert.Equal("Đèn lồng đỏ", (await db.MstProducts.AsNoTracking().SingleAsync(p => p.ProductId == 60)).ProductName);
    }
}

/// <summary>Report 5.1 – sheet ToggleProductStatus (DatTD): bật / tắt kinh doanh hàng hóa. UTCID04 (403) – xem Authorization/ApiPermissionTests.</summary>
public class ToggleProductStatusTests
{
    private const string Function = "ToggleProductStatus";

    private static async Task<(TestStockFlowDbContext Db, Result<bool> R)> Toggle(bool? startActive, int productId = TestData.PTest)
    {
        var db = TestStockFlowDbContext.Create();
        TestData.SeedMasterData(db);
        if (startActive.HasValue)
        {
            var p = db.MstProducts.Single(x => x.ProductId == TestData.PTest);
            p.IsActive = startActive;
            TestData.SaveAndDetach(db);
        }
        var r = await new ToggleProductStatusCommandHandler(db).Handle(new ToggleProductStatusCommand(productId), CancellationToken.None);
        return (db, r);
    }

    [Fact(DisplayName = "ToggleProductStatus/UTCID01 – P-TEST đang bán: trả false (ngừng kinh doanh)")]
    [Trait("Function", Function)][Trait("UTCID", "ToggleProductStatus/UTCID01")][Trait("Type", "N")]
    public async Task UTCID01_Active_Stopped()
    {
        var (db, r) = await Toggle(true);
        Assert.True(r.IsSuccess, r.Error);
        Assert.False(r.Value);
        Assert.False(db.MstProducts.AsNoTracking().Single(p => p.ProductId == TestData.PTest).IsActive);
    }

    [Fact(DisplayName = "ToggleProductStatus/UTCID02 – P-TEST đang ngừng: trả true (bán lại)")]
    [Trait("Function", Function)][Trait("UTCID", "ToggleProductStatus/UTCID02")][Trait("Type", "N")]
    public async Task UTCID02_Inactive_Reactivated()
    {
        var (db, r) = await Toggle(false);
        Assert.True(r.IsSuccess, r.Error);
        Assert.True(r.Value);
        Assert.True(db.MstProducts.AsNoTracking().Single(p => p.ProductId == TestData.PTest).IsActive);
    }

    [Fact(DisplayName = "ToggleProductStatus/UTCID03 – hàng hóa 999999 không tồn tại")]
    [Trait("Function", Function)][Trait("UTCID", "ToggleProductStatus/UTCID03")][Trait("Type", "A")]
    public async Task UTCID03_Unknown_ReturnsError()
    {
        var (_, r) = await Toggle(null, 999_999);
        Assert.False(r.IsSuccess);
        Assert.Equal("Không tìm thấy thông tin hàng hóa.", r.Error);
    }
}

/// <summary>Report 5.1 – sheet DeleteProduct (DatTD): chỉ xóa hàng chưa có đơn, chưa có thẻ kho, không còn tồn.</summary>
public class DeleteProductTests
{
    private const string Function = "DeleteProduct";
    private const int NewProduct = 61;

    private static TestStockFlowDbContext Db()
    {
        var db = TestStockFlowDbContext.Create();
        TestData.SeedMasterData(db);
        db.MstProducts.Add(new MstProduct
        {
            ProductId = NewProduct, ProductCode = "SP-NEW", ProductName = "Hàng mới", CategoryId = TestData.CategoryId, BaseUnitId = TestData.UnitId,
            ProductType = "GOODS", IsActive = true,
        });
        TestData.SaveAndDetach(db);
        return db;
    }

    private static Task<Result<bool>> Delete(TestStockFlowDbContext db, int id) =>
        new DeleteProductCommandHandler(db).Handle(new DeleteProductCommand(id), CancellationToken.None);

    private static async Task AssertRejected(TestStockFlowDbContext db, string message)
    {
        var r = await Delete(db, NewProduct);
        Assert.False(r.IsSuccess);
        Assert.Equal(message, r.Error);
        Assert.True(await db.MstProducts.AnyAsync(p => p.ProductId == NewProduct));
    }

    [Fact(DisplayName = "DeleteProduct/UTCID01 – hàng mới chưa phát sinh giao dịch: xóa khỏi mst_products")]
    [Trait("Function", Function)][Trait("UTCID", "DeleteProduct/UTCID01")][Trait("Type", "N")]
    public async Task UTCID01_Unused_Deleted()
    {
        var db = Db();
        var r = await Delete(db, NewProduct);
        Assert.True(r.IsSuccess, r.Error);
        Assert.True(r.Value);
        Assert.False(await db.MstProducts.AnyAsync(p => p.ProductId == NewProduct));
    }

    [Fact(DisplayName = "DeleteProduct/UTCID02 – hàng đã có trong đơn đặt hàng")]
    [Trait("Function", Function)][Trait("UTCID", "DeleteProduct/UTCID02")][Trait("Type", "A")]
    public async Task UTCID02_UsedInBooking_ReturnsError()
    {
        var db = Db();
        SalesData.SeedCustomers(db);
        SalesData.AddBooking(db, "DH0001", SalesData.KhHm01, TestData.K001, "DRAFT", new[] { (NewProduct, 1m, 10_000m) });
        await AssertRejected(db,
            "Sản phẩm này đã phát sinh đơn đặt hàng trong hệ thống. Để bảo toàn lịch sử dữ liệu và chứng từ, không thể xóa vĩnh viễn! Bạn có thể chuyển trạng thái sang 'Ngừng kinh doanh' để ẩn sản phẩm.");
    }

    [Fact(DisplayName = "DeleteProduct/UTCID03 – hàng đã có thẻ kho")]
    [Trait("Function", Function)][Trait("UTCID", "DeleteProduct/UTCID03")][Trait("Type", "A")]
    public async Task UTCID03_HasStockCard_ReturnsError()
    {
        var db = Db();
        db.TrxInventoryTransactions.Add(new TrxInventoryTransaction
        {
            WarehouseId = TestData.K001, ProductId = NewProduct, TransactionType = "INBOUND_RECEIPT", Quantity = 1,
            ReferenceType = "GOODS_RECEIPT", ReferenceId = 1, CreatedBy = TestData.UserId, TransactionDate = VietnamTime.Now,
        });
        TestData.SaveAndDetach(db);
        await AssertRejected(db, "Sản phẩm này đã phát sinh giao dịch xuất/nhập kho (thẻ kho). Không thể xóa vĩnh viễn để bảo đảm tính toàn vẹn của sổ sách kho!");
    }

    [Fact(DisplayName = "DeleteProduct/UTCID04 – còn tồn 5, chưa có thẻ kho")]
    [Trait("Function", Function)][Trait("UTCID", "DeleteProduct/UTCID04")][Trait("Type", "A")]
    public async Task UTCID04_HasStock_ReturnsError()
    {
        var db = Db();
        TestData.SetStock(db, TestData.K001, NewProduct, 5, 1000);
        await AssertRejected(db, "Sản phẩm hiện vẫn còn tồn kho thực tế. Vui lòng xuất kho hoặc cân chỉnh tồn về 0 trước khi xóa.");
    }

    [Fact(DisplayName = "DeleteProduct/UTCID05 – hàng hóa 999999 không tồn tại")]
    [Trait("Function", Function)][Trait("UTCID", "DeleteProduct/UTCID05")][Trait("Type", "A")]
    public async Task UTCID05_Unknown_ReturnsError()
    {
        var r = await Delete(Db(), 999_999);
        Assert.False(r.IsSuccess);
        Assert.Equal("Không tìm thấy thông tin hàng hóa.", r.Error);
    }
}

/// <summary>
/// Report 5.1 – sheet ApplyFormula (DatTD): tính lại giá của bảng giá "Giá sỉ" theo giá chung ± số tiền / %.
/// Toán tử, đơn vị, giá trị của công thức được lưu cùng bảng giá (UpdatePriceBookCommand) nên ca 04–06 kiểm ở validator đó (PriceBookFormulaRules).
/// </summary>
public class ApplyFormulaTests
{
    private const string Function = "ApplyFormula";
    private const int LanternCategory = 2;
    private const int Lantern = 62;
    private const int Other = 63;

    /// <summary>DL-01 (nhóm "Đèn lồng", giá chung 100.000), HH-01 (nhóm "Hàng test", giá chung 200.000), bảng giá "Giá sỉ" với công thức cho trước.</summary>
    private static (TestStockFlowDbContext Db, int PriceBookId) Arrange(string op, decimal value, string unit)
    {
        var db = TestStockFlowDbContext.Create();
        TestData.SeedMasterData(db);
        db.MstProductCategories.Add(new MstProductCategory { CategoryId = LanternCategory, CategoryName = "Đèn lồng", IsActive = true });
        db.MstProducts.AddRange(
            new MstProduct { ProductId = Lantern, ProductCode = "DL-01", ProductName = "Đèn lồng 01", CategoryId = LanternCategory, BaseUnitId = TestData.UnitId, ProductType = "GOODS", StandardPrice = 100_000, IsActive = true },
            new MstProduct { ProductId = Other, ProductCode = "HH-01", ProductName = "Hàng 01", CategoryId = TestData.CategoryId, BaseUnitId = TestData.UnitId, ProductType = "GOODS", StandardPrice = 200_000, IsActive = true });
        var pb = new MstPriceBook
        {
            PriceBookCode = "BG-SI", PriceBookName = "Giá sỉ", IsActive = true, FormulaBaseType = "STANDARD",
            FormulaOperator = op, FormulaValue = value, FormulaUnit = unit,
        };
        db.MstPriceBooks.Add(pb);
        TestData.SaveAndDetach(db);
        return (db, pb.PriceBookId);
    }

    private static decimal? PriceOf(TestStockFlowDbContext db, int priceBookId, int productId) =>
        db.DtlPriceBookItems.AsNoTracking().Where(i => i.PriceBookId == priceBookId && i.ProductId == productId).Select(i => (decimal?)i.Price).SingleOrDefault();

    private static IEnumerable<string> FormulaErrors(string op, decimal value, string unit) =>
        new UpdatePriceBookCommandValidator()
            .Validate(new UpdatePriceBookCommand(1, "Giá sỉ", FormulaBaseType: "STANDARD", FormulaOperator: op, FormulaValue: value, FormulaUnit: unit))
            .Errors.Select(e => e.ErrorMessage);

    [Fact(DisplayName = "ApplyFormula/UTCID01 – giá chung + 10%, mọi hàng: giá = giá chung × 1,10")]
    [Trait("Function", Function)][Trait("UTCID", "ApplyFormula/UTCID01")][Trait("Type", "N")]
    public async Task UTCID01_PlusTenPercent_AllProducts()
    {
        var (db, id) = Arrange("+", 10, "PERCENT");
        var r = await new ApplyPriceBookFormulaCommandHandler(db).Handle(new ApplyPriceBookFormulaCommand(id, AllProducts: true), CancellationToken.None);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(110_000m, PriceOf(db, id, Lantern));
        Assert.Equal(220_000m, PriceOf(db, id, Other));
    }

    [Fact(DisplayName = "ApplyFormula/UTCID02 – giá chung − 5.000, nhóm \"Đèn lồng\": chỉ hàng của nhóm đổi giá")]
    [Trait("Function", Function)][Trait("UTCID", "ApplyFormula/UTCID02")][Trait("Type", "N")]
    public async Task UTCID02_MinusAmount_CategoryOnly()
    {
        var (db, id) = Arrange("-", 5000, "VND");
        var r = await new ApplyPriceBookFormulaCommandHandler(db)
            .Handle(new ApplyPriceBookFormulaCommand(id, new List<int> { LanternCategory }), CancellationToken.None);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(95_000m, PriceOf(db, id, Lantern));
        Assert.Null(PriceOf(db, id, Other));
    }

    [Fact(DisplayName = "ApplyFormula/UTCID03 – + 0 VND: giá bằng giá nguồn")]
    [Trait("Function", Function)][Trait("UTCID", "ApplyFormula/UTCID03")][Trait("Type", "B")]
    public async Task UTCID03_PlusZero_EqualsSource()
    {
        var (db, id) = Arrange("+", 0, "VND");
        var r = await new ApplyPriceBookFormulaCommandHandler(db).Handle(new ApplyPriceBookFormulaCommand(id, AllProducts: true), CancellationToken.None);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(100_000m, PriceOf(db, id, Lantern));
        Assert.Equal(200_000m, PriceOf(db, id, Other));
    }

    [Fact(DisplayName = "ApplyFormula/UTCID04 – toán tử \"*\" (validator)")]
    [Trait("Function", Function)][Trait("UTCID", "ApplyFormula/UTCID04")][Trait("Type", "A")]
    public void UTCID04_InvalidOperator_ValidatorRejects() =>
        Assert.Contains("Toán tử phải là '+' hoặc '-'.", FormulaErrors("*", 10, "PERCENT"));

    [Fact(DisplayName = "ApplyFormula/UTCID05 – đơn vị \"USD\" (validator)")]
    [Trait("Function", Function)][Trait("UTCID", "ApplyFormula/UTCID05")][Trait("Type", "A")]
    public void UTCID05_InvalidUnit_ValidatorRejects() =>
        Assert.Contains("Đơn vị điều chỉnh phải là 'VND' hoặc 'PERCENT'.", FormulaErrors("+", 10, "USD"));

    [Fact(DisplayName = "ApplyFormula/UTCID06 – giá trị −10 (validator)")]
    [Trait("Function", Function)][Trait("UTCID", "ApplyFormula/UTCID06")][Trait("Type", "A")]
    public void UTCID06_NegativeValue_ValidatorRejects() =>
        Assert.Contains("Giá trị điều chỉnh không được âm.", FormulaErrors("+", -10, "VND"));

    [Fact(DisplayName = "ApplyFormula/UTCID07 – bảng giá 999999 không tồn tại")]
    [Trait("Function", Function)][Trait("UTCID", "ApplyFormula/UTCID07")][Trait("Type", "A")]
    public async Task UTCID07_UnknownPriceBook_ReturnsError()
    {
        var (db, _) = Arrange("+", 10, "PERCENT");
        var r = await new ApplyPriceBookFormulaCommandHandler(db).Handle(new ApplyPriceBookFormulaCommand(999_999, AllProducts: true), CancellationToken.None);
        Assert.False(r.IsSuccess);
        Assert.Equal("Không tìm thấy bảng giá.", r.Error);
    }
}
