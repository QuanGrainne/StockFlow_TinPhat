// src/features/purchase-returns/services/purchaseReturnService.ts
// Kết nối API Trả hàng nhập (/api/PurchaseReturns)

import { apiClient } from '@/lib/api/client';
import type {
  CreateSupplierRefundPayload,
  PurchaseReturnDetail,
  PurchaseReturnListRecord,
  ReturnSource,
  SavePurchaseReturnPayload,
} from '../types';

export const purchaseReturnService = {
  async getList(params?: {
    warehouseIds?: number[];
    statuses?: string[];
    fromDate?: string;
    toDate?: string;
    search?: string;
    grId?: number;
  }): Promise<PurchaseReturnListRecord[]> {
    const query = new URLSearchParams();
    if (params?.warehouseIds?.length) query.append('warehouseIds', params.warehouseIds.join(','));
    if (params?.statuses?.length) query.append('statuses', params.statuses.join(','));
    if (params?.fromDate) query.append('fromDate', params.fromDate);
    if (params?.toDate) query.append('toDate', params.toDate);
    if (params?.search?.trim()) query.append('search', params.search.trim());
    if (params?.grId) query.append('grId', String(params.grId));
    const qs = query.toString() ? `?${query.toString()}` : '';
    const data = await apiClient.get<PurchaseReturnListRecord[]>(`/api/PurchaseReturns${qs}`);
    return Array.isArray(data) ? data : [];
  },

  getById(id: number | string): Promise<PurchaseReturnDetail> {
    return apiClient.get<PurchaseReturnDetail>(`/api/PurchaseReturns/${id}`);
  },

  /** Phiếu nhập gốc + SL còn được trả từng dòng (excludeReturnId: khi sửa phiếu tạm) */
  getSource(grId: number | string, excludeReturnId?: number | string): Promise<ReturnSource> {
    const qs = excludeReturnId ? `?excludeReturnId=${excludeReturnId}` : '';
    return apiClient.get<ReturnSource>(`/api/PurchaseReturns/source/${grId}${qs}`);
  },

  create(payload: SavePurchaseReturnPayload): Promise<PurchaseReturnDetail> {
    return apiClient.post<PurchaseReturnDetail>('/api/PurchaseReturns', payload);
  },

  update(id: number | string, payload: SavePurchaseReturnPayload): Promise<PurchaseReturnDetail> {
    return apiClient.put<PurchaseReturnDetail>(`/api/PurchaseReturns/${id}`, payload);
  },

  /** Nhà cung cấp trả tiền cho phiếu trả hàng nhập (phiếu thu PT...) */
  createRefund(id: number | string, payload: CreateSupplierRefundPayload): Promise<PurchaseReturnDetail> {
    return apiClient.post<PurchaseReturnDetail>(`/api/PurchaseReturns/${id}/refunds`, payload);
  },

  cancel(id: number | string): Promise<{ success: boolean }> {
    return apiClient.patch<{ success: boolean }>(`/api/PurchaseReturns/${id}/cancel`, {});
  },
};
