using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockFlow.Infrastructure.Persistence.Migrations
{
    /// <summary>
    /// Thiết lập bảng giá:
    /// 1. mst_price_books.scope_customer_ids: phạm vi "Khách hàng cụ thể" (JSON PartnerId), thay cho nhóm khách hàng
    ///    (hệ thống không có nhóm khách). Bảng giá cũ đang chọn nhóm khách / người tạo giao dịch cụ thể
    ///    được đưa về "Tất cả" vì hai phạm vi này đã bỏ.
    /// 2. Sequence mã bảng giá BG000001... (trước đây đếm số bảng giá + 1: xóa rồi tạo lại sẽ trùng mã),
    ///    bắt đầu nối tiếp số lớn nhất đang có.
    /// SQL idempotent như các migration trước.
    /// </summary>
    public partial class PriceBookCustomerScopeAndCodeSequence : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
ALTER TABLE stockflow.mst_price_books ADD COLUMN IF NOT EXISTS scope_customer_ids text NULL;

UPDATE stockflow.mst_price_books
SET scope_customer_type = 'ALL', scope_customer_group_codes = NULL
WHERE scope_customer_type = 'SPECIFIC' AND scope_customer_ids IS NULL;

UPDATE stockflow.mst_price_books
SET scope_user_type = 'ALL', scope_user_ids = NULL
WHERE scope_user_type <> 'ALL' OR scope_user_ids IS NOT NULL;

CREATE SEQUENCE IF NOT EXISTS stockflow.seq_price_book_code START 1;
SELECT setval('stockflow.seq_price_book_code',
    GREATEST(
        (SELECT COALESCE(MAX(substring(price_book_code FROM '^BG([0-9]+)$')::bigint), 0) FROM stockflow.mst_price_books),
        (SELECT last_value FROM stockflow.seq_price_book_code),
        1),
    true);
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
DROP SEQUENCE IF EXISTS stockflow.seq_price_book_code;
ALTER TABLE stockflow.mst_price_books DROP COLUMN IF EXISTS scope_customer_ids;
");
        }
    }
}
