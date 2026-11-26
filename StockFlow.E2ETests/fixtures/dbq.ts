// Truy vấn CHỈ ĐỌC trên stockflow_e2e_test để kiểm kết quả (Assert). Không dùng để thay thao tác nghiệp vụ.
import type { Client } from 'pg';
import { queryRows } from './pg';
import { WAREHOUSES, type WarehouseCode } from './accounts';

/** Tồn hiện có của một hàng tại một kho (cộng mọi vị trí / lô) */
export async function stockQty(db: Client, productId: number, wh: WarehouseCode): Promise<number> {
  const r = await queryRows<{ q: string | null }>(
    db,
    'SELECT COALESCE(SUM(quantity), 0)::text AS q FROM stockflow.trx_inventory_balances WHERE product_id = $1 AND warehouse_id = $2',
    [productId, WAREHOUSES[wh].id]
  );
  return Number(r[0].q);
}

export interface LedgerRow {
  transaction_type: string;
  quantity: string;
  reference_type: string;
  reference_id: number;
  warehouse_id: number;
  created_by: number | null;
}

export async function ledgerRows(db: Client, productId: number, referenceType: string, referenceId: number): Promise<LedgerRow[]> {
  return queryRows<LedgerRow>(
    db,
    `SELECT transaction_type, quantity::text AS quantity, reference_type, reference_id, warehouse_id, created_by
       FROM stockflow.trx_inventory_transactions
      WHERE product_id = $1 AND reference_type = $2 AND reference_id = $3
      ORDER BY transaction_id`,
    [productId, referenceType, referenceId]
  );
}

export interface OrderRow {
  order_id: number;
  order_code: string;
  status: string | null;
  order_type: string | null;
  total_amount: string;
  paid_amount: string | null;
  warehouse_id: number | null;
  partner_id: number | null;
  created_by: number | null;
}

export async function orderByCode(db: Client, code: string): Promise<OrderRow | undefined> {
  const r = await queryRows<OrderRow>(
    db,
    `SELECT order_id, order_code, status, order_type, total_amount::text AS total_amount, paid_amount::text AS paid_amount,
            warehouse_id, partner_id, created_by
       FROM stockflow.trx_orders WHERE order_code = $1`,
    [code]
  );
  return r[0];
}

/** Phiếu xuất kho bán hàng sinh ra từ hóa đơn POS (thẻ kho tham chiếu phiếu này) */
export async function stockIssuesOfOrder(db: Client, orderId: number): Promise<{ stock_issue_id: number; status: string | null }[]> {
  return queryRows(db, 'SELECT stock_issue_id, status FROM stockflow.trx_stock_issues WHERE sales_order_id = $1', [orderId]);
}

export interface TransferRow {
  stock_transfer_id: number;
  transfer_code: string;
  status: string;
  source_warehouse_id: number;
  dest_warehouse_id: number;
  created_by: number | null;
}

export async function transferByCode(db: Client, code: string): Promise<TransferRow | undefined> {
  const r = await queryRows<TransferRow>(
    db,
    `SELECT stock_transfer_id, transfer_code, status, source_warehouse_id, dest_warehouse_id, created_by
       FROM stockflow.trx_stock_transfers WHERE transfer_code = $1`,
    [code]
  );
  return r[0];
}

/** Thời gian chuyển + n phút, dạng ô datetime-local (YYYY-MM-DDTHH:mm), giờ Việt Nam như lúc lưu */
export async function transferDatePlusMinutes(db: Client, transferId: number, minutes: number): Promise<string> {
  const r = await queryRows<{ v: string }>(
    db,
    `SELECT to_char(transfer_date + make_interval(mins => $2), 'YYYY-MM-DD"T"HH24:MI') AS v
       FROM stockflow.trx_stock_transfers WHERE stock_transfer_id = $1`,
    [transferId, minutes]
  );
  return r[0].v;
}

export async function transferItems(db: Client, transferId: number): Promise<{ product_id: number; quantity: string; issued_quantity: string | null; received_quantity: string | null }[]> {
  return queryRows(
    db,
    `SELECT product_id, quantity::text AS quantity, issued_quantity::text AS issued_quantity, received_quantity::text AS received_quantity
       FROM stockflow.dtl_stock_transfer_items WHERE stock_transfer_id = $1`,
    [transferId]
  );
}

export async function userByUsername(db: Client, username: string): Promise<{ user_id: number; is_active: boolean | null; full_name: string } | undefined> {
  const r = await queryRows<{ user_id: number; is_active: boolean | null; full_name: string }>(
    db,
    'SELECT user_id, is_active, full_name FROM stockflow.sec_users WHERE username = $1',
    [username]
  );
  return r[0];
}

export async function rolesOfUser(db: Client, username: string): Promise<string[]> {
  const r = await queryRows<{ role_name: string }>(
    db,
    `SELECT r.role_name FROM stockflow.sec_users u
       JOIN stockflow.jnc_user_roles ur ON ur.user_id = u.user_id
       JOIN stockflow.sec_roles r ON r.role_id = ur.role_id
      WHERE u.username = $1 ORDER BY r.role_name`,
    [username]
  );
  return r.map((x) => x.role_name);
}

