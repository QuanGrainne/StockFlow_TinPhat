using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Moq;
using StockFlow.Application.Common;
using StockFlow.Application.Features.WarehousePermissions.Commands;
using StockFlow.Application.Features.WarehousePermissions.DTOs;
using StockFlow.Application.Features.WarehousePermissions.Queries;
using StockFlow.Domain.Entities;
using StockFlow.Infrastructure.Services;
using StockFlow.UnitTests.Common;
using Xunit;

namespace StockFlow.UnitTests.Warehouse;

internal static class WarehouseSetup
{
    /// <summary>
    /// CurrentUserService thật (Infrastructure) đọc người dùng từ HttpContext.User (claim như JWT) và đọc quyền kho từ DB.
    /// tokenWarehouses = claim WarehouseId ghi trong token lúc đăng nhập (handler không được tin claim này).
    /// </summary>
    public static CurrentUserService Service(TestStockFlowDbContext db, int? userId, string role = "WarehouseStaff", params int[] tokenWarehouses)
    {
        var claims = new List<Claim>();
        if (userId.HasValue)
        {
            claims.Add(new Claim(ClaimTypes.NameIdentifier, userId.Value.ToString()));
            claims.Add(new Claim(ClaimTypes.Role, role));
            claims.AddRange(tokenWarehouses.Select(w => new Claim("WarehouseId", w.ToString())));
        }
        var identity = userId.HasValue ? new ClaimsIdentity(claims, "Bearer") : new ClaimsIdentity();
        var accessor = new Mock<IHttpContextAccessor>();
        accessor.SetupGet(a => a.HttpContext).Returns(new DefaultHttpContext { User = new ClaimsPrincipal(identity) });
        return new CurrentUserService(accessor.Object, db);
    }

    /// <summary>Chỉ để lại các kho được tích cho người dùng (jnc_user_warehouse_access).</summary>
    public static void OnlyTicked(TestStockFlowDbContext db, int userId, params int[] warehouseIds)
    {
        db.JncUserWarehouseAccesses.RemoveRange(db.JncUserWarehouseAccesses.Where(a => a.UserId == userId));
        db.SaveChanges();
        db.JncUserWarehouseAccesses.AddRange(warehouseIds.Select(w => new JncUserWarehouseAccess { UserId = userId, WarehouseId = w }));
        TestData.SaveAndDetach(db);
    }
}

/// <summary>
/// Report 5.1 – sheet HasWarehouseAccess (TamDM): CurrentUserService.HasWarehouseAccessAsync chỉ trả true khi kho được tích
/// trong jnc_user_warehouse_access và đang hoạt động; Admin cùng luật; đọc DB mỗi request (không tin claim trong token).
/// </summary>
public class HasWarehouseAccessTests
{
    private const string Function = "HasWarehouseAccess";

    private static async Task<bool> Check(int? userId, int warehouseId, string role = "WarehouseStaff", Action<TestStockFlowDbContext>? arrange = null,
        params int[] tokenWarehouses)
    {
        var db = AuthData.Db();
        WarehouseSetup.OnlyTicked(db, AuthData.Warehouse, TestData.K001);
        WarehouseSetup.OnlyTicked(db, AuthData.Admin, TestData.K001);
        arrange?.Invoke(db);
        return await WarehouseSetup.Service(db, userId, role, tokenWarehouses).HasWarehouseAccessAsync(warehouseId);
    }

    [Fact(DisplayName = "HasWarehouseAccess/UTCID01 – WarehouseStaff được tích K001, hỏi kho 3: true")]
    [Trait("Function", Function)][Trait("UTCID", "HasWarehouseAccess/UTCID01")][Trait("Type", "N")]
    public async Task UTCID01_Ticked_True() => Assert.True(await Check(AuthData.Warehouse, TestData.K001));

    [Fact(DisplayName = "HasWarehouseAccess/UTCID02 – WarehouseStaff được tích K001, hỏi kho 4: false")]
    [Trait("Function", Function)][Trait("UTCID", "HasWarehouseAccess/UTCID02")][Trait("Type", "N")]
    public async Task UTCID02_NotTicked_False() => Assert.False(await Check(AuthData.Warehouse, TestData.K002));

