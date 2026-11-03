using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockFlow.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSupplierPaymentVoucher : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Mã chứng từ cho giao dịch tài chính (phiếu chi trả NCC: PC000001...) + sequence sinh mã.
            // Dùng IF NOT EXISTS để chạy được trên mọi trạng thái DB của các thành viên.
            migrationBuilder.Sql(@"
ALTER TABLE stockflow.trx_financial_transactions ADD COLUMN IF NOT EXISTS tx_code character varying(30) NULL;
CREATE INDEX IF NOT EXISTS ix_trx_financial_transactions_tx_code ON stockflow.trx_financial_transactions (tx_code);
CREATE SEQUENCE IF NOT EXISTS stockflow.seq_supplier_payment START 1;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
DROP INDEX IF EXISTS stockflow.ix_trx_financial_transactions_tx_code;
ALTER TABLE stockflow.trx_financial_transactions DROP COLUMN IF EXISTS tx_code;
DROP SEQUENCE IF EXISTS stockflow.seq_supplier_payment;");
        }
    }
}
