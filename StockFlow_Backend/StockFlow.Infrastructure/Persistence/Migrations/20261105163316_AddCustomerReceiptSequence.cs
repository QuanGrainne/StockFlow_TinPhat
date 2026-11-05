using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockFlow.Infrastructure.Persistence.Migrations
{
    /// <summary>
    /// Sequence sinh mã phiếu thu nợ khách hàng (PT000001...).
    /// Idempotent: chỉ tạo khi chưa có; số bắt đầu = số lớn nhất của mã PT đang có + 1 để không trùng mã.
    /// </summary>
    public partial class AddCustomerReceiptSequence : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
DO $$
DECLARE next_val bigint;
BEGIN
  IF to_regclass('stockflow.seq_customer_receipt') IS NULL THEN
    SELECT COALESCE(MAX(NULLIF(regexp_replace(tx_code, '\D', '', 'g'), '')::bigint), 0) + 1 INTO next_val
    FROM stockflow.trx_financial_transactions WHERE tx_code ~ '^PT[0-9]+$';
    EXECUTE format('CREATE SEQUENCE stockflow.seq_customer_receipt START WITH %s', next_val);
  END IF;
END $$;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP SEQUENCE IF EXISTS stockflow.seq_customer_receipt;");
        }
    }
}
