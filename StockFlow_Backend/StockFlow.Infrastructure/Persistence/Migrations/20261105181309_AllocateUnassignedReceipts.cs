using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockFlow.Infrastructure.Persistence.Migrations
{
    /// <summary>
    /// Phiếu thu nợ khách có phần "chưa phân bổ" (mã PT...) đã trừ vào nợ khách nhưng không trừ vào hóa đơn còn nợ
    /// → sổ công nợ = 0 trong khi hóa đơn vẫn ghi còn nợ. Gắn các phiếu PT đó vào hóa đơn còn nợ cũ nhất của khách
    /// (đổi mã thành TTHD...-n, cập nhật Đã trả / Còn nợ / trạng thái hóa đơn). Chỉ xử lý khi số tiền phiếu
    /// không vượt quá số còn nợ của hóa đơn; chạy lại không đổi gì thêm.
    /// </summary>
    public partial class AllocateUnassignedReceipts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
DO $$
DECLARE
  r record;
  o record;
  n int;
  new_code text;
BEGIN
  FOR r IN
    SELECT tx_id, partner_id, amount
    FROM stockflow.trx_financial_transactions
    WHERE tx_type = 'RECEIPT' AND reference_type IS NULL
      AND coalesce(status, 'COMPLETED') <> 'CANCELLED' AND tx_code ~ '^PT[0-9]+$'
    ORDER BY tx_id
  LOOP
    SELECT order_id, order_code, outstanding_amount INTO o
    FROM stockflow.trx_orders
    WHERE partner_id = r.partner_id AND upper(coalesce(status, '')) = 'COMPLETED'
      AND coalesce(outstanding_amount, 0) >= r.amount AND coalesce(outstanding_amount, 0) > 0
    ORDER BY order_date, order_id
    LIMIT 1;

    IF NOT FOUND THEN CONTINUE; END IF;

    SELECT count(*) INTO n FROM stockflow.trx_financial_transactions
    WHERE tx_type = 'RECEIPT' AND reference_type = 'SALES_ORDER' AND reference_id = o.order_id;
    new_code := 'TT' || o.order_code || CASE WHEN n = 0 THEN '' ELSE '-' || n END;
    WHILE EXISTS (SELECT 1 FROM stockflow.trx_financial_transactions WHERE tx_code = new_code) LOOP
      n := n + 1;
      new_code := 'TT' || o.order_code || '-' || n;
    END LOOP;

    UPDATE stockflow.trx_financial_transactions
    SET reference_type = 'SALES_ORDER', reference_id = o.order_id, tx_code = new_code
    WHERE tx_id = r.tx_id;

    UPDATE stockflow.trx_orders
    SET paid_amount = coalesce(paid_amount, 0) + r.amount,
        outstanding_amount = greatest(0, coalesce(outstanding_amount, 0) - r.amount),
        payment_status = CASE WHEN coalesce(outstanding_amount, 0) - r.amount > 0 THEN 'PARTIAL' ELSE 'PAID' END
    WHERE order_id = o.order_id;

  END LOOP;
END $$;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Không hoàn tác.
        }
    }
}
