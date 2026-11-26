using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Features.Products.Commands;
using StockFlow.Domain.Entities;
using StockFlow.UnitTests.Common;
using Xunit;

namespace StockFlow.UnitTests.MasterData;

/// <summary>
/// Sửa / xóa nhóm hàng (nút bút chì ở bộ lọc Nhóm hàng, 26/11/2026).
/// Precondition chung: nhóm "Hàng test" (id 1) có hàng P-TEST; nhóm "Nhóm trống" (id 2) chưa có hàng.
/// </summary>
public class ProductCategoryTests
{
    private const int EmptyCategory = 2;

    private static TestStockFlowDbContext Db()
    {
        var db = TestStockFlowDbContext.Create();
        TestData.SeedMasterData(db);
        db.MstProductCategories.Add(new MstProductCategory { CategoryId = EmptyCategory, CategoryName = "Nhóm trống", IsActive = true });
        TestData.SaveAndDetach(db);
        return db;
    }

    private static Task<StockFlow.Application.Common.Result<StockFlow.Application.Features.Products.DTOs.ProductCategoryDto>> Update(
        TestStockFlowDbContext db, int id, string name, string? description = null) =>
        new UpdateProductCategoryCommandHandler(db).Handle(
            new UpdateProductCategoryCommand(id, new UpdateCategoryRequest(name, description)), CancellationToken.None);

    [Fact(DisplayName = "UpdateProductCategory/UTCID01 – đổi tên nhóm đang có hàng: hàng vẫn thuộc nhóm")]
    [Trait("Function", "UpdateProductCategory")][Trait("UTCID", "UpdateProductCategory/UTCID01")][Trait("Type", "N")]
    public async Task Update_Rename_KeepsProducts()
    {
        var db = Db();
        var r = await Update(db, TestData.CategoryId, "  Hàng test mới  ", "Mô tả");

        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal("Hàng test mới", r.Value!.CategoryName);
        Assert.Equal(1, r.Value.ProductCount);
        var saved = await db.MstProductCategories.AsNoTracking().SingleAsync(c => c.CategoryId == TestData.CategoryId);
        Assert.Equal("Hàng test mới", saved.CategoryName);
        Assert.Equal("Mô tả", saved.Description);
        Assert.Equal(TestData.CategoryId, (await db.MstProducts.AsNoTracking().SingleAsync(p => p.ProductId == TestData.PTest)).CategoryId);
    }

    [Fact(DisplayName = "UpdateProductCategory/UTCID02 – trùng tên nhóm khác (không phân biệt hoa thường)")]
    [Trait("Function", "UpdateProductCategory")][Trait("UTCID", "UpdateProductCategory/UTCID02")][Trait("Type", "A")]
    public async Task Update_DuplicateName_ReturnsError()
    {
        var db = Db();
        var r = await Update(db, EmptyCategory, "hàng TEST");

        Assert.False(r.IsSuccess);
        Assert.Equal("Nhóm hàng \"hàng TEST\" đã tồn tại.", r.Error);
        Assert.Equal("Nhóm trống", (await db.MstProductCategories.AsNoTracking().SingleAsync(c => c.CategoryId == EmptyCategory)).CategoryName);
    }

    [Fact(DisplayName = "UpdateProductCategory/UTCID03 – tên trống")]
    [Trait("Function", "UpdateProductCategory")][Trait("UTCID", "UpdateProductCategory/UTCID03")][Trait("Type", "B")]
    public async Task Update_EmptyName_ReturnsError()
    {
        var db = Db();
        var r = await Update(db, EmptyCategory, "   ");

        Assert.False(r.IsSuccess);
        Assert.Equal("Tên nhóm hàng không được để trống.", r.Error);
    }

    [Fact(DisplayName = "DeleteProductCategory/UTCID01 – nhóm còn hàng hóa: không xóa")]
    [Trait("Function", "DeleteProductCategory")][Trait("UTCID", "DeleteProductCategory/UTCID01")][Trait("Type", "A")]
    public async Task Delete_WithProducts_ReturnsError()
    {
        var db = Db();
        var r = await new DeleteProductCategoryCommandHandler(db).Handle(new DeleteProductCategoryCommand(TestData.CategoryId), CancellationToken.None);

        Assert.False(r.IsSuccess);
        Assert.Equal("Nhóm hàng \"Hàng test\" đang có 1 hàng hóa. Chuyển các hàng hóa sang nhóm khác trước khi xóa.", r.Error);
        Assert.True(await db.MstProductCategories.AnyAsync(c => c.CategoryId == TestData.CategoryId));
    }

    [Fact(DisplayName = "DeleteProductCategory/UTCID02 – nhóm trống: xóa khỏi mst_product_categories")]
    [Trait("Function", "DeleteProductCategory")][Trait("UTCID", "DeleteProductCategory/UTCID02")][Trait("Type", "N")]
    public async Task Delete_Empty_Deleted()
    {
        var db = Db();
        var r = await new DeleteProductCategoryCommandHandler(db).Handle(new DeleteProductCategoryCommand(EmptyCategory), CancellationToken.None);

        Assert.True(r.IsSuccess, r.Error);
        Assert.False(await db.MstProductCategories.AnyAsync(c => c.CategoryId == EmptyCategory));
    }
}
