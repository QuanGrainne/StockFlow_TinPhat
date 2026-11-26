// Truy vấn CHỈ ĐỌC cho đợt 4 (sheet NEW No 30–34): hóa đơn / đơn đặt, thẻ kho theo kho, bảng giá, thiết lập đơn hàng.
import type { Client } from 'pg';
import { queryRows } from './pg';
import { WAREHOUSES, type WarehouseCode } from './accounts';

export interface OrderItemRow {
  product_id: number;
  quantity: string;
  unit_price: string | null;
  original_price: string | null;
  line_total: string | null;
}

export async function orderItemsOf(db: Client, orderId: number): Promise<OrderItemRow[]> {
  return queryRows<OrderItemRow>(
    db,
    `SELECT product_id, quantity::text AS quantity, unit_price::text AS unit_price, original_price::text AS original_price, line_total::text AS line_total
       FROM stockflow.dtl_order_items WHERE order_id = $1 ORDER BY order_item_id`,
    [orderId]
  );
}

export interface OrderOfProduct {
  order_id: number;
  order_code: string;
  order_type: string | null;
  status: string | null;
  booking_order_id: number | null;
  partner_id: number | null;
}

/** Mọi hóa đơn / đơn đặt có chứa một hàng (theo thứ tự tạo) */
export async function ordersWithProduct(db: Client, productId: number): Promise<OrderOfProduct[]> {
  return queryRows<OrderOfProduct>(
    db,
    `SELECT DISTINCT o.order_id, o.order_code, o.order_type, o.status, o.booking_order_id, o.partner_id
       FROM stockflow.trx_orders o JOIN stockflow.dtl_order_items i ON i.order_id = o.order_id
      WHERE i.product_id = $1 ORDER BY o.order_id`,
    [productId]
  );
}

export async function orderById(db: Client, orderId: number): Promise<{ order_code: string; order_type: string | null; status: string | null; total_amount: string | null; paid_amount: string | null; outstanding_amount: string | null; deposit_amount: string | null; payment_status: string | null } | undefined> {
  return (
    await queryRows<{ order_code: string; order_type: string | null; status: string | null; total_amount: string | null; paid_amount: string | null; outstanding_amount: string | null; deposit_amount: string | null; payment_status: string | null }>(
      db,
      `SELECT order_code, order_type, status, total_amount::text AS total_amount, paid_amount::text AS paid_amount,
              outstanding_amount::text AS outstanding_amount, deposit_amount::text AS deposit_amount, payment_status
         FROM stockflow.trx_orders WHERE order_id = $1`,
      [orderId]
    )
  )[0];
}

export interface WhLedgerRow {
  transaction_id: number;
  transaction_type: string;
  quantity: string;
  reference_type: string | null;
  reference_id: number | null;
}

/** Toàn bộ dòng thẻ kho của một hàng tại một kho, theo thứ tự ghi */
export async function ledgerOfProductWh(db: Client, productId: number, wh: WarehouseCode): Promise<WhLedgerRow[]> {
  return queryRows<WhLedgerRow>(
    db,
    `SELECT transaction_id, transaction_type, quantity::text AS quantity, reference_type, reference_id
       FROM stockflow.trx_inventory_transactions WHERE product_id = $1 AND warehouse_id = $2 ORDER BY transaction_id`,
    [productId, WAREHOUSES[wh].id]
  );
}

export async function priceBookByName(db: Client, name: string): Promise<{ price_book_id: number; is_active: boolean | null; formula_base_type: string | null; formula_operator: string | null; formula_value: string | null } | undefined> {
  return (
    await queryRows<{ price_book_id: number; is_active: boolean | null; formula_base_type: string | null; formula_operator: string | null; formula_value: string | null }>(
      db,
      `SELECT price_book_id, is_active, formula_base_type, formula_operator, formula_value::text AS formula_value
         FROM stockflow.mst_price_books WHERE price_book_name = $1 ORDER BY price_book_id`,
      [name]
    )
  )[0];
}

export async function priceBookCount(db: Client): Promise<number> {
  const r = await queryRows<{ n: string }>(db, 'SELECT COUNT(*)::text AS n FROM stockflow.mst_price_books');
  return Number(r[0].n);
}

export async function priceOf(db: Client, priceBookId: number, productId: number): Promise<number | null> {
  const r = await queryRows<{ v: string | null }>(
    db,
    'SELECT price::text AS v FROM stockflow.dtl_price_book_items WHERE price_book_id = $1 AND product_id = $2',
    [priceBookId, productId]
  );
  return r.length ? Number(r[0].v) : null;
}

export async function orderSettingsRow(db: Client): Promise<{ order_code_prefix: string | null; order_code_rule: string | null; allow_negative_stock_sale: boolean | null; allow_selling_reserved_stock: boolean | null }> {
  return (
    await queryRows<{ order_code_prefix: string | null; order_code_rule: string | null; allow_negative_stock_sale: boolean | null; allow_selling_reserved_stock: boolean | null }>(
      db,
      `SELECT order_code_prefix, order_code_rule, allow_negative_stock_sale, allow_selling_reserved_stock
         FROM stockflow.mst_order_settings WHERE setting_id = 1`
    )
  )[0];
}

export async function receiptsOfProduct(db: Client, productId: number): Promise<{ gr_id: number; gr_code: string; status: string }[]> {
  return queryRows(
    db,
    `SELECT DISTINCT g.gr_id, g.gr_code, g.status FROM stockflow.trx_goods_receipts g
       JOIN stockflow.dtl_goods_receipt_items i ON i.gr_id = g.gr_id WHERE i.product_id = $1 ORDER BY g.gr_id`,
    [productId]
  );
}

export async function purchaseReturnByCode(db: Client, code: string): Promise<{ purchase_return_id: number; status: string; total_amount: string; refund_amount: string | null } | undefined> {
  return (
    await queryRows<{ purchase_return_id: number; status: string; total_amount: string; refund_amount: string | null }>(
      db,
      `SELECT purchase_return_id, status, total_amount::text AS total_amount, refund_amount::text AS refund_amount
         FROM stockflow.trx_purchase_returns WHERE return_code = $1`,
      [code]
    )
  )[0];
}

export async function productCodesLike(db: Client, prefix: string): Promise<{ product_code: string; product_name: string; standard_price: string | null; unit: string | null }[]> {
  return queryRows(
    db,
    `SELECT p.product_code, p.product_name, p.standard_price::text AS standard_price, u.unit_name AS unit
       FROM stockflow.mst_products p LEFT JOIN stockflow.mst_units u ON u.unit_id = p.base_unit_id
      WHERE p.product_code LIKE $1 ORDER BY p.product_code`,
    [`${prefix}%`]
  );
}
