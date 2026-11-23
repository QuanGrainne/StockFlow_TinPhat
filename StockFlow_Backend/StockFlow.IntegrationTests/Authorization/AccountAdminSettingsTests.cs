using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Features.Admin.DTOs;
using StockFlow.Application.Features.Auth.DTOs;
using StockFlow.Application.Features.Roles.DTOs;
using StockFlow.IntegrationTests.Infrastructure;
using StockFlow.IntegrationTests.Inventory;
using Xunit;
using Xunit.Abstractions;

namespace StockFlow.IntegrationTests.Authorization;

/// <summary>
/// Report 5.2 – sheet "Login and JWT Session" (chức năng 37, UC-01, UC-02, BR-01), "Change Password" (38, UC-03, BR-35..37),
/// "Staff Accounts and Roles" (39, UC-04..09, UC-14), "Role Permission Matrix" (40, UC-10..13, BR-02),
/// "Order Settings Affect Sales" (41, UC-51). Tài khoản của DatabaseSeeder: admin, manager01, sales01 (SalesStaff, K001 + K003, mật khẩu TinPhat@2026);
/// locked01 (bị khóa) do TestDataSeeder tạo.
/// </summary>
public sealed class AccountAdminSettingsTests : InventoryTestBase
{
    public AccountAdminSettingsTests(IntegrationTestFixture fixture, ITestOutputHelper output) : base(fixture, output) { }

    // ───────── Login & JWT Session ─────────

    [Fact(DisplayName = "INT-AUT-37-01 | Valid login")]
    public async Task INT_AUT_37_01_ValidLogin()
    {
        var login = await LoginAsync("admin", "TinPhat@2026");
        var token = login.String("token");
        var me = token == null ? null : await GetAsync(ClientWithToken(token), "/api/auth/me");

        var check = new Checks(Output);
        check.Equal("HTTP status", 200, login.StatusCode);
        var body = login.Node as JsonObject;
        check.True("Có token, roles, permissions, warehouses",
            token != null && body?["roles"] != null && body?["permissions"] != null && body?["warehouses"] != null,
            string.Join(", ", body?.Select(p => p.Key) ?? Array.Empty<string>()));
        check.True("/me trả về người dùng admin", me?.IsSuccess == true && me.Body.Contains("admin"), $"{me?.StatusCode}");
        check.Assert();
    }

    [Fact(DisplayName = "INT-AUT-37-02 | Wrong password")]
    public async Task INT_AUT_37_02_WrongPassword()
    {
        var res = await LoginAsync("admin", "Sai@12345");
        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", "Tên đăng nhập hoặc mật khẩu không chính xác.", res);
        check.Assert();
    }

    [Fact(DisplayName = "INT-AUT-37-03 | Locked account")]
    public async Task INT_AUT_37_03_LockedAccount()
    {
        var res = await LoginAsync(TestDataSeeder.Locked.Username, TestDataSeeder.Locked.Password);
        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", "Tài khoản của bạn đã bị vô hiệu hóa.", res);
        check.Assert();
    }

    [Fact(DisplayName = "INT-AUT-37-04 | No token")]
    public async Task INT_AUT_37_04_NoToken()
    {
        var res = await GetAsync(AnonymousClient(), "/api/products");
        var check = new Checks(Output);
        check.Equal("HTTP status", 401, res.StatusCode);
        check.Assert();
    }

    [Fact(DisplayName = "INT-AUT-37-05 | Expired session in the UI",
        Skip = "E2E (nhóm C): chuyển hướng /login khi mất token là hành vi frontend (lib/api/client.ts), không thuộc Backend Integration Test.")]
    public void INT_AUT_37_05_ExpiredSessionUi() { }

    [Fact(DisplayName = "INT-AUT-37-06 | Two tabs, two accounts",
        Skip = "E2E (nhóm C): mỗi tab giữ tài khoản riêng (tabSession) là hành vi trình duyệt, không thuộc Backend Integration Test.")]
    public void INT_AUT_37_06_TwoTabs() { }

    // ───────── Change Password ─────────

    private const string Sales01Password = "TinPhat@2026";

    private async Task<ApiResult> ChangeAsync(string current, string next, string confirm) =>
        await PostAsync(await ClientAsync(TestDataSeeder.Sales01), "/api/auth/change-password", new ChangePasswordRequest(current, next, confirm));

