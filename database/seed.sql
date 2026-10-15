-- =============================================================================
-- StockFlow Seed Data
-- Mật khẩu mặc định cho tất cả tài khoản: StockFlow@123
-- =============================================================================

SET search_path TO stockflow, public;

-- 1. Vai trò (sec_roles)
INSERT INTO sec_roles (role_id, role_name, description) VALUES
(1, 'Admin', 'Administrator - Quản trị hệ thống, tài khoản, phân quyền vai trò và phân quyền kho'),
(2, 'Manager', 'Manager - Quản lý cấu hình dữ liệu gốc, BOM, phê duyệt hạn mức nợ, kiểm kê, công nợ'),
(3, 'SalesStaff', 'Sales Staff - Tiếp nhận đơn hàng B2B, quản lý đơn chờ, yêu cầu xuất kho'),
(4, 'WarehouseStaff', 'Warehouse Staff - Nhập kho, xuất kho bán hàng, xuất NVL sản xuất, kiểm kê, chuyển kho'),
(5, 'ProductionStaff', 'Production Staff - Lệnh sản xuất, theo dõi cấp phát NVL, báo cáo hoàn thành thành phẩm, báo cáo lỗi')
ON CONFLICT (role_id) DO NOTHING;

-- 2. Kho hàng (mst_warehouses)
INSERT INTO mst_warehouses (warehouse_id, warehouse_code, warehouse_name, description, is_active) VALUES
(1, 'KTP-01', 'Kho Thành Phẩm', 'Kho lưu trữ thành phẩm sẵn sàng xuất bán', true),
(2, 'KNVL-01', 'Kho Nguyên Vật Liệu', 'Kho lưu trữ nguyên vật liệu phục vụ sản xuất', true)
ON CONFLICT (warehouse_id) DO NOTHING;

-- 3. Người dùng (sec_users) - Mật khẩu mặc định: StockFlow@123
INSERT INTO sec_users (user_id, username, full_name, email, phone, password_hash, is_active, created_at) VALUES
(1, 'admin', 'Quản trị viên Hệ thống', 'admin@tinphat.vn', '0901234567', '$2a$11$1opEHEFeQeA542CrjEh0MuByzd7olky/Tlz3MVn54bDuIpZfkGjpu', true, NOW()),
(2, 'manager01', 'Nguyễn Văn Quản Lý', 'manager01@tinphat.vn', '0901234568', '$2a$11$1opEHEFeQeA542CrjEh0MuByzd7olky/Tlz3MVn54bDuIpZfkGjpu', true, NOW()),
(3, 'sales01', 'Trần Thị Bán Hàng', 'sales01@tinphat.vn', '0901234569', '$2a$11$1opEHEFeQeA542CrjEh0MuByzd7olky/Tlz3MVn54bDuIpZfkGjpu', true, NOW()),
(4, 'whstaff01', 'Lê Văn Thủ Kho', 'whstaff01@tinphat.vn', '0901234570', '$2a$11$1opEHEFeQeA542CrjEh0MuByzd7olky/Tlz3MVn54bDuIpZfkGjpu', true, NOW()),
(5, 'prodstaff01', 'Phạm Văn Sản Xuất', 'prodstaff01@tinphat.vn', '0901234571', '$2a$11$1opEHEFeQeA542CrjEh0MuByzd7olky/Tlz3MVn54bDuIpZfkGjpu', true, NOW())
ON CONFLICT (user_id) DO NOTHING;

-- 4. Phân vai trò cho người dùng (jnc_user_roles)
INSERT INTO jnc_user_roles (user_id, role_id, assigned_at) VALUES
(1, 1, NOW()),
(2, 2, NOW()),
(3, 3, NOW()),
(4, 4, NOW()),
(5, 5, NOW())
ON CONFLICT DO NOTHING;

-- 5. Phân quyền truy cập kho (jnc_user_warehouse_access)
INSERT INTO jnc_user_warehouse_access (user_id, warehouse_id, assigned_at) VALUES
(1, 1, NOW()),
(1, 2, NOW()),
(2, 1, NOW()),
(2, 2, NOW()),
(4, 1, NOW()),
(4, 2, NOW())
ON CONFLICT DO NOTHING;

-- Đồng bộ sequence cho các bảng có identity/serial
SELECT setval(pg_get_serial_sequence('stockflow.sec_roles', 'role_id'), COALESCE(MAX(role_id), 1)) FROM stockflow.sec_roles;
SELECT setval(pg_get_serial_sequence('stockflow.mst_warehouses', 'warehouse_id'), COALESCE(MAX(warehouse_id), 1)) FROM stockflow.mst_warehouses;
SELECT setval(pg_get_serial_sequence('stockflow.sec_users', 'user_id'), COALESCE(MAX(user_id), 1)) FROM stockflow.sec_users;
