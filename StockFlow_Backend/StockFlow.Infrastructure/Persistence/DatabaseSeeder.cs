using Microsoft.EntityFrameworkCore;
using StockFlow.Domain.Entities;

namespace StockFlow.Infrastructure.Persistence;

public static class DatabaseSeeder
{
    public static async Task SeedAsync(StockFlowDbContext context)
    {
        // 1. Seed Roles
        if (!await context.SecRoles.AnyAsync())
        {
            var roles = new List<SecRole>
            {
                new() { RoleId = 1, RoleName = "Admin", Description = "Administrator - Quản trị hệ thống, tài khoản, phân quyền vai trò và phân quyền kho" },
                new() { RoleId = 2, RoleName = "Manager", Description = "Manager - Quản lý cấu hình dữ liệu gốc, BOM, phê duyệt hạn mức nợ, kiểm kê, công nợ" },
                new() { RoleId = 3, RoleName = "SalesStaff", Description = "Sales Staff - Tiếp nhận đơn hàng B2B, quản lý đơn chờ, yêu cầu xuất kho" },
                new() { RoleId = 4, RoleName = "WarehouseStaff", Description = "Warehouse Staff - Nhập kho, xuất kho bán hàng, xuất NVL sản xuất, kiểm kê, chuyển kho" },
                new() { RoleId = 5, RoleName = "ProductionStaff", Description = "Production Staff - Lệnh sản xuất, theo dõi cấp phát NVL, báo cáo hoàn thành thành phẩm, báo cáo lỗi" }
            };

            await context.SecRoles.AddRangeAsync(roles);
            await context.SaveChangesAsync();
        }

        // 2. Seed Warehouses
        if (!await context.MstWarehouses.AnyAsync())
        {
            var warehouses = new List<MstWarehouse>
            {
                new() { WarehouseId = 1, WarehouseCode = "KTP-01", WarehouseName = "Kho Thành Phẩm", IsActive = true, Description = "Kho lưu trữ thành phẩm sẵn sàng xuất bán" },
                new() { WarehouseId = 2, WarehouseCode = "KNVL-01", WarehouseName = "Kho Nguyên Vật Liệu", IsActive = true, Description = "Kho lưu trữ nguyên vật liệu phục vụ sản xuất" }
            };

            await context.MstWarehouses.AddRangeAsync(warehouses);
            await context.SaveChangesAsync();
        }

        // 3. Seed Users
        if (!await context.SecUsers.AnyAsync())
        {
            // Default BCrypt hash for "StockFlow@123"
            const string defaultHash = "$2a$11$1opEHEFeQeA542CrjEh0MuByzd7olky/Tlz3MVn54bDuIpZfkGjpu";

            var users = new List<SecUser>
            {
                new() { UserId = 1, Username = "admin", FullName = "Quản trị viên Hệ thống", Email = "admin@tinphat.vn", Phone = "0901234567", PasswordHash = defaultHash, IsActive = true, CreatedAt = DateTime.UtcNow },
                new() { UserId = 2, Username = "manager01", FullName = "Nguyễn Văn Quản Lý", Email = "manager01@tinphat.vn", Phone = "0901234568", PasswordHash = defaultHash, IsActive = true, CreatedAt = DateTime.UtcNow },
                new() { UserId = 3, Username = "sales01", FullName = "Trần Thị Bán Hàng", Email = "sales01@tinphat.vn", Phone = "0901234569", PasswordHash = defaultHash, IsActive = true, CreatedAt = DateTime.UtcNow },
                new() { UserId = 4, Username = "whstaff01", FullName = "Lê Văn Thủ Kho", Email = "whstaff01@tinphat.vn", Phone = "0901234570", PasswordHash = defaultHash, IsActive = true, CreatedAt = DateTime.UtcNow },
                new() { UserId = 5, Username = "prodstaff01", FullName = "Phạm Văn Sản Xuất", Email = "prodstaff01@tinphat.vn", Phone = "0901234571", PasswordHash = defaultHash, IsActive = true, CreatedAt = DateTime.UtcNow }
            };

            await context.SecUsers.AddRangeAsync(users);
            await context.SaveChangesAsync();

            // 4. Assign User Roles
            var userRoles = new List<JncUserRole>
            {
                new() { UserId = 1, RoleId = 1, AssignedAt = DateTime.UtcNow },
                new() { UserId = 2, RoleId = 2, AssignedAt = DateTime.UtcNow },
                new() { UserId = 3, RoleId = 3, AssignedAt = DateTime.UtcNow },
                new() { UserId = 4, RoleId = 4, AssignedAt = DateTime.UtcNow },
                new() { UserId = 5, RoleId = 5, AssignedAt = DateTime.UtcNow }
            };

            await context.JncUserRoles.AddRangeAsync(userRoles);

            // 5. Assign User Warehouse Access
            var warehouseAccesses = new List<JncUserWarehouseAccess>
            {
                new() { UserId = 1, WarehouseId = 1, AssignedAt = DateTime.UtcNow },
                new() { UserId = 1, WarehouseId = 2, AssignedAt = DateTime.UtcNow },
                new() { UserId = 2, WarehouseId = 1, AssignedAt = DateTime.UtcNow },
                new() { UserId = 2, WarehouseId = 2, AssignedAt = DateTime.UtcNow },
                new() { UserId = 4, WarehouseId = 1, AssignedAt = DateTime.UtcNow },
                new() { UserId = 4, WarehouseId = 2, AssignedAt = DateTime.UtcNow }
            };

            await context.JncUserWarehouseAccesses.AddRangeAsync(warehouseAccesses);
            await context.SaveChangesAsync();
        }
    }
}
