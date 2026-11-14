using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace StockFlow.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddMultiProductProductionOrders : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "production_order_item_id",
                schema: "stockflow",
                table: "trx_production_material_requirements",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "production_order_item_id",
                schema: "stockflow",
                table: "trx_finished_goods_receipts",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "dtl_production_order_items",
                schema: "stockflow",
                columns: table => new
                {
                    production_order_item_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    production_order_id = table.Column<int>(type: "integer", nullable: false),
                    product_id = table.Column<int>(type: "integer", nullable: false),
                    bom_id = table.Column<int>(type: "integer", nullable: false),
                    planned_quantity = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    actual_quantity = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("dtl_production_order_items_pkey", x => x.production_order_item_id);
                    table.ForeignKey(
                        name: "fk_dtl_production_order_items_bom_id",
                        column: x => x.bom_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_boms",
                        principalColumn: "bom_id");
                    table.ForeignKey(
                        name: "fk_dtl_production_order_items_product_id",
                        column: x => x.product_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_products",
                        principalColumn: "product_id");
                    table.ForeignKey(
                        name: "fk_dtl_production_order_items_production_order_id",
                        column: x => x.production_order_id,
                        principalSchema: "stockflow",
                        principalTable: "trx_production_orders",
                        principalColumn: "production_order_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_trx_production_material_requirements_production_order_item_~",
                schema: "stockflow",
                table: "trx_production_material_requirements",
                column: "production_order_item_id");

            migrationBuilder.CreateIndex(
                name: "IX_trx_finished_goods_receipts_production_order_item_id",
                schema: "stockflow",
                table: "trx_finished_goods_receipts",
                column: "production_order_item_id");

            migrationBuilder.CreateIndex(
                name: "IX_dtl_production_order_items_bom_id",
                schema: "stockflow",
                table: "dtl_production_order_items",
                column: "bom_id");

            migrationBuilder.CreateIndex(
                name: "ix_dtl_production_order_items_order_id",
                schema: "stockflow",
                table: "dtl_production_order_items",
                column: "production_order_id");

            migrationBuilder.CreateIndex(
                name: "IX_dtl_production_order_items_product_id",
                schema: "stockflow",
                table: "dtl_production_order_items",
                column: "product_id");

            migrationBuilder.AddForeignKey(
                name: "fk_trx_finished_goods_receipts_production_order_item_id",
                schema: "stockflow",
                table: "trx_finished_goods_receipts",
                column: "production_order_item_id",
                principalSchema: "stockflow",
                principalTable: "dtl_production_order_items",
                principalColumn: "production_order_item_id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "fk_trx_production_material_requirements_order_item_id",
                schema: "stockflow",
                table: "trx_production_material_requirements",
                column: "production_order_item_id",
                principalSchema: "stockflow",
                principalTable: "dtl_production_order_items",
                principalColumn: "production_order_item_id",
                onDelete: ReferentialAction.Cascade);

            // Backfill dữ liệu cũ: mỗi lệnh sản xuất đơn thành phẩm hiện có tạo 1 dòng dtl_production_order_items
            migrationBuilder.Sql(@"
                INSERT INTO stockflow.dtl_production_order_items (production_order_id, product_id, bom_id, planned_quantity, actual_quantity, notes)
                SELECT o.production_order_id, o.product_id, o.bom_id, COALESCE(o.planned_quantity, 0), COALESCE(o.actual_quantity, 0), o.notes
                FROM stockflow.trx_production_orders o
                WHERE NOT EXISTS (
                    SELECT 1 FROM stockflow.dtl_production_order_items i WHERE i.production_order_id = o.production_order_id
                );

                UPDATE stockflow.trx_production_material_requirements r
                SET production_order_item_id = i.production_order_item_id
                FROM stockflow.dtl_production_order_items i
                WHERE r.production_order_id = i.production_order_id
                  AND r.production_order_item_id IS NULL;

                UPDATE stockflow.trx_finished_goods_receipts f
                SET production_order_item_id = i.production_order_item_id
                FROM stockflow.dtl_production_order_items i
                WHERE f.production_order_id = i.production_order_id
                  AND f.product_id = i.product_id
                  AND f.production_order_item_id IS NULL;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_trx_finished_goods_receipts_production_order_item_id",
                schema: "stockflow",
                table: "trx_finished_goods_receipts");

            migrationBuilder.DropForeignKey(
                name: "fk_trx_production_material_requirements_order_item_id",
                schema: "stockflow",
                table: "trx_production_material_requirements");

            migrationBuilder.DropTable(
                name: "dtl_production_order_items",
                schema: "stockflow");

            migrationBuilder.DropIndex(
                name: "IX_trx_production_material_requirements_production_order_item_~",
                schema: "stockflow",
                table: "trx_production_material_requirements");

            migrationBuilder.DropIndex(
                name: "IX_trx_finished_goods_receipts_production_order_item_id",
                schema: "stockflow",
                table: "trx_finished_goods_receipts");

            migrationBuilder.DropColumn(
                name: "production_order_item_id",
                schema: "stockflow",
                table: "trx_production_material_requirements");

            migrationBuilder.DropColumn(
                name: "production_order_item_id",
                schema: "stockflow",
                table: "trx_finished_goods_receipts");
        }
    }
}
