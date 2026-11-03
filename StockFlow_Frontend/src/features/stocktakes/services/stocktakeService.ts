// src/features/stocktakes/services/stocktakeService.ts
// Kết nối API Kiểm kho (/api/Stocktakes)

import { apiClient } from '@/lib/api/client';
import type { SaveStocktakePayload, StocktakeDetail, StocktakeSummary } from '../types';

export const stocktakeService = {
  async getList(params?: {
    warehouseIds?: number[];
    statuses?: string[];
    fromDate?: string;
    toDate?: string;
    search?: string;
  }): Promise<StocktakeSummary[]> {
    const q = new URLSearchParams();
    if (params?.warehouseIds?.length) q.append('warehouseIds', params.warehouseIds.join(','));
    if (params?.statuses?.length) q.append('statuses', params.statuses.join(','));
    if (params?.fromDate) q.append('fromDate', params.fromDate);
    if (params?.toDate) q.append('toDate', params.toDate);
    if (params?.search?.trim()) q.append('search', params.search.trim());
    const qs = q.toString() ? `?${q.toString()}` : '';
    const data = await apiClient.get<StocktakeSummary[]>(`/api/Stocktakes${qs}`);
    return Array.isArray(data) ? data : [];
  },

  getById(id: number | string): Promise<StocktakeDetail> {
    return apiClient.get<StocktakeDetail>(`/api/Stocktakes/${id}`);
  },

  create(payload: SaveStocktakePayload): Promise<StocktakeDetail> {
    return apiClient.post<StocktakeDetail>('/api/Stocktakes', payload);
  },

  update(id: number | string, payload: SaveStocktakePayload): Promise<StocktakeDetail> {
    return apiClient.put<StocktakeDetail>(`/api/Stocktakes/${id}`, payload);
  },

  cancel(id: number | string): Promise<StocktakeDetail> {
    return apiClient.post<StocktakeDetail>(`/api/Stocktakes/${id}/cancel`, {});
  },

  /** Gộp các phiếu tạm cùng kho → 1 phiếu tạm mới, phiếu cũ chuyển sang Đã hủy */
  merge(stocktakeIds: number[]): Promise<StocktakeDetail> {
    return apiClient.post<StocktakeDetail>('/api/Stocktakes/merge', { stocktakeIds });
  },
};
