using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockFlow.Infrastructure.Persistence.Migrations
{
    /// <summary>
    /// Sequence sinh mã cho bán hàng POS và khách hàng — trước đây không có trong migration nào
    /// (chỉ tạo tay trên một số máy) nên POS báo lỗi 500 "seq_pos_order_code does not exist".
    /// Idempotent: chỉ tạo khi chưa có; số bắt đầu = số lớn nhất của mã đang có + 1 để không trùng mã.
    /// </summary>
    public partial class AddPosSequences : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
DO $$
DECLARE next_val bigint;
BEGIN
  IF to_regclass('stockflow.seq_pos_order_code') IS NULL THEN
    SELECT COALESCE(MAX(NULLIF(regexp_replace(order_code, '\D', '', 'g'), '')::bigint), 0) + 1 INTO next_val
    FROM stockflow.trx_orders WHERE order_code ~ '^[A-Za-z]*[0-9]+$';
    EXECUTE format('CREATE SEQUENCE stockflow.seq_pos_order_code START WITH %s', next_val);
  END IF;

  IF to_regclass('stockflow.seq_stock_issue_code') IS NULL THEN
    SELECT COALESCE(MAX(NULLIF(regexp_replace(issue_code, '\D', '', 'g'), '')::bigint), 0) + 1 INTO next_val
    FROM stockflow.trx_stock_issues WHERE issue_code ~ '^[A-Za-z]*[0-9]+$';
    EXECUTE format('CREATE SEQUENCE stockflow.seq_stock_issue_code START WITH %s', next_val);
  END IF;

  IF to_regclass('stockflow.seq_customer_code') IS NULL THEN
    SELECT COALESCE(MAX(NULLIF(regexp_replace(partner_code, '\D', '', 'g'), '')::bigint), 0) + 1 INTO next_val
    FROM stockflow.mst_business_partners WHERE partner_code ~ '^KH[0-9]+$';
    EXECUTE format('CREATE SEQUENCE stockflow.seq_customer_code START WITH %s', next_val);
  END IF;
END $$;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Không xóa sequence: có thể đã tồn tại trước migration này trên một số máy và đang được dùng để sinh mã.
        }
    }
}
