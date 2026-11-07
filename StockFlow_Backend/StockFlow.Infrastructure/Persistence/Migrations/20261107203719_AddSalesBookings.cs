using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockFlow.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSalesBookings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Idempotent: máy đã thêm cột bằng tay vẫn chạy được
            migrationBuilder.Sql(@"
ALTER TABLE stockflow.trx_orders ADD COLUMN IF NOT EXISTS warehouse_id integer NULL;
ALTER TABLE stockflow.trx_orders ADD COLUMN IF NOT EXISTS delivery_date timestamp without time zone NULL;
ALTER TABLE stockflow.trx_orders ADD COLUMN IF NOT EXISTS booking_order_id integer NULL;
ALTER TABLE stockflow.trx_orders ADD COLUMN IF NOT EXISTS deposit_amount numeric(18,2) NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS ""IX_trx_orders_booking_order_id"" ON stockflow.trx_orders (booking_order_id);
CREATE INDEX IF NOT EXISTS ""IX_trx_orders_warehouse_id"" ON stockflow.trx_orders (warehouse_id);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_trx_orders_booking_order_id') THEN
    ALTER TABLE stockflow.trx_orders ADD CONSTRAINT fk_trx_orders_booking_order_id
      FOREIGN KEY (booking_order_id) REFERENCES stockflow.trx_orders (order_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_trx_orders_warehouse_id') THEN
    ALTER TABLE stockflow.trx_orders ADD CONSTRAINT fk_trx_orders_warehouse_id
      FOREIGN KEY (warehouse_id) REFERENCES stockflow.mst_warehouses (warehouse_id);
  END IF;
END $$;

-- Hóa đơn cũ: chi nhánh bán lấy theo phiếu xuất kho
UPDATE stockflow.trx_orders o SET warehouse_id = si.warehouse_id
FROM stockflow.trx_stock_issues si
WHERE si.sales_order_id = o.order_id AND o.warehouse_id IS NULL;

-- Đơn chờ (PENDING) cũ của POS là đơn đặt hàng → Phiếu tạm
UPDATE stockflow.trx_orders SET order_type = 'BOOKING', status = 'DRAFT'
WHERE status = 'PENDING';
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_trx_orders_booking_order_id",
                schema: "stockflow",
                table: "trx_orders");

            migrationBuilder.DropForeignKey(
                name: "fk_trx_orders_warehouse_id",
                schema: "stockflow",
                table: "trx_orders");

            migrationBuilder.DropIndex(
                name: "IX_trx_orders_booking_order_id",
                schema: "stockflow",
                table: "trx_orders");

            migrationBuilder.DropIndex(
                name: "IX_trx_orders_warehouse_id",
                schema: "stockflow",
                table: "trx_orders");

            migrationBuilder.DropColumn(
                name: "booking_order_id",
                schema: "stockflow",
                table: "trx_orders");

            migrationBuilder.DropColumn(
                name: "delivery_date",
                schema: "stockflow",
                table: "trx_orders");

            migrationBuilder.DropColumn(
                name: "deposit_amount",
                schema: "stockflow",
                table: "trx_orders");

            migrationBuilder.DropColumn(
                name: "warehouse_id",
                schema: "stockflow",
                table: "trx_orders");
        }
    }
}
