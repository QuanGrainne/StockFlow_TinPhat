using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Features.Production.Commands;
using StockFlow.Application.Features.Production.DTOs;
using StockFlow.Domain.Entities;
using StockFlow.UnitTests.Common;
using Xunit;

namespace StockFlow.UnitTests.Production.Boms;

internal static class BomSetup
{
    public static TestStockFlowDbContext Db()
    {
        var db = TestStockFlowDbContext.Create();
        TestData.SeedMasterData(db);
        ProductionData.SeedProducts(db);
        return db;
    }

    public static SaveBomRequest Req(int productId = ProductionData.Fg01, string? version = "1.0", string? code = null,
        decimal qty = 2, decimal wastage = 5, string? description = null) =>
        new(productId, code, version, description, new List<SaveBomItemRequest> { new(ProductionData.Rm01, qty, wastage) }, false);

    /// <summary>Đặt lại mã định mức (BomName) của 1 BOM đã tạo.</summary>
    public static void Rename(TestStockFlowDbContext db, int bomId, string code)
    {
        var bom = db.MstBoms.Single(b => b.BomId == bomId);
        bom.BomName = code;
        TestData.SaveAndDetach(db);
    }

    /// <summary>Lệnh LSX0001 dùng BOM → BOM coi như đã dùng (BR-06).</summary>
    public static void UseInOrder(TestStockFlowDbContext db, int bomId) =>
        ProductionData.AddOrder(db, "LSX0001", ProductionOrderStatus.NotStarted, bomId);
}

/// <summary>
/// Report 5.1 – sheet CreateBom (TamDM): tạo định mức (UC-57) cho thành phẩm; phiên bản và mã định mức không trùng.
/// Ca 03, 04 kiểm theo câu chữ mới ở D.1 (BOM → định mức). Ca 02, 05 là luật của CreateBomCommandValidator.
/// </summary>
public class CreateBomTests
{
    private const string Function = "CreateBom";

    [Fact(DisplayName = "CreateBom/UTCID01 – FG-01 v1.0, RM-01 × 2, hao hụt 5%: tạo định mức (chưa áp dụng)")]
    [Trait("Function", Function)][Trait("UTCID", "CreateBom/UTCID01")][Trait("Type", "N")]
    public async Task UTCID01_ValidBom_CreatedInactive()
    {
        var db = BomSetup.Db();
        var r = await new CreateBomCommandHandler(db).Handle(new CreateBomCommand(BomSetup.Req()), CancellationToken.None);
        Assert.True(r.IsSuccess, r.Error);
        var bom = await db.MstBoms.AsNoTracking().Include(b => b.DtlBomItems).SingleAsync();
        Assert.False(bom.IsActive);
        Assert.Equal("1.0", bom.Version);
        var line = Assert.Single(bom.DtlBomItems);
        Assert.Equal(2, line.Quantity);
        Assert.Equal(5, line.WastageRate);
    }

    [Fact(DisplayName = "CreateBom/UTCID02 – không chọn thành phẩm (validator)")]
    [Trait("Function", Function)][Trait("UTCID", "CreateBom/UTCID02")][Trait("Type", "A")]
    public void UTCID02_NoProduct_ValidatorRejects()
    {
        var r = new CreateBomCommandValidator().Validate(new CreateBomCommand(BomSetup.Req(productId: 0)));
        Assert.Contains("Vui lòng chọn thành phẩm.", r.Errors.Select(e => e.ErrorMessage));
    }

    [Fact(DisplayName = "CreateBom/UTCID03 – FG-01 đã có phiên bản 1.0")]
    [Trait("Function", Function)][Trait("UTCID", "CreateBom/UTCID03")][Trait("Type", "A")]
    public async Task UTCID03_DuplicateVersion_ReturnsError()
    {
        var db = BomSetup.Db();
        ProductionData.AddBom(db, ProductionData.Fg01, "1.0", active: true);
        var r = await new CreateBomCommandHandler(db).Handle(new CreateBomCommand(BomSetup.Req(version: "1.0")), CancellationToken.None);
        Assert.False(r.IsSuccess);
        Assert.Equal("Thành phẩm đã có định mức phiên bản 1.0.", r.Error);
    }

    [Fact(DisplayName = "CreateBom/UTCID04 – mã BOM-FG01 đã tồn tại")]
    [Trait("Function", Function)][Trait("UTCID", "CreateBom/UTCID04")][Trait("Type", "A")]
    public async Task UTCID04_DuplicateCode_ReturnsError()
    {
        var db = BomSetup.Db();
        var existing = ProductionData.AddBom(db, ProductionData.Fg01, "1.0", active: true);
        BomSetup.Rename(db, existing, "BOM-FG01");
        var r = await new CreateBomCommandHandler(db).Handle(new CreateBomCommand(BomSetup.Req(version: "2.0", code: "BOM-FG01")), CancellationToken.None);
        Assert.False(r.IsSuccess);
        Assert.Equal("Mã định mức BOM-FG01 đã tồn tại trong hệ thống.", r.Error);
    }

    [Fact(DisplayName = "CreateBom/UTCID05 – phiên bản 21 ký tự (validator)")]
    [Trait("Function", Function)][Trait("UTCID", "CreateBom/UTCID05")][Trait("Type", "B")]
    public void UTCID05_VersionTooLong_ValidatorRejects()
    {
        var r = new CreateBomCommandValidator().Validate(new CreateBomCommand(BomSetup.Req(version: new string('9', 21))));
        Assert.Contains("Phiên bản tối đa 20 ký tự.", r.Errors.Select(e => e.ErrorMessage));
    }
}

