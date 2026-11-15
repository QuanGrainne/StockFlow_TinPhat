using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockFlow.Infrastructure.Persistence.Migrations
{
    /// <summary>
    /// Sequence sinh mã kế hoạch sản xuất KHSX00001... (UC-PP-02, khoảng trống G6 ở specs/production-planning-analysis/07).
    /// Chỉ thêm sequence, không đổi model EF. Chạy lại vẫn an toàn.
    /// </summary>
    public partial class AddProductionPlanCodeSequence : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("CREATE SEQUENCE IF NOT EXISTS stockflow.seq_production_plan_code START 1;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP SEQUENCE IF EXISTS stockflow.seq_production_plan_code;");
        }
    }
}
