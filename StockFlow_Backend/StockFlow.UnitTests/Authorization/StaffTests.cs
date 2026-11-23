using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Common;
using StockFlow.Application.Features.Admin.Commands;
using StockFlow.Application.Features.Admin.DTOs;
using StockFlow.UnitTests.Common;
using Xunit;

namespace StockFlow.UnitTests.Authorization;

/// <summary>
/// Report 5.1 – sheet CreateStaff (TamDM): Admin tạo tài khoản nhân viên. UTCID03 theo D.1 (lỗi theo từng trường của validator).
/// UTCID08 (403 – không phải Admin) kiểm ở Authorization/ApiPermissionTests.
/// </summary>
public class CreateStaffTests
{
    private const string Function = "CreateStaff";

    private static CreateStaffRequest Req(string username = "newstaff01", string role = "SALES", string? email = "newstaff01@tinphat.vn",
        string? password = null, string? status = null, List<string>? warehouses = null) =>
        new() { Username = username, Name = "Nhân viên mới", Phone = "0987654321", Email = email, Role = role, Password = password, Status = status, AssignedWarehouses = warehouses };

    private static async Task<(TestStockFlowDbContext Db, Result<StaffDto> R)> Create(CreateStaffRequest req)
    {
        var db = AuthData.Db();
        var r = await new CreateStaffCommandHandler(db, AuthData.Hasher).Handle(new CreateStaffCommand(req), CancellationToken.None);
        return (db, r);
    }

    private static async Task AssertRejected(CreateStaffRequest req, string message)
    {
        var (db, r) = await Create(req);
        Assert.False(r.IsSuccess);
        Assert.Equal(message, r.Error);
        Assert.Equal(5, await db.SecUsers.CountAsync());
    }

    [Fact(DisplayName = "CreateStaff/UTCID01 – dữ liệu hợp lệ, vai trò SALES, không nhập mật khẩu: ROLE_SALES, ACTIVE, mật khẩu mặc định TinPhat@2026")]
    [Trait("Function", Function)][Trait("UTCID", "CreateStaff/UTCID01")][Trait("Type", "N")]
    public async Task UTCID01_Valid_CreatedWithDefaultPassword()
    {
        var (db, r) = await Create(Req());
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal("ROLE_SALES", r.Value!.Role);
        Assert.Equal("ACTIVE", r.Value.Status);
        var user = await db.SecUsers.AsNoTracking().Include(u => u.JncUserRoles).SingleAsync(u => u.Username == "newstaff01");
        Assert.True(AuthData.Hasher.Verify(AuthData.DefaultPassword, user.PasswordHash!));
        Assert.Equal(AuthData.SalesRole, Assert.Single(user.JncUserRoles).RoleId);
    }

    [Fact(DisplayName = "CreateStaff/UTCID02 – tên đăng nhập chữ hoa, có mật khẩu, LOCKED, kho K001/K003")]
    [Trait("Function", Function)][Trait("UTCID", "CreateStaff/UTCID02")][Trait("Type", "N")]
    public async Task UTCID02_LockedWithWarehouses_Created()
    {
        var (db, r) = await Create(Req(username: "NEWSTAFF02", email: "newstaff02@tinphat.vn", password: AuthData.SalesPassword,
            status: "LOCKED", warehouses: new() { "K001", "K003" }));
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal("LOCKED", r.Value!.Status);
        Assert.Equal(new[] { "K001", "K003" }, r.Value.AssignedWarehouses.OrderBy(c => c));
        var user = await db.SecUsers.AsNoTracking().SingleAsync(u => u.Username == "newstaff02");
        Assert.False(user.IsActive);
        Assert.True(AuthData.Hasher.Verify(AuthData.SalesPassword, user.PasswordHash!));
    }

