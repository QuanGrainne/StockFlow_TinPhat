using Moq;
using StockFlow.Application.Common.Interfaces;
using StockFlow.Domain.Entities;
using StockFlow.Infrastructure.Services;

namespace StockFlow.UnitTests.Common;

/// <summary>
/// Dữ liệu mẫu cho tài khoản – vai trò – quyền kho (giống DatabaseSeeder ở các điểm test cần):
/// vai trò 1 Admin, 2 Manager, 3 SalesStaff, 4 WarehouseStaff, 5 ProductionStaff;
/// tài khoản 1 admin, 2 manager01, 3 sales01, 4 kho04 (mã NV-NV004), 5 locked01 (bị khóa).
/// Mật khẩu băm bằng BcryptPasswordHasher thật (tính một lần cho cả lượt chạy vì BCrypt chậm).
/// </summary>
public static class AuthData
{
    public const string DefaultPassword = "TinPhat@2026";
    public const string SalesPassword = "Abc@12345";

    public const int AdminRole = 1, ManagerRole = 2, SalesRole = 3, WarehouseRole = 4, ProductionRole = 5;
    public const int Admin = 1, Manager = 2, Sales = 3, Warehouse = 4, Locked = 5;

    public static readonly BcryptPasswordHasher Hasher = new();
    private static readonly Lazy<string> DefaultHash = new(() => Hasher.Hash(DefaultPassword));
    private static readonly Lazy<string> SalesHash = new(() => Hasher.Hash(SalesPassword));

    public static TestStockFlowDbContext Db()
    {
        var db = TestStockFlowDbContext.Create();
        db.MstWarehouses.AddRange(
            new MstWarehouse { WarehouseId = TestData.InactiveWarehouse, WarehouseCode = "KTP-01", WarehouseName = "Kho Thành Phẩm", IsActive = false },
            new MstWarehouse { WarehouseId = 2, WarehouseCode = "KNVL-01", WarehouseName = "Kho Nguyên Vật Liệu", IsActive = false },
            new MstWarehouse { WarehouseId = TestData.K001, WarehouseCode = "K001", WarehouseName = "Kho Tổng Gia Lâm", IsActive = true },
            new MstWarehouse { WarehouseId = TestData.K002, WarehouseCode = "K002", WarehouseName = "Kho Đông Anh", IsActive = true },
            new MstWarehouse { WarehouseId = TestData.K003, WarehouseCode = "K003", WarehouseName = "Kho Hà Đông", IsActive = true },
            new MstWarehouse { WarehouseId = TestData.K004, WarehouseCode = "K004", WarehouseName = "Kho Hoàn Kiếm", IsActive = true });
        db.SecRoles.AddRange(
            new SecRole { RoleId = AdminRole, RoleName = "Admin" },
            new SecRole { RoleId = ManagerRole, RoleName = "Manager" },
            new SecRole { RoleId = SalesRole, RoleName = "SalesStaff" },
            new SecRole { RoleId = WarehouseRole, RoleName = "WarehouseStaff" },
            new SecRole { RoleId = ProductionRole, RoleName = "ProductionStaff" });
        db.SecUsers.AddRange(
            User(Admin, "admin", "Quản trị viên", "admin@tinphat.vn", DefaultHash.Value),
            User(Manager, "manager01", "Quản lý 01", "manager01@tinphat.vn", DefaultHash.Value),
            User(Sales, "sales01", "Nhân viên bán hàng 01", "sales01@tinphat.vn", SalesHash.Value),
            User(Warehouse, "kho04", "Nhân viên kho 04", "kho04@tinphat.vn", DefaultHash.Value),
            User(Locked, "locked01", "Tài khoản bị khóa", "locked01@tinphat.vn", DefaultHash.Value, active: false));
        db.JncUserRoles.AddRange(
            new JncUserRole { UserId = Admin, RoleId = AdminRole },
            new JncUserRole { UserId = Manager, RoleId = ManagerRole },
            new JncUserRole { UserId = Sales, RoleId = SalesRole },
            new JncUserRole { UserId = Warehouse, RoleId = WarehouseRole },
            new JncUserRole { UserId = Locked, RoleId = SalesRole });
        foreach (var wh in new[] { TestData.K001, TestData.K002, TestData.K003, TestData.K004 }) Grant(db, Admin, wh);
        Grant(db, Sales, TestData.K001);
        Grant(db, Sales, TestData.K003);
        Grant(db, Warehouse, TestData.K001);
        Grant(db, Warehouse, TestData.K002);
        TestData.SaveAndDetach(db);
        return db;
    }

    private static SecUser User(int id, string username, string name, string email, string hash, bool active = true) =>
        new() { UserId = id, Username = username, FullName = name, Email = email, Phone = "0912345678", PasswordHash = hash, IsActive = active };

    private static void Grant(TestStockFlowDbContext db, int userId, int warehouseId) =>
        db.JncUserWarehouseAccesses.Add(new JncUserWarehouseAccess { UserId = userId, WarehouseId = warehouseId });

    /// <summary>Gán các mã quyền (tạo dòng sec_permissions nếu chưa có) cho vai trò.</summary>
    public static void GivePermissions(TestStockFlowDbContext db, int roleId, params string[] codes)
    {
        var role = db.SecRoles.Single(r => r.RoleId == roleId);
        foreach (var code in codes)
        {
            var permission = db.SecPermissions.Local.FirstOrDefault(p => p.PermissionCode == code)
                ?? db.SecPermissions.FirstOrDefault(p => p.PermissionCode == code)
                ?? db.SecPermissions.Add(new SecPermission { PermissionCode = code, PermissionName = code, Module = code.Split('_')[0] }).Entity;
            role.Permissions.Add(permission);
        }
        TestData.SaveAndDetach(db);
    }

    public static ICollection<string?> RolePermissionCodes(TestStockFlowDbContext db, int roleId) =>
        db.SecRoles.Where(r => r.RoleId == roleId).SelectMany(r => r.Permissions.Select(p => p.PermissionCode)).ToList();

    /// <summary>Người dùng hiện tại (mock) là Admin – dùng cho các handler có kiểm IsAdmin bên trong.</summary>
    public static Mock<ICurrentUserService> AdminUser() => CurrentUser.Admin(Admin, TestData.K001, TestData.K002, TestData.K003, TestData.K004);
}
