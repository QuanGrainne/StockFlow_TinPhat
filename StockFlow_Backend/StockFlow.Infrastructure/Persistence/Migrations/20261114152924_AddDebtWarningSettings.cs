using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockFlow.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddDebtWarningSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "mst_debt_warning_settings",
                schema: "stockflow",
                columns: table => new
                {
                    setting_id = table.Column<int>(type: "integer", nullable: false),
                    enable_debt_amount_warning = table.Column<bool>(type: "boolean", nullable: false),
                    debt_amount_threshold = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    enable_debt_days_warning = table.Column<bool>(type: "boolean", nullable: false),
                    debt_days_threshold = table.Column<int>(type: "integer", nullable: false),
                    debt_days_from = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    allow_debt_over_limit = table.Column<bool>(type: "boolean", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("mst_debt_warning_settings_pkey", x => x.setting_id);
                    table.ForeignKey(
                        name: "fk_mst_debt_warning_settings_updated_by",
                        column: x => x.updated_by,
                        principalSchema: "stockflow",
                        principalTable: "sec_users",
                        principalColumn: "user_id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_mst_debt_warning_settings_updated_by",
                schema: "stockflow",
                table: "mst_debt_warning_settings",
                column: "updated_by");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "mst_debt_warning_settings",
                schema: "stockflow");
        }
    }
}
