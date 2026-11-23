using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Features.Roles.Commands;
using StockFlow.Application.Features.Roles.Common;
using StockFlow.Application.Features.Roles.DTOs;
using StockFlow.Domain.Entities;
using StockFlow.Infrastructure.Services;
using StockFlow.UnitTests.Common;
using Xunit;

namespace StockFlow.UnitTests.Authorization;

internal static class RoleSetup
{
    /// <summary>9 phân hệ của ma trận quyền; mọi phân hệ chỉ READ, riêng SALES có READ / CREATE / UPDATE.</summary>
    public static List<PermissionModuleDto> SalesMatrix() =>
        PermissionConstants.Modules.Select(m => new PermissionModuleDto(m.Id, m.Stt, m.Name, m.DisplayCode, m.Description,
            Read: true, Create: m.ModuleKey == "SALES", Update: m.ModuleKey == "SALES", Delete: false, Approve: false)).ToList();

    public static List<string> ModuleCodes(TestStockFlowDbContext db, int roleId) =>
        AuthData.RolePermissionCodes(db, roleId).Where(c => !FeatureConstants.IsFeatureCode(c)).Select(c => c!).OrderBy(c => c, StringComparer.Ordinal).ToList();

    public static List<string> FeatureCodes(TestStockFlowDbContext db, int roleId) =>
        AuthData.RolePermissionCodes(db, roleId).Where(c => FeatureConstants.IsFeatureCode(c) && c != FeatureConstants.ConfiguredMarker)
            .Select(c => c!).OrderBy(c => c, StringComparer.Ordinal).ToList();
}

/// <summary>Report 5.1 – sheet SaveRolePermissions (TamDM): lưu ma trận 9 phân hệ × 5 thao tác của vai trò, giữ mã FEAT_*. UTCID06 (403) – ApiPermissionTests.</summary>
public class SaveRolePermissionsTests
{
    private const string Function = "SaveRolePermissions";

    /// <summary>ROLE_SALES (SalesStaff) đã có FEAT_POS và SALES_READ.</summary>
    private static TestStockFlowDbContext Db()
    {
        var db = AuthData.Db();
        AuthData.GivePermissions(db, AuthData.SalesRole, "FEAT_POS", "SALES_READ");
        return db;
    }

    private static Task<Result<bool>> Save(TestStockFlowDbContext db, string roleCode, List<PermissionModuleDto> modules) =>
        new SaveRolePermissionsCommandHandler(db).Handle(new SaveRolePermissionsCommand(roleCode, modules), CancellationToken.None);

    [Fact(DisplayName = "SaveRolePermissions/UTCID01 – ROLE_SALES: SALES đọc/tạo/sửa, phân hệ khác chỉ đọc; giữ FEAT_POS")]
    [Trait("Function", Function)][Trait("UTCID", "SaveRolePermissions/UTCID01")][Trait("Type", "N")]
    public async Task UTCID01_Matrix_Saved_FeatureKept()
    {
        var db = Db();
        var r = await Save(db, "ROLE_SALES", RoleSetup.SalesMatrix());
        Assert.True(r.IsSuccess, r.Error);
        var expected = PermissionConstants.Modules.Select(m => $"{m.ModuleKey}_READ").Concat(new[] { "SALES_CREATE", "SALES_UPDATE" }).OrderBy(c => c, StringComparer.Ordinal);
        Assert.Equal(expected, RoleSetup.ModuleCodes(db, AuthData.SalesRole));
        Assert.Equal(new[] { "FEAT_POS" }, RoleSetup.FeatureCodes(db, AuthData.SalesRole));
    }

    [Fact(DisplayName = "SaveRolePermissions/UTCID02 – danh sách phân hệ rỗng: không còn quyền phân hệ, giữ FEAT_POS")]
    [Trait("Function", Function)][Trait("UTCID", "SaveRolePermissions/UTCID02")][Trait("Type", "B")]
    public async Task UTCID02_EmptyList_NoModulePermission()
    {
        var db = Db();
        var r = await Save(db, "ROLE_SALES", new List<PermissionModuleDto>());
        Assert.True(r.IsSuccess, r.Error);
        Assert.Empty(RoleSetup.ModuleCodes(db, AuthData.SalesRole));
        Assert.Equal(new[] { "FEAT_POS" }, RoleSetup.FeatureCodes(db, AuthData.SalesRole));
    }

