// src/features/production/services/productionService.ts
// Kết nối API Sản xuất (/api/production) và Định mức BOM (/api/production/boms)

import { apiClient } from '@/lib/api/client';
import type {
  AdjustNormLine,
  ApproveProductionOrderPayload,
  BomDetail,
  BomSummary,
  CreateFinishedGoodsReceiptPayload,
  CreateMaterialIssuePayload,
  FinishedGoodsCheck,
  FinishedGoodsReceipt,
  MaterialIssue,
  ProductionOrderDetail,
  ProductionOrderSummary,
  ProductionProductLookup,
  RequirementPreview,
  SaveBomPayload,
  SaveProductionOrderPayload,
  WarehouseLocation,
} from '../types';

function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    q.append(key, String(value));
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

const asList = <T>(data: T[] | null | undefined): T[] => (Array.isArray(data) ? data : []);

export const productionService = {
  // ─── BOM ──────────────────────────────────────────────────────────────────
  async getBoms(params?: { isActive?: boolean; search?: string; productId?: number }): Promise<BomSummary[]> {
    return asList(await apiClient.get<BomSummary[]>(`/api/production/boms${qs({ ...params })}`));
  },

  getBom(id: number): Promise<BomDetail> {
    return apiClient.get<BomDetail>(`/api/production/boms/${id}`);
  },

  createBom(payload: SaveBomPayload): Promise<BomDetail> {
    return apiClient.post<BomDetail>('/api/production/boms', payload);
  },

  updateBom(id: number, payload: SaveBomPayload): Promise<BomDetail> {
    return apiClient.put<BomDetail>(`/api/production/boms/${id}`, payload);
  },

  activateBom(id: number): Promise<BomDetail> {
    return apiClient.post<BomDetail>(`/api/production/boms/${id}/activate`, {});
  },

  deactivateBom(id: number): Promise<BomDetail> {
    return apiClient.post<BomDetail>(`/api/production/boms/${id}/deactivate`, {});
  },

  deleteBom(id: number): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/api/production/boms/${id}`);
  },

  // ─── Lệnh sản xuất ────────────────────────────────────────────────────────
  async getOrders(params: {
    statuses?: string[];
    fromDate?: string;
    toDate?: string;
    search?: string;
    needsReviewOnly?: boolean;
  }): Promise<ProductionOrderSummary[]> {
    return asList(
      await apiClient.get<ProductionOrderSummary[]>(
        `/api/production/orders${qs({
          statuses: params.statuses?.join(','),
          fromDate: params.fromDate,
          toDate: params.toDate,
          search: params.search?.trim(),
          needsReviewOnly: params.needsReviewOnly || undefined,
        })}`
      )
    );
  },

  getOrder(id: number, warehouseId?: number | null): Promise<ProductionOrderDetail> {
    return apiClient.get<ProductionOrderDetail>(`/api/production/orders/${id}${qs({ warehouseId })}`);
  },

  getRequirementPreview(productId: number, plannedQuantity: number, warehouseId?: number | null): Promise<RequirementPreview> {
    return apiClient.get<RequirementPreview>(
      `/api/production/orders/requirement-preview${qs({ productId, plannedQuantity, warehouseId })}`
    );
  },

  createOrder(payload: SaveProductionOrderPayload): Promise<ProductionOrderDetail> {
    return apiClient.post<ProductionOrderDetail>('/api/production/orders', payload);
  },

  updateOrder(id: number, payload: SaveProductionOrderPayload): Promise<ProductionOrderDetail> {
    return apiClient.put<ProductionOrderDetail>(`/api/production/orders/${id}`, payload);
  },

  cancelOrder(id: number): Promise<ProductionOrderDetail> {
    return apiClient.post<ProductionOrderDetail>(`/api/production/orders/${id}/cancel`, {});
  },

  closeOrder(id: number, reason: string): Promise<ProductionOrderDetail> {
    return apiClient.post<ProductionOrderDetail>(`/api/production/orders/${id}/close`, { reason });
  },

  /** Duyệt hoàn thành: tự sinh phiếu nhập thành phẩm theo SL thực tế và đóng lệnh */
  approveOrder(id: number, payload: ApproveProductionOrderPayload): Promise<ProductionOrderDetail> {
    return apiClient.post<ProductionOrderDetail>(`/api/production/orders/${id}/approve`, payload);
  },

  adjustNorms(id: number, reason: string, lines: AdjustNormLine[]): Promise<ProductionOrderDetail> {
    return apiClient.post<ProductionOrderDetail>(`/api/production/orders/${id}/adjust-norms`, { reason, lines });
  },

  // ─── Xuất NVL ─────────────────────────────────────────────────────────────
  async getMaterialIssues(params: {
    warehouseIds?: number[];
    fromDate?: string;
    toDate?: string;
    search?: string;
    isSupplementary?: boolean;
  }): Promise<MaterialIssue[]> {
    return asList(
      await apiClient.get<MaterialIssue[]>(
        `/api/production/material-issues${qs({
          warehouseIds: params.warehouseIds?.join(','),
          fromDate: params.fromDate,
          toDate: params.toDate,
          search: params.search?.trim(),
          isSupplementary: params.isSupplementary,
        })}`
      )
    );
  },

  createMaterialIssue(payload: CreateMaterialIssuePayload): Promise<MaterialIssue> {
    return apiClient.post<MaterialIssue>('/api/production/material-issues', payload);
  },

  // ─── Nhập thành phẩm ──────────────────────────────────────────────────────
  async getFinishedGoodsReceipts(params: {
    warehouseIds?: number[];
    fromDate?: string;
    toDate?: string;
    search?: string;
    needsReviewOnly?: boolean;
  }): Promise<FinishedGoodsReceipt[]> {
    return asList(
      await apiClient.get<FinishedGoodsReceipt[]>(
        `/api/production/finished-goods-receipts${qs({
          warehouseIds: params.warehouseIds?.join(','),
          fromDate: params.fromDate,
          toDate: params.toDate,
          search: params.search?.trim(),
          needsReviewOnly: params.needsReviewOnly || undefined,
        })}`
      )
    );
  },

  checkFinishedGoodsReceipt(
    productionOrderId: number,
    acceptedQuantity: number,
    defectQuantity: number,
    productionOrderItemId?: number | null,
    productId?: number | null
  ): Promise<FinishedGoodsCheck> {
    return apiClient.get<FinishedGoodsCheck>(
      `/api/production/finished-goods-receipts/check${qs({
        productionOrderId,
        acceptedQuantity,
        defectQuantity,
        productionOrderItemId,
        productId,
      })}`
    );
  },

  createFinishedGoodsReceipt(payload: CreateFinishedGoodsReceiptPayload): Promise<FinishedGoodsReceipt> {
    return apiClient.post<FinishedGoodsReceipt>('/api/production/finished-goods-receipts', payload);
  },

  // ─── Tra cứu ──────────────────────────────────────────────────────────────
  async searchProducts(params: {
    search?: string;
    warehouseId?: number | null;
    activeBomOnly?: boolean;
    productType?: string;
    limit?: number;
  }): Promise<ProductionProductLookup[]> {
    return asList(
      await apiClient.get<ProductionProductLookup[]>(
        `/api/production/lookups/products${qs({
          search: params.search?.trim(),
          warehouseId: params.warehouseId,
          activeBomOnly: params.activeBomOnly || undefined,
          productType: params.productType || undefined,
          limit: params.limit,
        })}`
      )
    );
  },

  async getLocations(warehouseId: number): Promise<WarehouseLocation[]> {
    return asList(await apiClient.get<WarehouseLocation[]>(`/api/production/lookups/locations${qs({ warehouseId })}`));
  },
};
