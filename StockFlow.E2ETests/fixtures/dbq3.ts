// Truy vấn CHỈ ĐỌC cho đợt 3 (sheet No 21–29): sản xuất, danh mục, hạn mức, phiếu thu / chi. Chỉ để kiểm kết quả (Assert).
import type { Client } from 'pg';
import { queryRows } from './pg';
import { WAREHOUSES, type WarehouseCode } from './accounts';

export async function productionOrderRow(
  db: Client,
  id: number
): Promise<{ production_order_code: string; status: string; planned_quantity: string; actual_quantity: string | null; notes: string | null } | undefined> {
  const r = await queryRows<{ production_order_code: string; status: string; planned_quantity: string; actual_quantity: string | null; notes: string | null }>(
    db,
    `SELECT production_order_code, status, planned_quantity::text AS planned_quantity, actual_quantity::text AS actual_quantity, notes
       FROM stockflow.trx_production_orders WHERE production_order_id = $1`,
    [id]
  );
  return r[0];
}

export async function productionOrdersOfPlan(db: Client, planId: number): Promise<{ production_order_id: number; production_order_code: string; status: string; planned_quantity: string }[]> {
  return queryRows(
    db,
    `SELECT production_order_id, production_order_code, status, planned_quantity::text AS planned_quantity
       FROM stockflow.trx_production_orders WHERE production_plan_id = $1 ORDER BY production_order_id`,
    [planId]
  );
}

export async function requirementsOfOrder(
  db: Client,
  orderId: number
): Promise<{ material_id: number; required_qty: string; issued_qty: string; shortage_qty: string; norm_per_unit: string; adjust_reason: string | null }[]> {
  return queryRows(
    db,
    `SELECT material_id, required_qty::text AS required_qty, issued_qty::text AS issued_qty, shortage_qty::text AS shortage_qty,
            norm_per_unit::text AS norm_per_unit, adjust_reason
       FROM stockflow.trx_production_material_requirements WHERE production_order_id = $1 ORDER BY requirement_id`,
    [orderId]
  );
}

export async function issuesOfOrder(db: Client, orderId: number): Promise<{ issue_code: string; is_supplementary: boolean | null; reason: string | null; warehouse_id: number }[]> {
  return queryRows(
    db,
    'SELECT issue_code, is_supplementary, reason, warehouse_id FROM stockflow.trx_stock_issues WHERE production_order_id = $1 ORDER BY stock_issue_id',
    [orderId]
  );
}

export async function fgReceiptsOfOrder(
  db: Client,
  orderId: number
): Promise<{ fgr_code: string; quantity: string; status: string | null; needs_review: boolean | null; review_note: string | null; warehouse_id: number; lot_number: string | null }[]> {
  return queryRows(
    db,
    `SELECT f.fgr_code, f.quantity::text AS quantity, f.status, f.needs_review, f.review_note, f.warehouse_id, l.lot_number
       FROM stockflow.trx_finished_goods_receipts f
       LEFT JOIN stockflow.mst_inventory_lots l ON l.lot_id = f.lot_id
      WHERE f.production_order_id = $1 ORDER BY f.fgr_id`,
    [orderId]
  );
}

export async function productionReports(db: Client, orderId: number): Promise<{ produced_qty: string | null; defect_qty: string | null; notes: string | null }[]> {
  return queryRows(
    db,
    'SELECT produced_qty::text AS produced_qty, defect_qty::text AS defect_qty, notes FROM stockflow.trx_production_reports WHERE production_order_id = $1 ORDER BY report_id',
    [orderId]
  );
}

/** Loại giao dịch thẻ kho gần nhất của hàng tại kho */
export async function lastLedgerType(db: Client, productId: number, wh: WarehouseCode): Promise<{ transaction_type: string; quantity: string; reference_type: string } | undefined> {
  const r = await queryRows<{ transaction_type: string; quantity: string; reference_type: string }>(
    db,
    `SELECT transaction_type, quantity::text AS quantity, reference_type FROM stockflow.trx_inventory_transactions
      WHERE product_id = $1 AND warehouse_id = $2 ORDER BY transaction_id DESC LIMIT 1`,
    [productId, WAREHOUSES[wh].id]
  );
  return r[0];
}

export async function productByName(
  db: Client,
  name: string
): Promise<{ product_id: number; product_code: string; is_active: boolean | null; min_safe_stock: string | null; reorder_point: string | null; standard_price: string | null } | undefined> {
  const r = await queryRows<{ product_id: number; product_code: string; is_active: boolean | null; min_safe_stock: string | null; reorder_point: string | null; standard_price: string | null }>(
    db,
    `SELECT product_id, product_code, is_active, min_safe_stock::text AS min_safe_stock, reorder_point::text AS reorder_point, standard_price::text AS standard_price
       FROM stockflow.mst_products WHERE product_name = $1 ORDER BY product_id`,
    [name]
  );
  return r[0];
}

