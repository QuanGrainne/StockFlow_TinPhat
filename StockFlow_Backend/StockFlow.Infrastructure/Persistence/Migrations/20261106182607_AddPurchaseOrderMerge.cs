using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockFlow.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPurchaseOrderMerge : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "merged_into_po_id",
                schema: "stockflow",
                table: "trx_purchase_orders",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_trx_purchase_orders_merged_into_po_id",
                schema: "stockflow",
                table: "trx_purchase_orders",
                column: "merged_into_po_id");

            migrationBuilder.AddForeignKey(
                name: "fk_trx_purchase_orders_merged_into_po_id",
                schema: "stockflow",
                table: "trx_purchase_orders",
                column: "merged_into_po_id",
                principalSchema: "stockflow",
                principalTable: "trx_purchase_orders",
                principalColumn: "po_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_trx_purchase_orders_merged_into_po_id",
                schema: "stockflow",
                table: "trx_purchase_orders");

            migrationBuilder.DropIndex(
                name: "IX_trx_purchase_orders_merged_into_po_id",
                schema: "stockflow",
                table: "trx_purchase_orders");

            migrationBuilder.DropColumn(
                name: "merged_into_po_id",
                schema: "stockflow",
                table: "trx_purchase_orders");
        }
    }
}
