using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockFlow.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCustomerDebtAdjustSequence : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Mã phiếu điều chỉnh công nợ khách hàng CB000001... (chạy lại vẫn an toàn)
            migrationBuilder.Sql("CREATE SEQUENCE IF NOT EXISTS stockflow.seq_customer_debt_adjust START 1;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP SEQUENCE IF EXISTS stockflow.seq_customer_debt_adjust;");
        }
    }
}
