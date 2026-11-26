// Arrange cho các sheet bán hàng: khách hàng, hạn mức, đơn đặt, hóa đơn POS, phiếu trả, yêu cầu tín dụng.
// Chỉ dùng để dựng TIỀN ĐỀ. Thao tác nghiệp vụ đang kiểm luôn làm qua giao diện.
import type { ApiSession } from './api';
import { WAREHOUSES, type WarehouseCode } from './accounts';

/** Đơn vị "Cái" trong seed */
export const UNIT_CAI = 8;

export interface CustomerDto {
  partnerId: number;
  code: string;
  name: string;
  phone: string;
  creditLimit: number;
  currentDebt: number;
}

/** Số điện thoại duy nhất theo hậu tố test (10 số, bắt đầu 09) */
export function phoneFrom(uid: string, salt = 0): string {
  const digits = `${uid.replace(/\D/g, '')}${salt}`;
  return `09${digits.slice(-8).padStart(8, '0')}`;
}

/** Tạo khách hàng gắn chi nhánh tạo (màn Khách hàng của nhân viên lọc theo chi nhánh) */
export async function createCustomer(
  api: ApiSession,
  opts: { suffix: string; namePrefix?: string; warehouse?: WarehouseCode; salt?: number }
): Promise<CustomerDto> {
  return api.post<CustomerDto>('/api/customers', {
    name: `${opts.namePrefix ?? 'KH E2E'} ${opts.suffix}`,
    phone: phoneFrom(opts.suffix, opts.salt ?? 0),
    createdWarehouseId: WAREHOUSES[opts.warehouse ?? 'K001'].id,
  });
}

/** Đặt hạn mức (cần quyền duyệt tín dụng: admin / manager) */
export async function setCreditLimit(api: ApiSession, partnerId: number, newLimit: number): Promise<void> {
  await api.patch(`/api/customers/${partnerId}/credit-limit`, { newLimit, reason: 'E2E arrange' });
}

export interface Line {
  productId: number;
  qty: number;
  price: number;
}

export interface OrderResult {
  orderId: number;
  orderCode: string;
  status?: string;
  totalAmount?: number;
}

export async function createBooking(
  api: ApiSession,
  opts: { partnerId: number; warehouse?: WarehouseCode; lines: Line[]; paid?: number; method?: 'CASH' | 'VIETQR' }
): Promise<OrderResult> {
  return api.post<OrderResult>('/api/sales-bookings', {
    partnerId: opts.partnerId,
    warehouseId: WAREHOUSES[opts.warehouse ?? 'K001'].id,
    paidAmount: opts.paid ?? 0,
    paymentMethod: opts.method ?? 'CASH',
    items: opts.lines.map((l) => ({ productId: l.productId, unitId: UNIT_CAI, quantity: l.qty, originalPrice: l.price })),
  });
}

/** Hóa đơn POS hoàn thành (xuất kho ngay). Lưu ý PAY-016: cùng khách + cùng tổng tiền trong 3 giây bị chặn. */
export async function createInvoice(
  api: ApiSession,
  opts: { partnerId: number; warehouse?: WarehouseCode; lines: Line[]; paid: number; method?: 'CASH' | 'VIETQR'; requestId: string }
): Promise<OrderResult> {
  const items = opts.lines.map((l) => ({
    productId: l.productId,
    quantity: l.qty,
    unitId: UNIT_CAI,
    originalPrice: l.price,
    unitPrice: l.price,
    lineTotal: l.qty * l.price,
  }));
  const total = items.reduce((s, i) => s + i.lineTotal, 0);
  return api.post<OrderResult>('/api/orders/pos', {
    partnerId: opts.partnerId,
    warehouseId: WAREHOUSES[opts.warehouse ?? 'K001'].id,
    paymentMethod: opts.method ?? 'CASH',
    subTotal: total,
    totalAmount: total,
    paidAmount: opts.paid,
    status: 'COMPLETED',
    issueStockNow: true,
    clientRequestId: opts.requestId,
    items,
  });
}

export async function cancelInvoice(api: ApiSession, orderId: number): Promise<void> {
  await api.post(`/api/orders/${orderId}/cancel`);
}

interface InvoiceDetail {
  items?: { orderItemId?: number; id?: number; productId: number }[];
}

/** Phiếu trả hàng hoàn chỉnh theo hóa đơn (tiền đề cho ca huỷ phiếu trả) */
export async function createSalesReturn(
  api: ApiSession,
  opts: { invoiceId: number; partnerId: number; warehouse?: WarehouseCode; productId: number; qty: number; price: number; refund?: number }
): Promise<OrderResult & { returnId?: number; returnCode?: string }> {
  const detail = await api.get<InvoiceDetail>(`/api/orders/${opts.invoiceId}`);
  const item = (detail.items ?? []).find((i) => i.productId === opts.productId);
  return api.post('/api/sales-returns', {
    invoiceId: opts.invoiceId,
    partnerId: opts.partnerId,
    warehouseId: WAREHOUSES[opts.warehouse ?? 'K001'].id,
    discountAmount: 0,
    returnFee: 0,
    refundAmount: opts.refund ?? 0,
    paymentMethod: 'CASH',
    notes: 'E2E arrange',
    items: [{ orderItemId: item?.orderItemId ?? item?.id ?? 0, productId: opts.productId, quantity: opts.qty, returnPrice: opts.price }],
  });
}

export interface CreditRequestDto {
  requestId?: number;
  id?: number;
  requestCode?: string;
  code?: string;
  status: string;
}

export async function createCreditRequest(
  api: ApiSession,
  opts: { partnerId: number; expectedNewDebt: number; requestedLimit?: number; reason: string }
): Promise<CreditRequestDto> {
  return api.post<CreditRequestDto>('/api/credit-requests', opts);
}

export interface RoleFeatures {
  roleCode: string;
  roleName: string;
  features: string[];
  configured: boolean;
}

export async function getFeatureMatrix(api: ApiSession): Promise<RoleFeatures[]> {
  return api.get<RoleFeatures[]>('/api/roles/feature-matrix');
}
