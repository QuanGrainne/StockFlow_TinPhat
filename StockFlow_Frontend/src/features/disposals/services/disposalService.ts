// src/features/disposals/services/disposalService.ts
// Kết nối API Xuất hủy (/api/Disposals)

import { apiClient } from '@/lib/api/client';
import type { DisposalDetail, DisposalSummary, SaveDisposalPayload } from '../types';

export const disposalService = {
  async getList(params?: {
    warehouseIds?: number[];
    statuses?: string[];
    fromDate?: string;
    toDate?: string;
  }): Promise<DisposalSummary[]> {
    const q = new URLSearchParams();
    if (params?.warehouseIds?.length) q.append('warehouseIds', params.warehouseIds.join(','));
    if (params?.statuses?.length) q.append('statuses', params.statuses.join(','));
    if (params?.fromDate) q.append('fromDate', params.fromDate);
    if (params?.toDate) q.append('toDate', params.toDate);
    const qs = q.toString() ? `?${q.toString()}` : '';
    const data = await apiClient.get<DisposalSummary[]>(`/api/Disposals${qs}`);
    return Array.isArray(data) ? data : [];
  },

  getById(id: number | string): Promise<DisposalDetail> {
    return apiClient.get<DisposalDetail>(`/api/Disposals/${id}`);
  },

  /** Lưu tạm (status DRAFT) hoặc Hoàn thành (status COMPLETED — trừ tồn kho) */
  create(payload: SaveDisposalPayload): Promise<DisposalDetail> {
    return apiClient.post<DisposalDetail>('/api/Disposals', payload);
  },

  /** Sửa phiếu tạm; status COMPLETED thì hoàn thành phiếu */
  update(id: number | string, payload: SaveDisposalPayload): Promise<DisposalDetail> {
    return apiClient.put<DisposalDetail>(`/api/Disposals/${id}`, payload);
  },
};