/// <summary>Report 5.1 – sheet UpdateBom (TamDM): sửa định mức chưa dùng cho lệnh nào (BR-06); đã dùng thì phải tạo phiên bản mới.</summary>
public class UpdateBomTests
{
    private const string Function = "UpdateBom";

    [Fact(DisplayName = "UpdateBom/UTCID01 – BOM-FG01 chưa dùng, RM-01 2 → 3: lưu định mức")]
    [Trait("Function", Function)][Trait("UTCID", "UpdateBom/UTCID01")][Trait("Type", "N")]
    public async Task UTCID01_UnusedBom_Saves()
    {
        var db = BomSetup.Db();
        var id = ProductionData.AddBom(db, ProductionData.Fg01, "1.0", active: true);
        var r = await new UpdateBomCommandHandler(db).Handle(new UpdateBomCommand(id, BomSetup.Req(qty: 3)), CancellationToken.None);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(3, (await db.DtlBomItems.AsNoTracking().SingleAsync()).Quantity);
    }

    [Fact(DisplayName = "UpdateBom/UTCID02 – BOM-FG01 đã dùng cho LSX0001")]
    [Trait("Function", Function)][Trait("UTCID", "UpdateBom/UTCID02")][Trait("Type", "A")]
    public async Task UTCID02_UsedBom_ReturnsError()
    {
        var db = BomSetup.Db();
        var id = ProductionData.AddBom(db, ProductionData.Fg01, "1.0", active: true);
        BomSetup.UseInOrder(db, id);
        var r = await new UpdateBomCommandHandler(db).Handle(new UpdateBomCommand(id, BomSetup.Req(qty: 3)), CancellationToken.None);
        Assert.False(r.IsSuccess);
        Assert.Equal("Định mức đã được dùng cho lệnh sản xuất nên không sửa được. Vui lòng tạo phiên bản mới.", r.Error);
    }

    [Fact(DisplayName = "UpdateBom/UTCID03 – FG-01 đã có phiên bản 2.0, sửa v1.0 thành 2.0")]
    [Trait("Function", Function)][Trait("UTCID", "UpdateBom/UTCID03")][Trait("Type", "A")]
    public async Task UTCID03_DuplicateVersion_ReturnsError()
    {
        var db = BomSetup.Db();
        var id = ProductionData.AddBom(db, ProductionData.Fg01, "1.0", active: true);
        ProductionData.AddBom(db, ProductionData.Fg01, "2.0", active: false);
        var r = await new UpdateBomCommandHandler(db).Handle(new UpdateBomCommand(id, BomSetup.Req(version: "2.0")), CancellationToken.None);
        Assert.False(r.IsSuccess);
        Assert.Equal("Thành phẩm đã có định mức phiên bản 2.0.", r.Error);
    }

    [Fact(DisplayName = "UpdateBom/UTCID04 – ghi chú kỹ thuật 501 ký tự (validator)")]
    [Trait("Function", Function)][Trait("UTCID", "UpdateBom/UTCID04")][Trait("Type", "B")]
    public void UTCID04_DescriptionTooLong_ValidatorRejects()
    {
        var r = new UpdateBomCommandValidator().Validate(new UpdateBomCommand(1, BomSetup.Req(description: new string('a', 501))));
        Assert.Contains("Ghi chú kỹ thuật tối đa 500 ký tự.", r.Errors.Select(e => e.ErrorMessage));
    }
}

/// <summary>Report 5.1 – sheet DeleteBom (TamDM): xóa định mức chưa từng dùng cho lệnh sản xuất; đã dùng thì gợi ý ngừng áp dụng.</summary>
public class DeleteBomTests
{
    private const string Function = "DeleteBom";

    [Fact(DisplayName = "DeleteBom/UTCID01 – định mức chưa dùng: xóa")]
    [Trait("Function", Function)][Trait("UTCID", "DeleteBom/UTCID01")][Trait("Type", "N")]
    public async Task UTCID01_UnusedBom_Deleted()
    {
        var db = BomSetup.Db();
        var id = ProductionData.AddBom(db, ProductionData.Fg01, "1.0", active: false);
        var r = await new DeleteBomCommandHandler(db).Handle(new DeleteBomCommand(id), CancellationToken.None);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Empty(db.MstBoms.AsNoTracking());
        Assert.Empty(db.DtlBomItems.AsNoTracking());
    }

    [Fact(DisplayName = "DeleteBom/UTCID02 – định mức đã dùng cho LSX0001")]
    [Trait("Function", Function)][Trait("UTCID", "DeleteBom/UTCID02")][Trait("Type", "A")]
    public async Task UTCID02_UsedBom_ReturnsError()
    {
        var db = BomSetup.Db();
        var id = ProductionData.AddBom(db, ProductionData.Fg01, "1.0", active: true);
        BomSetup.UseInOrder(db, id);
        var r = await new DeleteBomCommandHandler(db).Handle(new DeleteBomCommand(id), CancellationToken.None);
        Assert.False(r.IsSuccess);
        Assert.Equal("Định mức đã được dùng cho lệnh sản xuất nên không hủy được. Bạn có thể ngừng áp dụng định mức.", r.Error);
    }

    [Fact(DisplayName = "DeleteBom/UTCID03 – định mức id 999999 không tồn tại")]
    [Trait("Function", Function)][Trait("UTCID", "DeleteBom/UTCID03")][Trait("Type", "A")]
    public async Task UTCID03_UnknownBom_ReturnsError()
    {
        var db = BomSetup.Db();
        var r = await new DeleteBomCommandHandler(db).Handle(new DeleteBomCommand(999_999), CancellationToken.None);
        Assert.False(r.IsSuccess);
        Assert.Equal("Không tìm thấy định mức hoặc định mức không còn khả dụng.", r.Error);
    }
}
