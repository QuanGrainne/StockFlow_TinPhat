using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockFlow.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPurchaseReturnType : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "return_type",
                schema: "stockflow",
                table: "trx_purchase_returns",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "STOCK");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "return_type",
                schema: "stockflow",
                table: "trx_purchase_returns");
        }
    }
}
