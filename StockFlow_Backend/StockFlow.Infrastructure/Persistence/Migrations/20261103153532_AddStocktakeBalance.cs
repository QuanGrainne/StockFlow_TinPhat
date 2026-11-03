using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockFlow.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddStocktakeBalance : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Kiểm kho: thời điểm / người cân bằng kho, giá vốn từng dòng lúc kiểm, sequence sinh mã KK000001.
            // Dùng IF NOT EXISTS để chạy được trên mọi trạng thái DB của các thành viên.
            migrationBuilder.Sql(@"
ALTER TABLE stockflow.trx_stocktakes
    ADD COLUMN IF NOT EXISTS balanced_date timestamp without time zone NULL,
    ADD COLUMN IF NOT EXISTS balanced_by integer NULL;

ALTER TABLE stockflow.dtl_stocktake_items
    ADD COLUMN IF NOT EXISTS unit_cost numeric(18,4) NULL;

CREATE INDEX IF NOT EXISTS ix_trx_stocktakes_warehouse_status
    ON stockflow.trx_stocktakes (warehouse_id, status);

CREATE SEQUENCE IF NOT EXISTS stockflow.seq_stocktake_code START WITH 1 INCREMENT BY 1;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
DROP SEQUENCE IF EXISTS stockflow.seq_stocktake_code;
DROP INDEX IF EXISTS stockflow.ix_trx_stocktakes_warehouse_status;
ALTER TABLE stockflow.dtl_stocktake_items DROP COLUMN IF EXISTS unit_cost;
ALTER TABLE stockflow.trx_stocktakes
    DROP COLUMN IF EXISTS balanced_by,
    DROP COLUMN IF EXISTS balanced_date;");
        }
    }
}