    [Fact(DisplayName = "INT-AUT-38-01 | Change password (phần backend; modal ở header là E2E)")]
    public async Task INT_AUT_38_01_ChangePassword()
    {
        var res = await ChangeAsync(Sales01Password, "MatKhauMoi@2026", "MatKhauMoi@2026");
        var withNew = await LoginAsync("sales01", "MatKhauMoi@2026");
        var withOld = await LoginAsync("sales01", Sales01Password);

        var check = new Checks(Output);
        check.Success(res);
        check.Equal("Đăng nhập bằng mật khẩu mới", 200, withNew.StatusCode);
        check.True("Mật khẩu cũ không dùng được", !withOld.IsSuccess, $"{withOld.StatusCode}");
        check.Assert();
    }

    [Fact(DisplayName = "INT-AUT-38-02 | Wrong current password")]
    public async Task INT_AUT_38_02_WrongCurrent()
    {
        var res = await ChangeAsync("Sai@12345", "MatKhauMoi@2026", "MatKhauMoi@2026");
        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", "Mật khẩu hiện tại không chính xác (BR-37).", res);
        check.Assert();
    }

    [Fact(DisplayName = "INT-AUT-38-03 | Weak new password")]
    public async Task INT_AUT_38_03_WeakPassword()
    {
        var res = await ChangeAsync(Sales01Password, "MatKhauMoi2026", "MatKhauMoi2026");
        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", "Mật khẩu mới phải có ít nhất 1 ký tự đặc biệt (BR-35).", res);
        check.Assert();
    }

    [Fact(DisplayName = "INT-AUT-38-04 | Same as current")]
    public async Task INT_AUT_38_04_SameAsCurrent()
    {
        var res = await ChangeAsync(Sales01Password, Sales01Password, Sales01Password);
        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", "Mật khẩu mới không được trùng mật khẩu hiện tại (BR-36).", res);
        check.Assert();
    }

    [Fact(DisplayName = "INT-AUT-38-05 | Confirmation mismatch")]
    public async Task INT_AUT_38_05_ConfirmationMismatch()
    {
        var res = await ChangeAsync(Sales01Password, "MatKhauMoi@2026", "MatKhauKhac@2026");
        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", "Xác nhận mật khẩu mới không khớp.", res);
        check.Assert();
    }

    // ───────── Staff Accounts & Roles ─────────

    private static CreateStaffRequest Sales02(string? password = null) => new()
    {
        Username = "sales02", Name = "Nhân viên bán hàng 02", Phone = "0922222222", Email = "sales02@it.test",
        Role = "SalesStaff", AssignedWarehouses = new() { "K001" }, Password = password,
    };

    private Task<int> Sales02IdAsync() => QueryAsync(db => db.SecUsers.Where(u => u.Username == "sales02").Select(u => u.UserId).SingleAsync());

    [Fact(DisplayName = "INT-ADM-39-01 | Create a staff")]
    public async Task INT_ADM_39_01_CreateStaff()
    {
        var admin = await ClientAsync(TestDataSeeder.Admin);
        var res = await PostAsync(admin, "/api/staff", Sales02());
        var login = await LoginAsync("sales02", "TinPhat@2026"); // mật khẩu mặc định
        var my = login.String("token") is { } t ? await GetAsync(ClientWithToken(t), "/api/warehouses/my-warehouses") : null;

        var check = new Checks(Output);
        check.Success(res);
        var u = await QueryAsync(db => db.SecUsers.FirstOrDefaultAsync(x => x.Username == "sales02"));
        check.Equal("Tài khoản ACTIVE", true, u?.IsActive);
        check.Equal("Đăng nhập bằng mật khẩu mặc định", 200, login.StatusCode);
        var codes = my?.Items.Select(i => i?["warehouseCode"]?.GetValue<string>() ?? i?["code"]?.GetValue<string>()).ToList() ?? new();
        check.True("Chỉ có K001", codes.Count == 1 && codes[0] == "K001", my?.Body ?? "(không gọi được)");
        check.Assert();
    }

