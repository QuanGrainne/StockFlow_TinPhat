using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockFlow.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class NormalizeWarehouseCost : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<decimal>(
                name: "unit_cost",
                schema: "stockflow",
                table: "trx_inventory_transactions",
                type: "numeric(18,4)",
                precision: 18,
                scale: 4,
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,2)",
                oldPrecision: 18,
                oldScale: 2,
                oldNullable: true);

            // Giá vốn tính theo hàng hóa tại từng kho (gộp mọi vị trí / lô). Dữ liệu cũ tính theo từng dòng tồn nên
            // các lô của cùng 1 hàng trong 1 kho có thể lệch giá → đưa mọi dòng về giá bình quân theo SL của kho
            // (giống CostingPolicy.WeightedAverageCost: chỉ dòng SL > 0 và đã có giá > 0; không có thì lấy giá cao nhất),
            // ghi 1 dòng thẻ kho "Cập nhật giá vốn" cho mỗi (kho, hàng) đã đổi, dùng chung 1 mã CB.
            // Sau đó giá vốn chung của hàng hóa = bình quân theo SL mọi kho (cùng quy tắc).
            migrationBuilder.Sql(@"
DO $$
DECLARE
    v_ref  integer;
    v_user integer;
    v_now  timestamp := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh');
BEGIN
    DROP TABLE IF EXISTS _cost_fix;
    CREATE TEMP TABLE _cost_fix ON COMMIT DROP AS
    SELECT warehouse_id,
           product_id,
           SUM(COALESCE(quantity, 0)) AS total_qty,
           ROUND(CASE
                     WHEN SUM(CASE WHEN quantity > 0 AND unit_cost > 0 THEN quantity ELSE 0 END) > 0
                         THEN SUM(CASE WHEN quantity > 0 AND unit_cost > 0 THEN quantity * unit_cost ELSE 0 END)
                              / SUM(CASE WHEN quantity > 0 AND unit_cost > 0 THEN quantity ELSE 0 END)
                     ELSE MAX(COALESCE(unit_cost, 0))
                 END, 3) AS new_cost
    FROM stockflow.trx_inventory_balances
    GROUP BY warehouse_id, product_id
    HAVING COUNT(DISTINCT ROUND(COALESCE(unit_cost, 0), 3)) > 1;

    IF EXISTS (SELECT 1 FROM _cost_fix) THEN
        v_ref := nextval('stockflow.seq_cost_update');
        SELECT user_id INTO v_user FROM stockflow.sec_users WHERE username = 'admin' ORDER BY user_id LIMIT 1;
        IF v_user IS NULL THEN
            SELECT MIN(user_id) INTO v_user FROM stockflow.sec_users;
        END IF;

        UPDATE stockflow.trx_inventory_balances b
        SET unit_cost = f.new_cost, last_updated = v_now
        FROM _cost_fix f
        WHERE b.warehouse_id = f.warehouse_id AND b.product_id = f.product_id;

        INSERT INTO stockflow.trx_inventory_transactions
            (warehouse_id, product_id, transaction_type, quantity, reference_type, reference_id,
             transaction_date, created_by, unit_cost, balance_after)
        SELECT warehouse_id, product_id, 'COST_UPDATE', 0, 'COST_UPDATE', v_ref,
               v_now, v_user, new_cost, total_qty
        FROM _cost_fix;
    END IF;

    UPDATE stockflow.mst_products p
    SET moving_average_cost = x.cost
    FROM (SELECT product_id,
                 ROUND(SUM(quantity * unit_cost) / SUM(quantity), 3) AS cost
          FROM stockflow.trx_inventory_balances
          WHERE quantity > 0 AND unit_cost > 0
          GROUP BY product_id) x
    WHERE p.product_id = x.product_id
      AND p.moving_average_cost IS DISTINCT FROM x.cost;
END $$;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<decimal>(
                name: "unit_cost",
                schema: "stockflow",
                table: "trx_inventory_transactions",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,4)",
                oldPrecision: 18,
                oldScale: 4,
                oldNullable: true);
        }
    }
}
