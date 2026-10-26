// src/features/purchases/services/purchaseService.ts
// Service kết nối RESTful API Phiếu nhập hàng (.NET 9 CQRS)

import { apiClient } from '@/lib/api/client';
import {
  PurchaseListRecord,
  PurchaseDetail,
  CreatePurchasePayload,
  UpdatePurchasePayload,
  CompletePurchasePayload,
  CancelPurchasePayload,
} from '../types';

export const purchaseService = {
  /**
   * Lấy danh sách phiếu nhập hàng theo bộ lọc chi nhánh/kho, trạng thái, ngày, NCC
   */
  async getPurchases(params?: {
    warehouseId?: number;
    warehouseIds?: number[] | string;
    status?: string;
    fromDate?: string;
    toDate?: string;
    partnerId?: number;
    search?: string;
  }): Promise<PurchaseListRecord[]> {
    try {
      const query = new URLSearchParams();
      if (params?.warehouseId && params.warehouseId > 0) {
        query.append('warehouseId', String(params.warehouseId));
      }
      if (params?.warehouseIds) {
        const whIdsStr = Array.isArray(params.warehouseIds)
          ? params.warehouseIds.join(',')
          : params.warehouseIds;
        if (whIdsStr) query.append('warehouseIds', whIdsStr);
      }
      if (params?.status && params.status !== 'ALL') {
        query.append('status', params.status);
      }
      if (params?.fromDate) {
        query.append('fromDate', params.fromDate);
      }
      if (params?.toDate) {
        query.append('toDate', params.toDate);
      }
      if (params?.partnerId && params.partnerId > 0) {
        query.append('partnerId', String(params.partnerId));
      }
      if (params?.search && params.search.trim()) {
        query.append('search', params.search.trim());
      }

      const qs = query.toString() ? `?${query.toString()}` : '';
      const data = await apiClient.get<PurchaseListRecord[]>(`/api/purchases${qs}`);
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Lỗi khi tải danh sách phiếu nhập hàng:', err);
      throw err;
    }
  },

  /**
   * Lấy thông tin chi tiết một phiếu nhập hàng kèm danh sách mặt hàng
   */
  async getPurchaseById(id: number | string): Promise<PurchaseDetail> {
    try {
      return await apiClient.get<PurchaseDetail>(`/api/purchases/${id}`);
    } catch (err) {
      console.error(`Lỗi khi lấy chi tiết phiếu nhập #${id}:`, err);
      throw err;
    }
  },

  /**
   * Tạo phiếu nhập hàng mới (Lưu tạm DRAFT hoặc Hoàn thành COMPLETED)
   */
  async createPurchase(payload: CreatePurchasePayload): Promise<PurchaseDetail> {
    try {
      return await apiClient.post<PurchaseDetail>('/api/purchases', payload);
    } catch (err) {
      console.error('Lỗi khi tạo phiếu nhập hàng:', err);
      throw err;
    }
  },

  /**
   * Cập nhật thông tin phiếu nhập đang ở trạng thái DRAFT
   */
  async updatePurchase(id: number | string, payload: UpdatePurchasePayload): Promise<PurchaseDetail> {
    try {
      return await apiClient.put<PurchaseDetail>(`/api/purchases/${id}`, payload);
    } catch (err) {
      console.error(`Lỗi khi cập nhật phiếu nhập #${id}:`, err);
      throw err;
    }
  },

  /**
   * Xác nhận hoàn thành nhập kho cho phiếu tạm (DRAFT -> COMPLETED)
   */
  async completePurchase(id: number | string, payload: CompletePurchasePayload): Promise<PurchaseDetail> {
    try {
      return await apiClient.patch<PurchaseDetail>(`/api/purchases/${id}/complete`, payload);
    } catch (err) {
      console.error(`Lỗi khi hoàn thành phiếu nhập #${id}:`, err);
      throw err;
    }
  },

  /**
   * Hủy phiếu nhập tạm (DRAFT -> CANCELLED)
   */
  async cancelPurchase(id: number | string, payload?: CancelPurchasePayload): Promise<{ success: boolean; message: string }> {
    try {
      return await apiClient.patch<{ success: boolean; message: string }>(`/api/purchases/${id}/cancel`, payload || {});
    } catch (err) {
      console.error(`Lỗi khi hủy phiếu nhập #${id}:`, err);
      throw err;
    }
  },
};
