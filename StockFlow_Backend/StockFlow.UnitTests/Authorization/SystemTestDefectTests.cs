using StockFlow.Application.Features.Roles.Commands;
using StockFlow.Application.Features.Roles.Common;
using StockFlow.Application.Features.Roles.DTOs;
using StockFlow.Infrastructure.Services;
using StockFlow.UnitTests.Common;
using Xunit;

namespace StockFlow.UnitTests.Authorization;

/// <summary>Hồi quy các lỗi phân quyền tìm thấy ở system test Report 5.3 (DEF-E2E-04, 05, 06, 08).</summary>
public class SystemTestDefectTests
{
    private static Task<StockFlow.Application.Common.Result<RoleDto>> CreateRole(TestStockFlowDbContext db, string name, string code) =>
        new CreateRoleCommandHandler(db).Handle(new CreateRoleCommand(new CreateRoleRequest(name, code, null, null)), CancellationToken.None);

    [Theory(DisplayName = "DEF-E2E-04 – không tạo được vai trò trùng tên hiển thị hoặc mã của vai trò có sẵn")]
    [InlineData("Quản lý", "ROLE_MANAGER")]
    [InlineData("Quản lý", "ROLE_KHAC")]
    [InlineData("Vai trò mới", "ROLE_MANAGER")]
    [InlineData("Vai trò mới", "manager")]
    [InlineData("Manager", "ROLE_KHAC")]
    public async Task CreateRole_DuplicateOfBuiltIn_Rejected(string name, string code)
    {
        var db = AuthData.Db();
        var r = await CreateRole(db, name, code);
        Assert.False(r.IsSuccess);
        Assert.Contains("đã tồn tại trong hệ thống", r.Error);
        Assert.Equal(5, db.SecRoles.Count());
    }

    [Fact(DisplayName = "DEF-E2E-04 – vai trò tự tạo: lần 2 trùng mã [CODE:…] bị từ chối, vai trò khác vẫn tạo được")]
    public async Task CreateRole_CustomCode_DuplicateRejected()
    {
        var db = AuthData.Db();
        Assert.True((await CreateRole(db, "Kế toán", "ROLE_ACCOUNTANT")).IsSuccess);
        Assert.False((await CreateRole(db, "Kế toán tổng hợp", "role_accountant")).IsSuccess);
        Assert.True((await CreateRole(db, "Thu ngân", "ROLE_CASHIER")).IsSuccess);
        Assert.Equal(7, db.SecRoles.Count());
    }

    [Fact(DisplayName = "DEF-E2E-05 – Admin bỏ tick hết chức năng trên ma trận vẫn có mọi chức năng")]
    public async Task Admin_UntickedMatrix_StillHasAllFeatures()
    {
        var db = AuthData.Db();
        AuthData.GivePermissions(db, AuthData.AdminRole, FeatureConstants.ConfiguredMarker);
        var features = await new UserPermissionService(db).GetFeatureCodesAsync(AuthData.Admin);
        foreach (var f in FeatureConstants.Features)
            Assert.Contains(f.Code, features);
    }

    [Fact(DisplayName = "DEF-E2E-06/08 – quyền mặc định: SalesStaff có SALES_DELETE, WarehouseStaff có PURCHASE_UPDATE")]
    public void DefaultPermissions_CoverCancelAndEdit()
    {
        Assert.Contains("SALES_DELETE", PermissionConstants.GetDefaultPermissionCodes("ROLE_SALES"));
        Assert.DoesNotContain("SALES_APPROVE", PermissionConstants.GetDefaultPermissionCodes("ROLE_SALES"));
        Assert.Contains("PURCHASE_UPDATE", PermissionConstants.GetDefaultPermissionCodes("ROLE_WAREHOUSE"));
    }
}
