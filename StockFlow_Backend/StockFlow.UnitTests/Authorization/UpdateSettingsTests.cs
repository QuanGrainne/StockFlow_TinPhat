using Microsoft.EntityFrameworkCore;
using Moq;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Settings.Commands;
using StockFlow.Application.Features.Settings.DTOs;
using StockFlow.UnitTests.Common;
using Xunit;

namespace StockFlow.UnitTests.Authorization;

/// <summary>
/// Report 5.1 – sheet UpdateSettings: lưu cài đặt giao dịch (cho phép bán hàng vượt tồn kho, cho phép chuyển hàng khi âm kho).
/// Từ 24/11/2026 chỉ còn 2 tuỳ chọn; quyền lưu theo chức năng "Cài đặt" (feat-settings) kiểm ở controller, handler không gán cứng Admin.
/// UTCID05 (403 thiếu quyền) – ApiPermissionTests.
/// </summary>
public class UpdateSettingsTests
{
    private const string Function = "UpdateSettings";

    private static UpdateOrderSettingDto Dto(bool sale, bool transfer) =>
        new() { AllowNegativeStockSale = sale, AllowNegativeStockTransfer = transfer };

    private static async Task<(TestStockFlowDbContext Db, Result<OrderSettingDto> R)> Update(UpdateOrderSettingDto dto, bool withRecord = true,
        Mock<ICurrentUserService>? user = null)
    {
        var db = AuthData.Db();
        if (withRecord) SalesData.SeedOrderSettings(db);
        var r = await new UpdateOrderSettingsCommandHandler(db, (user ?? AuthData.AdminUser()).Object)
            .Handle(new UpdateOrderSettingsCommand(dto), CancellationToken.None);
        return (db, r);
    }

    [Fact(DisplayName = "UpdateSettings/UTCID01 – tắt bán vượt tồn kho và chuyển hàng âm kho: lưu false / false, updatedBy 1")]
    [Trait("Function", Function)][Trait("UTCID", "UpdateSettings/UTCID01")][Trait("Type", "N")]
    public async Task UTCID01_TurnOffBoth_Saved()
    {
        var (db, r) = await Update(Dto(false, false));
        Assert.True(r.IsSuccess, r.Error);
        Assert.False(r.Value!.AllowNegativeStockSale);
        Assert.False(r.Value.AllowNegativeStockTransfer);
        Assert.Equal(AuthData.Admin, r.Value.UpdatedBy);
        var saved = await db.MstOrderSettings.AsNoTracking().SingleAsync();
        Assert.False(saved.AllowNegativeStockSale);
        Assert.False(saved.AllowNegativeStockTransfer);
    }

    [Fact(DisplayName = "UpdateSettings/UTCID02 – chưa có dòng cài đặt: tạo mới")]
    [Trait("Function", Function)][Trait("UTCID", "UpdateSettings/UTCID02")][Trait("Type", "N")]
    public async Task UTCID02_NoRecord_Created()
    {
        var (db, r) = await Update(Dto(true, false), withRecord: false);
        Assert.True(r.IsSuccess, r.Error);
        var saved = await db.MstOrderSettings.AsNoTracking().SingleAsync();
        Assert.Equal(1, saved.SettingId);
        Assert.True(saved.AllowNegativeStockSale);
        Assert.False(saved.AllowNegativeStockTransfer);
    }

    [Fact(DisplayName = "UpdateSettings/UTCID03 – bật lại cả hai (mặc định cho phép)")]
    [Trait("Function", Function)][Trait("UTCID", "UpdateSettings/UTCID03")][Trait("Type", "N")]
    public async Task UTCID03_TurnOnBoth_Saved()
    {
        var (_, r) = await Update(Dto(true, true));
        Assert.True(r.IsSuccess, r.Error);
        Assert.True(r.Value!.AllowNegativeStockSale);
        Assert.True(r.Value.AllowNegativeStockTransfer);
    }

    [Fact(DisplayName = "UpdateSettings/UTCID04 – Manager (không phải Admin) lưu được: quyền theo chức năng Cài đặt, không gán cứng Admin")]
    [Trait("Function", Function)][Trait("UTCID", "UpdateSettings/UTCID04")][Trait("Type", "N")]
    public async Task UTCID04_Manager_Saved()
    {
        var (_, r) = await Update(Dto(false, true), user: CurrentUser.WithWarehouses(AuthData.Manager, TestData.K001));
        Assert.True(r.IsSuccess, r.Error);
        Assert.False(r.Value!.AllowNegativeStockSale);
        Assert.Equal(AuthData.Manager, r.Value.UpdatedBy);
    }
}
