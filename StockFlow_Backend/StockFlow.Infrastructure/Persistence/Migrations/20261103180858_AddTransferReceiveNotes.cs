using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockFlow.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddTransferReceiveNotes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Ghi chú nhận hàng lưu cột riêng. Dữ liệu cũ dạng "ghi chú chuyển | [Nhận hàng]: ghi chú nhận"
            // được tách ra; phần "[Lý do hủy]: ..." (nếu nằm sau) trả lại ghi chú chuyển. Chạy lại an toàn.
            migrationBuilder.Sql(@"
ALTER TABLE stockflow.trx_stock_transfers
    ADD COLUMN IF NOT EXISTS receive_notes character varying(500) NULL;

UPDATE stockflow.trx_stock_transfers
SET receive_notes = NULLIF(btrim(substr(notes, strpos(notes, '[Nhận hàng]:') + length('[Nhận hàng]:'))), ''),
    notes = NULLIF(rtrim(btrim(substr(notes, 1, strpos(notes, '[Nhận hàng]:') - 1)), ' |'), '')
WHERE receive_notes IS NULL AND strpos(coalesce(notes, ''), '[Nhận hàng]:') > 0;

UPDATE stockflow.trx_stock_transfers
SET notes = concat_ws(' | ', notes, '[Lý do hủy]:' || split_part(receive_notes, '[Lý do hủy]:', 2)),
    receive_notes = NULLIF(rtrim(btrim(split_part(receive_notes, '[Lý do hủy]:', 1)), ' |'), '')
WHERE strpos(coalesce(receive_notes, ''), '[Lý do hủy]:') > 0;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
UPDATE stockflow.trx_stock_transfers
SET notes = concat_ws(' | ', notes, '[Nhận hàng]: ' || receive_notes)
WHERE receive_notes IS NOT NULL;

ALTER TABLE stockflow.trx_stock_transfers DROP COLUMN IF EXISTS receive_notes;");
        }
    }
}