    [Fact(DisplayName = "INT-ADM-39-02 | Duplicate username")]
    public async Task INT_ADM_39_02_DuplicateUsername()
    {
        var admin = await ClientAsync(TestDataSeeder.Admin);
        Assert.True((await PostAsync(admin, "/api/staff", Sales02())).IsSuccess);

        var res = await PostAsync(admin, "/api/staff", Sales02());

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", "Tên đăng nhập 'sales02' đã tồn tại trong hệ thống. Vui lòng chọn tên đăng nhập khác.", res);
        check.Assert();
    }

    [Fact(DisplayName = "INT-ADM-39-03 | Lock an account")]
    public async Task INT_ADM_39_03_LockAccount()
    {
        var admin = await ClientAsync(TestDataSeeder.Admin);
        Assert.True((await PostAsync(admin, "/api/staff", Sales02())).IsSuccess);
        var token = (await LoginAsync("sales02", "TinPhat@2026")).String("token")!;

        var lockRes = await SendAsync(admin, HttpMethod.Patch, $"/api/staff/{await Sales02IdAsync()}/toggle-status");
        var call = await GetAsync(ClientWithToken(token), "/api/products");

        var check = new Checks(Output);
        check.Success(lockRes);
        check.Equal("Tài khoản bị khóa", false, (await QueryAsync(db => db.SecUsers.SingleAsync(u => u.Username == "sales02"))).IsActive);
        check.True("Request tiếp theo bị từ chối", call.StatusCode is 401 or 403, $"{call.StatusCode}");
        check.Assert();
    }

    [Fact(DisplayName = "INT-ADM-39-04 | Lock Admin")]
    public async Task INT_ADM_39_04_LockAdmin()
    {
        var admin = await ClientAsync(TestDataSeeder.Admin);
        var res = await SendAsync(admin, HttpMethod.Patch, $"/api/staff/{Ids.UserId(TestDataSeeder.Admin)}/toggle-status");

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", "Không thể khóa tài khoản Quản trị viên Hệ thống (Admin).", res);
        check.Equal("Admin vẫn hoạt động", true, (await QueryAsync(db => db.SecUsers.SingleAsync(u => u.Username == "admin"))).IsActive);
        check.Assert();
    }

    [Fact(DisplayName = "INT-ADM-39-05 | Reset password")]
    public async Task INT_ADM_39_05_ResetPassword()
    {
        var admin = await ClientAsync(TestDataSeeder.Admin);
        Assert.True((await PostAsync(admin, "/api/staff", Sales02("Sales02@Cu2026"))).IsSuccess); // mật khẩu cũ đã biết

        var res = await PostAsync(admin, $"/api/staff/{await Sales02IdAsync()}/reset-password");
        var old = await LoginAsync("sales02", "Sales02@Cu2026");

        var check = new Checks(Output);
        check.Success(res);
        Actual("Phản hồi đặt lại", res.Body);
        check.True("Mật khẩu cũ không dùng được", !old.IsSuccess, $"{old.StatusCode}");
        check.Assert();
    }

    [Fact(DisplayName = "INT-ADM-39-06 | Non-admin calls staff API")]
    public async Task INT_ADM_39_06_NonAdminCallsStaffApi()
    {
        var sales = await ClientAsync(TestDataSeeder.Sales01);
        var res = await PostAsync(sales, "/api/staff", Sales02());

        var check = new Checks(Output);
        check.Equal("HTTP status", 403, res.StatusCode);
        check.Equal("Không tạo tài khoản", 0, await QueryAsync(db => db.SecUsers.CountAsync(u => u.Username == "sales02")));
        check.Assert();
    }

    // ───────── Role Permission Matrix Enforcement ─────────

    private async Task<ApiResult> SetSalesCreateAsync(bool allowed)
    {
        var admin = await ClientAsync(TestDataSeeder.Admin);
        var current = await GetAsync(admin, "/api/roles/SalesStaff/permissions");
        Assert.True(current.IsSuccess, current.Body);
        var modules = (JsonArray)current.Node!;
        foreach (var m in modules)
            if (string.Equals(m!["code"]?.GetValue<string>()?.Trim('[', ']'), "SALES", StringComparison.OrdinalIgnoreCase)
                || string.Equals(m!["id"]?.GetValue<string>(), "SALES", StringComparison.OrdinalIgnoreCase))
                m!["create"] = allowed;
        return await PutAsync(admin, "/api/roles/SalesStaff/permissions", modules);
    }

