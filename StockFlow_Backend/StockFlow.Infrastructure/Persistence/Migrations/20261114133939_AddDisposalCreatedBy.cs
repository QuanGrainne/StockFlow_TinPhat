using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockFlow.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddDisposalCreatedBy : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "created_by",
                schema: "stockflow",
                table: "trx_inventory_disposals",
                type: "integer",
                nullable: true);

            // Phiếu xuất hủy cũ: người tạo = người xuất hủy
            migrationBuilder.Sql("UPDATE stockflow.trx_inventory_disposals SET created_by = processed_by WHERE created_by IS NULL;");

            migrationBuilder.CreateIndex(
                name: "IX_trx_inventory_disposals_created_by",
                schema: "stockflow",
                table: "trx_inventory_disposals",
                column: "created_by");

            migrationBuilder.AddForeignKey(
                name: "fk_trx_inventory_disposals_created_by",
                schema: "stockflow",
                table: "trx_inventory_disposals",
                column: "created_by",
                principalSchema: "stockflow",
                principalTable: "sec_users",
                principalColumn: "user_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_trx_inventory_disposals_created_by",
                schema: "stockflow",
                table: "trx_inventory_disposals");

            migrationBuilder.DropIndex(
                name: "IX_trx_inventory_disposals_created_by",
                schema: "stockflow",
                table: "trx_inventory_disposals");

            migrationBuilder.DropColumn(
                name: "created_by",
                schema: "stockflow",
                table: "trx_inventory_disposals");
        }
    }
}
