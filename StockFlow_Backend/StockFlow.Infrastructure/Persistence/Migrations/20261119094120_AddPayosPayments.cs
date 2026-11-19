using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace StockFlow.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPayosPayments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "trx_payos_payments",
                schema: "stockflow",
                columns: table => new
                {
                    payos_payment_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    order_code = table.Column<long>(type: "bigint", nullable: false),
                    payment_link_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    reference_type = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    warehouse_id = table.Column<int>(type: "integer", nullable: true),
                    amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    description = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    checkout_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    qr_code = table.Column<string>(type: "text", nullable: true),
                    bin = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    account_number = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    account_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    expired_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    paid_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    paid_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    payos_reference = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    created_by = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("trx_payos_payments_pkey", x => x.payos_payment_id);
                    table.ForeignKey(
                        name: "fk_trx_payos_payments_created_by",
                        column: x => x.created_by,
                        principalSchema: "stockflow",
                        principalTable: "sec_users",
                        principalColumn: "user_id");
                    table.ForeignKey(
                        name: "fk_trx_payos_payments_warehouse_id",
                        column: x => x.warehouse_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_warehouses",
                        principalColumn: "warehouse_id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_trx_payos_payments_created_by",
                schema: "stockflow",
                table: "trx_payos_payments",
                column: "created_by");

            migrationBuilder.CreateIndex(
                name: "IX_trx_payos_payments_warehouse_id",
                schema: "stockflow",
                table: "trx_payos_payments",
                column: "warehouse_id");

            migrationBuilder.CreateIndex(
                name: "uq_trx_payos_payments_order_code",
                schema: "stockflow",
                table: "trx_payos_payments",
                column: "order_code",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "trx_payos_payments",
                schema: "stockflow");
        }
    }
}
