using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockFlow.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPurchaseDiscounts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Lưu đơn giá gốc + % giảm từng dòng và giảm giá toàn phiếu nhập.
            // UnitLandedCost vẫn là giá vốn thực (đã trừ cả giảm giá dòng và phần phân bổ giảm giá phiếu).
            migrationBuilder.Sql(@"
ALTER TABLE stockflow.dtl_goods_receipt_items ADD COLUMN IF NOT EXISTS unit_price numeric(18,4) NULL;
ALTER TABLE stockflow.dtl_goods_receipt_items ADD COLUMN IF NOT EXISTS discount_percent numeric(9,4) NULL;
ALTER TABLE stockflow.trx_goods_receipts ADD COLUMN IF NOT EXISTS discount_amount numeric(18,2) NULL;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
ALTER TABLE stockflow.dtl_goods_receipt_items DROP COLUMN IF EXISTS unit_price;
ALTER TABLE stockflow.dtl_goods_receipt_items DROP COLUMN IF EXISTS discount_percent;
ALTER TABLE stockflow.trx_goods_receipts DROP COLUMN IF EXISTS discount_amount;");
        }
    }
}
