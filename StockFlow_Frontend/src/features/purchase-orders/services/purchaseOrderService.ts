// src/features/purchase-orders/services/purchaseOrderService.ts
// Service API Phiếu đặt hàng nhập

import { apiClient } from '@/lib/api/client';
import type {
  PurchaseOrderDetail,
  PurchaseOrderListFilter,
  PurchaseOrderListItem,
  ReceivePurchaseOrderPayload,
  SavePurchaseOrderPayload,
} from '../types';

export const purchaseOrderService = {
  async getPurchaseOrders(filter: PurchaseOrderListFilter): Promise<PurchaseOrderListItem[]> {
    const qs = new URLSearchParams();
    if (filter.warehouseIds?.length) qs.set('warehouseIds', filter.warehouseIds.join(','));
    if (filter.statuses?.length) qs.set('status', filter.statuses.join(','));
    if (filter.fromDate) qs.set('fromDate', filter.fromDate);
    if (filter.toDate) qs.set('toDate', filter.toDate);
    if (filter.partnerId) qs.set('partnerId', String(filter.partnerId));
    if (filter.search?.trim()) qs.set('search', filter.search.trim());
    const data = await apiClient.get<PurchaseOrderListItem[]>(`/api/purchase-orders?${qs.toString()}`);
    return Array.isArray(data) ? data : [];
  },

  getPurchaseOrder(id: number | string): Promise<PurchaseOrderDetail> {
    return apiClient.get<PurchaseOrderDetail>(`/api/purchase-orders/${id}`);
  },

  /** Tra phiếu theo mã PDN (link chỉ có mã, VD phiếu gộp, PO trên phiếu nhập) */
  getPurchaseOrderByCode(code: string): Promise<PurchaseOrderDetail> {
    return apiClient.get<PurchaseOrderDetail>(`/api/purchase-orders/by-code/${encodeURIComponent(code)}`);
  },

  createPurchaseOrder(payload: SavePurchaseOrderPayload): Promise<{ poId: number }> {
    return apiClient.post<{ poId: number }>('/api/purchase-orders', payload);
  },

  updatePurchaseOrder(id: number | string, payload: SavePurchaseOrderPayload): Promise<{ poId: number }> {
    return apiClient.put<{ poId: number }>(`/api/purchase-orders/${id}`, payload);
  },

  async cancelPurchaseOrder(id: number): Promise<void> {
    await apiClient.post(`/api/purchase-orders/${id}/cancel`, {});
  },

  async updateNotes(id: number, notes: string): Promise<void> {
    await apiClient.patch(`/api/purchase-orders/${id}/notes`, { notes });
  },

  /** Gộp các phiếu cùng NCC, cùng kho thành 1 phiếu mới; phiếu gốc chuyển Đã hủy */
  mergePurchaseOrders(poIds: number[]): Promise<{ poId: number }> {
    return apiClient.post<{ poId: number }>('/api/purchase-orders/merge', { poIds });
  },

  /** Kết thúc phiếu đang nhập một phần: không nhập thêm phần còn thiếu */
  async finishPurchaseOrder(id: number): Promise<void> {
    await apiClient.post(`/api/purchase-orders/${id}/finish`, {});
  },

  /** Nhập hàng ngay trong phiếu đặt: tự sinh phiếu nhập Hoàn thành, trả về phiếu đặt sau khi cập nhật */
  receivePurchaseOrder(id: number, payload: ReceivePurchaseOrderPayload): Promise<PurchaseOrderDetail> {
    return apiClient.post<PurchaseOrderDetail>(`/api/purchase-orders/${id}/receive`, payload);
  },
};