    [Fact(DisplayName = "CreateStaff/UTCID03 – thiếu tên đăng nhập, họ tên, SĐT, vai trò; email sai (validator, câu chữ D.1)")]
    [Trait("Function", Function)][Trait("UTCID", "CreateStaff/UTCID03")][Trait("Type", "A")]
    public void UTCID03_InvalidInput_ValidatorRejects()
    {
        var req = new CreateStaffRequest { Username = "", Name = "", Phone = "", Role = "", Email = "sai-email" };
        var errors = new CreateStaffCommandValidator().Validate(new CreateStaffCommand(req)).Errors.Select(e => e.ErrorMessage).ToList();
        Assert.Contains("Tên đăng nhập không được để trống.", errors);
        Assert.Contains("Họ và tên nhân viên không được để trống.", errors);
        Assert.Contains("Số điện thoại không được để trống.", errors);
        Assert.Contains("Vai trò không được để trống.", errors);
        Assert.Contains("Email không đúng định dạng.", errors);
    }

    [Fact(DisplayName = "CreateStaff/UTCID04 – tên đăng nhập manager01 đã tồn tại")]
    [Trait("Function", Function)][Trait("UTCID", "CreateStaff/UTCID04")][Trait("Type", "A")]
    public Task UTCID04_DuplicateUsername_ReturnsError() =>
        AssertRejected(Req(username: "manager01"), "Tên đăng nhập 'manager01' đã tồn tại trong hệ thống. Vui lòng chọn tên đăng nhập khác.");

    [Fact(DisplayName = "CreateStaff/UTCID05 – email sales01@tinphat.vn đã dùng")]
    [Trait("Function", Function)][Trait("UTCID", "CreateStaff/UTCID05")][Trait("Type", "A")]
    public Task UTCID05_DuplicateEmail_ReturnsError() =>
        AssertRejected(Req(email: "sales01@tinphat.vn"), "Email 'sales01@tinphat.vn' đã được sử dụng cho một tài khoản khác.");

    [Fact(DisplayName = "CreateStaff/UTCID06 – vai trò ADMIN")]
    [Trait("Function", Function)][Trait("UTCID", "CreateStaff/UTCID06")][Trait("Type", "A")]
    public async Task UTCID06_AdminRole_ReturnsError()
    {
        var (db, r) = await Create(Req(role: "ADMIN"));
        Assert.False(r.IsSuccess);
        Assert.StartsWith("Không thể tạo tài khoản nhân viên với vai trò Quản trị viên (ROLE_ADMIN)", r.Error);
        Assert.Equal(5, await db.SecUsers.CountAsync());
    }

    [Fact(DisplayName = "CreateStaff/UTCID07 – vai trò XYZ_NOT_EXIST")]
    [Trait("Function", Function)][Trait("UTCID", "CreateStaff/UTCID07")][Trait("Type", "A")]
    public Task UTCID07_UnknownRole_ReturnsError() =>
        AssertRejected(Req(role: "XYZ_NOT_EXIST"), "Không tìm thấy vai trò 'XYZ_NOT_EXIST' trong hệ thống.");
}

/// <summary>Report 5.1 – sheet UpdateStaff (QuanDN): Admin sửa tài khoản nhân viên sales01 (id 3, kho K001, K003).</summary>
public class UpdateStaffTests
{
    private const string Function = "UpdateStaff";

    private static UpdateStaffRequest Req(string name = "Nhân viên bán hàng 01", string phone = "0912345678", string? email = "sales01@tinphat.vn",
        string role = "SALES", List<string>? warehouses = null) =>
        new() { Name = name, Phone = phone, Email = email, Role = role, AssignedWarehouses = warehouses ?? new() { "K001", "K003" } };

    private static async Task<(TestStockFlowDbContext Db, Result<StaffDto> R)> Update(UpdateStaffRequest req, int userId = AuthData.Sales)
    {
        var db = AuthData.Db();
        var r = await new UpdateStaffCommandHandler(db, AuthData.Hasher).Handle(new UpdateStaffCommand(userId, req), CancellationToken.None);
        return (db, r);
    }

    private static string? NameOfSales(TestStockFlowDbContext db) => db.SecUsers.AsNoTracking().Single(u => u.UserId == AuthData.Sales).FullName;

    [Fact(DisplayName = "UpdateStaff/UTCID01 – họ tên và SĐT mới")]
    [Trait("Function", Function)][Trait("UTCID", "UpdateStaff/UTCID01")][Trait("Type", "N")]
    public async Task UTCID01_NameAndPhone_Updated()
    {
        var (db, r) = await Update(Req(name: "Nguyễn Văn Bán", phone: "0909000111"));
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal("Nguyễn Văn Bán", r.Value!.Name);
        var user = await db.SecUsers.AsNoTracking().SingleAsync(u => u.UserId == AuthData.Sales);
        Assert.Equal("Nguyễn Văn Bán", user.FullName);
        Assert.Equal("0909000111", user.Phone);
    }