/** Mã quyền phân hệ của một vai trò (vd SALES_%) – bằng chứng cho lỗi phân quyền */
export async function permissionCodesOfRole(db: Client, roleName: string, like: string): Promise<string[]> {
  const r = await queryRows<{ code: string }>(
    db,
    `SELECT p.permission_code AS code FROM stockflow.jnc_role_permissions jrp
       JOIN stockflow.sec_roles r ON r.role_id = jrp.role_id
       JOIN stockflow.sec_permissions p ON p.permission_id = jrp.permission_id
      WHERE r.role_name = $1 AND p.permission_code LIKE $2 ORDER BY 1`,
    [roleName, like]
  );
  return r.map((x) => x.code);
}

/** Mã kho đang hoạt động được gán cho người dùng (jnc_user_warehouse_access) */
export async function warehouseCodesOfUser(db: Client, username: string): Promise<string[]> {
  const r = await queryRows<{ code: string }>(
    db,
    `SELECT w.warehouse_code AS code FROM stockflow.sec_users u
       JOIN stockflow.jnc_user_warehouse_access a ON a.user_id = u.user_id
       JOIN stockflow.mst_warehouses w ON w.warehouse_id = a.warehouse_id
      WHERE u.username = $1 AND w.is_active ORDER BY 1`,
    [username]
  );
  return r.map((x) => x.code);
}

// ─── Mua hàng (UC-30 / UC-31) ────────────────────────────────────────────────

export async function poRow(db: Client, poId: number): Promise<{ po_code: string; status: string; total_amount: string; partner_id: number; notes: string | null } | undefined> {
  const r = await queryRows<{ po_code: string; status: string; total_amount: string; partner_id: number; notes: string | null }>(
    db,
    'SELECT po_code, status, total_amount::text AS total_amount, partner_id, notes FROM stockflow.trx_purchase_orders WHERE po_id = $1',
    [poId]
  );
  return r[0];
}

export async function poItems(db: Client, poId: number): Promise<{ product_id: number; ordered_qty: string; unit_price: string }[]> {
  return queryRows(
    db,
    'SELECT product_id, ordered_qty::text AS ordered_qty, unit_price::text AS unit_price FROM stockflow.dtl_purchase_order_items WHERE po_id = $1 ORDER BY po_item_id',
    [poId]
  );
}

export interface GrRow {
  gr_id: number;
  gr_code: string;
  status: string;
  warehouse_id: number;
  partner_id: number;
}

export async function receiptsOfPo(db: Client, poId: number): Promise<GrRow[]> {
  return queryRows<GrRow>(
    db,
    'SELECT gr_id, gr_code, status, warehouse_id, partner_id FROM stockflow.trx_goods_receipts WHERE purchase_order_id = $1 ORDER BY gr_id',
    [poId]
  );
}

export async function receiptByCode(db: Client, code: string): Promise<GrRow | undefined> {
  const r = await queryRows<GrRow>(db, 'SELECT gr_id, gr_code, status, warehouse_id, partner_id FROM stockflow.trx_goods_receipts WHERE gr_code = $1', [code]);
  return r[0];
}

export async function receiptItems(
  db: Client,
  grId: number
): Promise<{ product_id: number; received_qty: string | null; accepted_qty: string | null; defective_qty: string | null; damaged_qty: string | null; lot_id: number | null; location_id: number | null }[]> {
  return queryRows(
    db,
    `SELECT product_id, received_qty::text AS received_qty, accepted_qty::text AS accepted_qty, defective_qty::text AS defective_qty,
            damaged_qty::text AS damaged_qty, lot_id, location_id
       FROM stockflow.dtl_goods_receipt_items WHERE gr_id = $1 ORDER BY gr_item_id`,
    [grId]
  );
}

/** Số phiếu nhập hiện có (kiểm "không lưu gì") */
export async function receiptCountOfProduct(db: Client, productId: number): Promise<number> {
  const r = await queryRows<{ n: string }>(db, 'SELECT COUNT(DISTINCT gr_id)::text AS n FROM stockflow.dtl_goods_receipt_items WHERE product_id = $1', [productId]);
  return Number(r[0].n);
}

/** Công nợ phải trả NCC (current_payable) */
export async function supplierPayable(db: Client, partnerId: number): Promise<number> {
  const r = await queryRows<{ v: string | null }>(db, 'SELECT current_payable::text AS v FROM stockflow.mst_business_partners WHERE partner_id = $1', [partnerId]);
  return Number(r[0]?.v ?? 0);
}

/** Giá vốn bình quân di động (MAC) của hàng hóa */
export async function productMac(db: Client, productId: number): Promise<number> {
  const r = await queryRows<{ v: string | null }>(db, 'SELECT moving_average_cost::text AS v FROM stockflow.mst_products WHERE product_id = $1', [productId]);
  return Number(r[0]?.v ?? 0);
}

