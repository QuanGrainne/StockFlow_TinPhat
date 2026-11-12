// src/features/sales-returns/services/salesReturnService.ts
// Service API Trả hàng (khách trả lại hàng theo hóa đơn)

import { apiClient } from '@/lib/api/client';
import type {
  CreateSalesReturnPayload,
  SalesReturnDetail,
  SalesReturnListFilter,
  SalesReturnListItem,
  SalesReturnResult,
  SalesReturnSource,
} from '../types';

export const salesReturnService = {
  async getReturns(filter: SalesReturnListFilter): Promise<SalesReturnListItem[]> {
    const qs = new URLSearchParams();
    if (filter.warehouseIds?.length) qs.set('warehouseIds', filter.warehouseIds.join(','));
    if (filter.statuses?.length) qs.set('status', filter.statuses.join(','));
    if (filter.fromDate) qs.set('fromDate', filter.fromDate);
    if (filter.toDate) qs.set('toDate', filter.toDate);
    if (filter.search?.trim()) qs.set('search', filter.search.trim());
    const data = await apiClient.get<SalesReturnListItem[]>(`/api/sales-returns?${qs.toString()}`);
    return Array.isArray(data) ? data : [];
  },

  getReturn(id: number): Promise<SalesReturnDetail> {
    return apiClient.get<SalesReturnDetail>(`/api/sales-returns/${id}`);
  },

  /** Hàng của hóa đơn gốc kèm SL còn được trả */
  getSource(invoiceId: number): Promise<SalesReturnSource> {
    return apiClient.get<SalesReturnSource>(`/api/sales-returns/source/${invoiceId}`);
  },

  createReturn(payload: CreateSalesReturnPayload): Promise<SalesReturnResult> {
    return apiClient.post<SalesReturnResult>('/api/sales-returns', payload);
  },

  async cancelReturn(id: number): Promise<void> {
    await apiClient.post(`/api/sales-returns/${id}/cancel`, {});
  },

  /** Trả thêm tiền cho khách (phần chưa trả lúc trả hàng) */
  addRefund(
    id: number,
    payload: { amount: number; paymentMethod: 'CASH' | 'VIETQR'; refundDate?: string; notes?: string | null }
  ): Promise<SalesReturnResult> {
    return apiClient.post<SalesReturnResult>(`/api/sales-returns/${id}/refunds`, payload);
  },

  async updateNotes(id: number, notes: string | null): Promise<void> {
    await apiClient.patch(`/api/sales-returns/${id}/notes`, { notes });
  },
};