    [Fact(DisplayName = "HasWarehouseAccess/UTCID03 – Admin chỉ được tích K001, hỏi kho 4: false")]
    [Trait("Function", Function)][Trait("UTCID", "HasWarehouseAccess/UTCID03")][Trait("Type", "N")]
    public async Task UTCID03_AdminSameRule_False() => Assert.False(await Check(AuthData.Admin, TestData.K002, "Admin"));

    [Fact(DisplayName = "HasWarehouseAccess/UTCID04 – token cấp trước khi Admin bỏ tích K001: false (đọc DB mỗi request)")]
    [Trait("Function", Function)][Trait("UTCID", "HasWarehouseAccess/UTCID04")][Trait("Type", "A")]
    public async Task UTCID04_UntickedAfterToken_False() =>
        Assert.False(await Check(AuthData.Warehouse, TestData.K001, arrange: db => WarehouseSetup.OnlyTicked(db, AuthData.Warehouse),
            tokenWarehouses: TestData.K001));

    [Fact(DisplayName = "HasWarehouseAccess/UTCID05 – chưa xác thực: false")]
    [Trait("Function", Function)][Trait("UTCID", "HasWarehouseAccess/UTCID05")][Trait("Type", "A")]
    public async Task UTCID05_NotAuthenticated_False() => Assert.False(await Check(null, TestData.K001));

    [Fact(DisplayName = "HasWarehouseAccess/UTCID06 – kho 999999 không tồn tại: false")]
    [Trait("Function", Function)][Trait("UTCID", "HasWarehouseAccess/UTCID06")][Trait("Type", "B")]
    public async Task UTCID06_UnknownWarehouse_False() => Assert.False(await Check(AuthData.Warehouse, 999_999));
}

/// <summary>Report 5.1 – sheet UpdateWarehouseAccess (TamDM): Admin cập nhật kho của sales01 (id 3, đang có K001, K003). UTCID06 (403) – ApiPermissionTests.</summary>
public class UpdateWarehouseAccessTests
{
    private const string Function = "UpdateWarehouseAccess";

    private static async Task<(TestStockFlowDbContext Db, Result<WarehouseStaffAccessDto> R)> Update(int userId, List<int>? ids, List<string>? codes)
    {
        var db = AuthData.Db();
        var r = await new UpdateWarehouseAccessCommandHandler(db, AuthData.AdminUser().Object)
            .Handle(new UpdateWarehouseAccessCommand(userId, new UpdateWarehouseAccessRequest { WarehouseIds = ids, AssignedWarehouses = codes }), CancellationToken.None);
        return (db, r);
    }

    private static List<int> Ticked(TestStockFlowDbContext db, int userId) =>
        db.JncUserWarehouseAccesses.AsNoTracking().Where(a => a.UserId == userId).Select(a => a.WarehouseId).OrderBy(i => i).ToList();

    [Fact(DisplayName = "UpdateWarehouseAccess/UTCID01 – warehouseIds [3] + assignedWarehouses [K002]: K001, K002")]
    [Trait("Function", Function)][Trait("UTCID", "UpdateWarehouseAccess/UTCID01")][Trait("Type", "N")]
    public async Task UTCID01_IdsAndCodes_Merged()
    {
        var (db, r) = await Update(AuthData.Sales, new() { TestData.K001 }, new() { "K002" });
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(new[] { "K001", "K002" }, r.Value!.AssignedWarehouses.OrderBy(c => c));
        Assert.Equal(new[] { TestData.K001, TestData.K002 }, Ticked(db, AuthData.Sales));
    }

    [Fact(DisplayName = "UpdateWarehouseAccess/UTCID02 – mã cũ WH-HN-02 và id dạng chuỗi \"3\": K001, K002")]
    [Trait("Function", Function)][Trait("UTCID", "UpdateWarehouseAccess/UTCID02")][Trait("Type", "N")]
    public async Task UTCID02_LegacyCodeAndStringId_Resolved()
    {
        var (db, r) = await Update(AuthData.Sales, null, new() { "WH-HN-02", "3" });
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(new[] { "K001", "K002" }, r.Value!.AssignedWarehouses.OrderBy(c => c));
        Assert.Equal(new[] { TestData.K001, TestData.K002 }, Ticked(db, AuthData.Sales));
    }