    [Fact(DisplayName = "SaveRolePermissions/UTCID03 – phân hệ lạ \"[XYZ]\": không còn quyền phân hệ")]
    [Trait("Function", Function)][Trait("UTCID", "SaveRolePermissions/UTCID03")][Trait("Type", "A")]
    public async Task UTCID03_UnknownModule_Ignored()
    {
        var db = Db();
        var r = await Save(db, "ROLE_SALES", new List<PermissionModuleDto> { new("MOD-XX", "99", "Lạ", "[XYZ]", "", true, true, true, true, true) });
        Assert.True(r.IsSuccess, r.Error);
        Assert.Empty(RoleSetup.ModuleCodes(db, AuthData.SalesRole));
        Assert.Equal(new[] { "FEAT_POS" }, RoleSetup.FeatureCodes(db, AuthData.SalesRole));
    }

    [Fact(DisplayName = "SaveRolePermissions/UTCID04 – thiếu dòng sec_permissions: tự tạo đủ 45 mã phân hệ")]
    [Trait("Function", Function)][Trait("UTCID", "SaveRolePermissions/UTCID04")][Trait("Type", "N")]
    public async Task UTCID04_MissingPermissionRows_Created()
    {
        var db = Db();
        Assert.Equal(1, await db.SecPermissions.CountAsync(p => !p.PermissionCode!.StartsWith("FEAT_")));
        var r = await Save(db, "ROLE_SALES", RoleSetup.SalesMatrix());
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(45, await db.SecPermissions.CountAsync(p => !p.PermissionCode!.StartsWith("FEAT_")));
        Assert.Equal(11, RoleSetup.ModuleCodes(db, AuthData.SalesRole).Count);
    }

    [Fact(DisplayName = "SaveRolePermissions/UTCID05 – vai trò ROLE_NOT_EXIST")]
    [Trait("Function", Function)][Trait("UTCID", "SaveRolePermissions/UTCID05")][Trait("Type", "A")]
    public async Task UTCID05_UnknownRole_ReturnsError()
    {
        var r = await Save(Db(), "ROLE_NOT_EXIST", RoleSetup.SalesMatrix());
        Assert.False(r.IsSuccess);
        Assert.Equal("Không tìm thấy vai trò 'ROLE_NOT_EXIST' trong hệ thống.", r.Error);
    }
}

/// <summary>Report 5.1 – sheet SaveFeatureMatrix (TamDM): lưu ma trận chức năng navbar theo vai trò; kiểm hết rồi mới ghi. UTCID07 (403) – ApiPermissionTests.</summary>
public class SaveFeatureMatrixTests
{
    private const string Function = "SaveFeatureMatrix";

    private static Task<Result<bool>> Save(TestStockFlowDbContext db, Dictionary<string, List<string>> matrix) =>
        new SaveRoleFeaturesCommandHandler(db).Handle(new SaveRoleFeaturesCommand(matrix), CancellationToken.None);

    [Fact(DisplayName = "SaveFeatureMatrix/UTCID01 – ROLE_SALES [feat-pos, feat-invoices], ROLE_WAREHOUSE [feat-transfers]")]
    [Trait("Function", Function)][Trait("UTCID", "SaveFeatureMatrix/UTCID01")][Trait("Type", "N")]
    public async Task UTCID01_Matrix_Saved()
    {
        var db = AuthData.Db();
        var r = await Save(db, new() { ["ROLE_SALES"] = new() { "feat-pos", "feat-invoices" }, ["ROLE_WAREHOUSE"] = new() { "feat-transfers" } });
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(new[] { "FEAT_INVOICES", "FEAT_POS" }, RoleSetup.FeatureCodes(db, AuthData.SalesRole));
        Assert.Equal(new[] { "FEAT_TRANSFERS" }, RoleSetup.FeatureCodes(db, AuthData.WarehouseRole));
        Assert.Contains(FeatureConstants.ConfiguredMarker, AuthData.RolePermissionCodes(db, AuthData.SalesRole));
    }

