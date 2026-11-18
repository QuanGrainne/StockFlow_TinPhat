using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockFlow.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddProductionPlanWarehouse : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "warehouse_id",
                schema: "stockflow",
                table: "trx_production_plans",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_trx_production_plans_warehouse_id",
                schema: "stockflow",
                table: "trx_production_plans",
                column: "warehouse_id");

            migrationBuilder.AddForeignKey(
                name: "fk_trx_production_plans_warehouse_id",
                schema: "stockflow",
                table: "trx_production_plans",
                column: "warehouse_id",
                principalSchema: "stockflow",
                principalTable: "mst_warehouses",
                principalColumn: "warehouse_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_trx_production_plans_warehouse_id",
                schema: "stockflow",
                table: "trx_production_plans");

            migrationBuilder.DropIndex(
                name: "IX_trx_production_plans_warehouse_id",
                schema: "stockflow",
                table: "trx_production_plans");

            migrationBuilder.DropColumn(
                name: "warehouse_id",
                schema: "stockflow",
                table: "trx_production_plans");
        }
    }
}
