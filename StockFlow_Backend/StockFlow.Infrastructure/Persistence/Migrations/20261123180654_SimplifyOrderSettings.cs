using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockFlow.Infrastructure.Persistence.Migrations
{
    /// <summary>
    /// Thu gọn cài đặt giao dịch (nút cài đặt cạnh avatar) còn 2 tuỳ chọn, theo chốt của nhóm 24/11/2026:
    /// - Thêm allow_negative_stock_transfer (cho phép chuyển hàng khi âm kho, mặc định true);
    ///   allow_negative_stock_sale đổi mặc định thành true (giá trị đang lưu của dòng cài đặt giữ nguyên).
    /// - Xoá các cột tuỳ chọn cũ: hệ thống luôn nhận đơn đặt hàng, luôn cho chọn thời gian giao dịch, mã chứng từ luôn theo số thứ tự.
    /// - Thêm chức năng phân quyền "Cài đặt" (FEAT_SETTINGS). Vai trò đã lưu ma trận chức năng (FEAT__CONFIGURED) được cấp
    ///   theo mặc định mới: Admin và Manager (trước đây handler gán cứng chỉ Admin lưu được). Vai trò khác do Admin tick trong ma trận.
    ///   Kèm AUTH_UPDATE (quyền của API lưu cài đặt) cho vai trò có lưu mã quyền phân hệ, giống khi tick chức năng rồi lưu ma trận.
    /// Viết idempotent vì DB các máy có thể lệch nhau.
    /// </summary>
    public partial class SimplifyOrderSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
ALTER TABLE stockflow.mst_order_settings ADD COLUMN IF NOT EXISTS allow_negative_stock_transfer boolean NOT NULL DEFAULT true;
ALTER TABLE stockflow.mst_order_settings ALTER COLUMN allow_negative_stock_sale SET DEFAULT true;

ALTER TABLE stockflow.mst_order_settings
    DROP COLUMN IF EXISTS enable_order_placement,
    DROP COLUMN IF EXISTS allow_order_when_out_of_stock,
    DROP COLUMN IF EXISTS allow_selling_reserved_stock,
    DROP COLUMN IF EXISTS allow_transferring_order_branch,
    DROP COLUMN IF EXISTS enable_print_quotation,
    DROP COLUMN IF EXISTS confirm_before_complete_order,
    DROP COLUMN IF EXISTS enable_return_time_limit,
    DROP COLUMN IF EXISTS return_time_limit_days,
    DROP COLUMN IF EXISTS lock_transaction_time,
    DROP COLUMN IF EXISTS order_code_rule;

INSERT INTO stockflow.sec_permissions (permission_code, permission_name, module, description)
SELECT 'FEAT_SETTINGS', 'Chức năng Cài đặt', 'FEATURE', 'Dùng chức năng navbar Cài đặt (feat-settings)'
WHERE NOT EXISTS (SELECT 1 FROM stockflow.sec_permissions WHERE permission_code = 'FEAT_SETTINGS');

WITH role_codes AS (
    SELECT rp.role_id, p.permission_code
    FROM stockflow.jnc_role_permissions rp
    JOIN stockflow.sec_permissions p ON p.permission_id = rp.permission_id
),
targets AS (
    SELECT r.role_id
    FROM stockflow.sec_roles r
    WHERE EXISTS (SELECT 1 FROM role_codes c WHERE c.role_id = r.role_id AND c.permission_code = 'FEAT__CONFIGURED')
      AND upper(r.role_name) IN ('ADMIN', 'ROLE_ADMIN', 'MANAGER', 'ROLE_MANAGER')
)
INSERT INTO stockflow.jnc_role_permissions (role_id, permission_id)
SELECT t.role_id, p.permission_id
FROM targets t
JOIN stockflow.sec_permissions p ON p.permission_code = 'FEAT_SETTINGS'
WHERE NOT EXISTS (SELECT 1 FROM stockflow.jnc_role_permissions x WHERE x.role_id = t.role_id AND x.permission_id = p.permission_id);

-- Vai trò có FEAT_SETTINGS và đang lưu mã quyền phân hệ (không phải mặc định) thì cần AUTH_UPDATE cho API lưu cài đặt
INSERT INTO stockflow.jnc_role_permissions (role_id, permission_id)
SELECT DISTINCT rp.role_id, au.permission_id
FROM stockflow.jnc_role_permissions rp
JOIN stockflow.sec_permissions fs ON fs.permission_id = rp.permission_id AND fs.permission_code = 'FEAT_SETTINGS'
JOIN stockflow.sec_permissions au ON au.permission_code = 'AUTH_UPDATE'
WHERE EXISTS (
        SELECT 1 FROM stockflow.jnc_role_permissions m
        JOIN stockflow.sec_permissions mp ON mp.permission_id = m.permission_id
        WHERE m.role_id = rp.role_id AND mp.permission_code NOT LIKE 'FEAT\_%')
  AND NOT EXISTS (SELECT 1 FROM stockflow.jnc_role_permissions x WHERE x.role_id = rp.role_id AND x.permission_id = au.permission_id);
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Khôi phục cột cũ với giá trị mặc định trước đây (giá trị đã lưu không phục hồi được); giữ quyền FEAT_SETTINGS
            migrationBuilder.Sql(@"
ALTER TABLE stockflow.mst_order_settings
    ADD COLUMN IF NOT EXISTS enable_order_placement boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS allow_order_when_out_of_stock boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS allow_selling_reserved_stock boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS allow_transferring_order_branch boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS enable_print_quotation boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS confirm_before_complete_order boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS enable_return_time_limit boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS return_time_limit_days integer NOT NULL DEFAULT 30,
    ADD COLUMN IF NOT EXISTS lock_transaction_time boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS order_code_rule character varying(20) NOT NULL DEFAULT 'SEQUENTIAL';
ALTER TABLE stockflow.mst_order_settings ALTER COLUMN allow_negative_stock_sale SET DEFAULT false;
ALTER TABLE stockflow.mst_order_settings DROP COLUMN IF EXISTS allow_negative_stock_transfer;
");
        }
    }
}
