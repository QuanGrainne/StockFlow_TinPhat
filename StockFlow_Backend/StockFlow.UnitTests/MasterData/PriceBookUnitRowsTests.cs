using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Features.PriceBooks.Commands;
using StockFlow.Application.Features.PriceBooks.DTOs;
using StockFlow.Application.Features.PriceBooks.Queries;
using StockFlow.Domain.Entities;
using StockFlow.UnitTests.Common;
using Xunit;

namespace StockFlow.UnitTests.MasterData;

/// <summary>
/// Thiết lập giá – đơn vị quy đổi hiện thành dòng riêng (kiểu KiotViet): SP004330 = "bịch (10 set)" của SP004328.
/// Tìm được theo mã đơn vị; giá ở Bảng giá chung = giá bán của đơn vị (variants_json), sửa được và lưu lại vào đó.
/// Màn Bán hàng (AllProducts) không nhận dòng đơn vị để giá đơn vị không đè giá của hàng.
/// </summary>
public class PriceBookUnitRowsTests
{
    private const int Set = 70;

    private const string VariantsJson =
        "{\"units\":[{\"Name\":\"set\",\"ConversionRate\":1,\"IsBase\":true,\"IsDirectSale\":true}," +
        "{\"Name\":\"bịch (10set/bịch)\",\"ConversionRate\":10,\"IsBase\":false,\"IsDirectSale\":true}]," +
        "\"attributes\":[{\"Name\":\"MÀU\",\"Values\":[\"áo trắng\"]}]," +
        "\"variants\":[{\"AttributeValue\":\"áo trắng\",\"UnitName\":\"set\",\"ConversionRate\":1,\"Code\":\"SP004328\",\"SalePrice\":11000}," +
        "{\"AttributeValue\":\"áo trắng\",\"UnitName\":\"bịch (10set/bịch)\",\"ConversionRate\":10,\"Code\":\"SP004330\",\"SalePrice\":110000}]," +
        "\"groupCode\":\"SP004328\"}";

    private static (TestStockFlowDbContext Db, int DefaultBook, int CustomBook) Arrange()
    {
        var db = TestStockFlowDbContext.Create();
        TestData.SeedMasterData(db);
        db.MstUnits.Add(new MstUnit { UnitId = 2, UnitName = "set", Abbreviation = "set" });
        db.MstProducts.Add(new MstProduct
        {
            ProductId = Set, ProductCode = "SP004328", ProductName = "Set tốt nghiệp - áo trắng", CategoryId = TestData.CategoryId,
            BaseUnitId = 2, ProductType = "GOODS", StandardPrice = 11_000, MovingAverageCost = 5_000, IsActive = true,
            VariantsJson = VariantsJson,
        });
        var def = new MstPriceBook { PriceBookCode = "BG-CHUNG", PriceBookName = "Bảng giá chung", IsActive = true, IsDefault = true };
        var custom = new MstPriceBook { PriceBookCode = "BG-SI", PriceBookName = "Giá sỉ", IsActive = true };
        db.MstPriceBooks.AddRange(def, custom);
        TestData.SaveAndDetach(db);
        TestData.SetStock(db, TestData.K001, Set, 820, 5_000);
        return (db, def.PriceBookId, custom.PriceBookId);
    }

    private static async Task<List<PriceBookMatrixItemDto>> Matrix(TestStockFlowDbContext db, int bookId, string? search = null, bool all = false)
    {
        var r = await new GetPriceBookMatrixQueryHandler(db).Handle(
            new GetPriceBookMatrixQuery(Search: search, PriceBookIds: new List<int> { bookId }, AllProducts: all), CancellationToken.None);
        Assert.True(r.IsSuccess, r.Error);
        return r.Value!.Items.Where(i => i.ProductId == Set).ToList();
    }

    [Fact(DisplayName = "PriceBookUnit/01 – tìm \"4330\": chỉ ra dòng đơn vị SP004330, giá 110.000, tồn 82, giá vốn × 10")]
    public async Task Search_UnitCode_ReturnsUnitRowOnly()
    {
        var (db, def, _) = Arrange();
        var rows = await Matrix(db, def, "4330");
        var row = Assert.Single(rows);
        Assert.Equal("SP004330", row.ProductCode);
        Assert.Equal("SP004330", row.UnitCode);
        Assert.Equal(10m, row.ConversionRate);
        Assert.Equal("bịch (10set/bịch)", row.UnitName);
        Assert.Equal(110_000m, row.Prices[def]);
        Assert.Equal(82m, row.StockQuantity);
        Assert.Equal(50_000m, row.CostPrice);
    }