    [Fact(DisplayName = "UpdateWarehouseAccess/UTCID03 – hai danh sách rỗng: thu hồi hết")]
    [Trait("Function", Function)][Trait("UTCID", "UpdateWarehouseAccess/UTCID03")][Trait("Type", "B")]
    public async Task UTCID03_Empty_AllRevoked()
    {
        var (db, r) = await Update(AuthData.Sales, new(), new());
        Assert.True(r.IsSuccess, r.Error);
        Assert.Empty(r.Value!.AssignedWarehouses);
        Assert.Empty(Ticked(db, AuthData.Sales));
    }

    [Fact(DisplayName = "UpdateWarehouseAccess/UTCID04 – warehouseIds [999], assignedWarehouses [XXX]: thu hồi hết")]
    [Trait("Function", Function)][Trait("UTCID", "UpdateWarehouseAccess/UTCID04")][Trait("Type", "A")]
    public async Task UTCID04_UnknownWarehouses_AllRevoked()
    {
        var (db, r) = await Update(AuthData.Sales, new() { 999 }, new() { "XXX" });
        Assert.True(r.IsSuccess, r.Error);
        Assert.Empty(r.Value!.AssignedWarehouses);
        Assert.Empty(Ticked(db, AuthData.Sales));
    }

    [Fact(DisplayName = "UpdateWarehouseAccess/UTCID05 – userId 999999 không tồn tại")]
    [Trait("Function", Function)][Trait("UTCID", "UpdateWarehouseAccess/UTCID05")][Trait("Type", "A")]
    public async Task UTCID05_UnknownUser_ReturnsError()
    {
        var (_, r) = await Update(999_999, new() { TestData.K001 }, null);
        Assert.False(r.IsSuccess);
        Assert.Equal("Không tìm thấy thông tin nhân sự.", r.Error);
    }
}

/// <summary>
/// Report 5.1 – sheet GetMyWarehouses (TamDM): kho đang hoạt động được tích cho người dùng hiện tại; Admin cùng luật (từ commit bde2d06).
/// Dùng CurrentUserService thật. UTCID06 theo D.1: ở unit là nhánh IsAuthenticated = false của handler (401 thật thuộc API test).
/// </summary>
public class GetMyWarehousesTests
{
    private const string Function = "GetMyWarehouses";

    private static async Task<Result<List<WarehouseFacilityDto>>> Get(int? userId, string role, params int[] ticked)
    {
        var db = AuthData.Db();
        if (userId.HasValue) WarehouseSetup.OnlyTicked(db, userId.Value, ticked);
        return await new GetMyWarehousesQueryHandler(db, WarehouseSetup.Service(db, userId, role)).Handle(new GetMyWarehousesQuery(), CancellationToken.None);
    }

    private static void AssertCodes(Result<List<WarehouseFacilityDto>> r, params string[] codes)
    {
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(codes, r.Value!.Select(w => w.Code));
    }

    [Fact(DisplayName = "GetMyWarehouses/UTCID01 – WarehouseStaff được tích K001, K002: 2 kho")]
    [Trait("Function", Function)][Trait("UTCID", "GetMyWarehouses/UTCID01")][Trait("Type", "N")]
    public async Task UTCID01_TwoTicked() => AssertCodes(await Get(AuthData.Warehouse, "WarehouseStaff", TestData.K001, TestData.K002), "K001", "K002");

    [Fact(DisplayName = "GetMyWarehouses/UTCID02 – Admin được tích K001..K004: 4 kho")]
    [Trait("Function", Function)][Trait("UTCID", "GetMyWarehouses/UTCID02")][Trait("Type", "N")]
    public async Task UTCID02_AdminFourTicked() =>
        AssertCodes(await Get(AuthData.Admin, "Admin", TestData.K001, TestData.K002, TestData.K003, TestData.K004), "K001", "K002", "K003", "K004");

    [Fact(DisplayName = "GetMyWarehouses/UTCID03 – Admin chỉ được tích K001: 1 kho")]
    [Trait("Function", Function)][Trait("UTCID", "GetMyWarehouses/UTCID03")][Trait("Type", "B")]
    public async Task UTCID03_AdminOneTicked() => AssertCodes(await Get(AuthData.Admin, "Admin", TestData.K001), "K001");

