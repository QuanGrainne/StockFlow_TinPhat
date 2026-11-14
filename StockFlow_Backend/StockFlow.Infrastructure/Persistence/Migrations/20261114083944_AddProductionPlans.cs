using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace StockFlow.Infrastructure.Persistence.Migrations
{
    /// <summary>
    /// Kế hoạch sản xuất: thêm 2 bảng trx_production_plans (đầu phiếu) và dtl_production_plan_items (dòng thành phẩm),
    /// và cột trx_production_orders.production_plan_id (cho phép rỗng) để một kế hoạch liên kết nhiều lệnh sản xuất.
    /// Không sửa hay xóa dữ liệu hiện có; Down chỉ gỡ đúng những gì Up đã thêm.
    /// </summary>
    public partial class AddProductionPlans : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "production_plan_id",
                schema: "stockflow",
                table: "trx_production_orders",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "trx_production_plans",
                schema: "stockflow",
                columns: table => new
                {
                    production_plan_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    plan_code = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    plan_name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    plan_date = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    period_start = table.Column<DateOnly>(type: "date", nullable: false),
                    period_end = table.Column<DateOnly>(type: "date", nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    created_by = table.Column<int>(type: "integer", nullable: false),
                    approved_by = table.Column<int>(type: "integer", nullable: true),
                    approval_date = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("trx_production_plans_pkey", x => x.production_plan_id);
                    table.ForeignKey(
                        name: "fk_trx_production_plans_approved_by",
                        column: x => x.approved_by,
                        principalSchema: "stockflow",
                        principalTable: "sec_users",
                        principalColumn: "user_id");
                    table.ForeignKey(
                        name: "fk_trx_production_plans_created_by",
                        column: x => x.created_by,
                        principalSchema: "stockflow",
                        principalTable: "sec_users",
                        principalColumn: "user_id");
                });

            migrationBuilder.CreateTable(
                name: "dtl_production_plan_items",
                schema: "stockflow",
                columns: table => new
                {
                    production_plan_item_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    production_plan_id = table.Column<int>(type: "integer", nullable: false),
                    product_id = table.Column<int>(type: "integer", nullable: false),
                    planned_quantity = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    planned_start_date = table.Column<DateOnly>(type: "date", nullable: false),
                    planned_end_date = table.Column<DateOnly>(type: "date", nullable: false),
                    warehouse_id = table.Column<int>(type: "integer", nullable: true),
                    notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("dtl_production_plan_items_pkey", x => x.production_plan_item_id);
                    table.ForeignKey(
                        name: "fk_dtl_production_plan_items_product_id",
                        column: x => x.product_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_products",
                        principalColumn: "product_id");
                    table.ForeignKey(
                        name: "fk_dtl_production_plan_items_production_plan_id",
                        column: x => x.production_plan_id,
                        principalSchema: "stockflow",
                        principalTable: "trx_production_plans",
                        principalColumn: "production_plan_id");
                    table.ForeignKey(
                        name: "fk_dtl_production_plan_items_warehouse_id",
                        column: x => x.warehouse_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_warehouses",
                        principalColumn: "warehouse_id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_trx_production_orders_production_plan_id",
                schema: "stockflow",
                table: "trx_production_orders",
                column: "production_plan_id");

            migrationBuilder.CreateIndex(
                name: "IX_dtl_production_plan_items_product_id",
                schema: "stockflow",
                table: "dtl_production_plan_items",
                column: "product_id");

            migrationBuilder.CreateIndex(
                name: "IX_dtl_production_plan_items_production_plan_id",
                schema: "stockflow",
                table: "dtl_production_plan_items",
                column: "production_plan_id");

            migrationBuilder.CreateIndex(
                name: "IX_dtl_production_plan_items_warehouse_id",
                schema: "stockflow",
                table: "dtl_production_plan_items",
                column: "warehouse_id");

            migrationBuilder.CreateIndex(
                name: "IX_trx_production_plans_approved_by",
                schema: "stockflow",
                table: "trx_production_plans",
                column: "approved_by");

            migrationBuilder.CreateIndex(
                name: "IX_trx_production_plans_created_by",
                schema: "stockflow",
                table: "trx_production_plans",
                column: "created_by");

            migrationBuilder.CreateIndex(
                name: "uq_trx_production_plans_code",
                schema: "stockflow",
                table: "trx_production_plans",
                column: "plan_code",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "fk_trx_production_orders_production_plan_id",
                schema: "stockflow",
                table: "trx_production_orders",
                column: "production_plan_id",
                principalSchema: "stockflow",
                principalTable: "trx_production_plans",
                principalColumn: "production_plan_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_trx_production_orders_production_plan_id",
                schema: "stockflow",
                table: "trx_production_orders");

            migrationBuilder.DropTable(
                name: "dtl_production_plan_items",
                schema: "stockflow");

            migrationBuilder.DropTable(
                name: "trx_production_plans",
                schema: "stockflow");

            migrationBuilder.DropIndex(
                name: "IX_trx_production_orders_production_plan_id",
                schema: "stockflow",
                table: "trx_production_orders");

            migrationBuilder.DropColumn(
                name: "production_plan_id",
                schema: "stockflow",
                table: "trx_production_orders");
        }
    }
}
