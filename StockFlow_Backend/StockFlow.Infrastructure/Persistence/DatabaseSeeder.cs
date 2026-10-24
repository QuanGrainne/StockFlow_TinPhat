using Microsoft.EntityFrameworkCore;
using StockFlow.Application.Features.Roles.Common;
using StockFlow.Domain.Entities;

namespace StockFlow.Infrastructure.Persistence;

public static class DatabaseSeeder
{
    public static async Task SeedAsync(StockFlowDbContext context)
    {
        var seedTimestamp = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified);

        // Ensure newly supported product specification columns exist
        await context.Database.ExecuteSqlRawAsync(@"
            ALTER TABLE stockflow.mst_products ADD COLUMN IF NOT EXISTS barcode character varying(50);
            ALTER TABLE stockflow.mst_products ADD COLUMN IF NOT EXISTS brand character varying(100);
            ALTER TABLE stockflow.mst_products ADD COLUMN IF NOT EXISTS standard_price numeric(18,2) DEFAULT 0;
            ALTER TABLE stockflow.mst_products ADD COLUMN IF NOT EXISTS min_safe_stock numeric(18,2) DEFAULT 0;
            ALTER TABLE stockflow.mst_products ADD COLUMN IF NOT EXISTS max_safe_stock numeric(18,2) DEFAULT 999999999;
            ALTER TABLE stockflow.mst_products ADD COLUMN IF NOT EXISTS weight numeric(18,2);
            ALTER TABLE stockflow.mst_products ADD COLUMN IF NOT EXISTS dimensions character varying(100);
            ALTER TABLE stockflow.mst_products ADD COLUMN IF NOT EXISTS location_name character varying(100);
            ALTER TABLE stockflow.mst_products ADD COLUMN IF NOT EXISTS is_direct_sale boolean DEFAULT true;
            ALTER TABLE stockflow.mst_products ADD COLUMN IF NOT EXISTS has_reward_points boolean DEFAULT true;
            ALTER TABLE stockflow.mst_products ADD COLUMN IF NOT EXISTS image_url text;
            ALTER TABLE stockflow.mst_products ALTER COLUMN image_url TYPE text;
            ALTER TABLE stockflow.mst_products ADD COLUMN IF NOT EXISTS variants_json text;
        ");

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
            new() { WarehouseId = 1, WarehouseCode = "KTP-01", WarehouseName = "Kho Thành Phẩm", IsActive = false, Description = "Kho lưu trữ thành phẩm sẵn sàng xuất bán" },
            new() { WarehouseId = 2, WarehouseCode = "KNVL-01", WarehouseName = "Kho Nguyên Vật Liệu", IsActive = false, Description = "Kho lưu trữ nguyên vật liệu phục vụ sản xuất" },
            new() { WarehouseId = 3, WarehouseCode = "K001", WarehouseName = "Kho Tổng Gia Lâm", Address = "Số 18 Đường Dệt May, Gia Lâm, Hà Nội", IsActive = true, Description = "8,500 m² - Kho trung tâm thành phẩm và phụ kiện" },
            new() { WarehouseId = 4, WarehouseCode = "K002", WarehouseName = "Kho Đông Anh", Address = "CCN Nguyên Khê, Đông Anh, Hà Nội", IsActive = true, Description = "4,200 m² - Kho nguyên vật liệu cơ khí và tôn mạ" },
            new() { WarehouseId = 5, WarehouseCode = "K003", WarehouseName = "Kho Hà Đông", Address = "Km14 Quốc lộ 6, Yên Nghĩa, Hà Đông, Hà Nội", IsActive = true, Description = "3,800 m² - Kho trung chuyển phân phối Tây Hà Nội" },
            new() { WarehouseId = 6, WarehouseCode = "K004", WarehouseName = "Kho Hoàn Kiếm", Address = "42 Phố Trần Hưng Đạo, Hoàn Kiếm, Hà Nội", IsActive = true, Description = "1,500 m² - Điểm giao hàng nhanh nội đô" }
        };

