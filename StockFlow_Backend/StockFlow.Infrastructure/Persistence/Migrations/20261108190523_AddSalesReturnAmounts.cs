using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockFlow.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSalesReturnAmounts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Idempotent: máy đã thêm cột bằng tay vẫn chạy được
            migrationBuilder.Sql(@"
ALTER TABLE stockflow.trx_return_requests ADD COLUMN IF NOT EXISTS warehouse_id integer NULL;
ALTER TABLE stockflow.trx_return_requests ADD COLUMN IF NOT EXISTS total_goods_amount numeric(18,2) NOT NULL DEFAULT 0;
ALTER TABLE stockflow.trx_return_requests ADD COLUMN IF NOT EXISTS discount_amount numeric(18,2) NOT NULL DEFAULT 0;
ALTER TABLE stockflow.trx_return_requests ADD COLUMN IF NOT EXISTS return_fee numeric(18,2) NOT NULL DEFAULT 0;
ALTER TABLE stockflow.trx_return_requests ADD COLUMN IF NOT EXISTS total_amount numeric(18,2) NOT NULL DEFAULT 0;
ALTER TABLE stockflow.trx_return_requests ADD COLUMN IF NOT EXISTS refund_amount numeric(18,2) NOT NULL DEFAULT 0;
ALTER TABLE stockflow.trx_return_requests ADD COLUMN IF NOT EXISTS payment_method character varying(20) NULL;
ALTER TABLE stockflow.trx_return_requests ADD COLUMN IF NOT EXISTS updated_at timestamp without time zone NULL;
ALTER TABLE stockflow.dtl_return_request_items ADD COLUMN IF NOT EXISTS sale_price numeric(18,2) NOT NULL DEFAULT 0;
ALTER TABLE stockflow.dtl_return_request_items ADD COLUMN IF NOT EXISTS return_price numeric(18,2) NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS ""IX_trx_return_requests_warehouse_id"" ON stockflow.trx_return_requests (warehouse_id);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_trx_return_requests_warehouse_id') THEN
    ALTER TABLE stockflow.trx_return_requests ADD CONSTRAINT fk_trx_return_requests_warehouse_id
      FOREIGN KEY (warehouse_id) REFERENCES stockflow.mst_warehouses (warehouse_id);
  END IF;
END $$;
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_trx_return_requests_warehouse_id",
                schema: "stockflow",
                table: "trx_return_requests");

            migrationBuilder.DropIndex(
                name: "IX_trx_return_requests_warehouse_id",
                schema: "stockflow",
                table: "trx_return_requests");

            migrationBuilder.DropColumn(
                name: "discount_amount",
                schema: "stockflow",
                table: "trx_return_requests");

            migrationBuilder.DropColumn(
                name: "payment_method",
                schema: "stockflow",
                table: "trx_return_requests");

            migrationBuilder.DropColumn(
                name: "refund_amount",
                schema: "stockflow",
                table: "trx_return_requests");

            migrationBuilder.DropColumn(
                name: "return_fee",
                schema: "stockflow",
                table: "trx_return_requests");

            migrationBuilder.DropColumn(
                name: "total_amount",
                schema: "stockflow",
                table: "trx_return_requests");

            migrationBuilder.DropColumn(
                name: "total_goods_amount",
                schema: "stockflow",
                table: "trx_return_requests");

            migrationBuilder.DropColumn(
                name: "updated_at",
                schema: "stockflow",
                table: "trx_return_requests");

            migrationBuilder.DropColumn(
                name: "warehouse_id",
                schema: "stockflow",
                table: "trx_return_requests");

            migrationBuilder.DropColumn(
                name: "return_price",
                schema: "stockflow",
                table: "dtl_return_request_items");

            migrationBuilder.DropColumn(
                name: "sale_price",
                schema: "stockflow",
                table: "dtl_return_request_items");
        }
    }
}
