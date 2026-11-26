// Arrange cho phân hệ Mua hàng (UC-30, UC-31) qua API: phiếu đặt hàng nhập, phiếu nhập theo phiếu đặt.
// Chỉ dựng tiền đề; thao tác đang kiểm luôn làm qua UI.
import type { ApiSession } from './api';
import { WAREHOUSES, type WarehouseCode } from './accounts';
import { docRef, type DocRef } from './inventory';

export interface SupplierRef {
  id: number;
  code: string;
  name: string;
}

interface SupplierRow {
  partnerId?: number;
  id?: number | string;
  partnerCode?: string;
  code?: string;
  partnerName?: string;
  name?: string;
}

/** Nhà cung cấp seed (thứ tự theo API), dùng nhiều NCC để kiểm bộ lọc */
export async function suppliers(api: ApiSession): Promise<SupplierRef[]> {
  const rows = await api.get<SupplierRow[]>('/api/suppliers');
  return rows.map((s) => ({
    id: Number(s.partnerId ?? s.id),
    code: String(s.partnerCode ?? s.code ?? ''),
    name: String(s.partnerName ?? s.name ?? ''),
  }));
}

export interface PoLine {
  productId: number;
  qty: number;
  price: number;
}

interface PoDetailDto {
  poId: number;
  poCode: string;
  status: string;
  totalAmount: number;
}

/** Tạo phiếu đặt hàng nhập (DRAFT / ORDERED); phản hồi chỉ có poId nên đọc lại mã phiếu */
export async function createPo(api: ApiSession, opts: { wh: WarehouseCode; partnerId: number; status: 'DRAFT' | 'ORDERED'; lines: PoLine[] }): Promise<DocRef> {
  const res = await api.post<{ poId: number }>('/api/purchase-orders', {
    warehouseId: WAREHOUSES[opts.wh].id,
    partnerId: opts.partnerId,
    status: opts.status,
    items: opts.lines.map((l) => ({ productId: l.productId, quantity: l.qty, unitPrice: l.price })),
  });
  const d = await api.get<PoDetailDto>(`/api/purchase-orders/${res.poId}`);
  return { id: d.poId, code: d.poCode };
}

/** Nhập hàng theo phiếu đặt (đã hoàn thành) – dựng phiếu đặt "Nhập một phần" / "Hoàn thành" */
export async function receivePoViaApi(
  api: ApiSession,
  opts: { poId: number; wh: WarehouseCode; partnerId: number; lines: (PoLine & { defect?: number })[]; status?: 'DRAFT' | 'COMPLETED' }
): Promise<DocRef> {
  const res = await api.post<{ grId: number; grCode: string }>('/api/purchases', {
    warehouseId: WAREHOUSES[opts.wh].id,
    partnerId: opts.partnerId,
    purchaseOrderId: opts.poId,
    status: opts.status ?? 'COMPLETED',
    paidAmount: 0,
    paymentMethod: 'CASH',
    items: opts.lines.map((l) => ({ productId: l.productId, quantity: l.qty, unitPrice: l.price, defectQuantity: l.defect ?? 0 })),
  });
  return { id: res.grId, code: res.grCode };
}

export async function cancelPoViaApi(api: ApiSession, poId: number): Promise<void> {
  await api.post(`/api/purchase-orders/${poId}/cancel`);
}

/** Bằng chứng backend cho ca UI chặn: sửa phiếu đặt với dữ liệu cho trước */
export function updatePoPayload(partnerId: number, lines: PoLine[], status: 'DRAFT' | 'ORDERED' = 'ORDERED'): Record<string, unknown> {
  return { partnerId, status, items: lines.map((l) => ({ productId: l.productId, quantity: l.qty, unitPrice: l.price })) };
}

/** Phiếu nhập trực tiếp (không theo phiếu đặt) đã hoàn thành / lưu tạm – tiền đề cho ca hủy phiếu nhập, trả hàng nhập */
export async function directReceiptViaApi(
  api: ApiSession,
  opts: { wh: WarehouseCode; partnerId: number; lines: PoLine[]; status?: 'DRAFT' | 'COMPLETED'; paid?: number }
): Promise<DocRef> {
  const res = await api.post<{ grId: number; grCode: string }>('/api/purchases', {
    warehouseId: WAREHOUSES[opts.wh].id,
    partnerId: opts.partnerId,
    status: opts.status ?? 'COMPLETED',
    paidAmount: opts.paid ?? 0,
    paymentMethod: 'CASH',
    items: opts.lines.map((l) => ({ productId: l.productId, quantity: l.qty, unitPrice: l.price })),
  });
  return { id: res.grId, code: res.grCode };
}

interface ReturnSource {
  partnerId: number;
  warehouseId: number;
  items: { grItemId: number; productId: number; importPrice: number; remainingQty: number }[];
}

/** Phiếu trả hàng nhập theo phiếu nhập (DRAFT / COMPLETED) – lấy dòng nguồn từ /api/PurchaseReturns/source/{grId} */
export async function purchaseReturnViaApi(
  api: ApiSession,
  opts: { grId: number; productId: number; qty: number; status: 'DRAFT' | 'COMPLETED' }
): Promise<DocRef> {
  const src = await api.get<ReturnSource>(`/api/PurchaseReturns/source/${opts.grId}`);
  const it = src.items.find((i) => i.productId === opts.productId);
  if (!it) throw new Error(`Phiếu nhập ${opts.grId} không có hàng ${opts.productId}`);
  const res = await api.post<{ purchaseReturnId?: number; returnCode?: string }>('/api/PurchaseReturns', {
    partnerId: src.partnerId,
    warehouseId: src.warehouseId,
    grId: opts.grId,
    status: opts.status,
    items: [{ productId: opts.productId, quantity: opts.qty, returnPrice: it.importPrice, grItemId: it.grItemId }],
  });
  // Phản hồi có cả grId lẫn purchaseReturnId → đọc thẳng purchaseReturnId (docRef ưu tiên grId)
  if (typeof res.purchaseReturnId === 'number' && res.returnCode) return { id: res.purchaseReturnId, code: res.returnCode };
  return docRef(res);
}