    [Fact(DisplayName = "SaveFeatureMatrix/UTCID02 – ROLE_PRODUCTION []: không còn chức năng")]
    [Trait("Function", Function)][Trait("UTCID", "SaveFeatureMatrix/UTCID02")][Trait("Type", "B")]
    public async Task UTCID02_EmptyFeatures_NoneLeft()
    {
        var db = AuthData.Db();
        AuthData.GivePermissions(db, AuthData.ProductionRole, "FEAT_PRODUCTION_ORDERS");
        var r = await Save(db, new() { ["ROLE_PRODUCTION"] = new() });
        Assert.True(r.IsSuccess, r.Error);
        Assert.Empty(RoleSetup.FeatureCodes(db, AuthData.ProductionRole));
    }

    [Fact(DisplayName = "SaveFeatureMatrix/UTCID03 – ROLE_ADMIN []: vẫn giữ FEAT_ROLES, FEAT_ROLE_MATRIX")]
    [Trait("Function", Function)][Trait("UTCID", "SaveFeatureMatrix/UTCID03")][Trait("Type", "B")]
    public async Task UTCID03_AdminEmpty_KeepsLockedFeatures()
    {
        var db = AuthData.Db();
        var r = await Save(db, new() { ["ROLE_ADMIN"] = new() });
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(new[] { "FEAT_ROLES", "FEAT_ROLE_MATRIX" }, RoleSetup.FeatureCodes(db, AuthData.AdminRole));
    }

    [Fact(DisplayName = "SaveFeatureMatrix/UTCID04 – ma trận rỗng {}")]
    [Trait("Function", Function)][Trait("UTCID", "SaveFeatureMatrix/UTCID04")][Trait("Type", "A")]
    public async Task UTCID04_Empty_ReturnsError()
    {
        var r = await Save(AuthData.Db(), new());
        Assert.False(r.IsSuccess);
        Assert.Equal("Không có dữ liệu phân quyền để lưu.", r.Error);
    }

    [Fact(DisplayName = "SaveFeatureMatrix/UTCID05 – chức năng feat-unknown")]
    [Trait("Function", Function)][Trait("UTCID", "SaveFeatureMatrix/UTCID05")][Trait("Type", "A")]
    public async Task UTCID05_UnknownFeature_ReturnsError()
    {
        var db = AuthData.Db();
        var r = await Save(db, new() { ["ROLE_SALES"] = new() { "feat-unknown" } });
        Assert.False(r.IsSuccess);
        Assert.Equal("Chức năng 'feat-unknown' không hợp lệ.", r.Error);
        Assert.Empty(AuthData.RolePermissionCodes(db, AuthData.SalesRole));
    }

    [Fact(DisplayName = "SaveFeatureMatrix/UTCID06 – có vai trò ROLE_X không tồn tại: không lưu gì")]
    [Trait("Function", Function)][Trait("UTCID", "SaveFeatureMatrix/UTCID06")][Trait("Type", "A")]
    public async Task UTCID06_UnknownRole_NothingSaved()
    {
        var db = AuthData.Db();
        var r = await Save(db, new() { ["ROLE_SALES"] = new() { "feat-pos" }, ["ROLE_X"] = new() { "feat-pos" } });
        Assert.False(r.IsSuccess);
        Assert.Equal("Không tìm thấy vai trò 'ROLE_X' trong hệ thống.", r.Error);
        Assert.Empty(AuthData.RolePermissionCodes(db, AuthData.SalesRole));
        Assert.Empty(db.SecPermissions.AsNoTracking());
    }
}

/// <summary>Report 5.1 – sheet DeleteRole (QuanDN): xóa vai trò không phải Admin và chưa gán cho ai.</summary>
public class DeleteRoleTests
{
    private const string Function = "DeleteRole";

    private static Task<Result<bool>> Delete(TestStockFlowDbContext db, string key) =>
        new DeleteRoleCommandHandler(db).Handle(new DeleteRoleCommand(key), CancellationToken.None);

