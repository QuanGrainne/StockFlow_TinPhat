using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace StockFlow.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCreditLimitHistoryAndDefaultLimitSetting : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "default_credit_limit",
                schema: "stockflow",
                table: "mst_debt_warning_settings",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                // Giữ đúng hạn mức mặc định đang áp dụng (trước đây gắn cứng 200.000.000 đ)
                defaultValue: 200_000_000m);

            migrationBuilder.CreateTable(
                name: "trx_credit_limit_histories",
                schema: "stockflow",
                columns: table => new
                {
                    history_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    partner_id = table.Column<int>(type: "integer", nullable: false),
                    old_limit = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    new_limit = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    source = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    request_id = table.Column<int>(type: "integer", nullable: true),
                    changed_by = table.Column<int>(type: "integer", nullable: true),
                    changed_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("trx_credit_limit_histories_pkey", x => x.history_id);
                    table.ForeignKey(
                        name: "fk_trx_credit_limit_histories_changed_by",
                        column: x => x.changed_by,
                        principalSchema: "stockflow",
                        principalTable: "sec_users",
                        principalColumn: "user_id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_trx_credit_limit_histories_partner",
                        column: x => x.partner_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_business_partners",
                        principalColumn: "partner_id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_trx_credit_limit_histories_request",
                        column: x => x.request_id,
                        principalSchema: "stockflow",
                        principalTable: "trx_credit_limit_requests",
                        principalColumn: "request_id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_trx_credit_limit_histories_changed_by",
                schema: "stockflow",
                table: "trx_credit_limit_histories",
                column: "changed_by");

            migrationBuilder.CreateIndex(
                name: "ix_trx_credit_limit_histories_partner_changed",
                schema: "stockflow",
                table: "trx_credit_limit_histories",
                columns: new[] { "partner_id", "changed_at" });

            migrationBuilder.CreateIndex(
                name: "IX_trx_credit_limit_histories_request_id",
                schema: "stockflow",
                table: "trx_credit_limit_histories",
                column: "request_id");

            // Đưa các yêu cầu nâng hạn mức đã duyệt trước đây vào lịch sử
            migrationBuilder.Sql(@"
                INSERT INTO stockflow.trx_credit_limit_histories
                    (partner_id, old_limit, new_limit, source, reason, request_id, changed_by, changed_at)
                SELECT r.partner_id,
                       COALESCE(r.current_limit, 0),
                       COALESCE(r.approved_limit, r.requested_limit, 0),
                       'REQUEST_APPROVED',
                       LEFT(COALESCE(NULLIF(TRIM(r.approval_notes), ''), r.reason), 500),
                       r.request_id,
                       r.approved_by,
                       COALESCE(r.approval_date, r.request_date, now())
                FROM stockflow.trx_credit_limit_requests r
                WHERE r.status = 'APPROVED' AND r.approval_type = 'NEW_LIMIT';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "trx_credit_limit_histories",
                schema: "stockflow");

            migrationBuilder.DropColumn(
                name: "default_credit_limit",
                schema: "stockflow",
                table: "mst_debt_warning_settings");
        }
    }
}
