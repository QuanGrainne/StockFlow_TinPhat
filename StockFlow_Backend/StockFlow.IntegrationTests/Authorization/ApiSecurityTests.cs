using System.IdentityModel.Tokens.Jwt;
using System.Text;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using StockFlow.Application.Features.Admin.DTOs;
using StockFlow.IntegrationTests.Infrastructure;
using StockFlow.IntegrationTests.Inventory;
using Xunit;
using Xunit.Abstractions;

namespace StockFlow.IntegrationTests.Authorization;

/// <summary>
/// Report 5.2 – sheet "API Authentication" (chức năng 24, BR-02), "Role-Based Authorization" (25, BR-02, BR-03),
/// "Immediate Access Revocation" (26, BR-02).
/// Luồng: JwtBearer (Program.cs) → FallbackPolicy / RequirePermission / RequireFeature / RequireAdmin
/// → PermissionAuthorizationHandler (quyền đọc từ DB mỗi request qua UserPermissionService) → JsonAuthorizationResultHandler.
/// </summary>
public sealed class ApiSecurityTests : InventoryTestBase
{
    private const string Unauthorized401 = "Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.";

    public ApiSecurityTests(IntegrationTestFixture fixture, ITestOutputHelper output) : base(fixture, output) { }

    private Task<int> TransferCountAsync() => QueryAsync(db => db.TrxStockTransfers.CountAsync());

    private async Task<HttpClient> StockAsync()
    {
        await SetStockAsync(K001, Ids.PTest, 100, 10_000m);
        return await ClientAsync(TestDataSeeder.OpsK001K002);
    }

    // ───────── API Authentication ─────────

    [Fact(DisplayName = "INT-SEC-49-01 | Valid token")]
    public async Task INT_SEC_49_01_ValidToken()
    {
        var a = await ClientAsync(TestDataSeeder.OpsK001K002);
        var res = await GetAsync(a, "/api/transfers");
        var check = new Checks(Output);
        check.Equal("HTTP status", 200, res.StatusCode);
        check.Assert();
    }

    [Fact(DisplayName = "INT-SEC-49-02 | Missing token")]
    public async Task INT_SEC_49_02_MissingToken()
    {
        var res = await GetAsync(AnonymousClient(), "/api/transfers");
        var check = new Checks(Output);
        check.Equal("HTTP status", 401, res.StatusCode);
        check.Message("Thông báo", Unauthorized401, res);
        check.Assert();
    }

    [Fact(DisplayName = "INT-SEC-49-03 | Malformed token")]
    public async Task INT_SEC_49_03_MalformedToken()
    {
        var res = await GetAsync(ClientWithToken("abc"), "/api/transfers");
        var check = new Checks(Output);
        check.Equal("HTTP status", 401, res.StatusCode);
        check.Message("Thông báo", Unauthorized401, res);
        check.Assert();
    }

    [Fact(DisplayName = "INT-SEC-49-04 | Token with a changed signature")]
    public async Task INT_SEC_49_04_ChangedSignature()
    {
        var token = await TokenAsync(TestDataSeeder.OpsK001K002);
        // Đổi 4 ký tự cuối của phần chữ ký (header.payload giữ nguyên)
        var tampered = token[..^4] + (token.EndsWith("AAAA", StringComparison.Ordinal) ? "BBBB" : "AAAA");
        Assert.NotEqual(token, tampered);
        var res = await GetAsync(ClientWithToken(tampered), "/api/transfers");
        var check = new Checks(Output);
        check.Equal("HTTP status", 401, res.StatusCode);
        check.Message("Thông báo", Unauthorized401, res);
        check.Assert();
    }

    [Fact(DisplayName = "INT-SEC-49-05 | Expired token")]
    public async Task INT_SEC_49_05_ExpiredToken()
    {
        // Token hết hạn 10 phút (quá 5 phút clock skew mặc định), ký bằng đúng khóa / issuer / audience của API trong test
        var valid = new JwtSecurityTokenHandler().ReadJwtToken(await TokenAsync(TestDataSeeder.OpsK001K002));
        var config = Fx.Factory.Services.GetRequiredService<IConfiguration>();
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:SecretKey"]!));
        var expired = new JwtSecurityToken(config["Jwt:Issuer"], config["Jwt:Audience"],
            valid.Claims.Where(c => c.Type is not ("exp" or "nbf" or "iat" or "iss" or "aud")),
            notBefore: DateTime.UtcNow.AddHours(-2), expires: DateTime.UtcNow.AddMinutes(-10),
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));
        var res = await GetAsync(ClientWithToken(new JwtSecurityTokenHandler().WriteToken(expired)), "/api/transfers");

