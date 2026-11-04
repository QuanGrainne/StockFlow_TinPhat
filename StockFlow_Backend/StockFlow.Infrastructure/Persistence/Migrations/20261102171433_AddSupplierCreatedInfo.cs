using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockFlow.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSupplierCreatedInfo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Migration này ngoài created_at/created_by của nhà cung cấp còn bù các cột/bảng mà entity đã có
            // nhưng trước đây chưa từng có migration (giảm giá đơn POS, received_date chuyển hàng, mst_order_settings).
            // Một số máy đã tự thêm bằng SQL tay, nên dùng IF NOT EXISTS để chạy được trên mọi trạng thái DB.

            // 1. Nhà cung cấp / đối tác: người tạo & ngày tạo
            migrationBuilder.Sql(@"
ALTER TABLE stockflow.mst_business_partners ADD COLUMN IF NOT EXISTS created_at timestamp without time zone NULL;
ALTER TABLE stockflow.mst_business_partners ADD COLUMN IF NOT EXISTS created_by integer NULL;");

            // 2. Chuyển hàng: ngày nhận
            migrationBuilder.Sql(@"
ALTER TABLE stockflow.trx_stock_transfers ADD COLUMN IF NOT EXISTS received_date timestamp without time zone NULL;");

            // 3. Đơn hàng POS: giảm giá theo đơn và theo dòng
            migrationBuilder.Sql(@"
ALTER TABLE stockflow.trx_orders ADD COLUMN IF NOT EXISTS discount_amount numeric(18,2) NOT NULL DEFAULT 0;
ALTER TABLE stockflow.trx_orders ADD COLUMN IF NOT EXISTS discount_type character varying(20) NOT NULL DEFAULT '';
ALTER TABLE stockflow.trx_orders ADD COLUMN IF NOT EXISTS discount_value numeric(18,2) NOT NULL DEFAULT 0;
ALTER TABLE stockflow.trx_orders ADD COLUMN IF NOT EXISTS sub_total numeric(18,2) NOT NULL DEFAULT 0;
ALTER TABLE stockflow.dtl_order_items ADD COLUMN IF NOT EXISTS discount_amount numeric(18,2) NOT NULL DEFAULT 0;
ALTER TABLE stockflow.dtl_order_items ADD COLUMN IF NOT EXISTS discount_type character varying(20) NOT NULL DEFAULT '';
ALTER TABLE stockflow.dtl_order_items ADD COLUMN IF NOT EXISTS discount_value numeric(18,2) NOT NULL DEFAULT 0;
ALTER TABLE stockflow.dtl_order_items ADD COLUMN IF NOT EXISTS line_total numeric(18,2) NOT NULL DEFAULT 0;
ALTER TABLE stockflow.dtl_order_items ADD COLUMN IF NOT EXISTS original_price numeric(18,2) NOT NULL DEFAULT 0;");

            // 4. Thiết lập đơn hàng (POS) — đúng nội dung script tay create_order_settings.sql (commit 133edde)
            //    để máy đã chạy script và máy chưa chạy có cùng cấu trúc: bảng singleton setting_id = 1,
            //    giá trị mặc định, dòng cấu hình mặc định và các sequence sinh mã chứng từ.
            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS stockflow.mst_order_settings (
    setting_id INTEGER NOT NULL DEFAULT 1 PRIMARY KEY,
    enable_order_placement BOOLEAN NOT NULL DEFAULT TRUE,
    allow_order_when_out_of_stock BOOLEAN NOT NULL DEFAULT TRUE,
    allow_selling_reserved_stock BOOLEAN NOT NULL DEFAULT FALSE,
    allow_transferring_order_branch BOOLEAN NOT NULL DEFAULT TRUE,
    allow_negative_stock_sale BOOLEAN NOT NULL DEFAULT FALSE,
    enable_print_quotation BOOLEAN NOT NULL DEFAULT TRUE,
    confirm_before_complete_order BOOLEAN NOT NULL DEFAULT FALSE,
    enable_return_time_limit BOOLEAN NOT NULL DEFAULT TRUE,
    return_time_limit_days INTEGER NOT NULL DEFAULT 30,
    lock_transaction_time BOOLEAN NOT NULL DEFAULT TRUE,
    order_code_rule VARCHAR(20) NOT NULL DEFAULT 'SEQUENTIAL',
    order_code_prefix VARCHAR(10) NOT NULL DEFAULT 'HD',
    booking_code_prefix VARCHAR(10) NOT NULL DEFAULT 'DH',
    return_code_prefix VARCHAR(10) NOT NULL DEFAULT 'TH',
    transfer_code_prefix VARCHAR(10) NOT NULL DEFAULT 'CK',
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER NULL REFERENCES stockflow.sec_users(user_id) ON DELETE SET NULL,
    CONSTRAINT chk_mst_order_settings_singleton CHECK (setting_id = 1),
    CONSTRAINT chk_order_code_rule CHECK (order_code_rule IN ('SEQUENTIAL', 'DATETIME', 'RANDOM')),
    CONSTRAINT chk_return_time_limit_days CHECK (return_time_limit_days >= 0)
);
CREATE INDEX IF NOT EXISTS ""IX_mst_order_settings_updated_by"" ON stockflow.mst_order_settings (updated_by);

INSERT INTO stockflow.mst_order_settings (setting_id) VALUES (1) ON CONFLICT (setting_id) DO NOTHING;

CREATE SEQUENCE IF NOT EXISTS stockflow.seq_booking_code START 1;
CREATE SEQUENCE IF NOT EXISTS stockflow.seq_return_code START 1;
CREATE SEQUENCE IF NOT EXISTS stockflow.seq_transfer_code START 1;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "mst_order_settings",
                schema: "stockflow");

            migrationBuilder.DropColumn(
                name: "received_date",
                schema: "stockflow",
                table: "trx_stock_transfers");

            migrationBuilder.DropColumn(
                name: "discount_amount",
                schema: "stockflow",
                table: "trx_orders");

            migrationBuilder.DropColumn(
                name: "discount_type",
                schema: "stockflow",
                table: "trx_orders");

            migrationBuilder.DropColumn(
                name: "discount_value",
                schema: "stockflow",
                table: "trx_orders");

            migrationBuilder.DropColumn(
                name: "sub_total",
                schema: "stockflow",
                table: "trx_orders");

            migrationBuilder.DropColumn(
                name: "created_at",
                schema: "stockflow",
                table: "mst_business_partners");

            migrationBuilder.DropColumn(
                name: "created_by",
                schema: "stockflow",
                table: "mst_business_partners");

            migrationBuilder.DropColumn(
                name: "discount_amount",
                schema: "stockflow",
                table: "dtl_order_items");

            migrationBuilder.DropColumn(
                name: "discount_type",
                schema: "stockflow",
                table: "dtl_order_items");

            migrationBuilder.DropColumn(
                name: "discount_value",
                schema: "stockflow",
                table: "dtl_order_items");

            migrationBuilder.DropColumn(
                name: "line_total",
                schema: "stockflow",
                table: "dtl_order_items");

            migrationBuilder.DropColumn(
                name: "original_price",
                schema: "stockflow",
                table: "dtl_order_items");
        }
    }
}
