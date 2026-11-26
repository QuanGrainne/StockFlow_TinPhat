// Arrange chứng từ kho ở trạng thái Phiếu tạm (DRAFT) qua API – chỉ dựng tiền đề (vd SYS-WHA-02 cô lập theo kho).
import type { ApiSession } from './api';
import { WAREHOUSES, type WarehouseCode } from './accounts';

export interface DocRef {
  id: number;
  code: string;
}

/** Lấy id / mã chứng từ từ phản hồi (mỗi module đặt tên khác nhau) */
export function docRef(body: unknown): DocRef {
  const raw = (body ?? {}) as Record<string, unknown>;
  // Một số module bọc thông tin chứng từ trong "summary" (vd DisposalDetailDto)
  const o = (raw.summary && typeof raw.summary === 'object' ? raw.summary : raw) as Record<string, unknown>;
  // Khoá id của chứng từ: ưu tiên tên đã biết (vd stockTransferId), sau đó mới tới khoá *Id đầu tiên
  const known = ['stockTransferId', 'grId', 'poId', 'disposalId', 'stocktakeId', 'purchaseReturnId', 'returnRequestId', 'id'];
  const idKey = known.find((k) => typeof o[k] === 'number') ?? Object.keys(o).find((k) => /^[a-z][A-Za-z]*Id$/.test(k) && typeof o[k] === 'number');
  const codeKey = Object.keys(o).find((k) => /code$/i.test(k) && typeof o[k] === 'string' && (o[k] as string).length > 0);
  return { id: idKey ? (o[idKey] as number) : Number(o.id ?? 0), code: codeKey ? (o[codeKey] as string) : '' };
}

export async function draftTransfer(api: ApiSession, from: WarehouseCode, to: WarehouseCode, productId: number, qty: number): Promise<DocRef> {
  return docRef(
    await api.post('/api/transfers', {
      sourceWarehouseId: WAREHOUSES[from].id,
      destWarehouseId: WAREHOUSES[to].id,
      status: 'DRAFT',
      items: [{ productId, quantity: qty }],
    })
  );
}

export async function firstSupplierId(api: ApiSession): Promise<number> {
  const list = await api.get<{ partnerId?: number; id?: number | string }[]>('/api/suppliers');
  const s = list[0];
  return Number(s?.partnerId ?? s?.id);
}

export async function draftPurchase(api: ApiSession, wh: WarehouseCode, productId: number, qty: number, price: number): Promise<DocRef> {
  return docRef(
    await api.post('/api/purchases', {
      warehouseId: WAREHOUSES[wh].id,
      partnerId: await firstSupplierId(api),
      status: 'DRAFT',
      paidAmount: 0,
      paymentMethod: 'CASH',
      items: [{ productId, quantity: qty, unitPrice: price }],
    })
  );
}

/** Phiếu kiểm DRAFT khoá biến động của hàng trong phiếu (BR-56) → test phải huỷ trong finally */
export async function draftStocktake(api: ApiSession, wh: WarehouseCode, productId: number, actual: number): Promise<DocRef> {
  return docRef(
    await api.post('/api/stocktakes', { warehouseId: WAREHOUSES[wh].id, status: 'DRAFT', items: [{ productId, actualQty: actual }] })
  );
}

export async function cancelStocktake(api: ApiSession, id: number): Promise<void> {
  await api.post(`/api/stocktakes/${id}/cancel`);
}

export async function draftDisposal(api: ApiSession, wh: WarehouseCode, productId: number, qty: number): Promise<DocRef> {
  return docRef(
    await api.post('/api/disposals', {
      warehouseId: WAREHOUSES[wh].id,
      reason: 'E2E arrange',
      status: 'DRAFT',
      items: [{ productId, quantity: qty }],
    })
  );
}

/** Phiếu chuyển đã xuất (IN_TRANSIT): tạo phiếu tạm rồi xuất chuyển (POST /complete) */
export async function inTransitTransfer(api: ApiSession, from: WarehouseCode, to: WarehouseCode, productId: number, qty: number): Promise<DocRef> {
  const t = await draftTransfer(api, from, to, productId, qty);
  await api.post(`/api/transfers/${t.id}/complete`);
  return t;
}

interface TransferDetailItem {
  transferItemId: number;
  productId: number;
  transferQuantity: number;
}

/** Bằng chứng backend: xác nhận nhận hàng với số lượng cho trước */
export async function receiveTransferViaApi(api: ApiSession, transferId: number, receivedDate: string, qty: number, notes = ''): Promise<unknown> {
  const d = await api.get<{ items: TransferDetailItem[] }>(`/api/transfers/${transferId}`);
  return api.post(`/api/transfers/${transferId}/receive`, {
    receivedDate,
    notes,
    items: d.items.map((it) => ({ transferItemId: it.transferItemId, productId: it.productId, receivedQuantity: qty })),
  });
}
