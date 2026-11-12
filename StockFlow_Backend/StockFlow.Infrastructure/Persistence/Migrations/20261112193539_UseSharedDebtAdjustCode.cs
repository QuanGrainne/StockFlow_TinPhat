using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockFlow.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class UseSharedDebtAdjustCode : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Phiếu điều chỉnh công nợ Khách hàng + Nhà cung cấp dùng chung 1 dãy mã DC000001... tăng dần.
            // Đổi mã CB... cũ thành DC... (giữ số), đặt sequence chung nối tiếp số lớn nhất, bỏ 2 sequence riêng.
            // Chạy lại vẫn an toàn.
            migrationBuilder.Sql(@"
CREATE SEQUENCE IF NOT EXISTS stockflow.seq_debt_adjust START 1;
UPDATE stockflow.trx_financial_transactions
   SET tx_code = 'DC' || substring(tx_code from 3)
 WHERE tx_type IN ('DEBT_ADJUST', 'SUPPLIER_DEBT_ADJUST') AND tx_code ~ '^CB[0-9]+$';
SELECT setval('stockflow.seq_debt_adjust',
       COALESCE((SELECT MAX(substring(tx_code from 3)::bigint) FROM stockflow.trx_financial_transactions
                  WHERE tx_type IN ('DEBT_ADJUST', 'SUPPLIER_DEBT_ADJUST') AND tx_code ~ '^DC[0-9]+$'), 0) + 1,
       false);
DROP SEQUENCE IF EXISTS stockflow.seq_customer_debt_adjust;
DROP SEQUENCE IF EXISTS stockflow.seq_supplier_debt_adjust;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
UPDATE stockflow.trx_financial_transactions
   SET tx_code = 'CB' || substring(tx_code from 3)
 WHERE tx_type IN ('DEBT_ADJUST', 'SUPPLIER_DEBT_ADJUST') AND tx_code ~ '^DC[0-9]+$';
CREATE SEQUENCE IF NOT EXISTS stockflow.seq_customer_debt_adjust START 1;
CREATE SEQUENCE IF NOT EXISTS stockflow.seq_supplier_debt_adjust START 1;
DROP SEQUENCE IF EXISTS stockflow.seq_debt_adjust;");
        }
    }
}
