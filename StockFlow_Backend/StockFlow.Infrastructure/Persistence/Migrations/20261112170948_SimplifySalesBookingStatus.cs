using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockFlow.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class SimplifySalesBookingStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Đơn đặt hàng bán chỉ còn Phiếu tạm → Hoàn thành / Đã hủy (mỗi đơn ra đúng 1 hóa đơn):
            // Đã xác nhận → Phiếu tạm; Đang giao hàng (đã có hóa đơn) → Hoàn thành. Chạy lại nhiều lần vẫn an toàn.
            migrationBuilder.Sql(@"
UPDATE stockflow.trx_orders SET status = 'DRAFT' WHERE order_type = 'BOOKING' AND status = 'CONFIRMED';
UPDATE stockflow.trx_orders SET status = 'FINISHED' WHERE order_type = 'BOOKING' AND status = 'DELIVERING';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Không khôi phục được trạng thái cũ (dữ liệu đã gộp)
        }
    }
}