export async function productActive(db: Client, productId: number): Promise<boolean | null> {
  const r = await queryRows<{ is_active: boolean | null }>(db, 'SELECT is_active FROM stockflow.mst_products WHERE product_id = $1', [productId]);
  return r[0]?.is_active ?? null;
}

export async function productsLike(db: Client, pattern: string): Promise<{ product_code: string; product_name: string; is_active: boolean | null }[]> {
  return queryRows(db, 'SELECT product_code, product_name, is_active FROM stockflow.mst_products WHERE product_name LIKE $1 ORDER BY product_id', [pattern]);
}

export async function unitConversions(db: Client, productId: number): Promise<{ conversion_factor: string; to_unit: string | null; from_unit: string | null }[]> {
  return queryRows(
    db,
    `SELECT c.conversion_factor::text AS conversion_factor, tu.unit_name AS to_unit, fu.unit_name AS from_unit
       FROM stockflow.mst_unit_conversions c
       LEFT JOIN stockflow.mst_units tu ON tu.unit_id = c.to_unit_id
       LEFT JOIN stockflow.mst_units fu ON fu.unit_id = c.from_unit_id
      WHERE c.product_id = $1 ORDER BY c.conversion_id`,
    [productId]
  );
}

export interface PartnerRow {
  partner_id: number;
  partner_code: string;
  partner_name: string;
  partner_type: string | null;
  is_active: boolean | null;
  credit_limit: string | null;
  current_debt: string | null;
  current_payable: string | null;
  phone: string | null;
}

const PARTNER_COLS = `partner_id, partner_code, partner_name, partner_type, is_active, credit_limit::text AS credit_limit,
  current_debt::text AS current_debt, current_payable::text AS current_payable, phone`;

export async function partnersByName(db: Client, name: string): Promise<PartnerRow[]> {
  return queryRows<PartnerRow>(db, `SELECT ${PARTNER_COLS} FROM stockflow.mst_business_partners WHERE partner_name = $1 ORDER BY partner_id`, [name]);
}

export async function partnerById(db: Client, id: number): Promise<PartnerRow | undefined> {
  return (await queryRows<PartnerRow>(db, `SELECT ${PARTNER_COLS} FROM stockflow.mst_business_partners WHERE partner_id = $1`, [id]))[0];
}

export async function creditHistory(db: Client, partnerId: number): Promise<{ old_limit: string | null; new_limit: string | null; reason: string | null; source: string | null }[]> {
  return queryRows(
    db,
    `SELECT old_limit::text AS old_limit, new_limit::text AS new_limit, reason, source FROM stockflow.trx_credit_limit_histories
      WHERE partner_id = $1 ORDER BY history_id`,
    [partnerId]
  );
}

export async function creditRequestsOf(
  db: Client,
  partnerId: number
): Promise<{ request_id: number; request_code: string | null; status: string; approved_by: number | null; approval_date: string | null; approval_notes: string | null; approved_limit: string | null }[]> {
  return queryRows(
    db,
    `SELECT request_id, request_code, status, approved_by, approval_date::text AS approval_date, approval_notes, approved_limit::text AS approved_limit
       FROM stockflow.trx_credit_limit_requests WHERE partner_id = $1 ORDER BY request_id`,
    [partnerId]
  );
}

export async function vouchersOf(db: Client, partnerId: number): Promise<{ tx_code: string | null; tx_type: string | null; amount: string; payment_method: string | null; status: string | null; reference_type: string | null }[]> {
  return queryRows(
    db,
    `SELECT tx_code, tx_type, amount::text AS amount, payment_method, status, reference_type FROM stockflow.trx_financial_transactions
      WHERE partner_id = $1 ORDER BY tx_id`,
    [partnerId]
  );
}

export async function bomsOfProduct(db: Client, productId: number): Promise<{ bom_id: number; version: string | null; is_active: boolean | null; bom_name: string | null; items: string }[]> {
  return queryRows(
    db,
    `SELECT b.bom_id, b.version, b.is_active, b.bom_name, (SELECT COUNT(*) FROM stockflow.dtl_bom_items i WHERE i.bom_id = b.bom_id)::text AS items
       FROM stockflow.mst_boms b WHERE b.product_id = $1 ORDER BY b.bom_id`,
    [productId]
  );
}

export async function warehouseByCode(db: Client, code: string): Promise<{ warehouse_id: number; is_active: boolean | null; warehouse_name: string } | undefined> {
  return (await queryRows<{ warehouse_id: number; is_active: boolean | null; warehouse_name: string }>(
    db,
    'SELECT warehouse_id, is_active, warehouse_name FROM stockflow.mst_warehouses WHERE warehouse_code = $1',
    [code]
  ))[0];
}

/** Cấu hình đơn vị / biến thể lưu dạng JSON trên hàng hóa (variants_json) */
export async function productVariantsJson(db: Client, productId: number): Promise<string | null> {
  const r = await queryRows<{ v: string | null }>(db, 'SELECT variants_json AS v FROM stockflow.mst_products WHERE product_id = $1', [productId]);
  return r[0]?.v ?? null;
}