        foreach (var warehouse in warehouses)
        {
            var existing = await context.MstWarehouses.FirstOrDefaultAsync(w => w.WarehouseId == warehouse.WarehouseId);
            if (existing == null)
            {
                if (!await context.MstWarehouses.AnyAsync(w => w.WarehouseCode == warehouse.WarehouseCode))
                {
                    await context.MstWarehouses.AddAsync(warehouse);
                }
            }
            else
            {
                if (existing.WarehouseId == 1 || existing.WarehouseId == 2)
                {
                    existing.IsActive = false;
                }
                else if (existing.WarehouseId == 3 && (existing.WarehouseCode == "WH-HN-01" || existing.WarehouseCode == "KTP-01"))
                {
                    existing.WarehouseCode = "K001";
                }
                else if (existing.WarehouseId == 4 && (existing.WarehouseCode == "WH-HN-02" || existing.WarehouseCode == "KNVL-01"))
                {
                    existing.WarehouseCode = "K002";
                }
                else if (existing.WarehouseId == 5 && existing.WarehouseCode == "WH-HN-03")
                {
                    existing.WarehouseCode = "K003";
                }
                else if (existing.WarehouseId == 6 && existing.WarehouseCode == "WH-HN-04")
                {
                    existing.WarehouseCode = "K004";
                }
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
        var additionalWarehouses = new List<MstWarehouse>
        {
            new() { WarehouseId = 3, WarehouseCode = "K001", WarehouseName = "Kho Tổng Gia Lâm", IsActive = true, Address = "Số 18 Đường Dệt May, Gia Lâm, Hà Nội", Description = "8,500 m² - Kho trung tâm thành phẩm và phụ kiện" },
            new() { WarehouseId = 4, WarehouseCode = "K002", WarehouseName = "Kho Đông Anh", IsActive = true, Address = "CCN Nguyên Khê, Đông Anh, Hà Nội", Description = "4,200 m² - Kho nguyên vật liệu cơ khí và tôn mạ" },
            new() { WarehouseId = 5, WarehouseCode = "K003", WarehouseName = "Kho Hà Đông", IsActive = true, Address = "Km14 Quốc lộ 6, Yên Nghĩa, Hà Đông, Hà Nội", Description = "3,800 m² - Kho trung chuyển phân phối Tây Hà Nội" },
            new() { WarehouseId = 6, WarehouseCode = "K004", WarehouseName = "Kho Hoàn Kiếm", IsActive = true, Address = "42 Phố Trần Hưng Đạo, Hoàn Kiếm, Hà Nội", Description = "1,500 m² - Điểm giao hàng nhanh nội đô" }
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

        var whMap = await context.MstWarehouses.Where(w => w.WarehouseCode != null).ToDictionaryAsync(w => w.WarehouseCode!, w => w.WarehouseId);
        var physicalAccesses = new[]
        {
            ("admin", "K001"), ("manager01", "K001"), ("sales01", "K001"), ("whstaff01", "K001"),
            ("admin", "K002"), ("manager01", "K002"), ("whstaff01", "K002"), ("prodstaff01", "K002"),
            ("admin", "K003"), ("manager01", "K003"),
            ("admin", "K004")
        };
        foreach (var (username, whCode) in physicalAccesses)
        {
            if (userIds.TryGetValue(username, out var uid) && whMap.TryGetValue(whCode, out var wid))
            {
                if (!await context.JncUserWarehouseAccesses.AnyAsync(wa => wa.UserId == uid && wa.WarehouseId == wid))
                {
                    await context.JncUserWarehouseAccesses.AddAsync(new JncUserWarehouseAccess { UserId = uid, WarehouseId = wid, AssignedAt = seedTimestamp });
                }
            }
        }
        await context.SaveChangesAsync();

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

        // 8. Seed initial Suppliers into mst_business_partners
        var initialSuppliers = new List<MstBusinessPartner>
        {
            new()
            {
                PartnerCode = "NCC000001",
                PartnerName = "Công ty Cổ phần Nhựa Tiền Phong",
                PartnerType = "SUPPLIER",
                Phone = "024 3823 4567",
                Email = "kinhdoanh@tienphongplastic.vn",
                Address = "Số 2 An Dương Vương, Tây Hồ, Hà Nội",
                CreditLimit = 300000000m,
                CurrentDebt = 0m,
                CurrentPayable = 120000000m,
                IsActive = true
            },
            new()
            {
                PartnerCode = "NCC000002",
                PartnerName = "Công ty Nhôm Tân Á",
                PartnerType = "SUPPLIER",
                Phone = "024 3756 8899",
                Email = "sales@nhomtana.vn",
                Address = "Lô B4, KCN Từ Liêm, Bắc Từ Liêm, Hà Nội",
                CreditLimit = 150000000m,
                CurrentDebt = 0m,
                CurrentPayable = 45000000m,
                IsActive = true
            },
            new()
            {
                PartnerCode = "NCC000003",
                PartnerName = "Phân xưởng Bao bì Đông Anh",
                PartnerType = "SUPPLIER",
                Phone = "0912 345 678",
                Email = "baobidonganh@gmail.com",
                Address = "Cụm Công nghiệp Nguyên Khê, Đông Anh, Hà Nội",
                CreditLimit = 100000000m,
                CurrentDebt = 0m,
                CurrentPayable = 0m,
                IsActive = true
            },
            new()
            {
                PartnerCode = "NCC000004",
                PartnerName = "Công ty TNHH Nhựa Hà Nội",
                PartnerType = "SUPPLIER",
                Phone = "024 3875 1234",
                Email = "contact@hanoiplastic.com.vn",
                Address = "Khu Công nghiệp Sài Đồng B, Long Biên, Hà Nội",
                CreditLimit = 250000000m,
                CurrentDebt = 0m,
                CurrentPayable = 86500000m,
                IsActive = true
            },
            new()
            {
                PartnerCode = "NCC000005",
                PartnerName = "Tập đoàn Thép Hòa Phát",
                PartnerType = "SUPPLIER",
                Phone = "024 3974 7755",
                Email = "thep@hoaphat.com.vn",
                Address = "66 Nguyễn Du, Hai Bà Trưng, Hà Nội",
                CreditLimit = 500000000m,
                CurrentDebt = 0m,
                CurrentPayable = 310000000m,
                IsActive = true
            },
            new()
            {
                PartnerCode = "NCC000006",
                PartnerName = "Tổng Công ty Hóa chất Việt Nhật",
                PartnerType = "SUPPLIER",
                Phone = "024 3688 9900",
                Email = "info@vietnhatchemical.vn",
                Address = "Đường TS5, KCN Tiên Sơn, Từ Sơn, Bắc Ninh",
                CreditLimit = 100000000m,
                CurrentDebt = 0m,
                CurrentPayable = 18200000m,
                IsActive = true
            },
            new()
            {
                PartnerCode = "NCC000007",
                PartnerName = "NCC Khoáng sản & Bột đá Yên Bái",
                PartnerType = "SUPPLIER",
                Phone = "0216 385 2211",
                Email = "sales@yenbaipowder.com",
                Address = "KCN Phía Nam, Xã Văn Phú, TP. Yên Bái",
                CreditLimit = 80000000m,
                CurrentDebt = 0m,
                CurrentPayable = 0m,
                IsActive = true
            },
            new()
            {
                PartnerCode = "NCC000008",
                PartnerName = "NCC Vật liệu Trang trí Đài Loan",
                PartnerType = "SUPPLIER",
                Phone = "+886 2 2700 1234",
                Email = "overseas@tw-decor.com.tw",
                Address = "Số 108 Đường Nam Kinh Đông, Đài Bắc (Nhập khẩu)",
                CreditLimit = 200000000m,
                CurrentDebt = 0m,
                CurrentPayable = 64000000m,
                IsActive = true
            }
        };

        var hasNewSuppliers = false;
        foreach (var supplier in initialSuppliers)
        {
            var exists = await context.MstBusinessPartners
                .AnyAsync(bp => bp.PartnerCode == supplier.PartnerCode);

            if (!exists)
            {
                await context.MstBusinessPartners.AddAsync(supplier);
                hasNewSuppliers = true;
            }
        }

        if (hasNewSuppliers)
        {
            await context.SaveChangesAsync();
            await context.Database.ExecuteSqlRawAsync("SELECT setval(pg_get_serial_sequence('stockflow.mst_business_partners', 'partner_id'), COALESCE(MAX(partner_id), 1)) FROM stockflow.mst_business_partners;");
        }

        // 9. Seed default price book "Bảng giá chung"
        var defaultPriceBook = await context.MstPriceBooks.FirstOrDefaultAsync(pb => pb.IsDefault);
        if (defaultPriceBook == null)
        {
            defaultPriceBook = new MstPriceBook
            {
                PriceBookCode = "BG000001",
                PriceBookName = "Bảng giá chung",
                IsActive = true,
                IsDefault = true,
                EffectiveFrom = DateTime.UtcNow.AddMonths(-1),
                AllowUnlistedProducts = true,
                WarnUnlistedProducts = false,
                ScopeBranchType = "ALL",
                ScopeCustomerType = "ALL",
                ScopeUserType = "ALL",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            await context.MstPriceBooks.AddAsync(defaultPriceBook);
            await context.SaveChangesAsync();

            // Populate initial product prices from MstProducts.StandardPrice
            var allProducts = await context.MstProducts.ToListAsync();
            var priceItems = allProducts.Select(p => new DtlPriceBookItem
            {
                PriceBookId = defaultPriceBook.PriceBookId,
                ProductId = p.ProductId,
                Price = p.StandardPrice ?? (p.MovingAverageCost > 0 ? Math.Round(p.MovingAverageCost.Value * 1.35m, 0) : 0),
                UpdatedAt = DateTime.UtcNow
            }).ToList();

            if (priceItems.Any())
            {
                await context.DtlPriceBookItems.AddRangeAsync(priceItems);
                await context.SaveChangesAsync();
            }
        }
    }
}
