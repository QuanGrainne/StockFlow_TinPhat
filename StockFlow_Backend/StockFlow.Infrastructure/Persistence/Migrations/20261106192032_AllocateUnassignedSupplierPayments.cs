using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockFlow.Infrastructure.Persistence.Migrations
{
    /// <summary>
    /// Phiếu chi có phần "chưa phân bổ" đã trừ vào nợ NCC nhưng không trừ vào phiếu nhập còn nợ
    /// → tổng nợ NCC nhỏ hơn tổng "Cần trả" của các phiếu nhập. Gắn các dòng đó vào phiếu nhập còn nợ cũ nhất
    /// (giữ nguyên mã phiếu chi). Chỉ xử lý khi số tiền không vượt quá số còn nợ của phiếu; chạy lại không đổi gì thêm.
    /// </summary>
    public partial class AllocateUnassignedSupplierPayments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
DO $$
DECLARE
  r record;
  target_gr int;
BEGIN
  FOR r IN
    SELECT tx_id, partner_id, amount
    FROM stockflow.trx_financial_transactions
    WHERE tx_type = 'SUPPLIER_PAYMENT' AND reference_type IS NULL
      AND coalesce(status, 'COMPLETED') <> 'CANCELLED'
    ORDER BY tx_id
  LOOP
    SELECT x.gr_id INTO target_gr
    FROM (
      SELECT g.gr_id, g.received_date,
             round((SELECT coalesce(sum(coalesce(i.accepted_qty, i.received_qty, i.ordered_qty, 0) * coalesce(i.unit_landed_cost, 0)), 0)
                    FROM stockflow.dtl_goods_receipt_items i WHERE i.gr_id = g.gr_id))
             - (SELECT coalesce(sum(t.amount), 0)
                FROM stockflow.trx_financial_transactions t
                WHERE t.tx_type = 'SUPPLIER_PAYMENT' AND coalesce(t.status, 'COMPLETED') <> 'CANCELLED'
                  AND t.reference_type = 'GOODS_RECEIPT' AND t.reference_id = g.gr_id)
             - (SELECT coalesce(sum(greatest(0, coalesce(p.total_amount, 0) - coalesce(p.refund_amount, 0))), 0)
                FROM stockflow.trx_purchase_returns p
                WHERE p.gr_id = g.gr_id AND p.status = 'COMPLETED') AS remaining
      FROM stockflow.trx_goods_receipts g
      WHERE g.partner_id = r.partner_id AND g.status = 'COMPLETED'
    ) x
    WHERE x.remaining >= r.amount
    ORDER BY x.received_date, x.gr_id
    LIMIT 1;

    IF NOT FOUND THEN CONTINUE; END IF;

    UPDATE stockflow.trx_financial_transactions
    SET reference_type = 'GOODS_RECEIPT', reference_id = target_gr
    WHERE tx_id = r.tx_id;
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
