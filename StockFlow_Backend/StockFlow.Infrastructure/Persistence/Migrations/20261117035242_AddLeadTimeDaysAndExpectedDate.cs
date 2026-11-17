using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockFlow.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddLeadTimeDaysAndExpectedDate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateOnly>(
                name: "expected_date",
                schema: "stockflow",
                table: "trx_purchase_orders",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "lead_time_days",
                schema: "stockflow",
                table: "mst_products",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "expected_date",
                schema: "stockflow",
                table: "trx_purchase_orders");

            migrationBuilder.DropColumn(
                name: "lead_time_days",
                schema: "stockflow",
                table: "mst_products");
        }
    }
}
