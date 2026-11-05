using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockFlow.Infrastructure.Persistence.Migrations
{
    /// <summary>
    /// Bán hàng POS trước đây lưu giờ UTC (DateTime.UtcNow) cho hóa đơn, phiếu xuất và phiếu thu lúc bán,
    /// trong khi toàn hệ thống lưu giờ Việt Nam → hóa đơn hiển thị chậm 7 tiếng.
    /// Thẻ kho của cùng phiếu xuất đã lưu đúng giờ Việt Nam, nên chỉ sửa các hóa đơn có
    /// giờ thẻ kho = giờ hóa đơn + 7 tiếng (nhận diện chính xác, chạy lại không đổi gì thêm).
    /// </summary>
    public partial class FixPosOrderUtcDates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
DROP TABLE IF EXISTS tmp_pos_utc_orders;
CREATE TEMP TABLE tmp_pos_utc_orders AS
SELECT DISTINCT o.order_id, o.order_date AS old_date
FROM stockflow.trx_orders o
JOIN stockflow.trx_stock_issues si ON si.sales_order_id = o.order_id
JOIN stockflow.trx_inventory_transactions it
  ON it.reference_type = 'STOCK_ISSUE' AND it.reference_id = si.stock_issue_id
WHERE o.order_date IS NOT NULL
  AND date_trunc('second', it.transaction_date) = date_trunc('second', o.order_date + interval '7 hours');

-- Phiếu thu lúc bán (cùng thời điểm hóa đơn, lệch < 1 phút)
UPDATE stockflow.trx_financial_transactions t
SET transaction_date = t.transaction_date + interval '7 hours'
FROM tmp_pos_utc_orders x
WHERE t.tx_type = 'RECEIPT' AND t.reference_type = 'SALES_ORDER' AND t.reference_id = x.order_id
  AND t.transaction_date IS NOT NULL
  AND abs(extract(epoch FROM (t.transaction_date - x.old_date))) < 60;

-- Phiếu xuất kho bán hàng
UPDATE stockflow.trx_stock_issues si
SET requested_date = CASE WHEN si.requested_date = x.old_date THEN si.requested_date + interval '7 hours' ELSE si.requested_date END,
    processed_date = CASE WHEN si.processed_date = x.old_date THEN si.processed_date + interval '7 hours' ELSE si.processed_date END
FROM tmp_pos_utc_orders x
WHERE si.sales_order_id = x.order_id;

-- Hóa đơn
UPDATE stockflow.trx_orders o
SET order_date = o.order_date + interval '7 hours'
FROM tmp_pos_utc_orders x
WHERE o.order_id = x.order_id AND o.order_date = x.old_date;

DROP TABLE tmp_pos_utc_orders;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Không hoàn tác: dữ liệu giờ UTC cũ là sai.
        }
    }
}
