using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace StockFlow.Infrastructure.Persistence.Migrations
{
    /// <summary>
    /// Mô hình dữ liệu BOM / định mức NVL (docs/spec-bom-dinh-muc-nvl.md mục 3).
    /// UC-57, UC-58/59, UC-45, UC-46, UC-49. Chỉ đổi cấu trúc và chuyển dữ liệu, chưa có nghiệp vụ.
    ///
    /// Thứ tự trong Up: (0) kiểm tra dữ liệu cũ, (1) BOM, (2) BOM item, (3) bảng dòng thành phẩm mới
    /// và chuyển dữ liệu từ lệnh cũ, (4) nhu cầu NVL, (5) bỏ cột thành phẩm khỏi đầu lệnh, (6) dòng phiếu xuất.
    /// Migration không xoá và không tự sửa dữ liệu sai; gặp dữ liệu không hợp lệ thì dừng kèm thông báo.
    /// </summary>
    public partial class BomMaterialNormMultiProduct : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ===== 0. Kiểm tra dữ liệu cũ: dừng sớm, rõ ràng, thay vì để ràng buộc mới báo lỗi khó hiểu =====
            migrationBuilder.Sql(@"
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM stockflow.dtl_bom_items WHERE quantity IS NULL OR quantity <= 0) THEN
        RAISE EXCEPTION 'dtl_bom_items có dòng định mức NULL hoặc <= 0. Sửa dữ liệu rồi chạy lại migration.';
    END IF;
    IF EXISTS (SELECT 1 FROM stockflow.dtl_bom_items WHERE wastage_rate < 0 OR wastage_rate > 100) THEN
        RAISE EXCEPTION 'dtl_bom_items có tỷ lệ hao hụt ngoài khoảng 0-100. Sửa dữ liệu rồi chạy lại migration.';
    END IF;
    IF EXISTS (SELECT 1 FROM stockflow.dtl_bom_items GROUP BY bom_id, material_id HAVING COUNT(*) > 1) THEN
        RAISE EXCEPTION 'dtl_bom_items có hai dòng cùng (bom_id, material_id). Gộp hoặc xoá dòng trùng rồi chạy lại migration.';
    END IF;
    IF EXISTS (SELECT 1 FROM stockflow.trx_production_orders WHERE planned_quantity IS NULL OR planned_quantity <= 0) THEN
        RAISE EXCEPTION 'trx_production_orders có planned_quantity NULL hoặc <= 0, không chuyển được sang dòng thành phẩm.';
    END IF;
    IF EXISTS (SELECT 1 FROM stockflow.trx_production_material_requirements
               WHERE required_qty < 0 OR issued_qty < 0 OR shortage_qty < 0) THEN
        RAISE EXCEPTION 'trx_production_material_requirements có số lượng âm. Sửa dữ liệu rồi chạy lại migration.';
    END IF;
END $$;");

            // ===== 1. mst_boms: status, effective_date, description + tối đa một bản Active mỗi thành phẩm (BR-30) =====
            migrationBuilder.AddColumn<string>(
                name: "description",
                schema: "stockflow",
                table: "mst_boms",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "effective_date",
                schema: "stockflow",
                table: "mst_boms",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "status",
                schema: "stockflow",
                table: "mst_boms",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Draft");

            // is_active cũ -> status. Nếu một thành phẩm có nhiều bản đang bật, giữ bản bom_id lớn nhất,
            // các bản còn lại chuyển Inactive (không xoá dòng nào) để unique index bên dưới tạo được.
            migrationBuilder.Sql(@"
UPDATE stockflow.mst_boms
SET status = CASE WHEN is_active IS TRUE THEN 'Active' ELSE 'Inactive' END;

UPDATE stockflow.mst_boms b
SET status = 'Inactive', is_active = FALSE
WHERE b.status = 'Active'
  AND EXISTS (SELECT 1 FROM stockflow.mst_boms o
              WHERE o.product_id = b.product_id AND o.status = 'Active' AND o.bom_id > b.bom_id);");

            migrationBuilder.DropIndex(
                name: "IX_mst_boms_product_id",
                schema: "stockflow",
                table: "mst_boms");

            migrationBuilder.CreateIndex(
                name: "uq_mst_boms_one_active_per_product",
                schema: "stockflow",
                table: "mst_boms",
                column: "product_id",
                unique: true,
                filter: "status = 'Active'");

            migrationBuilder.AddCheckConstraint(
                name: "ck_mst_boms_status",
                schema: "stockflow",
                table: "mst_boms",
                sql: "status IN ('Draft', 'Active', 'Inactive')");

            // ===== 2. dtl_bom_items: DECIMAL(18,6) > 0, hao hụt DECIMAL(7,4) 0-100, duy nhất (bom_id, material_id) =====
            migrationBuilder.Sql("UPDATE stockflow.dtl_bom_items SET wastage_rate = 0 WHERE wastage_rate IS NULL;");

            migrationBuilder.AlterColumn<decimal>(
                name: "quantity",
                schema: "stockflow",
                table: "dtl_bom_items",
                type: "numeric(18,6)",
                precision: 18,
                scale: 6,
                nullable: false,
                defaultValue: 0m,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,4)",
                oldPrecision: 18,
                oldScale: 4,
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "wastage_rate",
                schema: "stockflow",
                table: "dtl_bom_items",
                type: "numeric(7,4)",
                precision: 7,
                scale: 4,
                nullable: false,
                defaultValue: 0m,
                oldClrType: typeof(decimal),
                oldType: "numeric(5,2)",
                oldPrecision: 5,
                oldScale: 2,
                oldNullable: true);

            // Chỉ mục duy nhất (bom_id, material_id) đã phủ truy vấn theo bom_id nên bỏ chỉ mục đơn cũ.
            migrationBuilder.DropIndex(
                name: "IX_dtl_bom_items_bom_id",
                schema: "stockflow",
                table: "dtl_bom_items");

            migrationBuilder.CreateIndex(
                name: "uq_dtl_bom_items_bom_material",
                schema: "stockflow",
                table: "dtl_bom_items",
                columns: new[] { "bom_id", "material_id" },
                unique: true);

            migrationBuilder.AddCheckConstraint(
                name: "ck_dtl_bom_items_quantity",
                schema: "stockflow",
                table: "dtl_bom_items",
                sql: "quantity > 0");

            migrationBuilder.AddCheckConstraint(
                name: "ck_dtl_bom_items_wastage_rate",
                schema: "stockflow",
                table: "dtl_bom_items",
                sql: "wastage_rate >= 0 AND wastage_rate <= 100");

            // ===== 3. trx_production_order_items (mới) + chuyển dữ liệu từ lệnh cũ (một thành phẩm / lệnh) =====
            migrationBuilder.CreateTable(
                name: "trx_production_order_items",
                schema: "stockflow",
                columns: table => new
                {
                    production_order_item_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    production_order_id = table.Column<int>(type: "integer", nullable: false),
                    product_id = table.Column<int>(type: "integer", nullable: false),
                    bom_id = table.Column<int>(type: "integer", nullable: false),
                    planned_qty = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false),
                    received_qty = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false, defaultValue: 0m),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "Not Started")
                },
                constraints: table =>
                {
                    table.PrimaryKey("trx_production_order_items_pkey", x => x.production_order_item_id);
                    table.CheckConstraint("ck_trx_production_order_items_qty", "planned_qty > 0 AND received_qty >= 0");
                    table.ForeignKey(
                        name: "fk_trx_production_order_items_bom_id",
                        column: x => x.bom_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_boms",
                        principalColumn: "bom_id");
                    table.ForeignKey(
                        name: "fk_trx_production_order_items_product_id",
                        column: x => x.product_id,
                        principalSchema: "stockflow",
                        principalTable: "mst_products",
                        principalColumn: "product_id");
                    table.ForeignKey(
                        name: "fk_trx_production_order_items_production_order_id",
                        column: x => x.production_order_id,
                        principalSchema: "stockflow",
                        principalTable: "trx_production_orders",
                        principalColumn: "production_order_id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_trx_production_order_items_bom_id",
                schema: "stockflow",
                table: "trx_production_order_items",
                column: "bom_id");

            migrationBuilder.CreateIndex(
                name: "ix_trx_production_order_items_order_id",
                schema: "stockflow",
                table: "trx_production_order_items",
                column: "production_order_id");

            migrationBuilder.CreateIndex(
                name: "IX_trx_production_order_items_product_id",
                schema: "stockflow",
                table: "trx_production_order_items",
                column: "product_id");

            // Mỗi lệnh cũ -> đúng một dòng thành phẩm. [GIẢ ĐỊNH] received_qty lấy từ actual_quantity;
            // trạng thái dòng suy từ trạng thái lệnh cũ, giá trị lạ về 'Not Started'.
            migrationBuilder.Sql(@"
INSERT INTO stockflow.trx_production_order_items
    (production_order_id, product_id, bom_id, planned_qty, received_qty, status)
SELECT o.production_order_id, o.product_id, o.bom_id, o.planned_quantity,
       COALESCE(o.actual_quantity, 0),
       CASE UPPER(REPLACE(COALESCE(o.status, ''), ' ', '_'))
            WHEN 'COMPLETED'   THEN 'Completed'
            WHEN 'IN_PROGRESS' THEN 'In Progress'
            ELSE 'Not Started' END
FROM stockflow.trx_production_orders o
WHERE NOT EXISTS (SELECT 1 FROM stockflow.trx_production_order_items i
                  WHERE i.production_order_id = o.production_order_id);");

            // ===== 4. trx_production_material_requirements: gắn vào dòng thành phẩm + cột snapshot =====
            migrationBuilder.DropForeignKey(
                name: "fk_trx_production_material_requirements_production_order_id",
                schema: "stockflow",
                table: "trx_production_material_requirements");

            migrationBuilder.Sql(@"
UPDATE stockflow.trx_production_material_requirements SET required_qty = 0 WHERE required_qty IS NULL;
UPDATE stockflow.trx_production_material_requirements SET issued_qty = 0 WHERE issued_qty IS NULL;
UPDATE stockflow.trx_production_material_requirements SET shortage_qty = 0 WHERE shortage_qty IS NULL;");

            migrationBuilder.AlterColumn<decimal>(
                name: "required_qty",
                schema: "stockflow",
                table: "trx_production_material_requirements",
                type: "numeric(18,6)",
                precision: 18,
                scale: 6,
                nullable: false,
                defaultValue: 0m,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,2)",
                oldPrecision: 18,
                oldScale: 2,
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "issued_qty",
                schema: "stockflow",
                table: "trx_production_material_requirements",
                type: "numeric(18,6)",
                precision: 18,
                scale: 6,
                nullable: false,
                defaultValue: 0m,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,2)",
                oldPrecision: 18,
                oldScale: 2,
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "shortage_qty",
                schema: "stockflow",
                table: "trx_production_material_requirements",
                type: "numeric(18,6)",
                precision: 18,
                scale: 6,
                nullable: false,
                defaultValue: 0m,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,2)",
                oldPrecision: 18,
                oldScale: 2,
                oldNullable: true);

            migrationBuilder.AddColumn<int>(
                name: "production_order_item_id",
                schema: "stockflow",
                table: "trx_production_material_requirements",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "source_bom_item_id",
                schema: "stockflow",
                table: "trx_production_material_requirements",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "norm_per_unit",
                schema: "stockflow",
                table: "trx_production_material_requirements",
                type: "numeric(18,6)",
                precision: 18,
                scale: 6,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "wastage_rate",
                schema: "stockflow",
                table: "trx_production_material_requirements",
                type: "numeric(7,4)",
                precision: 7,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<bool>(
                name: "is_adjusted",
                schema: "stockflow",
                table: "trx_production_material_requirements",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "adjust_reason",
                schema: "stockflow",
                table: "trx_production_material_requirements",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "adjusted_by",
                schema: "stockflow",
                table: "trx_production_material_requirements",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "adjusted_at",
                schema: "stockflow",
                table: "trx_production_material_requirements",
                type: "timestamp without time zone",
                nullable: true);

            // Nối nhu cầu cũ vào dòng thành phẩm vừa tạo (mỗi lệnh cũ chỉ có đúng một dòng).
            migrationBuilder.Sql(@"
UPDATE stockflow.trx_production_material_requirements r
SET production_order_item_id = i.production_order_item_id
FROM stockflow.trx_production_order_items i
WHERE i.production_order_id = r.production_order_id;

-- Snapshot định mức: ưu tiên lấy từ dòng BOM cùng NVL; không có thì suy ngược required/planned
-- và coi là dòng thêm tay (source_bom_item_id = NULL).
UPDATE stockflow.trx_production_material_requirements r
SET source_bom_item_id = bi.bom_item_id,
    norm_per_unit      = bi.quantity,
    wastage_rate       = bi.wastage_rate
FROM stockflow.trx_production_order_items i
JOIN stockflow.dtl_bom_items bi ON bi.bom_id = i.bom_id
WHERE r.production_order_item_id = i.production_order_item_id
  AND bi.material_id = r.material_id;

UPDATE stockflow.trx_production_material_requirements r
SET norm_per_unit = ROUND(r.required_qty / i.planned_qty, 6)
FROM stockflow.trx_production_order_items i
WHERE r.production_order_item_id = i.production_order_item_id
  AND r.source_bom_item_id IS NULL
  AND i.planned_qty > 0;");

            migrationBuilder.AlterColumn<int>(
                name: "production_order_item_id",
                schema: "stockflow",
                table: "trx_production_material_requirements",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            // Bỏ cột cũ (kéo theo chỉ mục IX_..._production_order_id)
            migrationBuilder.DropColumn(
                name: "production_order_id",
                schema: "stockflow",
                table: "trx_production_material_requirements");

            migrationBuilder.CreateIndex(
                name: "ix_trx_prod_mat_req_order_item_id",
                schema: "stockflow",
                table: "trx_production_material_requirements",
                column: "production_order_item_id");

            migrationBuilder.CreateIndex(
                name: "IX_trx_production_material_requirements_adjusted_by",
                schema: "stockflow",
                table: "trx_production_material_requirements",
                column: "adjusted_by");

            migrationBuilder.CreateIndex(
                name: "IX_trx_production_material_requirements_source_bom_item_id",
                schema: "stockflow",
                table: "trx_production_material_requirements",
                column: "source_bom_item_id");

            migrationBuilder.AddCheckConstraint(
                name: "ck_trx_prod_mat_req_norm_per_unit",
                schema: "stockflow",
                table: "trx_production_material_requirements",
                sql: "norm_per_unit >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "ck_trx_prod_mat_req_quantities",
                schema: "stockflow",
                table: "trx_production_material_requirements",
                sql: "required_qty >= 0 AND issued_qty >= 0 AND shortage_qty >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "ck_trx_prod_mat_req_wastage_rate",
                schema: "stockflow",
                table: "trx_production_material_requirements",
                sql: "wastage_rate >= 0 AND wastage_rate <= 100");

            migrationBuilder.AddForeignKey(
                name: "fk_trx_production_material_requirements_order_item_id",
                schema: "stockflow",
                table: "trx_production_material_requirements",
                column: "production_order_item_id",
                principalSchema: "stockflow",
                principalTable: "trx_production_order_items",
                principalColumn: "production_order_item_id");

            migrationBuilder.AddForeignKey(
                name: "fk_trx_production_material_requirements_source_bom_item_id",
                schema: "stockflow",
                table: "trx_production_material_requirements",
                column: "source_bom_item_id",
                principalSchema: "stockflow",
                principalTable: "dtl_bom_items",
                principalColumn: "bom_item_id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "fk_trx_production_material_requirements_adjusted_by",
                schema: "stockflow",
                table: "trx_production_material_requirements",
                column: "adjusted_by",
                principalSchema: "stockflow",
                principalTable: "sec_users",
                principalColumn: "user_id");

            // ===== 5. trx_production_orders: chỉ còn đầu lệnh (bỏ product_id, bom_id, planned_quantity) =====
            migrationBuilder.DropForeignKey(
                name: "fk_trx_production_orders_bom_id",
                schema: "stockflow",
                table: "trx_production_orders");

            migrationBuilder.DropForeignKey(
                name: "fk_trx_production_orders_product_id",
                schema: "stockflow",
                table: "trx_production_orders");

            migrationBuilder.DropColumn(
                name: "bom_id",
                schema: "stockflow",
                table: "trx_production_orders");

            migrationBuilder.DropColumn(
                name: "planned_quantity",
                schema: "stockflow",
                table: "trx_production_orders");

            migrationBuilder.DropColumn(
                name: "product_id",
                schema: "stockflow",
                table: "trx_production_orders");

            // ===== 6. dtl_stock_issue_items: kho từng dòng (BR-55) + số lượng 6 chữ số =====
            migrationBuilder.AlterColumn<decimal>(
                name: "requested_qty",
                schema: "stockflow",
                table: "dtl_stock_issue_items",
                type: "numeric(18,6)",
                precision: 18,
                scale: 6,
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,2)",
                oldPrecision: 18,
                oldScale: 2,
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "actual_issued_qty",
                schema: "stockflow",
                table: "dtl_stock_issue_items",
                type: "numeric(18,6)",
                precision: 18,
                scale: 6,
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,2)",
                oldPrecision: 18,
                oldScale: 2,
                oldNullable: true);

            migrationBuilder.AddColumn<int>(
                name: "warehouse_id",
                schema: "stockflow",
                table: "dtl_stock_issue_items",
                type: "integer",
                nullable: true);

            // Dòng cũ chưa có kho riêng: lấy kho ở đầu phiếu.
            migrationBuilder.Sql(@"
UPDATE stockflow.dtl_stock_issue_items d
SET warehouse_id = s.warehouse_id
FROM stockflow.trx_stock_issues s
WHERE s.stock_issue_id = d.stock_issue_id AND d.warehouse_id IS NULL;");

            migrationBuilder.CreateIndex(
                name: "IX_dtl_stock_issue_items_warehouse_id",
                schema: "stockflow",
                table: "dtl_stock_issue_items",
                column: "warehouse_id");

            migrationBuilder.AddForeignKey(
                name: "fk_dtl_stock_issue_items_warehouse_id",
                schema: "stockflow",
                table: "dtl_stock_issue_items",
                column: "warehouse_id",
                principalSchema: "stockflow",
                principalTable: "mst_warehouses",
                principalColumn: "warehouse_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Đường lùi chỉ an toàn khi mỗi lệnh có đúng một dòng thành phẩm (đúng như mô hình cũ).
            migrationBuilder.Sql(@"
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM stockflow.trx_production_orders o
               WHERE (SELECT COUNT(*) FROM stockflow.trx_production_order_items i
                      WHERE i.production_order_id = o.production_order_id) <> 1) THEN
        RAISE EXCEPTION 'Không lùi được: có lệnh sản xuất không có đúng một dòng thành phẩm (mô hình cũ chỉ chứa một).';
    END IF;
END $$;");

            // ----- 6. dtl_stock_issue_items -----
            migrationBuilder.DropForeignKey(
                name: "fk_dtl_stock_issue_items_warehouse_id",
                schema: "stockflow",
                table: "dtl_stock_issue_items");

            migrationBuilder.DropIndex(
                name: "IX_dtl_stock_issue_items_warehouse_id",
                schema: "stockflow",
                table: "dtl_stock_issue_items");

            migrationBuilder.DropColumn(
                name: "warehouse_id",
                schema: "stockflow",
                table: "dtl_stock_issue_items");

            // Thu hẹp độ chính xác 6 -> 2 chữ số sẽ làm tròn dữ liệu (chấp nhận khi lùi).
            migrationBuilder.AlterColumn<decimal>(
                name: "requested_qty",
                schema: "stockflow",
                table: "dtl_stock_issue_items",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,6)",
                oldPrecision: 18,
                oldScale: 6,
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "actual_issued_qty",
                schema: "stockflow",
                table: "dtl_stock_issue_items",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,6)",
                oldPrecision: 18,
                oldScale: 6,
                oldNullable: true);

            // ----- 5. trx_production_orders: thêm lại cột, điền từ dòng thành phẩm -----
            migrationBuilder.AddColumn<int>(
                name: "bom_id",
                schema: "stockflow",
                table: "trx_production_orders",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "planned_quantity",
                schema: "stockflow",
                table: "trx_production_orders",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "product_id",
                schema: "stockflow",
                table: "trx_production_orders",
                type: "integer",
                nullable: true);

            migrationBuilder.Sql(@"
UPDATE stockflow.trx_production_orders o
SET bom_id = i.bom_id, product_id = i.product_id, planned_quantity = i.planned_qty
FROM stockflow.trx_production_order_items i
WHERE i.production_order_id = o.production_order_id;");

            migrationBuilder.AlterColumn<int>(
                name: "bom_id",
                schema: "stockflow",
                table: "trx_production_orders",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "product_id",
                schema: "stockflow",
                table: "trx_production_orders",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_trx_production_orders_bom_id",
                schema: "stockflow",
                table: "trx_production_orders",
                column: "bom_id");

            migrationBuilder.CreateIndex(
                name: "IX_trx_production_orders_product_id",
                schema: "stockflow",
                table: "trx_production_orders",
                column: "product_id");

            migrationBuilder.AddForeignKey(
                name: "fk_trx_production_orders_bom_id",
                schema: "stockflow",
                table: "trx_production_orders",
                column: "bom_id",
                principalSchema: "stockflow",
                principalTable: "mst_boms",
                principalColumn: "bom_id");

            migrationBuilder.AddForeignKey(
                name: "fk_trx_production_orders_product_id",
                schema: "stockflow",
                table: "trx_production_orders",
                column: "product_id",
                principalSchema: "stockflow",
                principalTable: "mst_products",
                principalColumn: "product_id");

            // ----- 4. trx_production_material_requirements: quay về gắn vào lệnh -----
            migrationBuilder.DropForeignKey(
                name: "fk_trx_production_material_requirements_order_item_id",
                schema: "stockflow",
                table: "trx_production_material_requirements");

            migrationBuilder.DropForeignKey(
                name: "fk_trx_production_material_requirements_source_bom_item_id",
                schema: "stockflow",
                table: "trx_production_material_requirements");

            migrationBuilder.DropForeignKey(
                name: "fk_trx_production_material_requirements_adjusted_by",
                schema: "stockflow",
                table: "trx_production_material_requirements");

            migrationBuilder.AddColumn<int>(
                name: "production_order_id",
                schema: "stockflow",
                table: "trx_production_material_requirements",
                type: "integer",
                nullable: true);

            migrationBuilder.Sql(@"
UPDATE stockflow.trx_production_material_requirements r
SET production_order_id = i.production_order_id
FROM stockflow.trx_production_order_items i
WHERE i.production_order_item_id = r.production_order_item_id;");

            migrationBuilder.AlterColumn<int>(
                name: "production_order_id",
                schema: "stockflow",
                table: "trx_production_material_requirements",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.DropCheckConstraint(
                name: "ck_trx_prod_mat_req_norm_per_unit",
                schema: "stockflow",
                table: "trx_production_material_requirements");

            migrationBuilder.DropCheckConstraint(
                name: "ck_trx_prod_mat_req_quantities",
                schema: "stockflow",
                table: "trx_production_material_requirements");

            migrationBuilder.DropCheckConstraint(
                name: "ck_trx_prod_mat_req_wastage_rate",
                schema: "stockflow",
                table: "trx_production_material_requirements");

            // DropColumn kéo theo các chỉ mục trên các cột này
            foreach (var column in new[]
            {
                "production_order_item_id", "source_bom_item_id", "norm_per_unit", "wastage_rate",
                "is_adjusted", "adjust_reason", "adjusted_by", "adjusted_at"
            })
            {
                migrationBuilder.DropColumn(
                    name: column,
                    schema: "stockflow",
                    table: "trx_production_material_requirements");
            }

            migrationBuilder.AlterColumn<decimal>(
                name: "required_qty",
                schema: "stockflow",
                table: "trx_production_material_requirements",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,6)",
                oldPrecision: 18,
                oldScale: 6,
                oldDefaultValue: 0m);

            migrationBuilder.AlterColumn<decimal>(
                name: "issued_qty",
                schema: "stockflow",
                table: "trx_production_material_requirements",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,6)",
                oldPrecision: 18,
                oldScale: 6,
                oldDefaultValue: 0m);

            migrationBuilder.AlterColumn<decimal>(
                name: "shortage_qty",
                schema: "stockflow",
                table: "trx_production_material_requirements",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,6)",
                oldPrecision: 18,
                oldScale: 6,
                oldDefaultValue: 0m);

            migrationBuilder.CreateIndex(
                name: "IX_trx_production_material_requirements_production_order_id",
                schema: "stockflow",
                table: "trx_production_material_requirements",
                column: "production_order_id");

            migrationBuilder.AddForeignKey(
                name: "fk_trx_production_material_requirements_production_order_id",
                schema: "stockflow",
                table: "trx_production_material_requirements",
                column: "production_order_id",
                principalSchema: "stockflow",
                principalTable: "trx_production_orders",
                principalColumn: "production_order_id");

            // ----- 3. bỏ bảng dòng thành phẩm -----
            migrationBuilder.DropTable(
                name: "trx_production_order_items",
                schema: "stockflow");

            // ----- 2. dtl_bom_items -----
            migrationBuilder.DropCheckConstraint(
                name: "ck_dtl_bom_items_quantity",
                schema: "stockflow",
                table: "dtl_bom_items");

            migrationBuilder.DropCheckConstraint(
                name: "ck_dtl_bom_items_wastage_rate",
                schema: "stockflow",
                table: "dtl_bom_items");

            migrationBuilder.DropIndex(
                name: "uq_dtl_bom_items_bom_material",
                schema: "stockflow",
                table: "dtl_bom_items");

            // wastage_rate (5,2) tối đa 999,99 nên giá trị 0-100 không tràn; phần thập phân thứ 3-4 bị làm tròn.
            migrationBuilder.AlterColumn<decimal>(
                name: "wastage_rate",
                schema: "stockflow",
                table: "dtl_bom_items",
                type: "numeric(5,2)",
                precision: 5,
                scale: 2,
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric(7,4)",
                oldPrecision: 7,
                oldScale: 4,
                oldDefaultValue: 0m);

            migrationBuilder.AlterColumn<decimal>(
                name: "quantity",
                schema: "stockflow",
                table: "dtl_bom_items",
                type: "numeric(18,4)",
                precision: 18,
                scale: 4,
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,6)",
                oldPrecision: 18,
                oldScale: 6);

            migrationBuilder.CreateIndex(
                name: "IX_dtl_bom_items_bom_id",
                schema: "stockflow",
                table: "dtl_bom_items",
                column: "bom_id");

            // ----- 1. mst_boms -----
            // Trước khi bỏ status, đồng bộ lại is_active để không mất thông tin bản đang dùng.
            migrationBuilder.Sql("UPDATE stockflow.mst_boms SET is_active = (status = 'Active');");

            migrationBuilder.DropCheckConstraint(
                name: "ck_mst_boms_status",
                schema: "stockflow",
                table: "mst_boms");

            migrationBuilder.DropIndex(
                name: "uq_mst_boms_one_active_per_product",
                schema: "stockflow",
                table: "mst_boms");

            migrationBuilder.CreateIndex(
                name: "IX_mst_boms_product_id",
                schema: "stockflow",
                table: "mst_boms",
                column: "product_id");

            migrationBuilder.DropColumn(
                name: "description",
                schema: "stockflow",
                table: "mst_boms");

            migrationBuilder.DropColumn(
                name: "effective_date",
                schema: "stockflow",
                table: "mst_boms");

            migrationBuilder.DropColumn(
                name: "status",
                schema: "stockflow",
                table: "mst_boms");
        }
    }
}
