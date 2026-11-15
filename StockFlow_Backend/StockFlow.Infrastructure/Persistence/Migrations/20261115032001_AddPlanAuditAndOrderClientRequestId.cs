using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockFlow.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPlanAuditAndOrderClientRequestId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "updated_at",
                schema: "stockflow",
                table: "trx_production_plans",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "updated_by",
                schema: "stockflow",
                table: "trx_production_plans",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "client_request_id",
                schema: "stockflow",
                table: "trx_production_orders",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_trx_production_plans_updated_by",
                schema: "stockflow",
                table: "trx_production_plans",
                column: "updated_by");

            migrationBuilder.CreateIndex(
                name: "uq_trx_production_orders_client_request_id",
                schema: "stockflow",
                table: "trx_production_orders",
                column: "client_request_id",
                unique: true,
                filter: "client_request_id IS NOT NULL");

            migrationBuilder.AddForeignKey(
                name: "fk_trx_production_plans_updated_by",
                schema: "stockflow",
                table: "trx_production_plans",
                column: "updated_by",
                principalSchema: "stockflow",
                principalTable: "sec_users",
                principalColumn: "user_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_trx_production_plans_updated_by",
                schema: "stockflow",
                table: "trx_production_plans");

            migrationBuilder.DropIndex(
                name: "IX_trx_production_plans_updated_by",
                schema: "stockflow",
                table: "trx_production_plans");

            migrationBuilder.DropIndex(
                name: "uq_trx_production_orders_client_request_id",
                schema: "stockflow",
                table: "trx_production_orders");

            migrationBuilder.DropColumn(
                name: "updated_at",
                schema: "stockflow",
                table: "trx_production_plans");

            migrationBuilder.DropColumn(
                name: "updated_by",
                schema: "stockflow",
                table: "trx_production_plans");

            migrationBuilder.DropColumn(
                name: "client_request_id",
                schema: "stockflow",
                table: "trx_production_orders");
        }
    }
}
