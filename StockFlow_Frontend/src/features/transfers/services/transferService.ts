// src/features/transfers/services/transferService.ts
// Kết nối API module Chuyển hàng (/api/transfers).
// Chỉ dùng dữ liệu thật từ backend: lỗi API được ném ra để màn hình báo đúng cho người dùng
// (trước đây lỗi bị nuốt và tự sửa dữ liệu trong localStorage → báo "thành công" dù DB không đổi).

import { apiClient } from '@/lib/api/client';
import type {
  TransferRecord,
  TransferDetail,
  TransferItem,
  TransferFilterState,
  TransferStatus,
  ProductForTransfer,
} from '../types';

/** Phiếu được gắn sao: tiện ích riêng từng trình duyệt */
const STAR_STORAGE_KEY = 'stockflow_transfers_starred';

interface ApiTransferList {
  stockTransferId: number;
  transferCode: string;
  transferDate?: string | null;
  receivedDate?: string | null;
  sourceWarehouseId: number;
  sourceWarehouseCode: string;
  sourceWarehouseName: string;
  destWarehouseId: number;
  destWarehouseCode: string;
  destWarehouseName: string;
  createdBy: number;
  createdByName: string;
  status: TransferStatus;
  totalQuantity: number;
  totalReceivedQuantity?: number | null;
  totalAmount: number;
  totalReceivedAmount?: number | null;
  notes?: string | null;
}

interface ApiTransferItem {
  transferItemId: number;
  productId: number;
  productCode: string;
  productName: string;
  unitName: string;
  sourceStock: number;
  destStock: number;
  transferQuantity: number;
  receivedQuantity?: number | null;
  transferPrice: number;
  lineTotal: number;
  notes?: string | null;
  receiveNotes?: string | null;
}

interface ApiTransferDetail extends ApiTransferList {
  items: ApiTransferItem[];
  receivedByName?: string | null;
  receiveNotes?: string | null;
}

interface ApiProductWithStock {
  productId: number;
  productCode: string;
  productName: string;
  unitName: string;
  costPrice: number;
  standardPrice: number;
  sourceStock: number;
  destStock: number;
  imageUrl?: string | null;
  variantsJson?: string | null;
}

export interface SaveTransferPayload {
  transferCode?: string;
  sourceWarehouseId: number;
  destWarehouseId: number;
  transferDate?: string;
  notes?: string;
  status: 'DRAFT' | 'IN_TRANSIT';
  items: { productId: number; quantity: number; transferPrice?: number; notes?: string }[];
}

function readStarred(): number[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STAR_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is number => typeof x === 'number') : [];
  } catch {
    return [];
  }
}

