using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockFlow.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddTransferItemNotes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Ghi chú từng dòng hàng của phiếu chuyển: của chi nhánh chuyển và của chi nhánh nhận. Chạy lại an toàn.
            migrationBuilder.Sql(@"
ALTER TABLE stockflow.dtl_stock_transfer_items
    ADD COLUMN IF NOT EXISTS notes character varying(500) NULL,
    ADD COLUMN IF NOT EXISTS receive_notes character varying(500) NULL;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
ALTER TABLE stockflow.dtl_stock_transfer_items
    DROP COLUMN IF EXISTS notes,
    DROP COLUMN IF EXISTS receive_notes;");
        }
    }
}
