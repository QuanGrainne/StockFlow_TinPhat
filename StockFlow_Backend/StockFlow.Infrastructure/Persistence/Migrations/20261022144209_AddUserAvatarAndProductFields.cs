using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockFlow.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddUserAvatarAndProductFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("ALTER TABLE stockflow.sec_users ADD COLUMN IF NOT EXISTS avatar text;");
            migrationBuilder.Sql("ALTER TABLE stockflow.mst_products ADD COLUMN IF NOT EXISTS barcode character varying(50);");
            migrationBuilder.Sql("ALTER TABLE stockflow.mst_products ADD COLUMN IF NOT EXISTS brand character varying(100);");
            migrationBuilder.Sql("ALTER TABLE stockflow.mst_products ADD COLUMN IF NOT EXISTS dimensions character varying(100);");
            migrationBuilder.Sql("ALTER TABLE stockflow.mst_products ADD COLUMN IF NOT EXISTS has_reward_points boolean;");
            migrationBuilder.Sql("ALTER TABLE stockflow.mst_products ADD COLUMN IF NOT EXISTS image_url text;");
            migrationBuilder.Sql("ALTER TABLE stockflow.mst_products ADD COLUMN IF NOT EXISTS is_direct_sale boolean;");
            migrationBuilder.Sql("ALTER TABLE stockflow.mst_products ADD COLUMN IF NOT EXISTS location_name character varying(100);");
            migrationBuilder.Sql("ALTER TABLE stockflow.mst_products ADD COLUMN IF NOT EXISTS max_safe_stock numeric(18,2);");
            migrationBuilder.Sql("ALTER TABLE stockflow.mst_products ADD COLUMN IF NOT EXISTS min_safe_stock numeric(18,2);");
            migrationBuilder.Sql("ALTER TABLE stockflow.mst_products ADD COLUMN IF NOT EXISTS standard_price numeric(18,2);");
            migrationBuilder.Sql("ALTER TABLE stockflow.mst_products ADD COLUMN IF NOT EXISTS variants_json text;");
            migrationBuilder.Sql("ALTER TABLE stockflow.mst_products ADD COLUMN IF NOT EXISTS weight numeric(18,2);");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "avatar",
                schema: "stockflow",
                table: "sec_users");

            migrationBuilder.DropColumn(
                name: "barcode",
                schema: "stockflow",
                table: "mst_products");

            migrationBuilder.DropColumn(
                name: "brand",
                schema: "stockflow",
                table: "mst_products");

            migrationBuilder.DropColumn(
                name: "dimensions",
                schema: "stockflow",
                table: "mst_products");

            migrationBuilder.DropColumn(
                name: "has_reward_points",
                schema: "stockflow",
                table: "mst_products");

            migrationBuilder.DropColumn(
                name: "image_url",
                schema: "stockflow",
                table: "mst_products");

            migrationBuilder.DropColumn(
                name: "is_direct_sale",
                schema: "stockflow",
                table: "mst_products");

            migrationBuilder.DropColumn(
                name: "location_name",
                schema: "stockflow",
                table: "mst_products");

            migrationBuilder.DropColumn(
                name: "max_safe_stock",
                schema: "stockflow",
                table: "mst_products");

            migrationBuilder.DropColumn(
                name: "min_safe_stock",
                schema: "stockflow",
                table: "mst_products");

            migrationBuilder.DropColumn(
                name: "standard_price",
                schema: "stockflow",
                table: "mst_products");

            migrationBuilder.DropColumn(
                name: "variants_json",
                schema: "stockflow",
                table: "mst_products");

            migrationBuilder.DropColumn(
                name: "weight",
                schema: "stockflow",
                table: "mst_products");
        }
    }
}
