using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace StockFlow.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPurchaseOrders : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Sequence sinh mã phiếu đặt hàng nhập PDN000001...
            migrationBuilder.Sql("CREATE SEQUENCE IF NOT EXISTS stockflow.seq_purchase_order;");

            migrationBuilder.AddColumn<int>(
                name: "purchase_order_id",
                schema: "stockflow",
                table: "trx_goods_receipts",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "trx_purchase_orders",
                schema: "stockflow",
                columns: table => new
                {
                    po_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    po_code = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    partner_id = table.Column<int>(type: "integer", nullable: false),
                    warehouse_id = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    order_date = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    discount_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    total_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    created_by = table.Column<int>(type: "integer", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    updated_by = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("trx_purchase_orders_pkey", x => x.po_id);
                    table.ForeignKey(
                        name: "fk_trx_purchase_orders_created_by",
                        column: x => x.created_by,
                        principalSchema: "stockflow",
                        principalTable: "sec_users",
                        principalColumn: "user_id");
                    table.ForeignKey(
                        name: "fk_trx_purchase_orders_partner_id",
                        column: x => x.partner_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_business_partners",
                        principalColumn: "partner_id");
                    table.ForeignKey(
                        name: "fk_trx_purchase_orders_warehouse_id",
                        column: x => x.warehouse_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_warehouses",
                        principalColumn: "warehouse_id");
                });

            migrationBuilder.CreateTable(
                name: "dtl_purchase_order_items",
                schema: "stockflow",
                columns: table => new
                {
                    po_item_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    po_id = table.Column<int>(type: "integer", nullable: false),
                    product_id = table.Column<int>(type: "integer", nullable: false),
                    ordered_qty = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    unit_price = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    discount_percent = table.Column<decimal>(type: "numeric(9,4)", precision: 9, scale: 4, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("dtl_purchase_order_items_pkey", x => x.po_item_id);
                    table.ForeignKey(
                        name: "fk_dtl_purchase_order_items_po_id",
                        column: x => x.po_id,
                        principalSchema: "stockflow",
                        principalTable: "trx_purchase_orders",
                        principalColumn: "po_id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_dtl_purchase_order_items_product_id",
                        column: x => x.product_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_products",
                        principalColumn: "product_id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_trx_goods_receipts_purchase_order_id",
                schema: "stockflow",
                table: "trx_goods_receipts",
                column: "purchase_order_id");

            migrationBuilder.CreateIndex(
                name: "IX_dtl_purchase_order_items_po_id",
                schema: "stockflow",
                table: "dtl_purchase_order_items",
                column: "po_id");

            migrationBuilder.CreateIndex(
                name: "IX_dtl_purchase_order_items_product_id",
                schema: "stockflow",
                table: "dtl_purchase_order_items",
                column: "product_id");

            migrationBuilder.CreateIndex(
                name: "IX_trx_purchase_orders_created_by",
                schema: "stockflow",
                table: "trx_purchase_orders",
                column: "created_by");

            migrationBuilder.CreateIndex(
                name: "IX_trx_purchase_orders_partner_id",
                schema: "stockflow",
                table: "trx_purchase_orders",
                column: "partner_id");

            migrationBuilder.CreateIndex(
                name: "IX_trx_purchase_orders_warehouse_id",
                schema: "stockflow",
                table: "trx_purchase_orders",
                column: "warehouse_id");

            migrationBuilder.CreateIndex(
                name: "uq_trx_purchase_orders_code",
                schema: "stockflow",
                table: "trx_purchase_orders",
                column: "po_code",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "fk_trx_goods_receipts_purchase_order_id",
                schema: "stockflow",
                table: "trx_goods_receipts",
                column: "purchase_order_id",
                principalSchema: "stockflow",
                principalTable: "trx_purchase_orders",
                principalColumn: "po_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP SEQUENCE IF EXISTS stockflow.seq_purchase_order;");

            migrationBuilder.DropForeignKey(
                name: "fk_trx_goods_receipts_purchase_order_id",
                schema: "stockflow",
                table: "trx_goods_receipts");

            migrationBuilder.DropTable(
                name: "dtl_purchase_order_items",
                schema: "stockflow");

            migrationBuilder.DropTable(
                name: "trx_purchase_orders",
                schema: "stockflow");

            migrationBuilder.DropIndex(
                name: "IX_trx_goods_receipts_purchase_order_id",
                schema: "stockflow",
                table: "trx_goods_receipts");

            migrationBuilder.DropColumn(
                name: "purchase_order_id",
                schema: "stockflow",
                table: "trx_goods_receipts");
        }
    }
}
