using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using StockFlow.Application.Common;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Application.Features.Roles.Common;
using StockFlow.Domain.Entities;
using StockFlow.Infrastructure.Persistence;

namespace StockFlow.IntegrationTests.Infrastructure;

/// <summary>Tài khoản dùng trong test (đăng nhập thật qua /api/auth/login).</summary>
public sealed record TestUser(string Username, string Password);

/// <summary>Id các bản ghi test sau khi seed (giống nhau ở mọi test vì database được dựng lại từ cùng bản mẫu).</summary>
public sealed class SeedIds
{
    // Kho của DatabaseSeeder (id cố định)
    public const int K001 = 3; // Kho Tổng Gia Lâm
    public const int K002 = 4; // Kho Đông Anh
    public const int K003 = 5; // Kho Hà Đông

    public int PTest { get; set; }
    public int PTest2 { get; set; }
    public int POther { get; set; }
    public int PA { get; set; }
    public int PB { get; set; }
    public int PC { get; set; }
    public int Fg01 { get; set; }
    public int Fg02 { get; set; }
    public int Rm01 { get; set; }
    public int Rm02 { get; set; }
    public int KhHm01 { get; set; }
    public int KhAbc { get; set; }
    public int KhZero { get; set; }
    public int Ncc01 { get; set; }
    public Dictionary<string, int> Users { get; } = new();
    public Dictionary<string, int> Roles { get; } = new();

    public int UserId(TestUser user) => Users[user.Username];
}

/// <summary>
/// Dữ liệu test có kiểm soát, thêm vào SAU migration + DatabaseSeeder (chạy 1 lần khi dựng bản mẫu).
/// Vai trò lưu giống màn Phân quyền chức năng (mã MODULE_ACTION + FEAT_* + FEAT__CONFIGURED trong quyền của vai trò).
/// Quyền của từng vai trò = quyền Precondition của Report 5.2 cộng quyền / chức năng (feat-*) mà code thật đòi ở API;
/// chỗ Precondition thiếu được ghi là SPEC_CODE_MISMATCH trong báo cáo.
/// </summary>
public static class TestDataSeeder
{
    public const string Password = "ItTest@2026";

    // ── Vai trò ──
    public const string SalesRole = "IT_SALES";           // bán hàng (pilot)
    public const string OpsRole = "IT_OPS";               // "User A/B/C": đủ quyền phân hệ + chức năng (không phải Admin)
    public const string StockReadRole = "IT_STOCK_READ";  // chỉ STOCK_READ (+ chức năng chuyển hàng, kiểm kho)
    public const string NoStocktakeRole = "IT_NO_STOCKTAKE"; // STOCK_READ nhưng vai trò không có feat-stocktake
    public const string StockCreateRole = "IT_STOCK_X";   // vai trò X: STOCK_CREATE
    public const string StockUpdateRole = "IT_STOCK_Y";   // vai trò Y: STOCK_UPDATE
    public const string TransferRole = "IT_TRANSFER";     // STOCK_CREATE/UPDATE + chức năng chuyển hàng (thu hồi quyền ngay)
    public const string PlannerRole = "IT_PLANNER";       // "Planner P": lập / gửi duyệt kế hoạch, không có quyền duyệt

    // ── Tài khoản ──
    public static readonly TestUser Admin = new("admin", "TinPhat@2026");      // DatabaseSeeder: Admin, K001–K004
    public static readonly TestUser Manager = new("manager01", "TinPhat@2026"); // DatabaseSeeder: Manager
    public static readonly TestUser Sales01 = new("sales01", "TinPhat@2026");   // DatabaseSeeder: SalesStaff
    public static readonly TestUser SalesK001 = new("it.sales.k001", Password);
    public static readonly TestUser SalesK002 = new("it.sales.k002", Password);
    public static readonly TestUser SalesK001K002 = new("it.sales.k001k002", Password);
    public static readonly TestUser OpsK001K002 = new("it.ops.k001k002", Password);
    public static readonly TestUser OpsK001 = new("it.ops.k001", Password);
    public static readonly TestUser OpsK002 = new("it.ops.k002", Password);
    public static readonly TestUser OpsNoWarehouse = new("it.ops.none", Password);
    public static readonly TestUser StockRead = new("it.stock.read", Password);
    public static readonly TestUser NoStocktake = new("it.nostocktake", Password);
    public static readonly TestUser MultiRole = new("it.multirole", Password);
    public static readonly TestUser Transfer = new("it.transfer", Password);
    public static readonly TestUser Locked = new("locked01", Password);
    public static readonly TestUser Planner = new("it.planner", Password);

    public static readonly string[] SalesModuleCodes =
    {
        "SALES_READ", "SALES_CREATE", "SALES_UPDATE", "SALES_DELETE",
        "PARTNER_READ", "GOODS_READ", "STOCK_READ", "FIN_READ", "FIN_CREATE", "FIN_UPDATE",
    };

