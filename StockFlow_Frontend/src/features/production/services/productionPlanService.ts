// src/features/production/services/productionPlanService.ts
// Kết nối API Kế hoạch sản xuất (/api/production/plans, UC-PP-01..06)

import { apiClient } from '@/lib/api/client';
import type {
  PlanMaterialRequirements,
  ProductionOrderDetail,
  ProductionPlanDetail,
  ProductionPlanListParams,
  ProductionPlanSummary,
  SaveProductionOrderPayload,
  SaveProductionPlanPayload,
} from '../types';

const BASE = '/api/production/plans';

function qs(params: Record<string, string | number | undefined | null>): string {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    q.append(key, String(value));
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

export const productionPlanService = {
  async getPlans(params: ProductionPlanListParams): Promise<ProductionPlanSummary[]> {
    const data = await apiClient.get<ProductionPlanSummary[]>(
      `${BASE}${qs({
        statuses: params.statuses?.join(','),
        fromDate: params.fromDate,
        toDate: params.toDate,
        search: params.search?.trim(),
      })}`
    );
    return Array.isArray(data) ? data : [];
  },

  getPlan(id: number): Promise<ProductionPlanDetail> {
    return apiClient.get<ProductionPlanDetail>(`${BASE}/${id}`);
  },

  createPlan(payload: SaveProductionPlanPayload): Promise<ProductionPlanDetail> {
    return apiClient.post<ProductionPlanDetail>(BASE, payload);
  },

  updatePlan(id: number, payload: SaveProductionPlanPayload): Promise<ProductionPlanDetail> {
    return apiClient.put<ProductionPlanDetail>(`${BASE}/${id}`, payload);
  },

  submitPlan(id: number): Promise<ProductionPlanDetail> {
    return apiClient.post<ProductionPlanDetail>(`${BASE}/${id}/submit`, {});
  },

  approvePlan(id: number): Promise<ProductionPlanDetail> {
    return apiClient.post<ProductionPlanDetail>(`${BASE}/${id}/approve`, {});
  },

  rejectPlan(id: number, reason: string): Promise<ProductionPlanDetail> {
    return apiClient.post<ProductionPlanDetail>(`${BASE}/${id}/reject`, { reason });
  },

  cancelPlan(id: number, reason: string): Promise<ProductionPlanDetail> {
    return apiClient.post<ProductionPlanDetail>(`${BASE}/${id}/cancel`, { reason });
  },

  closePlan(id: number): Promise<ProductionPlanDetail> {
    return apiClient.post<ProductionPlanDetail>(`${BASE}/${id}/close`, {});
  },

  getMaterialRequirements(id: number, warehouseId?: number | null): Promise<PlanMaterialRequirements> {
    return apiClient.get<PlanMaterialRequirements>(`${BASE}/${id}/material-requirements${qs({ warehouseId })}`);
  },

  previewMaterialRequirements(
    items: { productId: number; plannedQuantity: number }[],
    warehouseId?: number | null
  ): Promise<PlanMaterialRequirements> {
    return apiClient.post<PlanMaterialRequirements>(`${BASE}/material-requirements/preview`, {
      warehouseId: warehouseId ?? null,
      items,
    });
  },

  /** Lập lệnh sản xuất từ kế hoạch đã duyệt (body giống form lập lệnh UC-59) */
  createOrderFromPlan(id: number, payload: SaveProductionOrderPayload): Promise<ProductionOrderDetail> {
    return apiClient.post<ProductionOrderDetail>(`${BASE}/${id}/orders`, payload);
  },
};
