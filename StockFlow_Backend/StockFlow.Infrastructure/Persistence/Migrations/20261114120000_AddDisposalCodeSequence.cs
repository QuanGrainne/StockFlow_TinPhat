using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockFlow.Infrastructure.Persistence.Migrations
{
    /// <summary>
    /// Sequence sinh mã phiếu xuất hủy XH000001... (bảng trx_inventory_disposals đã có từ InitialDatabase).
    /// Chỉ thêm sequence, không đổi model EF nên không cần cập nhật ModelSnapshot. Chạy lại vẫn an toàn.
    /// </summary>
    [DbContext(typeof(StockFlowDbContext))]
    [Migration("20261114120000_AddDisposalCodeSequence")]
    public partial class AddDisposalCodeSequence : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("CREATE SEQUENCE IF NOT EXISTS stockflow.seq_disposal_code START 1;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP SEQUENCE IF EXISTS stockflow.seq_disposal_code;");
        }
    }
}
