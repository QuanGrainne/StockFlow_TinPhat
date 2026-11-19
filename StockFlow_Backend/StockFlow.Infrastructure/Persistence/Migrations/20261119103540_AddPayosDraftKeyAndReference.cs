using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockFlow.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPayosDraftKeyAndReference : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "draft_key",
                schema: "stockflow",
                table: "trx_payos_payments",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "reference_code",
                schema: "stockflow",
                table: "trx_payos_payments",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_trx_payos_payments_draft_key",
                schema: "stockflow",
                table: "trx_payos_payments",
                column: "draft_key");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_trx_payos_payments_draft_key",
                schema: "stockflow",
                table: "trx_payos_payments");

            migrationBuilder.DropColumn(
                name: "draft_key",
                schema: "stockflow",
                table: "trx_payos_payments");

            migrationBuilder.DropColumn(
                name: "reference_code",
                schema: "stockflow",
                table: "trx_payos_payments");
        }
    }
}
