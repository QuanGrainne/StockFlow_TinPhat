using Microsoft.EntityFrameworkCore;
using StockFlow.Domain.Entities;

namespace StockFlow.Infrastructure.Persistence;

public static class DatabaseSeeder
{
    public static async Task SeedAsync(StockFlowDbContext context)
    {
        var seedTimestamp = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified);

        var roles = new List<SecRole>
        {
            new() { RoleId = 1, RoleName = "Admin", Description = "Administrator - Quản trị hệ thống, tài khoản, phân quyền vai trò và phân quyền kho" },
            new() { RoleId = 2, RoleName = "Manager", Description = "Manager - Quản lý cấu hình dữ liệu gốc, BOM, phê duyệt hạn mức nợ, kiểm kê, công nợ" },
            new() { RoleId = 3, RoleName = "SalesStaff", Description = "Sales Staff - Tiếp nhận đơn hàng B2B, quản lý đơn chờ, yêu cầu xuất kho" },
            new() { RoleId = 4, RoleName = "WarehouseStaff", Description = "Warehouse Staff - Nhập kho, xuất kho bán hàng, xuất NVL sản xuất, kiểm kê, chuyển kho" },
            new() { RoleId = 5, RoleName = "ProductionStaff", Description = "Production Staff - Lệnh sản xuất, theo dõi cấp phát NVL, báo cáo hoàn thành thành phẩm, báo cáo lỗi" }
        };

        foreach (var role in roles)
        {
            if (!await context.SecRoles.AnyAsync(r => r.RoleId == role.RoleId))
            {
                await context.SecRoles.AddAsync(role);
            }
        }

        await context.SaveChangesAsync();
        await context.Database.ExecuteSqlRawAsync("SELECT setval(pg_get_serial_sequence('stockflow.sec_roles', 'role_id'), COALESCE(MAX(role_id), 1)) FROM stockflow.sec_roles;");

        var warehouses = new List<MstWarehouse>
        {
            new() { WarehouseId = 1, WarehouseCode = "KTP-01", WarehouseName = "Kho Thành Phẩm", IsActive = true, Description = "Kho lưu trữ thành phẩm sẵn sàng xuất bán" },
            new() { WarehouseId = 2, WarehouseCode = "KNVL-01", WarehouseName = "Kho Nguyên Vật Liệu", IsActive = true, Description = "Kho lưu trữ nguyên vật liệu phục vụ sản xuất" }
        };

        foreach (var warehouse in warehouses)
        {
            if (!await context.MstWarehouses.AnyAsync(w => w.WarehouseId == warehouse.WarehouseId))
            {
                await context.MstWarehouses.AddAsync(warehouse);
            }
        }

        await context.SaveChangesAsync();
        await context.Database.ExecuteSqlRawAsync("SELECT setval(pg_get_serial_sequence('stockflow.mst_warehouses', 'warehouse_id'), COALESCE(MAX(warehouse_id), 1)) FROM stockflow.mst_warehouses;");

        const string defaultHash = "$2a$11$1opEHEFeQeA542CrjEh0MuByzd7olky/Tlz3MVn54bDuIpZfkGjpu";
        var users = new List<SecUser>
        {
            new() { UserId = 1, Username = "admin", FullName = "Quản trị viên Hệ thống", Email = "admin@tinphat.vn", Phone = "0901234567", PasswordHash = defaultHash, IsActive = true },
            new() { UserId = 2, Username = "manager01", FullName = "Nguyễn Văn Quản Lý", Email = "manager01@tinphat.vn", Phone = "0901234568", PasswordHash = defaultHash, IsActive = true },
            new() { UserId = 3, Username = "sales01", FullName = "Trần Thị Bán Hàng", Email = "sales01@tinphat.vn", Phone = "0901234569", PasswordHash = defaultHash, IsActive = true },
            new() { UserId = 4, Username = "whstaff01", FullName = "Lê Văn Thủ Kho", Email = "whstaff01@tinphat.vn", Phone = "0901234570", PasswordHash = defaultHash, IsActive = true },
            new() { UserId = 5, Username = "prodstaff01", FullName = "Phạm Văn Sản Xuất", Email = "prodstaff01@tinphat.vn", Phone = "0901234571", PasswordHash = defaultHash, IsActive = true }
        };
        var userIds = new Dictionary<string, int>();

        foreach (var seededUser in users)
        {
            var username = seededUser.Username!;
            var user = await context.SecUsers.FirstOrDefaultAsync(u => u.Username == username);
            if (user == null)
            {
                seededUser.CreatedAt = seedTimestamp;
                await context.SecUsers.AddAsync(seededUser);
                userIds[username] = seededUser.UserId;
            }
            else
            {
                user.PasswordHash = defaultHash;
                user.IsActive = true;
                userIds[username] = user.UserId;
            }
        }

        await context.SaveChangesAsync();
        await context.Database.ExecuteSqlRawAsync("SELECT setval(pg_get_serial_sequence('stockflow.sec_users', 'user_id'), COALESCE(MAX(user_id), 1)) FROM stockflow.sec_users;");

        var userRoles = new[] { (Username: "admin", RoleId: 1), (Username: "manager01", RoleId: 2), (Username: "sales01", RoleId: 3), (Username: "whstaff01", RoleId: 4), (Username: "prodstaff01", RoleId: 5) };
        foreach (var (username, roleId) in userRoles)
        {
            var userId = userIds[username];
            if (!await context.JncUserRoles.AnyAsync(ur => ur.UserId == userId && ur.RoleId == roleId))
            {
                await context.JncUserRoles.AddAsync(new JncUserRole { UserId = userId, RoleId = roleId, AssignedAt = seedTimestamp });
            }
        }

        var warehouseAccesses = new[] { (Username: "admin", WarehouseId: 1), (Username: "admin", WarehouseId: 2), (Username: "manager01", WarehouseId: 1), (Username: "manager01", WarehouseId: 2), (Username: "whstaff01", WarehouseId: 1), (Username: "whstaff01", WarehouseId: 2) };
        foreach (var (username, warehouseId) in warehouseAccesses)
        {
            var userId = userIds[username];
            if (!await context.JncUserWarehouseAccesses.AnyAsync(wa => wa.UserId == userId && wa.WarehouseId == warehouseId))
            {
                await context.JncUserWarehouseAccesses.AddAsync(new JncUserWarehouseAccess { UserId = userId, WarehouseId = warehouseId, AssignedAt = seedTimestamp });
            }
        }

        await context.SaveChangesAsync();
    }
}
