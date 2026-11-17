using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace StockFlow.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddMrpRunTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "trx_mrp_runs",
                schema: "stockflow",
                columns: table => new
                {
                    mrp_run_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    run_code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    run_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    run_by = table.Column<int>(type: "integer", nullable: false),
                    period_start = table.Column<DateOnly>(type: "date", nullable: false),
                    period_end = table.Column<DateOnly>(type: "date", nullable: false),
                    warehouse_ids = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    include_pending_plans = table.Column<bool>(type: "boolean", nullable: false),
                    material_count = table.Column<int>(type: "integer", nullable: false),
                    shortage_count = table.Column<int>(type: "integer", nullable: false),
                    late_count = table.Column<int>(type: "integer", nullable: false),
                    notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("trx_mrp_runs_pkey", x => x.mrp_run_id);
                    table.ForeignKey(
                        name: "fk_trx_mrp_runs_run_by",
                        column: x => x.run_by,
                        principalSchema: "stockflow",
                        principalTable: "sec_users",
                        principalColumn: "user_id");
                });

            migrationBuilder.CreateTable(
                name: "dtl_mrp_run_lines",
                schema: "stockflow",
                columns: table => new
                {
                    mrp_run_line_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    mrp_run_id = table.Column<int>(type: "integer", nullable: false),
                    material_id = table.Column<int>(type: "integer", nullable: false),
                    bucket_date = table.Column<DateOnly>(type: "date", nullable: false),
                    gross_requirement = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    scheduled_receipt = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    projected_balance = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    net_requirement = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    planned_receipt = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    planned_release_date = table.Column<DateOnly>(type: "date", nullable: true),
                    is_late = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("dtl_mrp_run_lines_pkey", x => x.mrp_run_line_id);
                    table.ForeignKey(
                        name: "fk_dtl_mrp_run_lines_material_id",
                        column: x => x.material_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_products",
                        principalColumn: "product_id");
                    table.ForeignKey(
                        name: "fk_dtl_mrp_run_lines_mrp_run_id",
                        column: x => x.mrp_run_id,
                        principalSchema: "stockflow",
                        principalTable: "trx_mrp_runs",
                        principalColumn: "mrp_run_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_dtl_mrp_run_lines_material_id",
                schema: "stockflow",
                table: "dtl_mrp_run_lines",
                column: "material_id");

            migrationBuilder.CreateIndex(
                name: "uq_dtl_mrp_run_lines_bucket",
                schema: "stockflow",
                table: "dtl_mrp_run_lines",
                columns: new[] { "mrp_run_id", "material_id", "bucket_date" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_trx_mrp_runs_run_at",
                schema: "stockflow",
                table: "trx_mrp_runs",
                column: "run_at");

            migrationBuilder.CreateIndex(
                name: "IX_trx_mrp_runs_run_by",
                schema: "stockflow",
                table: "trx_mrp_runs",
                column: "run_by");

            migrationBuilder.CreateIndex(
                name: "uq_trx_mrp_runs_run_code",
                schema: "stockflow",
                table: "trx_mrp_runs",
                column: "run_code",
                unique: true);

            migrationBuilder.Sql("CREATE SEQUENCE IF NOT EXISTS stockflow.seq_mrp_run_code START 1;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP SEQUENCE IF EXISTS stockflow.seq_mrp_run_code;");

            migrationBuilder.DropTable(
                name: "dtl_mrp_run_lines",
                schema: "stockflow");

            migrationBuilder.DropTable(
                name: "trx_mrp_runs",
                schema: "stockflow");
        }
    }
}