    [Fact(DisplayName = "UpdateStaff/UTCID02 – kho K001 → K001, K002: cập nhật jnc_user_warehouse_access")]
    [Trait("Function", Function)][Trait("UTCID", "UpdateStaff/UTCID02")][Trait("Type", "N")]
    public async Task UTCID02_Warehouses_Replaced()
    {
        var (db, r) = await Update(Req(warehouses: new() { "K001", "K002" }));
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(new[] { "K001", "K002" }, r.Value!.AssignedWarehouses.OrderBy(c => c));
        var ids = await db.JncUserWarehouseAccesses.AsNoTracking().Where(a => a.UserId == AuthData.Sales).Select(a => a.WarehouseId).OrderBy(i => i).ToListAsync();
        Assert.Equal(new[] { TestData.K001, TestData.K002 }, ids);
    }

    [Fact(DisplayName = "UpdateStaff/UTCID03 – email của tài khoản khác")]
    [Trait("Function", Function)][Trait("UTCID", "UpdateStaff/UTCID03")][Trait("Type", "A")]
    public async Task UTCID03_EmailOfOther_ReturnsError()
    {
        var (db, r) = await Update(Req(name: "Tên đổi", email: "manager01@tinphat.vn"));
        Assert.False(r.IsSuccess);
        Assert.Equal("Email 'manager01@tinphat.vn' đã được sử dụng cho một tài khoản khác.", r.Error);
        Assert.Equal("Nhân viên bán hàng 01", NameOfSales(db));
    }

    [Fact(DisplayName = "UpdateStaff/UTCID04 – gán vai trò ADMIN")]
    [Trait("Function", Function)][Trait("UTCID", "UpdateStaff/UTCID04")][Trait("Type", "A")]
    public async Task UTCID04_AdminRole_ReturnsError()
    {
        var (db, r) = await Update(Req(role: "ADMIN"));
        Assert.False(r.IsSuccess);
        Assert.Equal("Không thể gán vai trò Quản trị viên (ROLE_ADMIN) cho nhân viên khác.", r.Error);
        Assert.Equal(AuthData.SalesRole, (await db.JncUserRoles.AsNoTracking().SingleAsync(ur => ur.UserId == AuthData.Sales)).RoleId);
    }

    [Fact(DisplayName = "UpdateStaff/UTCID05 – nhân viên 999999 không tồn tại")]
    [Trait("Function", Function)][Trait("UTCID", "UpdateStaff/UTCID05")][Trait("Type", "A")]
    public async Task UTCID05_Unknown_ReturnsError()
    {
        var (_, r) = await Update(Req(), 999_999);
        Assert.False(r.IsSuccess);
        Assert.Equal("Không tìm thấy thông tin nhân viên.", r.Error);
    }

    [Fact(DisplayName = "UpdateStaff/UTCID06 – họ tên trống")]
    [Trait("Function", Function)][Trait("UTCID", "UpdateStaff/UTCID06")][Trait("Type", "A")]
    public async Task UTCID06_EmptyName_ReturnsError()
    {
        var (db, r) = await Update(Req(name: ""));
        Assert.False(r.IsSuccess);
        Assert.Equal("Họ và tên nhân viên không được để trống.", r.Error);
        Assert.Equal("Nhân viên bán hàng 01", NameOfSales(db));
    }
}

/// <summary>Report 5.1 – sheet ToggleStaffStatus (TamDM): Admin khóa / mở khóa tài khoản; không khóa được Admin hệ thống. UTCID05 (403) – xem ApiPermissionTests.</summary>
public class ToggleStaffStatusTests
{
    private const string Function = "ToggleStaffStatus";

    private static async Task<(TestStockFlowDbContext Db, Result<bool> R)> Toggle(int id)
    {
        var db = AuthData.Db();
        var r = await new ToggleStaffStatusCommandHandler(db).Handle(new ToggleStaffStatusCommand(id), CancellationToken.None);
        return (db, r);
    }