    private async Task<ApiResult> Sales01SellsAsync() =>
        await PostAsync(await ClientAsync(TestDataSeeder.Sales01), "/api/orders/pos", Pos(WalkIn, K001, "CASH", 100_000m, new[] { (Ids.PTest, 1m, PTestPrice) }));

    [Fact(DisplayName = "INT-ADM-40-01 | Remove a permission")]
    public async Task INT_ADM_40_01_RemovePermission()
    {
        await SetStockAsync(K001, Ids.PTest, 50);
        await ClientAsync(TestDataSeeder.Sales01); // đã đăng nhập từ trước
        var put = await SetSalesCreateAsync(false);

        var res = await Sales01SellsAsync();

        var check = new Checks(Output);
        check.Success(put);
        check.Equal("403 ở request kế tiếp, không cần đăng nhập lại", 403, res.StatusCode);
        check.Assert();
    }

    [Fact(DisplayName = "INT-ADM-40-02 | Give the permission back")]
    public async Task INT_ADM_40_02_GiveBack()
    {
        await SetStockAsync(K001, Ids.PTest, 50);
        Assert.True((await SetSalesCreateAsync(false)).IsSuccess);
        var put = await SetSalesCreateAsync(true);

        var res = await Sales01SellsAsync();

        var check = new Checks(Output);
        check.Success(put);
        check.Success(res);
        check.Assert();
    }

    [Fact(DisplayName = "INT-ADM-40-03 | Feature matrix hides a menu (phần backend; ẩn menu là E2E)")]
    public async Task INT_ADM_40_03_FeatureMatrix()
    {
        var admin = await ClientAsync(TestDataSeeder.Admin);
        var matrix = await GetAsync(admin, "/api/roles/feature-matrix");
        Actual("Ma trận hiện tại (rút gọn)", matrix.Body.Length > 400 ? matrix.Body[..400] : matrix.Body);
        // Chức năng hiện tại của SalesStaff bỏ "Chuyển hàng" (feat-transfers)
        var sales = await ClientAsync(TestDataSeeder.Sales01);
        var mine = await GetAsync(sales, "/api/roles/my-features");
        // my-features trả mã chức năng; đổi về id dạng "feat-xxx" mà PUT /feature-matrix nhận (FEAT_SALES_BOOKING → feat-sales-booking)
        static string ToId(string f) => f.StartsWith("FEAT_", StringComparison.OrdinalIgnoreCase) ? "feat-" + f[5..].ToLowerInvariant().Replace('_', '-') : f;
        var current = mine.Items.Select(i => i?.GetValue<string>()).Where(x => x != null).Select(x => ToId(x!)).ToList();
        var next = current.Where(f => !f.Equals("feat-transfers", StringComparison.OrdinalIgnoreCase)).ToList();
        var put = await PutAsync(admin, "/api/roles/feature-matrix", new Dictionary<string, List<string>> { ["SalesStaff"] = next });

        var after = await GetAsync(sales, "/api/roles/my-features"); // 2. sales01 tải lại
        var transfers = await GetAsync(sales, "/api/transfers");

        var check = new Checks(Output);
        check.Success(put);
        check.True("Không còn chức năng Chuyển hàng", !after.Body.Contains("feat-transfers", StringComparison.OrdinalIgnoreCase)
            && !after.Body.Contains("FEAT_TRANSFERS", StringComparison.OrdinalIgnoreCase), after.Body);
        check.Equal("Mở /transfers bị từ chối (API)", 403, transfers.StatusCode);
        check.Assert();
    }

    [Fact(DisplayName = "INT-ADM-40-04 | Create a duplicate role")]
    public async Task INT_ADM_40_04_DuplicateRole()
    {
        var admin = await ClientAsync(TestDataSeeder.Admin);
        var res = await PostAsync(admin, "/api/roles", new CreateRoleRequest("SalesStaff", "SalesStaff", null, null));

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", "Vai trò '<name>' hoặc mã '<code>' đã tồn tại trong hệ thống.", res);
        check.Assert();
    }

