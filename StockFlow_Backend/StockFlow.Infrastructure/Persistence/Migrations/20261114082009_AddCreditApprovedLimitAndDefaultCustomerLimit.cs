using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockFlow.Infrastructure.Persistence.Migrations
{
    /// <summary>
    /// HM-01 (quyết định ngày 14/11/2026):
    /// 1. trx_credit_limit_requests.approved_limit: mức Kế toán trưởng duyệt (sửa được, khác số Sales đề xuất).
    /// 2. Khách hàng cũ đang có hạn mức 0 / null được nâng lên mặc định 200.000.000 đ
    ///    (trừ Khách lẻ KH00000; nhà cung cấp không đổi). Khách mới lấy mặc định ở CreateCustomerCommand.
    /// SQL idempotent như các migration trước.
    /// </summary>
    public partial class AddCreditApprovedLimitAndDefaultCustomerLimit : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
ALTER TABLE stockflow.trx_credit_limit_requests ADD COLUMN IF NOT EXISTS approved_limit numeric(18,2) NULL;

UPDATE stockflow.mst_business_partners
SET credit_limit = 200000000
WHERE upper(coalesce(partner_type, '')) IN ('CUSTOMER', 'BOTH')
  AND coalesce(partner_code, '') <> 'KH00000'
  AND coalesce(credit_limit, 0) = 0;
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Không hoàn tác hạn mức khách hàng (không phân biệt được khách nào được nâng bởi migration này).
            migrationBuilder.Sql(@"
ALTER TABLE stockflow.trx_credit_limit_requests DROP COLUMN IF EXISTS approved_limit;
");
        }
    }
}
