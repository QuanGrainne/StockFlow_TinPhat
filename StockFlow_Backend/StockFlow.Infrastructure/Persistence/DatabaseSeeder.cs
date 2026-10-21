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
        var additionalWarehouses = new List<MstWarehouse>
        {
            new() { WarehouseId = 3, WarehouseCode = "WH-HN-01", WarehouseName = "Kho Tổng Gia Lâm", IsActive = true, Address = "Số 18 Đường Dệt May, Gia Lâm, Hà Nội", Description = "8,500 m² - Kho trung tâm thành phẩm và phụ kiện" },
            new() { WarehouseId = 4, WarehouseCode = "WH-HN-02", WarehouseName = "Kho Đông Anh", IsActive = true, Address = "CCN Nguyên Khê, Đông Anh, Hà Nội", Description = "4,200 m² - Kho nguyên vật liệu cơ khí và tôn mạ" },
            new() { WarehouseId = 5, WarehouseCode = "WH-HN-03", WarehouseName = "Kho Hà Đông", IsActive = true, Address = "Km14 Quốc lộ 6, Yên Nghĩa, Hà Đông, Hà Nội", Description = "3,800 m² - Kho trung chuyển phân phối Tây Hà Nội" },
            new() { WarehouseId = 6, WarehouseCode = "WH-HN-04", WarehouseName = "Kho Hoàn Kiếm", IsActive = true, Address = "42 Phố Trần Hưng Đạo, Hoàn Kiếm, Hà Nội", Description = "1,500 m² - Điểm giao hàng nhanh nội đô" }
        };

        foreach (var wh in additionalWarehouses)
        {
            if (!await context.MstWarehouses.AnyAsync(w => w.WarehouseCode == wh.WarehouseCode))
            {
                await context.MstWarehouses.AddAsync(wh);
            }
        }
        await context.SaveChangesAsync();
        await context.Database.ExecuteSqlRawAsync("SELECT setval(pg_get_serial_sequence('stockflow.mst_warehouses', 'warehouse_id'), COALESCE(MAX(warehouse_id), 1)) FROM stockflow.mst_warehouses;");

        // Seed Categories
        var categories = new List<MstProductCategory>
        {
            new() { CategoryId = 1, CategoryName = "Thành phẩm tấm ốp & phào chỉ", Description = "Tấm ốp Nano PVC, phào chỉ PU, nẹp nhôm trang trí", IsActive = true },
            new() { CategoryId = 2, CategoryName = "Keo dán & Phụ liệu", Description = "Keo dán chuyên dụng, silicon, đinh vít", IsActive = true },
            new() { CategoryId = 3, CategoryName = "Nguyên vật liệu thép tôn", Description = "Tôn mạ kẽm cuộn, thanh nhôm định hình, sơn bột", IsActive = true }
        };
        foreach (var cat in categories)
        {
            if (!await context.MstProductCategories.AnyAsync(c => c.CategoryId == cat.CategoryId))
            {
                await context.MstProductCategories.AddAsync(cat);
            }
        }
        await context.SaveChangesAsync();
        await context.Database.ExecuteSqlRawAsync("SELECT setval(pg_get_serial_sequence('stockflow.mst_product_categories', 'category_id'), COALESCE(MAX(category_id), 1)) FROM stockflow.mst_product_categories;");

        // Seed Units
        var units = new List<MstUnit>
        {
            new() { UnitId = 1, UnitName = "Tấm", Abbreviation = "tam" },
            new() { UnitId = 2, UnitName = "Tuýp", Abbreviation = "tuyp" },
            new() { UnitId = 3, UnitName = "Cây", Abbreviation = "cay" },
            new() { UnitId = 4, UnitName = "Thanh", Abbreviation = "thanh" },
            new() { UnitId = 5, UnitName = "Cuộn", Abbreviation = "cuon" },
            new() { UnitId = 6, UnitName = "Kg", Abbreviation = "kg" },
            new() { UnitId = 7, UnitName = "Mét", Abbreviation = "m" },
            new() { UnitId = 8, UnitName = "Cái", Abbreviation = "cai" }
        };
        foreach (var u in units)
        {
            if (!await context.MstUnits.AnyAsync(x => x.UnitId == u.UnitId))
            {
                await context.MstUnits.AddAsync(u);
            }
        }
        await context.SaveChangesAsync();
        await context.Database.ExecuteSqlRawAsync("SELECT setval(pg_get_serial_sequence('stockflow.mst_units', 'unit_id'), COALESCE(MAX(unit_id), 1)) FROM stockflow.mst_units;");

        // Seed Products
        var products = new List<MstProduct>
        {
            new() { ProductId = 1, ProductCode = "TP-SP01", ProductName = "Tấm ốp Nano PVC vân đá 9mm", ProductType = "FINISHED", CategoryId = 1, BaseUnitId = 1, ReorderPoint = 50, MovingAverageCost = 130000, IsActive = true, CreatedAt = seedTimestamp, Description = "Tấm ốp Nano PVC cao cấp công nghệ phủ UV" },
            new() { ProductId = 2, ProductCode = "TP-KE001", ProductName = "Keo dán chuyên dụng Tín Phát 300ml", ProductType = "FINISHED", CategoryId = 2, BaseUnitId = 2, ReorderPoint = 30, MovingAverageCost = 38000, IsActive = true, CreatedAt = seedTimestamp, Description = "Keo dán xây dựng siêu dính khô nhanh" },
            new() { ProductId = 3, ProductCode = "TP-SP02", ProductName = "Phào chỉ cổ trần PU dát vàng 2.4m", ProductType = "FINISHED", CategoryId = 1, BaseUnitId = 3, ReorderPoint = 20, MovingAverageCost = 65000, IsActive = true, CreatedAt = seedTimestamp, Description = "Phào chỉ PU phong cách tân cổ điển" },
            new() { ProductId = 4, ProductCode = "TP-SP03", ProductName = "Nẹp nhôm chữ T mạ Anode 2.5m", ProductType = "FINISHED", CategoryId = 1, BaseUnitId = 4, ReorderPoint = 25, MovingAverageCost = 28000, IsActive = true, CreatedAt = seedTimestamp, Description = "Nẹp nhôm hoàn thiện chỉ tiếp giáp" },
            new() { ProductId = 5, ProductCode = "NVL-TON-01", ProductName = "Tôn cuộn mạ kẽm Posco 1.2mm", ProductType = "RAW_MATERIAL", CategoryId = 3, BaseUnitId = 5, ReorderPoint = 10, MovingAverageCost = 22000000, IsActive = true, CreatedAt = seedTimestamp, Description = "Nguyên liệu gia công máng cáp và khung đỡ" }
        };
        foreach (var prod in products)
        {
            if (!await context.MstProducts.AnyAsync(p => p.ProductCode == prod.ProductCode))
            {
                await context.MstProducts.AddAsync(prod);
            }
        }
        await context.SaveChangesAsync();
        await context.Database.ExecuteSqlRawAsync("SELECT setval(pg_get_serial_sequence('stockflow.mst_products', 'product_id'), COALESCE(MAX(product_id), 1)) FROM stockflow.mst_products;");

        // Seed Initial Inventory Balances
        var balances = new List<TrxInventoryBalance>
        {
            new() { ProductId = 1, WarehouseId = 1, Quantity = 450, UnitCost = 130000, LastUpdated = seedTimestamp },
            new() { ProductId = 2, WarehouseId = 1, Quantity = 280, UnitCost = 38000, LastUpdated = seedTimestamp },
            new() { ProductId = 3, WarehouseId = 1, Quantity = 120, UnitCost = 65000, LastUpdated = seedTimestamp },
            new() { ProductId = 4, WarehouseId = 1, Quantity = 200, UnitCost = 28000, LastUpdated = seedTimestamp },
            new() { ProductId = 5, WarehouseId = 2, Quantity = 15, UnitCost = 22000000, LastUpdated = seedTimestamp }
        };
        foreach (var bal in balances)
        {
            if (!await context.TrxInventoryBalances.AnyAsync(b => b.ProductId == bal.ProductId && b.WarehouseId == bal.WarehouseId))
            {
                await context.TrxInventoryBalances.AddAsync(bal);
            }
        }
        await context.SaveChangesAsync();
    }
}