    [Fact(DisplayName = "DeleteRole/UTCID01 – vai trò KIEMKE chưa gán: xóa")]
    [Trait("Function", Function)][Trait("UTCID", "DeleteRole/UTCID01")][Trait("Type", "N")]
    public async Task UTCID01_Unused_Deleted()
    {
        var db = AuthData.Db();
        db.SecRoles.Add(new SecRole { RoleId = 6, RoleName = "KIEMKE" });
        TestData.SaveAndDetach(db);
        var r = await Delete(db, "KIEMKE");
        Assert.True(r.IsSuccess, r.Error);
        Assert.False(await db.SecRoles.AnyAsync(x => x.RoleName == "KIEMKE"));
    }

    [Fact(DisplayName = "DeleteRole/UTCID02 – vai trò Admin")]
    [Trait("Function", Function)][Trait("UTCID", "DeleteRole/UTCID02")][Trait("Type", "A")]
    public async Task UTCID02_Admin_ReturnsError()
    {
        var db = AuthData.Db();
        var r = await Delete(db, "Admin");
        Assert.False(r.IsSuccess);
        Assert.Equal("Không thể xóa vai trò Quản trị viên (Admin) mặc định của hệ thống.", r.Error);
        Assert.True(await db.SecRoles.AnyAsync(x => x.RoleId == AuthData.AdminRole));
    }

    [Fact(DisplayName = "DeleteRole/UTCID03 – SalesStaff đang gán cho 3 nhân sự")]
    [Trait("Function", Function)][Trait("UTCID", "DeleteRole/UTCID03")][Trait("Type", "A")]
    public async Task UTCID03_Assigned_ReturnsError()
    {
        var db = AuthData.Db();
        db.SecUsers.Add(new SecUser { UserId = 6, Username = "sales02", FullName = "Nhân viên bán hàng 02", IsActive = true });
        db.JncUserRoles.Add(new JncUserRole { UserId = 6, RoleId = AuthData.SalesRole });
        TestData.SaveAndDetach(db);
        var r = await Delete(db, "SalesStaff");
        Assert.False(r.IsSuccess);
        Assert.Equal("Vai trò đang được phân công cho 3 nhân sự. Vui lòng chuyển nhân sự sang vai trò khác trước khi xóa.", r.Error);
    }

    [Fact(DisplayName = "DeleteRole/UTCID04 – vai trò XYZ không tồn tại")]
    [Trait("Function", Function)][Trait("UTCID", "DeleteRole/UTCID04")][Trait("Type", "A")]
    public async Task UTCID04_Unknown_ReturnsError()
    {
        var r = await Delete(AuthData.Db(), "XYZ");
        Assert.False(r.IsSuccess);
        Assert.Equal("Không tìm thấy vai trò 'XYZ'.", r.Error);
    }
}

/// <summary>Report 5.1 – sheet GetPermissionCodes (TamDM): UserPermissionService tính mã quyền hiệu lực từ DB (Admin, ma trận, mặc định, nhiều vai trò, khóa, cache).</summary>
public class GetPermissionCodesTests
{
    private const string Function = "GetPermissionCodes";

    private static Task<IReadOnlySet<string>> Codes(TestStockFlowDbContext db, int userId) =>
        new UserPermissionService(db).GetPermissionCodesAsync(userId, CancellationToken.None);

    [Fact(DisplayName = "GetPermissionCodes/UTCID01 – admin: 45 mã (9 phân hệ × 5 thao tác)")]
    [Trait("Function", Function)][Trait("UTCID", "GetPermissionCodes/UTCID01")][Trait("Type", "N")]
    public async Task UTCID01_Admin_AllCodes() => Assert.Equal(45, (await Codes(AuthData.Db(), AuthData.Admin)).Count);

    [Fact(DisplayName = "GetPermissionCodes/UTCID02 – Manager có ma trận đã lưu {AUTH_READ, SALES_READ, SALES_CREATE}")]
    [Trait("Function", Function)][Trait("UTCID", "GetPermissionCodes/UTCID02")][Trait("Type", "N")]
    public async Task UTCID02_SavedMatrix_Used()
    {
        var db = AuthData.Db();
        AuthData.GivePermissions(db, AuthData.ManagerRole, "AUTH_READ", "SALES_READ", "SALES_CREATE");
        Assert.Equal(new[] { "AUTH_READ", "SALES_CREATE", "SALES_READ" }, (await Codes(db, AuthData.Manager)).OrderBy(c => c));
    }

