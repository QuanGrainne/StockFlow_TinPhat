using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockFlow.Infrastructure.Persistence.Migrations
{
    /// <summary>
    /// HM-01 (UC-27, UC-64): thêm 2 cột cho trx_credit_limit_requests –
    /// request_code (mã yêu cầu YCHM00001 cho {code} trong thông báo) và approval_type (ONE_TIME / NEW_LIMIT),
    /// chỉ mục duy nhất cho request_code và sequence sinh mã. Viết bằng SQL idempotent (IF NOT EXISTS)
    /// như AddProductionFlow vì DB của các thành viên có thể khác nhau.
    /// </summary>
    public partial class AddCreditRequestCodeAndType : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
ALTER TABLE stockflow.trx_credit_limit_requests ADD COLUMN IF NOT EXISTS request_code character varying(30) NULL;
ALTER TABLE stockflow.trx_credit_limit_requests ADD COLUMN IF NOT EXISTS approval_type character varying(20) NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_trx_credit_limit_requests_request_code
    ON stockflow.trx_credit_limit_requests (request_code);

-- Mã yêu cầu duyệt hạn mức YCHM00001... (TransactionCodeGenerator, loại CREDIT_REQUEST)
CREATE SEQUENCE IF NOT EXISTS stockflow.seq_credit_request_code START 1;
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
DROP SEQUENCE IF EXISTS stockflow.seq_credit_request_code;
DROP INDEX IF EXISTS stockflow.uq_trx_credit_limit_requests_request_code;
ALTER TABLE stockflow.trx_credit_limit_requests DROP COLUMN IF EXISTS approval_type;
ALTER TABLE stockflow.trx_credit_limit_requests DROP COLUMN IF EXISTS request_code;
");
        }
    }
}