        var check = new Checks(Output);
        check.Equal("HTTP status", 401, res.StatusCode);
        check.Message("Thông báo", Unauthorized401, res);
        check.Assert();
    }

    [Fact(DisplayName = "INT-SEC-49-06 | Write API without a token")]
    public async Task INT_SEC_49_06_WriteWithoutToken()
    {
        await SetStockAsync(K001, Ids.PTest, 100, 10_000m);
        var res = await PostAsync(AnonymousClient(), "/api/transfers", TransferRequest(K001, K002, (Ids.PTest, 30m)));
        var check = new Checks(Output);
        check.Equal("HTTP status", 401, res.StatusCode);
        check.Equal("Không tạo phiếu", 0, await TransferCountAsync());
        check.Assert();
    }

    [Fact(DisplayName = "INT-SEC-49-07 | Login is available without a token")]
    public async Task INT_SEC_49_07_LoginWithoutToken()
    {
        var res = await LoginAsync(TestDataSeeder.OpsK001K002.Username, TestDataSeeder.Password);
        var check = new Checks(Output);
        check.Equal("HTTP status", 200, res.StatusCode);
        check.True("Có JWT", (res.String("token") ?? "").Split('.').Length == 3, res.String("token") ?? "(null)");
        check.Assert();
    }

    // ───────── Role-Based Authorization ─────────

    [Fact(DisplayName = "INT-SEC-50-01 | Permission granted")]
    public async Task INT_SEC_50_01_PermissionGranted()
    {
        await SetStockAsync(K001, Ids.PTest, 100, 10_000m);
        var u = await ClientAsync(TestDataSeeder.Transfer); // STOCK_CREATE + quyền kho xuất
        var res = await PostAsync(u, "/api/transfers", TransferRequest(K001, K002, (Ids.PTest, 30m)));
        var check = new Checks(Output);
        check.Success(res);
        check.Equal("Phiếu được tạo", 1, await TransferCountAsync());
        check.Assert();
    }

    [Fact(DisplayName = "INT-SEC-50-02 | Create without permission")]
    public async Task INT_SEC_50_02_CreateWithoutPermission()
    {
        await SetStockAsync(K001, Ids.PTest, 100, 10_000m);
        var u = await ClientAsync(TestDataSeeder.StockRead); // chỉ STOCK_READ
        var res = await PostAsync(u, "/api/transfers", TransferRequest(K001, K002, (Ids.PTest, 30m)));
        var check = new Checks(Output);
        check.Equal("HTTP status", 403, res.StatusCode);
        check.Message("Thông báo", "Bạn không có quyền thực hiện thao tác này (cần quyền STOCK_CREATE).", res);
        check.Equal("Không tạo phiếu", 0, await TransferCountAsync());
        check.Assert();
    }

    [Fact(DisplayName = "INT-SEC-50-03 | Read-only user cannot update")]
    public async Task INT_SEC_50_03_ReadOnlyCannotUpdate()
    {
        var a = await StockAsync();
        var id = await ArrangeDraftTransferAsync(a, K001, K002, (Ids.PTest, 30m));
        var u = await ClientAsync(TestDataSeeder.StockRead);

        var res = await PostAsync(u, $"/api/transfers/{id}/complete");

        var check = new Checks(Output);
        check.Equal("HTTP status", 403, res.StatusCode);
        check.Contains("Thông báo nêu STOCK_UPDATE", "STOCK_UPDATE", res);
        check.Equal("Vẫn Phiếu tạm", "DRAFT", (await TransferAsync(id)).Status);
        check.Equal("Tồn K001 không đổi", 100m, await StockAsync(K001, Ids.PTest));
        check.Assert();
    }

    [Fact(DisplayName = "INT-SEC-50-04 | Feature not granted to the role")]
    public async Task INT_SEC_50_04_FeatureNotGranted()
    {
        var u = await ClientAsync(TestDataSeeder.NoStocktake); // STOCK_READ, vai trò không có feat-stocktake
        var res = await GetAsync(u, "/api/stocktakes");
        var check = new Checks(Output);
        check.Equal("HTTP status", 403, res.StatusCode);
        check.Message("Thông báo", "Vai trò của bạn chưa được phân quyền chức năng feat-stocktake.", res);
        check.Assert();
    }

    private static CreateStaffRequest NewStaff(string username) => new()
    {
        Username = username, Name = "Nhân viên IT mới", Phone = "0911111111", Email = $"{username}@it.test",
        Role = "SalesStaff", AssignedWarehouses = new() { "K001" },
    };

    [Fact(DisplayName = "INT-SEC-50-05 | Non-admin calls an admin API")]
    public async Task INT_SEC_50_05_NonAdminCallsAdminApi()
    {
        var m = await ClientAsync(TestDataSeeder.Manager);
        var res = await PostAsync(m, "/api/staff", NewStaff("it.staff.byman"));
        var check = new Checks(Output);
        check.Equal("HTTP status", 403, res.StatusCode);
        check.Message("Thông báo", "Chỉ Quản trị viên mới được thực hiện thao tác này.", res);
        check.Equal("Không tạo tài khoản", 0, await QueryAsync(db => db.SecUsers.CountAsync(u => u.Username == "it.staff.byman")));
        check.Assert();
    }

    [Fact(DisplayName = "INT-SEC-50-06 | Admin calls an admin API")]
    public async Task INT_SEC_50_06_AdminCallsAdminApi()
    {
        var admin = await ClientAsync(TestDataSeeder.Admin);
        var res = await PostAsync(admin, "/api/staff", NewStaff("it.staff.byadmin"));
        var check = new Checks(Output);
        check.Success(res);
        check.Equal("Tài khoản được tạo", 1, await QueryAsync(db => db.SecUsers.CountAsync(u => u.Username == "it.staff.byadmin")));
        check.Assert();
    }

    [Fact(DisplayName = "INT-SEC-50-07 | Permissions of several roles are combined")]
    public async Task INT_SEC_50_07_SeveralRolesCombined()
    {
        await SetStockAsync(K001, Ids.PTest, 100, 10_000m);
        var u = await ClientAsync(TestDataSeeder.MultiRole); // vai trò X: STOCK_CREATE, vai trò Y: STOCK_UPDATE
        var create = await PostAsync(u, "/api/transfers", TransferRequest(K001, K002, (Ids.PTest, 30m)));
        var id = create.IsSuccess ? create.Int("stockTransferId") : 0;
        var complete = await PostAsync(u, $"/api/transfers/{id}/complete");

        var check = new Checks(Output);
        check.True("POST /api/transfers thành công", create.IsSuccess, $"{create.StatusCode} {create.Message}");
        check.True("POST /api/transfers/{id}/complete thành công", complete.IsSuccess, $"{complete.StatusCode} {complete.Message}");
        check.Assert();
    }

    // ───────── Immediate Access Revocation ─────────

    /// <summary>Admin đổi ô STOCK Create của vai trò IT_TRANSFER qua màn Ma trận quyền (GET rồi PUT /api/roles/{code}/permissions).</summary>
    private async Task<ApiResult> SetStockCreateAsync(bool allowed)
    {
        var admin = await ClientAsync(TestDataSeeder.Admin);
        var current = await GetAsync(admin, $"/api/roles/{TestDataSeeder.TransferRole}/permissions");
        Assert.True(current.IsSuccess, current.Body);
        var modules = (JsonArray)current.Node!;
        foreach (var m in modules)
            if (string.Equals(m!["code"]?.GetValue<string>()?.Trim('[', ']'), "STOCK", StringComparison.OrdinalIgnoreCase)
                || string.Equals(m!["id"]?.GetValue<string>(), "STOCK", StringComparison.OrdinalIgnoreCase))
                m!["create"] = allowed;
        var put = await PutAsync(admin, $"/api/roles/{TestDataSeeder.TransferRole}/permissions", modules);
        Step($"Admin đặt STOCK_CREATE = {allowed} cho {TestDataSeeder.TransferRole}: {put.StatusCode}");
        return put;
    }

    private async Task<bool> HasStockCreateAsync() => await QueryAsync(db => db.SecRoles
        .Where(r => r.RoleName == TestDataSeeder.TransferRole).SelectMany(r => r.Permissions).AnyAsync(p => p.PermissionCode == "STOCK_CREATE"));

    [Fact(DisplayName = "INT-SEC-51-01 | Remove a permission")]
    public async Task INT_SEC_51_01_RemovePermission()
    {
        await SetStockAsync(K001, Ids.PTest, 100, 10_000m);
        var u = await ClientAsync(TestDataSeeder.Transfer); // token có từ trước
        var put = await SetStockCreateAsync(false);

        var res = await PostAsync(u, "/api/transfers", TransferRequest(K001, K002, (Ids.PTest, 30m)));

        var check = new Checks(Output);
        check.True("Admin lưu ma trận thành công", put.IsSuccess && !await HasStockCreateAsync(), $"{put.StatusCode}");
        check.Equal("HTTP status", 403, res.StatusCode);
        check.Equal("Không tạo phiếu", 0, await TransferCountAsync());
        check.Assert();
    }

    [Fact(DisplayName = "INT-SEC-51-02 | Grant a permission")]
    public async Task INT_SEC_51_02_GrantPermission()
    {
        await SetStockAsync(K001, Ids.PTest, 100, 10_000m);
        var u = await ClientAsync(TestDataSeeder.Transfer);
        Assert.True((await SetStockCreateAsync(false)).IsSuccess); // Precondition: người dùng chưa có STOCK_CREATE
        var put = await SetStockCreateAsync(true);

        var res = await PostAsync(u, "/api/transfers", TransferRequest(K001, K002, (Ids.PTest, 30m)));

        var check = new Checks(Output);
        check.True("Admin cấp lại STOCK_CREATE", put.IsSuccess && await HasStockCreateAsync(), $"{put.StatusCode}");
        check.Success(res);
        check.Equal("Phiếu được tạo không cần đăng nhập lại", 1, await TransferCountAsync());
        check.Assert();
    }

    private UpdateStaffRequest StaffUpdate(string role, List<string> warehouses) => new()
    {
        Name = "IT Chuyển hàng", Phone = "0900000000", Email = $"{TestDataSeeder.Transfer.Username}@it.test",
        Role = role, AssignedWarehouses = warehouses, Username = TestDataSeeder.Transfer.Username,
    };

    [Fact(DisplayName = "INT-SEC-51-03 | Change the role of a user")]
    public async Task INT_SEC_51_03_ChangeRole()
    {
        await SetStockAsync(K001, Ids.PTest, 100, 10_000m);
        var u = await ClientAsync(TestDataSeeder.Transfer);
        var admin = await ClientAsync(TestDataSeeder.Admin);
        var put = await PutAsync(admin, $"/api/staff/{Ids.UserId(TestDataSeeder.Transfer)}", StaffUpdate(TestDataSeeder.StockReadRole, new() { "K001", "K002" }));

        var res = await PostAsync(u, "/api/transfers", TransferRequest(K001, K002, (Ids.PTest, 30m)));

        var check = new Checks(Output);
        check.True("Admin đổi vai trò thành công", put.IsSuccess, $"{put.StatusCode} {put.Message}");
        check.Equal("HTTP status", 403, res.StatusCode);
        check.Assert();
    }

    private async Task<ApiResult> ToggleTransferUserAsync()
    {
        var admin = await ClientAsync(TestDataSeeder.Admin);
        return await SendAsync(admin, HttpMethod.Patch, $"/api/staff/{Ids.UserId(TestDataSeeder.Transfer)}/toggle-status");
    }

    [Fact(DisplayName = "INT-SEC-51-04 | Lock an account")]
    public async Task INT_SEC_51_04_LockAccount()
    {
        await SetStockAsync(K001, Ids.PTest, 100, 10_000m);
        var u = await ClientAsync(TestDataSeeder.Transfer);
        var lockRes = await ToggleTransferUserAsync();

        var res = await PostAsync(u, "/api/transfers", TransferRequest(K001, K002, (Ids.PTest, 30m)));

        var check = new Checks(Output);
        check.True("Admin khóa tài khoản", lockRes.IsSuccess, $"{lockRes.StatusCode} {lockRes.Message}");
        check.True("Bị từ chối 401 hoặc 403", res.StatusCode is 401 or 403, $"{res.StatusCode}");
        check.Equal("Không tạo phiếu", 0, await TransferCountAsync());
        check.Assert();
    }

    [Fact(DisplayName = "INT-SEC-51-05 | Locked account cannot log in")]
    public async Task INT_SEC_51_05_LockedCannotLogin()
    {
        var res = await LoginAsync(TestDataSeeder.Locked.Username, TestDataSeeder.Locked.Password);
        var check = new Checks(Output);
        check.Rejected(res);
        check.True("Không trả token", res.String("token") == null, res.Body);
        check.Assert();
    }

    [Fact(DisplayName = "INT-SEC-51-06 | Unlock an account")]
    public async Task INT_SEC_51_06_UnlockAccount()
    {
        await SetStockAsync(K001, Ids.PTest, 100, 10_000m);
        var u = await ClientAsync(TestDataSeeder.Transfer); // token cũ, còn hạn
        Assert.True((await ToggleTransferUserAsync()).IsSuccess); // Precondition: tài khoản đã bị khóa
        var unlock = await ToggleTransferUserAsync();

        var res = await PostAsync(u, "/api/transfers", TransferRequest(K001, K002, (Ids.PTest, 30m)));

        var check = new Checks(Output);
        check.True("Admin mở khóa", unlock.IsSuccess, $"{unlock.StatusCode}");
        check.Success(res);
        check.Equal("Phiếu được tạo", 1, await TransferCountAsync());
        check.Assert();
    }
}
