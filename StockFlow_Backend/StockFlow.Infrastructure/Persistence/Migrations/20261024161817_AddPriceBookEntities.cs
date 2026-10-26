using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace StockFlow.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPriceBookEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "mst_price_books",
                schema: "stockflow",
                columns: table => new
                {
                    price_book_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    price_book_code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    price_book_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    effective_from = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    effective_to = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    is_default = table.Column<bool>(type: "boolean", nullable: false),
                    formula_base_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    formula_base_price_book_id = table.Column<int>(type: "integer", nullable: true),
                    formula_operator = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    formula_value = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    formula_unit = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    allow_unlisted_products = table.Column<bool>(type: "boolean", nullable: false),
                    warn_unlisted_products = table.Column<bool>(type: "boolean", nullable: false),
                    scope_branch_type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    scope_warehouse_ids = table.Column<string>(type: "text", nullable: true),
                    scope_customer_type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    scope_customer_group_codes = table.Column<string>(type: "text", nullable: true),
                    scope_user_type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    scope_user_ids = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("mst_price_books_pkey", x => x.price_book_id);
                    table.ForeignKey(
                        name: "fk_mst_price_books_base_price_book_id",
                        column: x => x.formula_base_price_book_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_price_books",
                        principalColumn: "price_book_id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "dtl_price_book_items",
                schema: "stockflow",
                columns: table => new
                {
                    price_book_item_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    price_book_id = table.Column<int>(type: "integer", nullable: false),
                    product_id = table.Column<int>(type: "integer", nullable: false),
                    price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("dtl_price_book_items_pkey", x => x.price_book_item_id);
                    table.ForeignKey(
                        name: "fk_dtl_price_book_items_price_book_id",
                        column: x => x.price_book_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_price_books",
                        principalColumn: "price_book_id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_dtl_price_book_items_product_id",
                        column: x => x.product_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_products",
                        principalColumn: "product_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_dtl_price_book_items_product_id",
                schema: "stockflow",
                table: "dtl_price_book_items",
                column: "product_id");

            migrationBuilder.CreateIndex(
                name: "uq_dtl_price_book_items_book_product",
                schema: "stockflow",
                table: "dtl_price_book_items",
                columns: new[] { "price_book_id", "product_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_mst_price_books_formula_base_price_book_id",
                schema: "stockflow",
                table: "mst_price_books",
                column: "formula_base_price_book_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "dtl_price_book_items",
                schema: "stockflow");

            migrationBuilder.DropTable(
                name: "mst_price_books",
                schema: "stockflow");
        }
    }
}
