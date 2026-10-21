using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Features.Roles.Common;
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
            new() { WarehouseId = 2, WarehouseCode = "KNVL-01", WarehouseName = "Kho Nguyên Vật Liệu", IsActive = true, Description = "Kho lưu trữ nguyên vật liệu phục vụ sản xuất" },
            new() { WarehouseId = 3, WarehouseCode = "WH-HN-01", WarehouseName = "Kho Tổng Gia Lâm", Address = "Số 18 Đường Dệt May, Gia Lâm, Hà Nội", IsActive = true, Description = "Kho trung tâm" },
            new() { WarehouseId = 4, WarehouseCode = "WH-HN-02", WarehouseName = "Kho Đông Anh", Address = "CCN Nguyên Khê, Đông Anh, Hà Nội", IsActive = true, Description = "Kho phụ trợ" },
            new() { WarehouseId = 5, WarehouseCode = "WH-HN-03", WarehouseName = "Kho Hà Đông", Address = "Km14 Quốc lộ 6, Yên Nghĩa, Hà Đông, Hà Nội", IsActive = true, Description = "Kho khu vực Tây Hà Nội" },
            new() { WarehouseId = 6, WarehouseCode = "WH-HN-04", WarehouseName = "Kho Hoàn Kiếm", Address = "42 Phố Trần Hưng Đạo, Hoàn Kiếm, Hà Nội", IsActive = true, Description = "Kho phân phối nội thành" }
        };

        foreach (var warehouse in warehouses)
        {
            if (!await context.MstWarehouses.AnyAsync(w => w.WarehouseCode == warehouse.WarehouseCode))
            {
                await context.MstWarehouses.AddAsync(warehouse);
            }
        }

        await context.SaveChangesAsync();
        await context.Database.ExecuteSqlRawAsync("SELECT setval(pg_get_serial_sequence('stockflow.mst_warehouses', 'warehouse_id'), COALESCE(MAX(warehouse_id), 1)) FROM stockflow.mst_warehouses;");

        var defaultHash = BCrypt.Net.BCrypt.HashPassword("TinPhat@2026");
        var users = new List<SecUser>
        {
            new() { UserId = 1, Username = "admin", FullName = "Quản trị viên Hệ thống", Email = "admin@tinphat.vn", Phone = "0901234567", Avatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80", PasswordHash = defaultHash, IsActive = true },
            new() { UserId = 2, Username = "manager01", FullName = "Nguyễn Văn Quản Lý", Email = "manager01@tinphat.vn", Phone = "0901234568", Avatar = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80", PasswordHash = defaultHash, IsActive = true },
            new() { UserId = 3, Username = "sales01", FullName = "Trần Thị Bán Hàng", Email = "sales01@tinphat.vn", Phone = "0901234569", Avatar = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80", PasswordHash = defaultHash, IsActive = true },
            new() { UserId = 4, Username = "whstaff01", FullName = "Lê Văn Thủ Kho", Email = "whstaff01@tinphat.vn", Phone = "0901234570", Avatar = "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80", PasswordHash = defaultHash, IsActive = true },
            new() { UserId = 5, Username = "prodstaff01", FullName = "Phạm Văn Sản Xuất", Email = "prodstaff01@tinphat.vn", Phone = "0901234571", Avatar = "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80", PasswordHash = defaultHash, IsActive = true }
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
                // Giữ nguyên mật khẩu hiện tại của người dùng, không ghi đè lại mỗi khi restart
                if (string.IsNullOrEmpty(user.PasswordHash))
                {
                    user.PasswordHash = defaultHash;
                }
                if (string.IsNullOrEmpty(user.Avatar) && !string.IsNullOrEmpty(seededUser.Avatar))
                {
                    user.Avatar = seededUser.Avatar;
                }
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

        var warehouseAccesses = new[]
        {
            (Username: "admin", WarehouseId: 3),
            (Username: "admin", WarehouseId: 4),
            (Username: "admin", WarehouseId: 5),
            (Username: "admin", WarehouseId: 6),
            (Username: "manager01", WarehouseId: 3),
            (Username: "manager01", WarehouseId: 4),
            (Username: "sales01", WarehouseId: 3),
            (Username: "sales01", WarehouseId: 5),
            (Username: "whstaff01", WarehouseId: 3),
            (Username: "prodstaff01", WarehouseId: 4)
        };
        foreach (var (username, warehouseId) in warehouseAccesses)
        {
            if (userIds.TryGetValue(username, out var userId))
            {
                if (!await context.JncUserWarehouseAccesses.AnyAsync(wa => wa.UserId == userId && wa.WarehouseId == warehouseId))
                {
                    await context.JncUserWarehouseAccesses.AddAsync(new JncUserWarehouseAccess { UserId = userId, WarehouseId = warehouseId, AssignedAt = seedTimestamp });
                }
            }
        }

        await context.SaveChangesAsync();

        // 6. Seed 45 permissions for 9 modules
        var modules = new[] { "AUTH", "BOM", "PARTNER", "PURCHASE", "SALES", "STOCK", "PROD", "FIN", "GOODS" };
        var actions = new[] { "READ", "CREATE", "UPDATE", "DELETE", "APPROVE" };

        var existingPerms = await context.SecPermissions.ToListAsync();
        var permMap = existingPerms.ToDictionary(p => p.PermissionCode ?? "", p => p);

        var hasNewPerms = false;
        foreach (var mod in modules)
        {
            foreach (var act in actions)
            {
                var code = $"{mod}_{act}";
                if (!permMap.ContainsKey(code))
                {
                    var p = new SecPermission
                    {
                        PermissionCode = code,
                        PermissionName = $"{act} {mod}",
                        Module = mod,
                        Description = $"Permission {act} on module {mod}"
                    };
                    await context.SecPermissions.AddAsync(p);
                    permMap[code] = p;
                    hasNewPerms = true;
                }
            }
        }

        if (hasNewPerms)
        {
            await context.SaveChangesAsync();
            await context.Database.ExecuteSqlRawAsync("SELECT setval(pg_get_serial_sequence('stockflow.sec_permissions', 'permission_id'), COALESCE(MAX(permission_id), 1)) FROM stockflow.sec_permissions;");
        }

        // 7. Seed initial role permissions into jnc_role_permissions if table is empty
        var hasAnyRolePerms = await context.Database.SqlQueryRaw<int>("SELECT 1 FROM stockflow.jnc_role_permissions LIMIT 1").AnyAsync();
        if (!hasAnyRolePerms)
        {
            var allPerms = await context.SecPermissions.ToListAsync();
            var pLookup = allPerms.ToDictionary(p => p.PermissionCode?.ToUpperInvariant() ?? "", p => p.PermissionId);

            var dbRoles = await context.SecRoles.ToListAsync();
            foreach (var r in dbRoles)
            {
                var roleNorm = PermissionConstants.ToRoleCode(r.RoleName ?? "");
                var defaultCodes = PermissionConstants.GetDefaultPermissionCodes(roleNorm);

                foreach (var code in defaultCodes)
                {
                    if (pLookup.TryGetValue(code.ToUpperInvariant(), out var pId))
                    {
                        await context.Database.ExecuteSqlRawAsync(
                            "INSERT INTO stockflow.jnc_role_permissions (role_id, permission_id) VALUES ({0}, {1}) ON CONFLICT DO NOTHING",
                            r.RoleId, pId);
                    }
                }
            }
        }
    }
}