export async function purchaseReturnsOfGr(db: Client, grId: number): Promise<{ return_code: string; status: string; total_amount: string; refund_amount: string | null }[]> {
  return queryRows(
    db,
    `SELECT return_code, status, total_amount::text AS total_amount, refund_amount::text AS refund_amount
       FROM stockflow.trx_purchase_returns WHERE gr_id = $1 ORDER BY purchase_return_id`,
    [grId]
  );
}

// ─── Kiểm kho / Xuất hủy (UC-39 / UC-43) ─────────────────────────────────────

export async function stocktakeByCode(db: Client, code: string): Promise<{ stocktake_id: number; status: string; notes: string | null; warehouse_id: number } | undefined> {
  const r = await queryRows<{ stocktake_id: number; status: string; notes: string | null; warehouse_id: number }>(
    db,
    'SELECT stocktake_id, status, notes, warehouse_id FROM stockflow.trx_stocktakes WHERE stocktake_code = $1',
    [code]
  );
  return r[0];
}

export async function stocktakeItems(db: Client, stocktakeId: number): Promise<{ product_id: number; system_qty: string | null; actual_qty: string | null; discrepancy: string | null; discrepancy_reason: string | null }[]> {
  return queryRows(
    db,
    `SELECT product_id, system_qty::text AS system_qty, actual_qty::text AS actual_qty, discrepancy::text AS discrepancy, discrepancy_reason
       FROM stockflow.dtl_stocktake_items WHERE stocktake_id = $1 ORDER BY stocktake_item_id`,
    [stocktakeId]
  );
}

export async function stocktakesOfProduct(db: Client, productId: number): Promise<{ stocktake_code: string; status: string }[]> {
  return queryRows(
    db,
    `SELECT DISTINCT s.stocktake_code, s.status FROM stockflow.trx_stocktakes s
       JOIN stockflow.dtl_stocktake_items i ON i.stocktake_id = s.stocktake_id
      WHERE i.product_id = $1 ORDER BY 1`,
    [productId]
  );
}

export async function disposalByCode(db: Client, code: string): Promise<{ disposal_id: number; status: string; reason: string | null; warehouse_id: number } | undefined> {
  const r = await queryRows<{ disposal_id: number; status: string; reason: string | null; warehouse_id: number }>(
    db,
    'SELECT disposal_id, status, reason, warehouse_id FROM stockflow.trx_inventory_disposals WHERE disposal_code = $1',
    [code]
  );
  return r[0];
}

export async function disposalsOfProduct(db: Client, productId: number): Promise<{ disposal_code: string; status: string; quantity: string }[]> {
  return queryRows(
    db,
    `SELECT d.disposal_code, d.status, i.quantity::text AS quantity FROM stockflow.trx_inventory_disposals d
       JOIN stockflow.dtl_inventory_disposal_items i ON i.disposal_id = d.disposal_id
      WHERE i.product_id = $1 ORDER BY d.disposal_id`,
    [productId]
  );
}

export async function transferNotes(db: Client, transferId: number): Promise<{ notes: string | null; receive_notes: string | null }> {
  const r = await queryRows<{ notes: string | null; receive_notes: string | null }>(
    db,
    'SELECT notes, receive_notes FROM stockflow.trx_stock_transfers WHERE stock_transfer_id = $1',
    [transferId]
  );
  return r[0];
}

export async function transfersOfProduct(db: Client, productId: number): Promise<{ transfer_code: string; status: string }[]> {
  return queryRows(
    db,
    `SELECT DISTINCT t.transfer_code, t.status FROM stockflow.trx_stock_transfers t
       JOIN stockflow.dtl_stock_transfer_items i ON i.stock_transfer_id = t.stock_transfer_id
      WHERE i.product_id = $1 ORDER BY 1`,
    [productId]
  );
}

/** Giá vốn bình quân của hàng tại một kho (giá vốn tính theo từng kho – CostingPolicy): unit_cost của các dòng tồn */
export async function warehouseUnitCost(db: Client, productId: number, wh: WarehouseCode): Promise<number> {
  const r = await queryRows<{ v: string | null }>(
    db,
    `SELECT (SUM(quantity * unit_cost) / NULLIF(SUM(quantity), 0))::text AS v
       FROM stockflow.trx_inventory_balances WHERE product_id = $1 AND warehouse_id = $2`,
    [productId, WAREHOUSES[wh].id]
  );
  return Number(r[0]?.v ?? 0);
}

/** Số phiếu đặt hàng nhập có hàng này (kiểm "không tạo phiếu") */
export async function poCountOfProduct(db: Client, productId: number): Promise<number> {
  const r = await queryRows<{ n: string }>(db, 'SELECT COUNT(DISTINCT po_id)::text AS n FROM stockflow.dtl_purchase_order_items WHERE product_id = $1', [productId]);
  return Number(r[0].n);
}