    public static readonly string[] SalesFeatureIds =
    {
        "feat-pos", "feat-sales-booking", "feat-invoices", "feat-sales-returns", "feat-customers",
    };

    private static readonly string[] Actions = { "READ", "CREATE", "UPDATE", "DELETE", "APPROVE" };

    public static async Task<SeedIds> SeedAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<StockFlowDbContext>();
        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();
        var now = VietnamTime.Now;
        var ids = new SeedIds();

        // 1. Dòng quyền FEAT_* + mã đánh dấu (giống SaveRoleFeaturesCommand.Ensure)
        var permMap = (await db.SecPermissions.ToListAsync())
            .Where(p => !string.IsNullOrEmpty(p.PermissionCode))
            .GroupBy(p => p.PermissionCode!.ToUpperInvariant())
            .ToDictionary(g => g.Key, g => g.First());
        void Ensure(string code, string name)
        {
            if (permMap.ContainsKey(code)) return;
            var p = new SecPermission { PermissionCode = code, PermissionName = name, Module = FeatureConstants.PermissionModule, Description = name };
            db.SecPermissions.Add(p);
            permMap[code] = p;
        }
        foreach (var f in FeatureConstants.Features) Ensure(f.Code, $"Chức năng {f.Name}");
        Ensure(FeatureConstants.ConfiguredMarker, "Đã cấu hình phân quyền chức năng");
        await db.SaveChangesAsync();

        // 2. Vai trò
        async Task AddRole(string name, IEnumerable<string> moduleCodes, IEnumerable<string> featureIds)
        {
            var role = new SecRole { RoleName = name, Description = $"Vai trò integration test (Report 5.2): {name}" };
            foreach (var code in moduleCodes.Concat(featureIds.Select(FeatureConstants.ToCode)).Append(FeatureConstants.ConfiguredMarker).Distinct())
            {
                if (!permMap.TryGetValue(code.ToUpperInvariant(), out var p))
                    throw new InvalidOperationException($"Thiếu dòng quyền {code} sau DatabaseSeeder.");
                role.Permissions.Add(p);
            }
            db.SecRoles.Add(role);
            await db.SaveChangesAsync();
            ids.Roles[name] = role.RoleId;
        }
        var allModules = PermissionConstants.Modules.SelectMany(m => Actions.Select(a => $"{m.ModuleKey}_{a}")).ToList();
        await AddRole(SalesRole, SalesModuleCodes, SalesFeatureIds);
        await AddRole(OpsRole, allModules, FeatureConstants.Features.Select(f => f.Id));
        await AddRole(StockReadRole, new[] { "STOCK_READ" }, new[] { "feat-transfers", "feat-stocktake" });
        await AddRole(NoStocktakeRole, new[] { "STOCK_READ" }, new[] { "feat-transfers" });
        await AddRole(StockCreateRole, new[] { "STOCK_READ", "STOCK_CREATE" }, new[] { "feat-transfers" });
        await AddRole(StockUpdateRole, new[] { "STOCK_READ", "STOCK_UPDATE" }, new[] { "feat-transfers" });
        await AddRole(TransferRole, new[] { "STOCK_READ", "STOCK_CREATE", "STOCK_UPDATE" }, new[] { "feat-transfers" });
        await AddRole(PlannerRole, new[] { "PROD_READ", "PROD_UPDATE", "GOODS_READ", "BOM_READ" }, new[] { FeatureConstants.ProductionPlans });

