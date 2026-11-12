using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockFlow.Infrastructure.Persistence.Migrations
{
    /// <summary>
    /// 1. Thẻ kho: thêm Giá GD (transaction_price), Giá vốn sau giao dịch (unit_cost), Tồn cuối (balance_after)
    ///    cho trx_inventory_transactions + sequence mã phiếu cập nhật giá vốn (CB000001...).
    /// 2. Bù phần lệch model: trx_orders.order_type / updated_at / updated_by (code đơn hàng đã dùng nhưng chưa có migration;
    ///    một số máy đã chạy tay database/add_order_type_migration.sql) → viết idempotent để không lỗi trên mọi DB.
    /// </summary>
    public partial class AddInventoryTransactionStockCard : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
ALTER TABLE stockflow.trx_inventory_transactions ADD COLUMN IF NOT EXISTS transaction_price numeric(18,2) NULL;
ALTER TABLE stockflow.trx_inventory_transactions ADD COLUMN IF NOT EXISTS unit_cost numeric(18,2) NULL;
ALTER TABLE stockflow.trx_inventory_transactions ADD COLUMN IF NOT EXISTS balance_after numeric(18,2) NULL;
CREATE SEQUENCE IF NOT EXISTS stockflow.seq_cost_update START 1;");

            migrationBuilder.Sql(@"
DO $$
DECLARE had_order_type boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockflow' AND table_name = 'trx_orders' AND column_name = 'order_type'
  ) INTO had_order_type;

  ALTER TABLE stockflow.trx_orders ADD COLUMN IF NOT EXISTS order_type character varying(20) NOT NULL DEFAULT 'INVOICE';
  ALTER TABLE stockflow.trx_orders ADD COLUMN IF NOT EXISTS updated_at timestamp without time zone NULL;
  ALTER TABLE stockflow.trx_orders ADD COLUMN IF NOT EXISTS updated_by integer NULL;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_trx_orders_updated_by') THEN
    ALTER TABLE stockflow.trx_orders
      ADD CONSTRAINT fk_trx_orders_updated_by FOREIGN KEY (updated_by) REFERENCES stockflow.sec_users(user_id);
  END IF;

  -- Chỉ phân loại đơn cũ khi cột vừa được thêm (không ghi đè dữ liệu trên máy đã chạy script tay)
  IF NOT had_order_type THEN
    UPDATE stockflow.trx_orders
    SET order_type = CASE WHEN order_code ILIKE 'DH%' OR order_code ILIKE 'SO%' THEN 'BOOKING' ELSE 'INVOICE' END;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS ""IX_trx_orders_updated_by"" ON stockflow.trx_orders (updated_by);
CREATE INDEX IF NOT EXISTS ix_trx_orders_order_type ON stockflow.trx_orders (order_type);");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Chỉ gỡ phần thẻ kho; các cột trx_orders là phần bù lệch model, code đơn hàng vẫn cần nên giữ lại.
            migrationBuilder.Sql(@"
ALTER TABLE stockflow.trx_inventory_transactions DROP COLUMN IF EXISTS transaction_price;
ALTER TABLE stockflow.trx_inventory_transactions DROP COLUMN IF EXISTS unit_cost;
ALTER TABLE stockflow.trx_inventory_transactions DROP COLUMN IF EXISTS balance_after;
DROP SEQUENCE IF EXISTS stockflow.seq_cost_update;");
        }
    }
}
