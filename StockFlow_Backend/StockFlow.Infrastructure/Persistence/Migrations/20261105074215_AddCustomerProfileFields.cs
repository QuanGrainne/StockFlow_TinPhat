using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockFlow.Infrastructure.Persistence.Migrations
{
    /// <summary>
    /// Hồ sơ khách hàng (dùng chung bảng đối tác): điện thoại 2, giới tính, sinh nhật, Facebook, ghi chú, chi nhánh tạo.
    /// Viết idempotent (IF NOT EXISTS) vì DB của các thành viên có thể đã lệch nhau.
    /// </summary>
    public partial class AddCustomerProfileFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
ALTER TABLE stockflow.mst_business_partners ADD COLUMN IF NOT EXISTS phone2 character varying(20) NULL;
ALTER TABLE stockflow.mst_business_partners ADD COLUMN IF NOT EXISTS gender character varying(10) NULL;
ALTER TABLE stockflow.mst_business_partners ADD COLUMN IF NOT EXISTS birth_date timestamp without time zone NULL;
ALTER TABLE stockflow.mst_business_partners ADD COLUMN IF NOT EXISTS facebook character varying(255) NULL;
ALTER TABLE stockflow.mst_business_partners ADD COLUMN IF NOT EXISTS notes character varying(500) NULL;
ALTER TABLE stockflow.mst_business_partners ADD COLUMN IF NOT EXISTS created_warehouse_id integer NULL;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
ALTER TABLE stockflow.mst_business_partners DROP COLUMN IF EXISTS phone2;
ALTER TABLE stockflow.mst_business_partners DROP COLUMN IF EXISTS gender;
ALTER TABLE stockflow.mst_business_partners DROP COLUMN IF EXISTS birth_date;
ALTER TABLE stockflow.mst_business_partners DROP COLUMN IF EXISTS facebook;
ALTER TABLE stockflow.mst_business_partners DROP COLUMN IF EXISTS notes;
ALTER TABLE stockflow.mst_business_partners DROP COLUMN IF EXISTS created_warehouse_id;");
        }
    }
}