    [Fact(DisplayName = "GetMyWarehouses/UTCID04 – SalesStaff chưa được tích kho nào: danh sách rỗng")]
    [Trait("Function", Function)][Trait("UTCID", "GetMyWarehouses/UTCID04")][Trait("Type", "B")]
    public async Task UTCID04_NoneTicked() => AssertCodes(await Get(AuthData.Sales, "SalesStaff"));

    [Fact(DisplayName = "GetMyWarehouses/UTCID05 – được tích K001 và kho ngừng hoạt động id 1: chỉ K001")]
    [Trait("Function", Function)][Trait("UTCID", "GetMyWarehouses/UTCID05")][Trait("Type", "A")]
    public async Task UTCID05_InactiveFiltered() =>
        AssertCodes(await Get(AuthData.Warehouse, "WarehouseStaff", TestData.K001, TestData.InactiveWarehouse), "K001");

    [Fact(DisplayName = "GetMyWarehouses/UTCID06 – chưa đăng nhập (câu chữ D.1)")]
    [Trait("Function", Function)][Trait("UTCID", "GetMyWarehouses/UTCID06")][Trait("Type", "A")]
    public async Task UTCID06_NotAuthenticated_ReturnsError()
    {
        var r = await Get(null, "");
        Assert.False(r.IsSuccess);
        Assert.Equal("Yêu cầu xác thực tài khoản để xem kho làm việc.", r.Error);
    }
}

/// <summary>Report 5.1 – sheet GetWarehouseById (TamDM): chi tiết kho – nhân sự được phân, số mặt hàng, tổng tồn.</summary>
public class GetWarehouseByIdTests
{
    private const string Function = "GetWarehouseById";

    private static Task<Result<WarehouseDetailDto>> Get(TestStockFlowDbContext db, int id) =>
        new GetWarehouseByIdQueryHandler(db).Handle(new GetWarehouseByIdQuery(id), CancellationToken.None);

    [Fact(DisplayName = "GetWarehouseById/UTCID01 – K001 có 4 nhân sự, 2 mặt hàng tồn 10 + 12: staffCount 4, totalProductCount 2, totalStockQuantity 22")]
    [Trait("Function", Function)][Trait("UTCID", "GetWarehouseById/UTCID01")][Trait("Type", "N")]
    public async Task UTCID01_Detail_Aggregated()
    {
        var db = AuthData.Db();
        db.JncUserWarehouseAccesses.Add(new JncUserWarehouseAccess { UserId = AuthData.Manager, WarehouseId = TestData.K001 });
        TestData.SaveAndDetach(db);
        TestData.SetStock(db, TestData.K001, 1, 10, 1000);
        TestData.SetStock(db, TestData.K001, 2, 12, 1000);
        var r = await Get(db, TestData.K001);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(4, r.Value!.StaffCount);
        Assert.Equal(2, r.Value.TotalProductCount);
        Assert.Equal(22m, r.Value.TotalStockQuantity);
    }

    [Fact(DisplayName = "GetWarehouseById/UTCID02 – kho 7 (KTEST) ngừng hoạt động, không tồn, không địa chỉ: INACTIVE, 0, 0")]
    [Trait("Function", Function)][Trait("UTCID", "GetWarehouseById/UTCID02")][Trait("Type", "B")]
    public async Task UTCID02_InactiveEmpty()
    {
        var db = AuthData.Db();
        db.MstWarehouses.Add(new MstWarehouse { WarehouseId = 7, WarehouseCode = "KTEST", WarehouseName = "Kho test", IsActive = false });
        TestData.SaveAndDetach(db);
        var r = await Get(db, 7);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal("INACTIVE", r.Value!.Status);
        Assert.Equal(0, r.Value.TotalProductCount);
        Assert.Equal(0m, r.Value.TotalStockQuantity);
    }

    [Fact(DisplayName = "GetWarehouseById/UTCID03 – kho 999999 không tồn tại")]
    [Trait("Function", Function)][Trait("UTCID", "GetWarehouseById/UTCID03")][Trait("Type", "A")]
    public async Task UTCID03_Unknown_ReturnsError()
    {
        var r = await Get(AuthData.Db(), 999_999);
        Assert.False(r.IsSuccess);
        Assert.Equal("Không tìm thấy thông tin kho.", r.Error);
    }
}
