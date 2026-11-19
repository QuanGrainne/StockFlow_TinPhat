using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace StockFlow.Infrastructure.Persistence.Migrations
{
    /// <summary>
    /// Xoá 3 bảng có trong ERD nhưng chưa có code dùng:
    /// trx_inbound_costs, dtl_inbound_cost_allocations (UC-34 phân bổ chi phí nhập)
    /// và trx_return_processing (UC-42 phân loại hàng trả).
    /// Down tạo lại đủ bảng, khoá ngoại, chỉ mục (không có dữ liệu).
    /// </summary>
    public partial class DropInboundCostAndReturnProcessing : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Chốt chặn: API tự chạy migration khi khởi động, nên nếu database nào đã có dữ liệu
            // trong 3 bảng thì dừng lại (cả migration rollback) thay vì xoá mất dữ liệu.
            migrationBuilder.Sql(@"
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM stockflow.trx_inbound_costs)
       OR EXISTS (SELECT 1 FROM stockflow.dtl_inbound_cost_allocations)
       OR EXISTS (SELECT 1 FROM stockflow.trx_return_processing) THEN
        RAISE EXCEPTION 'Không xoá được: trx_inbound_costs / dtl_inbound_cost_allocations / trx_return_processing còn dữ liệu. Sao lưu và xử lý dữ liệu trước khi chạy migration DropInboundCostAndReturnProcessing.';
    END IF;
END $$;");

            migrationBuilder.DropTable(
                name: "dtl_inbound_cost_allocations",
                schema: "stockflow");

            migrationBuilder.DropTable(
                name: "trx_return_processing",
                schema: "stockflow");

            migrationBuilder.DropTable(
                name: "trx_inbound_costs",
                schema: "stockflow");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "trx_inbound_costs",
                schema: "stockflow",
                columns: table => new
                {
                    inbound_cost_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    allocated_by = table.Column<int>(type: "integer", nullable: false),
                    gr_id = table.Column<int>(type: "integer", nullable: false),
                    amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    cost_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    description = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("trx_inbound_costs_pkey", x => x.inbound_cost_id);
                    table.ForeignKey(
                        name: "fk_trx_inbound_costs_allocated_by",
                        column: x => x.allocated_by,
                        principalSchema: "stockflow",
                        principalTable: "sec_users",
                        principalColumn: "user_id");
                    table.ForeignKey(
                        name: "fk_trx_inbound_costs_gr_id",
                        column: x => x.gr_id,
                        principalSchema: "stockflow",
                        principalTable: "trx_goods_receipts",
                        principalColumn: "gr_id");
                });

            migrationBuilder.CreateTable(
                name: "trx_return_processing",
                schema: "stockflow",
                columns: table => new
                {
                    processing_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    processed_by = table.Column<int>(type: "integer", nullable: false),
                    return_item_id = table.Column<int>(type: "integer", nullable: false),
                    warehouse_id = table.Column<int>(type: "integer", nullable: true),
                    category = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    process_date = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    quantity = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("trx_return_processing_pkey", x => x.processing_id);
                    table.ForeignKey(
                        name: "fk_trx_return_processing_processed_by",
                        column: x => x.processed_by,
                        principalSchema: "stockflow",
                        principalTable: "sec_users",
                        principalColumn: "user_id");
                    table.ForeignKey(
                        name: "fk_trx_return_processing_return_item_id",
                        column: x => x.return_item_id,
                        principalSchema: "stockflow",
                        principalTable: "dtl_return_request_items",
                        principalColumn: "return_item_id");
                    table.ForeignKey(
                        name: "fk_trx_return_processing_warehouse_id",
                        column: x => x.warehouse_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_warehouses",
                        principalColumn: "warehouse_id");
                });

            migrationBuilder.CreateTable(
                name: "dtl_inbound_cost_allocations",
                schema: "stockflow",
                columns: table => new
                {
                    allocation_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    gr_item_id = table.Column<int>(type: "integer", nullable: false),
                    inbound_cost_id = table.Column<int>(type: "integer", nullable: false),
                    allocated_amount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("dtl_inbound_cost_allocations_pkey", x => x.allocation_id);
                    table.ForeignKey(
                        name: "fk_dtl_inbound_cost_allocations_gr_item_id",
                        column: x => x.gr_item_id,
                        principalSchema: "stockflow",
                        principalTable: "dtl_goods_receipt_items",
                        principalColumn: "gr_item_id");
                    table.ForeignKey(
                        name: "fk_dtl_inbound_cost_allocations_inbound_cost_id",
                        column: x => x.inbound_cost_id,
                        principalSchema: "stockflow",
                        principalTable: "trx_inbound_costs",
                        principalColumn: "inbound_cost_id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_dtl_inbound_cost_allocations_gr_item_id",
                schema: "stockflow",
                table: "dtl_inbound_cost_allocations",
                column: "gr_item_id");

            migrationBuilder.CreateIndex(
                name: "IX_dtl_inbound_cost_allocations_inbound_cost_id",
                schema: "stockflow",
                table: "dtl_inbound_cost_allocations",
                column: "inbound_cost_id");

            migrationBuilder.CreateIndex(
                name: "IX_trx_inbound_costs_allocated_by",
                schema: "stockflow",
                table: "trx_inbound_costs",
                column: "allocated_by");

            migrationBuilder.CreateIndex(
                name: "IX_trx_inbound_costs_gr_id",
                schema: "stockflow",
                table: "trx_inbound_costs",
                column: "gr_id");

            migrationBuilder.CreateIndex(
                name: "IX_trx_return_processing_processed_by",
                schema: "stockflow",
                table: "trx_return_processing",
                column: "processed_by");

            migrationBuilder.CreateIndex(
                name: "IX_trx_return_processing_return_item_id",
                schema: "stockflow",
                table: "trx_return_processing",
                column: "return_item_id");

            migrationBuilder.CreateIndex(
                name: "IX_trx_return_processing_warehouse_id",
                schema: "stockflow",
                table: "trx_return_processing",
                column: "warehouse_id");
        }
    }
}
