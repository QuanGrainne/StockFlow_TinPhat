using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockFlow.Infrastructure.Persistence.Migrations
{
    /// <summary>
    /// Phiếu thu của khách không còn tự sinh ghi chú (ô Ghi chú chỉ chứa nội dung người dùng nhập).
    /// Xóa các ghi chú hệ thống đã sinh trước đây. Idempotent.
    /// </summary>
    public partial class ClearAutoReceiptNotes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
UPDATE stockflow.trx_financial_transactions
SET description = NULL
WHERE tx_type = 'RECEIPT'
  AND (description LIKE 'Thu tiền bán hàng hóa đơn POS %'
       OR description LIKE 'Phiếu thu PT% thu nợ khách hàng %'
       OR description LIKE 'Thu nợ hóa đơn % của khách hàng %');");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Không hoàn tác: ghi chú tự sinh không cần khôi phục.
        }
    }
}
