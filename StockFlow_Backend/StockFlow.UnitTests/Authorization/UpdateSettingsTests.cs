using Microsoft.EntityFrameworkCore;
using Moq;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Settings.Commands;
using StockFlow.Application.Features.Settings.DTOs;
using StockFlow.UnitTests.Common;
using Xunit;

namespace StockFlow.UnitTests.Authorization;

/// <summary>Report 5.1 – sheet UpdateSettings (TamDM): Admin sửa thiết lập đơn hàng (giới hạn đổi trả, quy tắc sinh mã, tiền tố). UTCID09 (403) – ApiPermissionTests.</summary>
public class UpdateSettingsTests
{
    private const string Function = "UpdateSettings";

    private static UpdateOrderSettingDto Dto(string? rule = "datetime", int days = 30, string prefix = "HD") =>
        new() { OrderCodeRule = rule!, ReturnTimeLimitDays = days, OrderCodePrefix = prefix };

    private static async Task<(TestStockFlowDbContext Db, Result<OrderSettingDto> R)> Update(UpdateOrderSettingDto dto, bool withRecord = true,
        Mock<ICurrentUserService>? user = null)
    {
        var db = AuthData.Db();
        if (withRecord) SalesData.SeedOrderSettings(db);
        var r = await new UpdateOrderSettingsCommandHandler(db, (user ?? AuthData.AdminUser()).Object)
            .Handle(new UpdateOrderSettingsCommand(dto), CancellationToken.None);
        return (db, r);
    }

    private static async Task AssertRejected(UpdateOrderSettingDto dto, string message, Mock<ICurrentUserService>? user = null)
    {
        var (db, r) = await Update(dto, user: user);
        Assert.False(r.IsSuccess);
        Assert.Equal(message, r.Error);
        Assert.Null((await db.MstOrderSettings.AsNoTracking().SingleAsync()).UpdatedBy);
    }

    [Fact(DisplayName = "UpdateSettings/UTCID01 – orderCodeRule \"datetime\", 30 ngày, tiền tố HD: DATETIME, updatedBy 1")]
    [Trait("Function", Function)][Trait("UTCID", "UpdateSettings/UTCID01")][Trait("Type", "N")]
    public async Task UTCID01_Valid_Saved()
    {
        var (db, r) = await Update(Dto());
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal("DATETIME", r.Value!.OrderCodeRule);
        Assert.Equal(AuthData.Admin, r.Value.UpdatedBy);
        Assert.Equal("DATETIME", (await db.MstOrderSettings.AsNoTracking().SingleAsync()).OrderCodeRule);
    }

    [Fact(DisplayName = "UpdateSettings/UTCID02 – chưa có dòng thiết lập: tạo mới")]
    [Trait("Function", Function)][Trait("UTCID", "UpdateSettings/UTCID02")][Trait("Type", "N")]
    public async Task UTCID02_NoRecord_Created()
    {
        var (db, r) = await Update(Dto(), withRecord: false);
        Assert.True(r.IsSuccess, r.Error);
        var saved = await db.MstOrderSettings.AsNoTracking().SingleAsync();
        Assert.Equal(1, saved.SettingId);
        Assert.Equal("DATETIME", saved.OrderCodeRule);
    }

    [Fact(DisplayName = "UpdateSettings/UTCID03 – orderCodeRule null, tiền tố \"   \": SEQUENTIAL, HD")]
    [Trait("Function", Function)][Trait("UTCID", "UpdateSettings/UTCID03")][Trait("Type", "B")]
    public async Task UTCID03_Defaults_Applied()
    {
        var (_, r) = await Update(Dto(rule: null, prefix: "   "));
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal("SEQUENTIAL", r.Value!.OrderCodeRule);
        Assert.Equal("HD", r.Value.OrderCodePrefix);
    }

    [Fact(DisplayName = "UpdateSettings/UTCID04 – returnTimeLimitDays = 0")]
    [Trait("Function", Function)][Trait("UTCID", "UpdateSettings/UTCID04")][Trait("Type", "B")]
    public async Task UTCID04_ZeroDays_Saved()
    {
        var (_, r) = await Update(Dto(days: 0));
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(0, r.Value!.ReturnTimeLimitDays);
    }

    [Fact(DisplayName = "UpdateSettings/UTCID05 – returnTimeLimitDays = −1")]
    [Trait("Function", Function)][Trait("UTCID", "UpdateSettings/UTCID05")][Trait("Type", "A")]
    public Task UTCID05_NegativeDays_ReturnsError() =>
        AssertRejected(Dto(days: -1), "Số ngày giới hạn đổi trả phải lớn hơn hoặc bằng 0.");

    [Fact(DisplayName = "UpdateSettings/UTCID06 – orderCodeRule \"INVALID\"")]
    [Trait("Function", Function)][Trait("UTCID", "UpdateSettings/UTCID06")][Trait("Type", "A")]
    public Task UTCID06_InvalidRule_ReturnsError() =>
        AssertRejected(Dto(rule: "INVALID"), "Quy tắc sinh mã không hợp lệ: INVALID. Chấp nhận: SEQUENTIAL, DATETIME, RANDOM.");

    [Fact(DisplayName = "UpdateSettings/UTCID07 – tiền tố 11 ký tự")]
    [Trait("Function", Function)][Trait("UTCID", "UpdateSettings/UTCID07")][Trait("Type", "A")]
    public Task UTCID07_LongPrefix_ReturnsError() =>
        AssertRejected(Dto(prefix: new string('H', 11)), "Tiền tố mã chứng từ không được vượt quá 10 ký tự.");

    [Fact(DisplayName = "UpdateSettings/UTCID08 – Manager (có SALES_APPROVE, không phải Admin)")]
    [Trait("Function", Function)][Trait("UTCID", "UpdateSettings/UTCID08")][Trait("Type", "A")]
    public Task UTCID08_Manager_ReturnsError() =>
        AssertRejected(Dto(), "Chỉ Quản trị viên (Admin) mới có quyền thay đổi thiết lập đơn hàng và quy tắc giao dịch.",
            CurrentUser.WithWarehouses(AuthData.Manager, TestData.K001));
}