    [Fact(DisplayName = "INT-ADM-40-05 | Delete a role in use")]
    public async Task INT_ADM_40_05_DeleteRoleInUse()
    {
        var admin = await ClientAsync(TestDataSeeder.Admin);
        var res = await SendAsync(admin, HttpMethod.Delete, "/api/roles/SalesStaff");

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", "Vai trò đang được phân công cho ... nhân sự. ...", res);
        check.Equal("Vai trò còn", 1, await QueryAsync(db => db.SecRoles.CountAsync(r => r.RoleName == "SalesStaff")));
        check.Assert();
    }

    // ───────── Order Settings Affect Sales ─────────

    private async Task<ApiResult> PutSettingsAsync(HttpClient client, Action<JsonObject> change)
    {
        var current = await GetAsync(client, "/api/settings/orders");
        Assert.True(current.IsSuccess, current.Body);
        var body = (JsonObject)current.Node!;
        change(body);
        return await PutAsync(client, "/api/settings/orders", body);
    }

    [Fact(DisplayName = "INT-SET-41-01 | Change code rule")]
    public async Task INT_SET_41_01_ChangeCodeRule()
    {
        await SetStockAsync(K001, Ids.PTest, 50);
        var admin = await ClientAsync(TestDataSeeder.Admin);
        var put = await PutSettingsAsync(admin, b => b["orderCodeRule"] = "DATETIME");

        var pos = await PostAsync(await ClientAsync(TestDataSeeder.SalesK001), "/api/orders/pos", Pos(WalkIn, K001, "CASH", 100_000m, new[] { (Ids.PTest, 1m, PTestPrice) }));

        var check = new Checks(Output);
        check.Success(put);
        check.Success(pos);
        var code = pos.String("orderCode") ?? "";
        var stamp = DateTime.Now.ToString("yyMMdd");
        check.True("Mã hóa đơn theo quy tắc DATETIME (tiền tố + yyMMdd…)", code.StartsWith("HD") && code.Length > 8 && code.Contains(stamp), code);
        check.Assert();
    }

    [Fact(DisplayName = "INT-SET-41-02 | Invalid rule")]
    public async Task INT_SET_41_02_InvalidRule()
    {
        var res = await PutSettingsAsync(await ClientAsync(TestDataSeeder.Admin), b => b["orderCodeRule"] = "ABC");
        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", "Quy tắc sinh mã không hợp lệ: ABC. Chấp nhận: SEQUENTIAL, DATETIME, RANDOM.", res);
        check.Assert();
    }

    [Fact(DisplayName = "INT-SET-41-03 | Prefix too long")]
    public async Task INT_SET_41_03_PrefixTooLong()
    {
        var res = await PutSettingsAsync(await ClientAsync(TestDataSeeder.Admin), b => b["orderCodePrefix"] = "ABCDEFGHIJK");
        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", "Tiền tố mã chứng từ không được vượt quá 10 ký tự.", res);
        check.Assert();
    }

    [Fact(DisplayName = "INT-SET-41-04 | Stop new bookings")]
    public async Task INT_SET_41_04_StopNewBookings()
    {
        await SetStockAsync(K001, Ids.PTest, 50);
        Assert.True((await PutSettingsAsync(await ClientAsync(TestDataSeeder.Admin), b => b["enableOrderPlacement"] = false)).IsSuccess);

        var res = await PostAsync(await ClientAsync(TestDataSeeder.SalesK001), "/api/sales-bookings", Booking(Ids.KhHm01, K001, new[] { (Ids.PTest, 1m, PTestPrice) }));

        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", "Hệ thống hiện đang tạm ngừng tiếp nhận đơn đặt hàng mới theo chính sách cài đặt (A1).", res);
        check.Equal("Không tạo đơn đặt", 0, await CountOrdersAsync("BOOKING"));
        check.Assert();
    }

    [Fact(DisplayName = "INT-SET-41-05 | Non-admin changes settings")]
    public async Task INT_SET_41_05_NonAdminChangesSettings()
    {
        var res = await PutSettingsAsync(await ClientAsync(TestDataSeeder.Manager), b => b["allowNegativeStockSale"] = true);
        var check = new Checks(Output);
        check.Equal("HTTP status", 400, res.StatusCode);
        check.Message("Thông báo", "Chỉ Quản trị viên (Admin) mới có quyền thay đổi thiết lập đơn hàng và quy tắc giao dịch.", res);
        check.Assert();
    }
}