        // 3. Người dùng + vai trò + quyền kho
        async Task AddUser(TestUser u, string fullName, string[] roles, int[] warehouses, bool active = true)
        {
            var user = new SecUser
            {
                Username = u.Username, FullName = fullName, PasswordHash = hasher.Hash(u.Password),
                Email = $"{u.Username}@it.test", Phone = "0900000000", IsActive = active, CreatedAt = now,
            };
            db.SecUsers.Add(user);
            await db.SaveChangesAsync();
            foreach (var r in roles)
                db.JncUserRoles.Add(new JncUserRole { UserId = user.UserId, RoleId = ids.Roles[r], AssignedAt = now });
            foreach (var w in warehouses)
                db.JncUserWarehouseAccesses.Add(new JncUserWarehouseAccess { UserId = user.UserId, WarehouseId = w, AssignedAt = now });
            await db.SaveChangesAsync();
            ids.Users[u.Username] = user.UserId;
        }
        const int k1 = SeedIds.K001, k2 = SeedIds.K002;
        await AddUser(SalesK001, "IT Bán hàng K001", new[] { SalesRole }, new[] { k1 });
        await AddUser(SalesK002, "IT Bán hàng K002", new[] { SalesRole }, new[] { k2 });
        await AddUser(SalesK001K002, "IT Bán hàng K001+K002", new[] { SalesRole }, new[] { k1, k2 });
        await AddUser(OpsK001K002, "IT Nghiệp vụ K001+K002", new[] { OpsRole }, new[] { k1, k2 });
        await AddUser(OpsK001, "IT Nghiệp vụ K001", new[] { OpsRole }, new[] { k1 });
        await AddUser(OpsK002, "IT Nghiệp vụ K002", new[] { OpsRole }, new[] { k2 });
        await AddUser(OpsNoWarehouse, "IT Nghiệp vụ không kho", new[] { OpsRole }, Array.Empty<int>());
        await AddUser(StockRead, "IT Chỉ xem kho", new[] { StockReadRole }, new[] { k1, k2 });
        await AddUser(NoStocktake, "IT Không có kiểm kho", new[] { NoStocktakeRole }, new[] { k1, k2 });
        await AddUser(MultiRole, "IT Hai vai trò", new[] { StockCreateRole, StockUpdateRole }, new[] { k1, k2 });
        await AddUser(Transfer, "IT Chuyển hàng", new[] { TransferRole }, new[] { k1, k2 });
        await AddUser(Locked, "IT Tài khoản bị khóa", new[] { SalesRole }, new[] { k1 }, active: false);
        await AddUser(Planner, "IT Người lập kế hoạch", new[] { PlannerRole }, new[] { k1 });
        foreach (var seeded in new[] { Admin, Manager, Sales01 })
            ids.Users[seeded.Username] = (await db.SecUsers.SingleAsync(x => x.Username == seeded.Username)).UserId;

        // 4. Hàng hóa (đơn vị "Cái" = 8, nhóm 1 của DatabaseSeeder)
        MstProduct Product(string code, string name, decimal price, decimal cost) => new()
        {
            ProductCode = code, ProductName = name, CategoryId = 1, BaseUnitId = 8, ProductType = "FINISHED",
            StandardPrice = price, MovingAverageCost = cost, IsActive = true, CreatedAt = now,
        };
        var pTest = Product("P-TEST", "Sản phẩm P-TEST", 100_000m, 60_000m);
        var pTest2 = Product("P-TEST2", "Sản phẩm P-TEST2", 150_000m, 90_000m);
        var pOther = Product("P-OTHER", "Sản phẩm P-OTHER", 50_000m, 30_000m);
        var pA = Product("P-A", "Sản phẩm P-A", 20_000m, 10_000m);
        var pB = Product("P-B", "Sản phẩm P-B", 20_000m, 10_000m);
        var pC = Product("P-C", "Sản phẩm P-C", 20_000m, 10_000m);
        var fg01 = Product("FG-01", "Thành phẩm FG-01", 500_000m, 0m);
        var fg02 = Product("FG-02", "Thành phẩm FG-02", 500_000m, 0m);
        var rm01 = Product("RM-01", "Nguyên vật liệu RM-01", 0m, 5_000m);
        var rm02 = Product("RM-02", "Nguyên vật liệu RM-02", 0m, 8_000m);
        rm01.ProductType = "MATERIAL";
        rm02.ProductType = "MATERIAL";
        db.MstProducts.AddRange(pTest, pTest2, pOther, pA, pB, pC, fg01, fg02, rm01, rm02);

        // 5. Khách hàng, nhà cung cấp
        MstBusinessPartner Partner(string code, string name, string type, decimal limit) => new()
        {
            PartnerCode = code, PartnerName = name, PartnerType = type, CreditLimit = limit,
            CurrentDebt = 0, CurrentPayable = 0, IsActive = true, CreatedAt = now,
        };
        var hm01 = Partner("KH-HM01", "Công ty Hoa Mai", "CUSTOMER", 10_000_000m);
        var abc = Partner("KH-ABC", "Công ty ABC", "CUSTOMER", 10_000_000m);
        var zero = Partner("KH-ZERO", "Khách hạn mức 0", "CUSTOMER", 0m);
        var ncc01 = Partner("NCC-01", "Nhà cung cấp NCC-01", "SUPPLIER", 0m);
        db.MstBusinessPartners.AddRange(hm01, abc, zero, ncc01);
        await db.SaveChangesAsync();

        ids.PTest = pTest.ProductId;
        ids.PTest2 = pTest2.ProductId;
        ids.POther = pOther.ProductId;
        ids.PA = pA.ProductId;
        ids.PB = pB.ProductId;
        ids.PC = pC.ProductId;
        ids.Fg01 = fg01.ProductId;
        ids.Fg02 = fg02.ProductId;
        ids.Rm01 = rm01.ProductId;
        ids.Rm02 = rm02.ProductId;
        ids.KhHm01 = hm01.PartnerId;
        ids.KhAbc = abc.PartnerId;
        ids.KhZero = zero.PartnerId;
        ids.Ncc01 = ncc01.PartnerId;
        return ids;
    }
}
