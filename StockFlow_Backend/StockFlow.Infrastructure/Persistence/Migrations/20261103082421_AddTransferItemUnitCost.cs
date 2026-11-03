using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockFlow.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddTransferItemUnitCost : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Giá vốn kho xuất tại thời điểm xuất chuyển (dùng làm giá nhập vào kho nhận và khi hủy phiếu).
            migrationBuilder.Sql(@"
ALTER TABLE stockflow.dtl_stock_transfer_items
    ADD COLUMN IF NOT EXISTS unit_cost numeric(18,4) NULL;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
ALTER TABLE stockflow.dtl_stock_transfer_items
    DROP COLUMN IF EXISTS unit_cost;");
        }
    }
}
