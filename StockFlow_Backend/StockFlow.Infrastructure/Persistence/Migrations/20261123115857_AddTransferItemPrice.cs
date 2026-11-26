using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockFlow.Infrastructure.Persistence.Migrations
{
    /// <summary>
    /// Thêm cột giá chuyển (transfer_price) cho dòng phiếu chuyển hàng: giá người dùng nhập, chỉ để theo dõi
    /// giá trị luân chuyển nội bộ, không ảnh hưởng giá vốn (giá vốn vẫn theo unit_cost).
    /// Phiếu cũ để null → hiển thị theo unit_cost như trước. Viết idempotent vì DB các máy có thể lệch nhau.
    /// </summary>
    public partial class AddTransferItemPrice : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "ALTER TABLE stockflow.dtl_stock_transfer_items ADD COLUMN IF NOT EXISTS transfer_price numeric(18,4) NULL;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "ALTER TABLE stockflow.dtl_stock_transfer_items DROP COLUMN IF EXISTS transfer_price;");
        }
    }
}
