using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockFlow.Infrastructure.Persistence.Migrations
{
    /// <summary>
    /// Chuẩn hóa mã phiếu thu gắn với hóa đơn bán hàng theo quy tắc TT + mã hóa đơn:
    /// phiếu thu đầu tiên của hóa đơn = TTHD000085, các phiếu sau = TTHD000085-1, TTHD000085-2...
    /// Chỉ đổi các phiếu thu chưa có mã hoặc mang mã chung PT... (dữ liệu cũ); phiếu đã đúng quy tắc giữ nguyên.
    /// Idempotent: chạy lại không thay đổi gì.
    /// </summary>
    public partial class BackfillOrderReceiptCodes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
WITH numbered AS (
  SELECT t.tx_id,
         t.tx_code,
         'TT' || o.order_code ||
           CASE WHEN ROW_NUMBER() OVER (PARTITION BY t.reference_id ORDER BY t.transaction_date, t.tx_id) = 1 THEN ''
                ELSE '-' || (ROW_NUMBER() OVER (PARTITION BY t.reference_id ORDER BY t.transaction_date, t.tx_id) - 1)::text
           END AS new_code
  FROM stockflow.trx_financial_transactions t
  JOIN stockflow.trx_orders o ON o.order_id = t.reference_id
  WHERE t.tx_type = 'RECEIPT' AND t.reference_type = 'SALES_ORDER' AND o.order_code IS NOT NULL
)
UPDATE stockflow.trx_financial_transactions t
SET tx_code = n.new_code
FROM numbered n
WHERE t.tx_id = n.tx_id
  AND (t.tx_code IS NULL OR t.tx_code ~ '^PT[0-9]+$')
  AND NOT EXISTS (
    SELECT 1 FROM stockflow.trx_financial_transactions x
    WHERE x.tx_code = n.new_code AND x.tx_id <> t.tx_id
  );");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Không hoàn tác: mã cũ (rỗng / PT...) không còn được lưu lại.
        }
    }
}
