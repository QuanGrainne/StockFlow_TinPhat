using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockFlow.Infrastructure.Persistence.Migrations
{
    /// <summary>
    /// Luồng sản xuất (UC-44–50, UC-57–61): thêm cột cho BOM, lệnh sản xuất, nhu cầu NVL (snapshot + điều chỉnh BR-51),
    /// phiếu xuất (lý do BR-34), phiếu nhập thành phẩm (cờ BR-37), chỉ mục BR-30 và sequence mã chứng từ.
    /// Viết bằng SQL idempotent (IF NOT EXISTS) vì DB của các thành viên đang ở trạng thái khác nhau
    /// (có máy đã thêm cột bằng script tay, model và migration từng lệch nhau).
    /// </summary>
    public partial class AddProductionFlow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
ALTER TABLE stockflow.mst_boms ADD COLUMN IF NOT EXISTS description character varying(500) NULL;

ALTER TABLE stockflow.trx_production_orders ADD COLUMN IF NOT EXISTS workshop character varying(200) NULL;

ALTER TABLE stockflow.trx_production_material_requirements ADD COLUMN IF NOT EXISTS source_bom_item_id integer NULL;
ALTER TABLE stockflow.trx_production_material_requirements ADD COLUMN IF NOT EXISTS norm_per_unit numeric(18,4) NULL;
ALTER TABLE stockflow.trx_production_material_requirements ADD COLUMN IF NOT EXISTS wastage_rate numeric(5,2) NULL;
ALTER TABLE stockflow.trx_production_material_requirements ADD COLUMN IF NOT EXISTS is_adjusted boolean NOT NULL DEFAULT FALSE;
ALTER TABLE stockflow.trx_production_material_requirements ADD COLUMN IF NOT EXISTS adjust_reason character varying(500) NULL;
ALTER TABLE stockflow.trx_production_material_requirements ADD COLUMN IF NOT EXISTS adjusted_by integer NULL;
ALTER TABLE stockflow.trx_production_material_requirements ADD COLUMN IF NOT EXISTS adjusted_at timestamp without time zone NULL;

ALTER TABLE stockflow.trx_stock_issues ADD COLUMN IF NOT EXISTS reason character varying(500) NULL;

ALTER TABLE stockflow.trx_finished_goods_receipts ADD COLUMN IF NOT EXISTS needs_review boolean NOT NULL DEFAULT FALSE;
ALTER TABLE stockflow.trx_finished_goods_receipts ADD COLUMN IF NOT EXISTS review_note character varying(500) NULL;

-- Chỉ mục FK cũ do EF quy ước (có DB không có): thay bằng chỉ mục duy nhất có điều kiện bên dưới
DROP INDEX IF EXISTS stockflow.""IX_mst_boms_product_id"";

-- BR-30: mỗi thành phẩm tối đa một BOM đang áp dụng. Bỏ qua nếu DB đang có dữ liệu trùng (handler vẫn chặn).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM stockflow.mst_boms WHERE is_active GROUP BY product_id HAVING COUNT(*) > 1
    ) THEN
        CREATE UNIQUE INDEX IF NOT EXISTS uq_mst_boms_active_product
            ON stockflow.mst_boms (product_id) WHERE is_active;
    ELSE
        RAISE NOTICE 'mst_boms có nhiều BOM đang áp dụng cho cùng thành phẩm: bỏ qua uq_mst_boms_active_product';
    END IF;
END $$;

-- Mã lệnh sản xuất LSX00001..., phiếu nhập thành phẩm NTP00001... (phiếu xuất NVL dùng chung seq_stock_issue_code)
CREATE SEQUENCE IF NOT EXISTS stockflow.seq_production_order_code START 1;
CREATE SEQUENCE IF NOT EXISTS stockflow.seq_fgr_code START 1;
CREATE SEQUENCE IF NOT EXISTS stockflow.seq_stock_issue_code START 1;
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
DROP SEQUENCE IF EXISTS stockflow.seq_fgr_code;
DROP SEQUENCE IF EXISTS stockflow.seq_production_order_code;
DROP INDEX IF EXISTS stockflow.uq_mst_boms_active_product;

ALTER TABLE stockflow.trx_finished_goods_receipts DROP COLUMN IF EXISTS review_note;
ALTER TABLE stockflow.trx_finished_goods_receipts DROP COLUMN IF EXISTS needs_review;
ALTER TABLE stockflow.trx_stock_issues DROP COLUMN IF EXISTS reason;
ALTER TABLE stockflow.trx_production_material_requirements DROP COLUMN IF EXISTS adjusted_at;
ALTER TABLE stockflow.trx_production_material_requirements DROP COLUMN IF EXISTS adjusted_by;
ALTER TABLE stockflow.trx_production_material_requirements DROP COLUMN IF EXISTS adjust_reason;
ALTER TABLE stockflow.trx_production_material_requirements DROP COLUMN IF EXISTS is_adjusted;
ALTER TABLE stockflow.trx_production_material_requirements DROP COLUMN IF EXISTS wastage_rate;
ALTER TABLE stockflow.trx_production_material_requirements DROP COLUMN IF EXISTS norm_per_unit;
ALTER TABLE stockflow.trx_production_material_requirements DROP COLUMN IF EXISTS source_bom_item_id;
ALTER TABLE stockflow.trx_production_orders DROP COLUMN IF EXISTS workshop;
ALTER TABLE stockflow.mst_boms DROP COLUMN IF EXISTS description;
");
        }
    }
}