    private static bool? IsActive(TestStockFlowDbContext db, int id) => db.SecUsers.AsNoTracking().Single(u => u.UserId == id).IsActive;

    [Fact(DisplayName = "ToggleStaffStatus/UTCID01 – id 3 (sales01 đang hoạt động): isActive = false")]
    [Trait("Function", Function)][Trait("UTCID", "ToggleStaffStatus/UTCID01")][Trait("Type", "N")]
    public async Task UTCID01_Active_Locked()
    {
        var (db, r) = await Toggle(AuthData.Sales);
        Assert.True(r.IsSuccess, r.Error);
        Assert.False(r.Value);
        Assert.False(IsActive(db, AuthData.Sales));
    }

    [Fact(DisplayName = "ToggleStaffStatus/UTCID02 – tài khoản đang khóa: isActive = true")]
    [Trait("Function", Function)][Trait("UTCID", "ToggleStaffStatus/UTCID02")][Trait("Type", "N")]
    public async Task UTCID02_Locked_Unlocked()
    {
        var (db, r) = await Toggle(AuthData.Locked);
        Assert.True(r.IsSuccess, r.Error);
        Assert.True(r.Value);
        Assert.True(IsActive(db, AuthData.Locked));
    }

    [Fact(DisplayName = "ToggleStaffStatus/UTCID03 – id 1 (admin)")]
    [Trait("Function", Function)][Trait("UTCID", "ToggleStaffStatus/UTCID03")][Trait("Type", "A")]
    public async Task UTCID03_Admin_ReturnsError()
    {
        var (db, r) = await Toggle(AuthData.Admin);
        Assert.False(r.IsSuccess);
        Assert.Equal("Không thể khóa tài khoản Quản trị viên Hệ thống (Admin).", r.Error);
        Assert.True(IsActive(db, AuthData.Admin));
    }

    [Fact(DisplayName = "ToggleStaffStatus/UTCID04 – id 999999 không tồn tại")]
    [Trait("Function", Function)][Trait("UTCID", "ToggleStaffStatus/UTCID04")][Trait("Type", "A")]
    public async Task UTCID04_Unknown_ReturnsError()
    {
        var (_, r) = await Toggle(999_999);
        Assert.False(r.IsSuccess);
        Assert.Equal("Không tìm thấy thông tin nhân viên.", r.Error);
    }
}

/// <summary>Report 5.1 – sheet ResetStaffPassword (TamDM): Admin đặt lại mật khẩu về TinPhat@2026. UTCID03 (403) – xem ApiPermissionTests.</summary>
public class ResetStaffPasswordTests
{
    private const string Function = "ResetStaffPassword";

    [Fact(DisplayName = "ResetStaffPassword/UTCID01 – id 3 (sales01 đã đổi mật khẩu): trả TinPhat@2026, đăng nhập được bằng mật khẩu mới")]
    [Trait("Function", Function)][Trait("UTCID", "ResetStaffPassword/UTCID01")][Trait("Type", "N")]
    public async Task UTCID01_Reset_DefaultPassword()
    {
        var db = AuthData.Db();
        var r = await new ResetStaffPasswordCommandHandler(db, AuthData.Hasher).Handle(new ResetStaffPasswordCommand(AuthData.Sales), CancellationToken.None);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(AuthData.DefaultPassword, r.Value);
        var hash = db.SecUsers.AsNoTracking().Single(u => u.UserId == AuthData.Sales).PasswordHash!;
        Assert.True(AuthData.Hasher.Verify(AuthData.DefaultPassword, hash));
        Assert.False(AuthData.Hasher.Verify(AuthData.SalesPassword, hash));
    }

    [Fact(DisplayName = "ResetStaffPassword/UTCID02 – id 999999 không tồn tại")]
    [Trait("Function", Function)][Trait("UTCID", "ResetStaffPassword/UTCID02")][Trait("Type", "A")]
    public async Task UTCID02_Unknown_ReturnsError()
    {
        var r = await new ResetStaffPasswordCommandHandler(AuthData.Db(), AuthData.Hasher).Handle(new ResetStaffPasswordCommand(999_999), CancellationToken.None);
        Assert.False(r.IsSuccess);
        Assert.Equal("Không tìm thấy thông tin nhân viên.", r.Error);
    }
}