function writeStarred(ids: number[]): void {
  try {
    localStorage.setItem(STAR_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // bỏ qua: chỉ là tiện ích hiển thị
  }
}

function mapRecord(t: ApiTransferList, starred: number[]): TransferRecord {
  const received = t.totalReceivedQuantity ?? null;
  return {
    id: t.stockTransferId,
    code: t.transferCode,
    transferDate: t.transferDate,
    receivedDate: t.receivedDate,
    sourceWarehouseId: t.sourceWarehouseId,
    sourceWarehouseCode: t.sourceWarehouseCode,
    sourceWarehouseName: t.sourceWarehouseName,
    destWarehouseId: t.destWarehouseId,
    destWarehouseCode: t.destWarehouseCode,
    destWarehouseName: t.destWarehouseName,
    createdBy: t.createdByName || 'Nhân viên',
    status: t.status,
    totalQuantity: t.totalQuantity ?? 0,
    totalReceivedQuantity: received,
    totalAmount: t.totalAmount ?? 0,
    totalReceivedAmount: t.totalReceivedAmount ?? null,
    notes: t.notes,
    isStarred: starred.includes(t.stockTransferId),
    isMatched: received !== null ? received === (t.totalQuantity ?? 0) : null,
  };
}

function mapItem(it: ApiTransferItem): TransferItem {
  return {
    id: it.transferItemId,
    productId: it.productId,
    productCode: it.productCode,
    productName: it.productName,
    unitName: it.unitName || 'Cái',
    sourceStock: it.sourceStock ?? 0,
    destStock: it.destStock ?? 0,
    transferQuantity: it.transferQuantity ?? 0,
    receivedQuantity: it.receivedQuantity,
    transferPrice: it.transferPrice ?? 0,
    lineTotal: it.lineTotal ?? 0,
    notes: it.notes ?? undefined,
    receiveNotes: it.receiveNotes ?? undefined,
  };
}

function mapDetail(d: ApiTransferDetail): TransferDetail {
  return { ...mapRecord(d, readStarred()), receivedBy: d.receivedByName ?? null, receiveNotes: d.receiveNotes ?? null, items: (d.items ?? []).map(mapItem) };
}

export const transferService = {
  async getTransfers(filters?: Partial<TransferFilterState>): Promise<TransferRecord[]> {
    const params = new URLSearchParams();
    if (filters?.sourceWarehouseId && filters.sourceWarehouseId !== 'ALL') {
      params.append('sourceWarehouseId', String(filters.sourceWarehouseId));
    }
    if (filters?.destWarehouseId && filters.destWarehouseId !== 'ALL') {
      params.append('destWarehouseId', String(filters.destWarehouseId));
    }
    if (filters?.statuses && filters.statuses.length > 0) params.append('status', filters.statuses.join(','));
    if (filters?.dateType) params.append('dateType', filters.dateType);
    if (filters?.dateFrom) params.append('fromDate', filters.dateFrom);
    if (filters?.dateTo) params.append('toDate', filters.dateTo);
    if (filters?.search?.trim()) params.append('search', filters.search.trim());

    const qs = params.toString() ? `?${params.toString()}` : '';
    const data = await apiClient.get<ApiTransferList[]>(`/api/transfers${qs}`);
    const starred = readStarred();
    let list = (Array.isArray(data) ? data : []).map((t) => mapRecord(t, starred));

    // Tình trạng nhận hàng (Khớp / Không khớp) chỉ áp dụng cho phiếu đã nhận
    if (filters?.matchStatus && filters.matchStatus !== 'ALL') {
      const wantMatched = filters.matchStatus === 'MATCHED';
      list = list.filter((t) => t.status === 'RECEIVED' && t.isMatched === wantMatched);
    }
    return list;
  },

  async getTransferById(id: number): Promise<TransferDetail> {
    const data = await apiClient.get<ApiTransferDetail>(`/api/transfers/${id}`);
    return mapDetail(data);
  },

  /** Hàng hóa kèm tồn kho 2 đầu và giá vốn tại kho xuất */
  async getProductsForTransfer(
    sourceWarehouseId: number,
    destWarehouseId?: number,
    search?: string
  ): Promise<ProductForTransfer[]> {
    const params = new URLSearchParams();
    params.append('sourceWarehouseId', String(sourceWarehouseId));
    if (destWarehouseId) params.append('destWarehouseId', String(destWarehouseId));
    if (search?.trim()) params.append('search', search.trim());
    const data = await apiClient.get<ApiProductWithStock[]>(`/api/transfers/products-for-transfer?${params.toString()}`);
    return (Array.isArray(data) ? data : []).map((p) => ({
      productId: p.productId,
      productCode: p.productCode,
      productName: p.productName,
      unitName: p.unitName || 'Cái',
      costPrice: p.costPrice ?? 0,
      standardPrice: p.standardPrice ?? 0,
      sourceStock: p.sourceStock ?? 0,
      destStock: p.destStock ?? 0,
      imageUrl: p.imageUrl ?? null,
      variantsJson: p.variantsJson ?? null,
    }));
  },

  /** Tạo phiếu: DRAFT = Lưu tạm, IN_TRANSIT = Hoàn thành (xuất hàng, trừ tồn kho xuất) */
  async createTransfer(payload: SaveTransferPayload): Promise<TransferDetail> {
    const data = await apiClient.post<ApiTransferDetail>('/api/transfers', payload);
    return mapDetail(data);
  },

  /** Sửa phiếu tạm (kho nhận, ngày chuyển, ghi chú, danh sách hàng) */
  async updateTransfer(
    id: number,
    payload: {
      destWarehouseId: number;
      transferDate?: string;
      notes?: string;
      items: { productId: number; quantity: number; transferPrice?: number; notes?: string }[];
    }
  ): Promise<TransferDetail> {
    const data = await apiClient.put<ApiTransferDetail>(`/api/transfers/${id}`, payload);
    return mapDetail(data);
  },

  /** Xuất hàng phiếu tạm → Đang chuyển (trừ tồn kho xuất) */
  async completeTransfer(id: number): Promise<TransferDetail> {
    const data = await apiClient.post<ApiTransferDetail>(`/api/transfers/${id}/complete`, {});
    return mapDetail(data);
  },

  /** Kho nhận xác nhận nhận hàng (cộng đúng SL nhận vào kho nhận) */
  async receiveTransfer(
    id: number,
    payload: {
      receivedDate?: string;
      notes?: string;
      items?: { productId: number; receivedQuantity: number; transferItemId?: number; notes?: string }[];
    }
  ): Promise<TransferDetail> {
    const data = await apiClient.post<ApiTransferDetail>(`/api/transfers/${id}/receive`, payload);
    return mapDetail(data);
  },

  /** Sửa ghi chú chuyển / ghi chú nhận (undefined = giữ nguyên, '' = xóa) */
  async updateNotes(id: number, payload: { notes?: string; receiveNotes?: string }): Promise<TransferDetail> {
    const data = await apiClient.put<ApiTransferDetail>(`/api/transfers/${id}/notes`, payload);
    return mapDetail(data);
  },

  /** Hủy phiếu: hoàn tồn kho xuất (và trừ lại kho nhận nếu đã nhận) */
  async cancelTransfer(id: number, reason?: string): Promise<boolean> {
    await apiClient.post<unknown>(`/api/transfers/${id}/cancel`, { reason });
    return true;
  },

  /** Gắn / bỏ sao một phiếu (lưu trên trình duyệt này) */
  toggleStar(id: number): boolean {
    const starred = readStarred();
    const next = starred.includes(id) ? starred.filter((x) => x !== id) : [...starred, id];
    writeStarred(next);
    return next.includes(id);
  },
};
