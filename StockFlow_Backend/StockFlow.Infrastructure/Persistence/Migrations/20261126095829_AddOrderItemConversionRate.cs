using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockFlow.Infrastructure.Persistence.Migrations
{
    /// <summary>
    /// Bán theo đơn vị quy đổi (26/11/2026): dtl_order_items.conversion_rate = số đơn vị cơ bản trong 1 đơn vị bán
    /// của dòng (1 túi = 10 bịch → 10). Dòng cũ đều bán theo đơn vị cơ bản → mặc định 1.
    /// Viết bằng SQL idempotent (DB các máy có thể lệch migration).
    /// </summary>
    public partial class AddOrderItemConversionRate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
ALTER TABLE stockflow.dtl_order_items
    ADD COLUMN IF NOT EXISTS conversion_rate numeric(18,4) NOT NULL DEFAULT 1;
UPDATE stockflow.dtl_order_items SET conversion_rate = 1 WHERE conversion_rate IS NULL OR conversion_rate <= 0;
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("ALTER TABLE stockflow.dtl_order_items DROP COLUMN IF EXISTS conversion_rate;");
        }
    }
}