    [Fact(DisplayName = "PriceBookUnit/02 – không tìm kiếm: dòng hàng rồi dòng đơn vị quy đổi")]
    public async Task NoSearch_ProductThenUnitRows()
    {
        var (db, def, _) = Arrange();
        var rows = await Matrix(db, def);
        Assert.Equal(new[] { "SP004328", "SP004330" }, rows.Select(r => r.ProductCode));
        Assert.Null(rows[0].UnitCode);
        Assert.Equal(11_000m, rows[0].Prices[def]);
    }

    [Fact(DisplayName = "PriceBookUnit/03 – màn Bán hàng (AllProducts): không có dòng đơn vị")]
    public async Task AllProducts_NoUnitRows()
    {
        var (db, def, _) = Arrange();
        var rows = await Matrix(db, def, all: true);
        var row = Assert.Single(rows);
        Assert.Null(row.UnitCode);
    }

    [Fact(DisplayName = "PriceBookUnit/04 – sửa giá SP004330 ở Bảng giá chung: lưu vào giá bán của đơn vị, giá hàng giữ nguyên")]
    public async Task UpdateDefaultBook_UnitPrice_SavedToVariants()
    {
        var (db, def, _) = Arrange();
        var r = await new UpdatePriceBookPricesCommandHandler(db).Handle(
            new UpdatePriceBookPricesCommand(def, new List<UpdateProductPriceItemDto> { new(Set, 120_000, "SP004330") }), CancellationToken.None);
        Assert.True(r.IsSuccess, r.Error);
        db.ChangeTracker.Clear();
        var p = await db.MstProducts.AsNoTracking().SingleAsync(x => x.ProductId == Set);
        Assert.Equal(11_000m, p.StandardPrice);
        Assert.Contains("\"SalePrice\":120000", p.VariantsJson);
        Assert.Contains("\"groupCode\":\"SP004328\"", p.VariantsJson);
        var rows = await Matrix(db, def, "SP004330");
        Assert.Equal(120_000m, Assert.Single(rows).Prices[def]);
    }

    [Fact(DisplayName = "PriceBookUnit/06 – phân trang theo dòng: 7 dòng (4 hàng, 3 có đơn vị), trang 5 dòng → 5 + 2, tổng 7")]
    public async Task Paging_CountsUnitRows()
    {
        var (db, def, _) = Arrange();
        for (var i = 1; i <= 2; i++)
        {
            var baseCode = $"SP00500{i}";
            var unitCode = $"SP00510{i}";
            db.MstProducts.Add(new MstProduct
            {
                ProductId = Set + i, ProductCode = baseCode, ProductName = $"Hàng {i}", CategoryId = TestData.CategoryId,
                BaseUnitId = 2, ProductType = "GOODS", StandardPrice = 1_000, IsActive = true,
                VariantsJson = VariantsJson.Replace("SP004328", baseCode).Replace("SP004330", unitCode),
            });
        }
        TestData.SaveAndDetach(db);

        async Task<(List<PriceBookMatrixItemDto> Items, int Total)> Page(int page)
        {
            var r = await new GetPriceBookMatrixQueryHandler(db).Handle(
                new GetPriceBookMatrixQuery(PriceBookIds: new List<int> { def }, PageIndex: page, PageSize: 5), CancellationToken.None);
            Assert.True(r.IsSuccess, r.Error);
            return (r.Value!.Items, r.Value.TotalCount);
        }

        var (p1, total) = await Page(1);
        var (p2, _) = await Page(2);
        Assert.Equal(7, total);
        Assert.Equal(5, p1.Count);
        Assert.Equal(2, p2.Count);
        Assert.Equal(
            new[] { "P-TEST", "SP004328", "SP004330", "SP005001", "SP005101", "SP005002", "SP005102" },
            p1.Concat(p2).Select(x => x.ProductCode));
    }

    [Fact(DisplayName = "PriceBookUnit/05 – sửa giá đơn vị ở bảng giá khác Bảng giá chung: báo lỗi")]
    public async Task UpdateCustomBook_UnitPrice_Rejected()
    {
        var (db, _, custom) = Arrange();
        var r = await new UpdatePriceBookPricesCommandHandler(db).Handle(
            new UpdatePriceBookPricesCommand(custom, new List<UpdateProductPriceItemDto> { new(Set, 100_000, "SP004330") }), CancellationToken.None);
        Assert.False(r.IsSuccess);
        Assert.Equal("Giá của đơn vị quy đổi chỉ sửa được ở Bảng giá chung.", r.Error);
    }
}
