// src/features/production/services/mrpService.ts
// Service kết nối API Hoạch định nhu cầu nguyên vật liệu (MRP)

import { apiClient } from '@/lib/api/client';
import type {
  MrpDailyRequirement,
  MrpMonthlyDemand,
  MrpProjection,
  MrpPurchaseSuggestion,
  MrpRunListItem,
  MrpRunSummary,
  MrpShortage,
  RunMrpRequest,
} from '../types';

const BASE = '/api/production/mrp';

function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    q.append(key, String(value));
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

export const mrpService = {
  /** Chạy tính toán MRP mới */
  runMrp(payload: RunMrpRequest): Promise<MrpRunSummary> {
    return apiClient.post<MrpRunSummary>(`${BASE}/runs`, payload);
  },

  /** Lịch sử các lần chạy MRP */
  async getRuns(params?: {
    fromDate?: string;
    toDate?: string;
    warehouseId?: number;
  }): Promise<MrpRunListItem[]> {
    const data = await apiClient.get<MrpRunListItem[]>(
      `${BASE}/runs${qs(params ?? {})}`
    );
    return Array.isArray(data) ? data : [];
  },

  /** Tổng quan chi tiết một lần chạy MRP */
  getRunSummary(id: number): Promise<MrpRunSummary> {
    return apiClient.get<MrpRunSummary>(`${BASE}/runs/${id}`);
  },

  /** Nhu cầu nguyên vật liệu chi tiết theo ngày */
  async getDailyRequirements(
    id: number,
    params?: { fromDate?: string; toDate?: string; materialId?: number }
  ): Promise<MrpDailyRequirement[]> {
    const data = await apiClient.get<MrpDailyRequirement[]>(
      `${BASE}/runs/${id}/daily-requirements${qs(params ?? {})}`
    );
    return Array.isArray(data) ? data : [];
  },

  /** Nhu cầu nguyên vật liệu tổng hợp theo Tháng hoặc Tuần */
  getMonthlyDemand(id: number, bucket: 'month' | 'week' = 'month'): Promise<MrpMonthlyDemand> {
    return apiClient.get<MrpMonthlyDemand>(
      `${BASE}/runs/${id}/monthly-demand${qs({ bucket })}`
    );
  },

  /** Danh sách các nguyên vật liệu bị thiếu hụt */
  async getShortages(id: number, lateOnly?: boolean): Promise<MrpShortage[]> {
    const data = await apiClient.get<MrpShortage[]>(
      `${BASE}/runs/${id}/shortages${qs({ lateOnly: lateOnly ? true : undefined })}`
    );
    return Array.isArray(data) ? data : [];
  },

  /** Chi tiết dòng biến động và tồn dự phóng của một NVL */
  getMaterialProjection(id: number, materialId: number): Promise<MrpProjection> {
    return apiClient.get<MrpProjection>(
      `${BASE}/runs/${id}/materials/${materialId}/projection`
    );
  },

  /** Danh sách đề xuất đặt mua hàng (Purchase Suggestions) */
  async getPurchaseSuggestions(
    id: number,
    status?: string
  ): Promise<MrpPurchaseSuggestion[]> {
    const data = await apiClient.get<MrpPurchaseSuggestion[]>(
      `${BASE}/runs/${id}/purchase-suggestions${qs({ status })}`
    );
    return Array.isArray(data) ? data : [];
  },
};
