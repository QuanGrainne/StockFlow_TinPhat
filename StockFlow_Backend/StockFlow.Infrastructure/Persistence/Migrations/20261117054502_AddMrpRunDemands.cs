using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace StockFlow.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddMrpRunDemands : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "dtl_mrp_run_demands",
                schema: "stockflow",
                columns: table => new
                {
                    mrp_run_demand_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    mrp_run_id = table.Column<int>(type: "integer", nullable: false),
                    material_id = table.Column<int>(type: "integer", nullable: false),
                    need_date = table.Column<DateOnly>(type: "date", nullable: false),
                    source_type = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    production_plan_id = table.Column<int>(type: "integer", nullable: true),
                    production_order_id = table.Column<int>(type: "integer", nullable: true),
                    product_id = table.Column<int>(type: "integer", nullable: false),
                    required_qty = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    allocated_qty = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    shortage_qty = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("dtl_mrp_run_demands_pkey", x => x.mrp_run_demand_id);
                    table.ForeignKey(
                        name: "fk_dtl_mrp_run_demands_material_id",
                        column: x => x.material_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_products",
                        principalColumn: "product_id");
                    table.ForeignKey(
                        name: "fk_dtl_mrp_run_demands_mrp_run_id",
                        column: x => x.mrp_run_id,
                        principalSchema: "stockflow",
                        principalTable: "trx_mrp_runs",
                        principalColumn: "mrp_run_id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_dtl_mrp_run_demands_product_id",
                        column: x => x.product_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_products",
                        principalColumn: "product_id");
                    table.ForeignKey(
                        name: "fk_dtl_mrp_run_demands_production_order_id",
                        column: x => x.production_order_id,
                        principalSchema: "stockflow",
                        principalTable: "trx_production_orders",
                        principalColumn: "production_order_id");
                    table.ForeignKey(
                        name: "fk_dtl_mrp_run_demands_production_plan_id",
                        column: x => x.production_plan_id,
                        principalSchema: "stockflow",
                        principalTable: "trx_production_plans",
                        principalColumn: "production_plan_id");
                });

            migrationBuilder.CreateIndex(
                name: "ix_dtl_mrp_run_demands_material_id",
                schema: "stockflow",
                table: "dtl_mrp_run_demands",
                column: "material_id");

            migrationBuilder.CreateIndex(
                name: "ix_dtl_mrp_run_demands_product_id",
                schema: "stockflow",
                table: "dtl_mrp_run_demands",
                column: "product_id");

            migrationBuilder.CreateIndex(
                name: "ix_dtl_mrp_run_demands_production_order_id",
                schema: "stockflow",
                table: "dtl_mrp_run_demands",
                column: "production_order_id");

            migrationBuilder.CreateIndex(
                name: "ix_dtl_mrp_run_demands_production_plan_id",
                schema: "stockflow",
                table: "dtl_mrp_run_demands",
                column: "production_plan_id");

            migrationBuilder.CreateIndex(
                name: "ix_dtl_mrp_run_demands_run_material",
                schema: "stockflow",
                table: "dtl_mrp_run_demands",
                columns: new[] { "mrp_run_id", "material_id" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "dtl_mrp_run_demands",
                schema: "stockflow");
        }
    }
}
