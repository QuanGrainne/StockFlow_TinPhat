using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Features.Production.Commands;
using StockFlow.UnitTests.Common;
using Xunit;

namespace StockFlow.UnitTests.Production.Boms;

/// <summary>
/// Trang Functions dòng 74 – ActivateBom (SF-FUNC-142, In charge NinhHQ). Chưa có sheet test case trong workbook;
/// ca duy nhất đã duyệt là ActivateBom/UTCID01 ở mục H (luồng chính) của báo cáo review.
/// </summary>
public class ActivateBomTests
{
    private const string Function = "SF-FUNC-142";

    [Fact(DisplayName = "ActivateBom/UTCID01 (mục H) – FG-01 có v1.0 đang áp dụng, kích hoạt v2.0: v2.0 áp dụng, v1.0 ngừng")]
    [Trait("Function", Function)]
    [Trait("UTCID", "ActivateBom/UTCID01")]
    [Trait("Type", "N")]
    [Trait("Source", "Review mục H")]
    public async Task UTCID01_ActivateNewVersion_DeactivatesPreviousVersion()
    {
        // Arrange
        var db = TestStockFlowDbContext.Create();
        TestData.SeedMasterData(db);
        ProductionData.SeedProducts(db);
        var v1 = ProductionData.AddBom(db, ProductionData.Fg01, "1.0", active: true);
        var v2 = ProductionData.AddBom(db, ProductionData.Fg01, "2.0", active: false);
        var handler = new ActivateBomCommandHandler(db);

        // Act
        var result = await handler.Handle(new ActivateBomCommand(v2), CancellationToken.None);

        // Assert
        Assert.True(result.IsSuccess, result.Error);
        var boms = await db.MstBoms.AsNoTracking().ToDictionaryAsync(b => b.BomId);
        Assert.True(boms[v2].IsActive);
        Assert.False(boms[v1].IsActive);
    }

    // ----- UTCID02–04: tạo mới cho sheet ActivateBom (chức năng chưa có test case trong workbook, theo yêu cầu 22/11) -----

    private static TestStockFlowDbContext Db()
    {
        var db = TestStockFlowDbContext.Create();
        TestData.SeedMasterData(db);
        ProductionData.SeedProducts(db);
        return db;
    }

    [Fact(DisplayName = "ActivateBom/UTCID02 – định mức chưa có dòng nguyên vật liệu")]
    [Trait("Function", Function)][Trait("UTCID", "ActivateBom/UTCID02")][Trait("Type", "A")]
    public async Task UTCID02_BomWithoutMaterial_ReturnsError()
    {
        var db = Db();
        var id = ProductionData.AddBom(db, ProductionData.Fg01, "3.0", active: false, withMaterial: false);
        var r = await new ActivateBomCommandHandler(db).Handle(new ActivateBomCommand(id), CancellationToken.None);
        Assert.False(r.IsSuccess);
        Assert.Equal("Định mức phải có ít nhất một nguyên vật liệu.", r.Error);
        Assert.False((await db.MstBoms.AsNoTracking().SingleAsync()).IsActive);
    }

    [Fact(DisplayName = "ActivateBom/UTCID03 – định mức id 999999 không tồn tại")]
    [Trait("Function", Function)][Trait("UTCID", "ActivateBom/UTCID03")][Trait("Type", "A")]
    public async Task UTCID03_UnknownBom_ReturnsError()
    {
        var db = Db();
        var r = await new ActivateBomCommandHandler(db).Handle(new ActivateBomCommand(999_999), CancellationToken.None);
        Assert.False(r.IsSuccess);
        Assert.Equal("Không tìm thấy định mức hoặc định mức không còn khả dụng.", r.Error);
    }

    [Fact(DisplayName = "ActivateBom/UTCID04 – kích hoạt lại định mức đang áp dụng: thành công, không đổi")]
    [Trait("Function", Function)][Trait("UTCID", "ActivateBom/UTCID04")][Trait("Type", "B")]
    public async Task UTCID04_AlreadyActive_KeepsState()
    {
        var db = Db();
        var id = ProductionData.AddBom(db, ProductionData.Fg01, "1.0", active: true);
        var r = await new ActivateBomCommandHandler(db).Handle(new ActivateBomCommand(id), CancellationToken.None);
        Assert.True(r.IsSuccess, r.Error);
        Assert.True((await db.MstBoms.AsNoTracking().SingleAsync()).IsActive);
    }
}