    [Fact(DisplayName = "GetPermissionCodes/UTCID03 – SalesStaff chưa có ma trận: 12 mã mặc định ROLE_SALES")]
    [Trait("Function", Function)][Trait("UTCID", "GetPermissionCodes/UTCID03")][Trait("Type", "N")]
    public async Task UTCID03_NoMatrix_Defaults()
    {
        var codes = await Codes(AuthData.Db(), AuthData.Sales);
        Assert.Equal(12, codes.Count);
        Assert.Equal(PermissionConstants.GetDefaultPermissionCodes("ROLE_SALES").OrderBy(c => c), codes.OrderBy(c => c));
    }

    [Fact(DisplayName = "GetPermissionCodes/UTCID04 – người dùng 2 vai trò có ma trận: hợp quyền của cả hai")]
    [Trait("Function", Function)][Trait("UTCID", "GetPermissionCodes/UTCID04")][Trait("Type", "N")]
    public async Task UTCID04_TwoRoles_Union()
    {
        var db = AuthData.Db();
        AuthData.GivePermissions(db, AuthData.WarehouseRole, "STOCK_READ", "STOCK_CREATE");
        AuthData.GivePermissions(db, AuthData.ProductionRole, "PROD_READ");
        db.JncUserRoles.Add(new JncUserRole { UserId = AuthData.Warehouse, RoleId = AuthData.ProductionRole });
        TestData.SaveAndDetach(db);
        Assert.Equal(new[] { "PROD_READ", "STOCK_CREATE", "STOCK_READ" }, (await Codes(db, AuthData.Warehouse)).OrderBy(c => c));
    }

    [Fact(DisplayName = "GetPermissionCodes/UTCID05 – SalesStaff chỉ có mã chức năng FEAT_POS: vẫn 12 mã mặc định")]
    [Trait("Function", Function)][Trait("UTCID", "GetPermissionCodes/UTCID05")][Trait("Type", "N")]
    public async Task UTCID05_OnlyFeatureCode_Defaults()
    {
        var db = AuthData.Db();
        AuthData.GivePermissions(db, AuthData.SalesRole, "FEAT_POS");
        Assert.Equal(PermissionConstants.GetDefaultPermissionCodes("ROLE_SALES").OrderBy(c => c), (await Codes(db, AuthData.Sales)).OrderBy(c => c));
    }

    [Fact(DisplayName = "GetPermissionCodes/UTCID06 – tài khoản bị khóa: rỗng")]
    [Trait("Function", Function)][Trait("UTCID", "GetPermissionCodes/UTCID06")][Trait("Type", "A")]
    public async Task UTCID06_Locked_Empty() => Assert.Empty(await Codes(AuthData.Db(), AuthData.Locked));

    [Fact(DisplayName = "GetPermissionCodes/UTCID07 – userId 999999: rỗng")]
    [Trait("Function", Function)][Trait("UTCID", "GetPermissionCodes/UTCID07")][Trait("Type", "A")]
    public async Task UTCID07_Unknown_Empty() => Assert.Empty(await Codes(AuthData.Db(), 999_999));

    [Fact(DisplayName = "GetPermissionCodes/UTCID08 – gọi 2 lần trong cùng scope, DB đổi giữa 2 lần: trả kết quả đã cache của lần đầu")]
    [Trait("Function", Function)][Trait("UTCID", "GetPermissionCodes/UTCID08")][Trait("Type", "N")]
    public async Task UTCID08_SameScope_Cached()
    {
        var db = AuthData.Db();
        var service = new UserPermissionService(db);
        var first = (await service.GetPermissionCodesAsync(AuthData.Sales)).OrderBy(c => c).ToList();
        AuthData.GivePermissions(db, AuthData.SalesRole, "SALES_APPROVE");
        var second = (await service.GetPermissionCodesAsync(AuthData.Sales)).OrderBy(c => c).ToList();
        Assert.Equal(first, second);
        Assert.Equal(new[] { "SALES_APPROVE" }, (await Codes(db, AuthData.Sales)).ToList()); // scope mới đọc lại DB
    }
}
