// src/features/suppliers/services/supplierService.ts
// Service kết nối RESTful API Nhà cung cấp với backend ASP.NET Core & MediatR

import { apiClient } from '@/lib/api/client';
import {
  Supplier,
  SupplierDetail,
  CreateSupplierPayload,
  UpdateSupplierPayload,
} from '../types';

export const supplierService = {
  /**
   * Lấy danh sách Nhà cung cấp kèm tìm kiếm và bộ lọc công nợ, trạng thái
   */
  async getSuppliers(params?: {
    search?: string;
    debtStatus?: string;
    status?: string;
  }): Promise<Supplier[]> {
    try {
      const query = new URLSearchParams();
      if (params?.search && params.search.trim()) {
        query.append('search', params.search.trim());
      }
      if (params?.debtStatus && params.debtStatus !== 'ALL') {
        query.append('debtStatus', params.debtStatus);
      }
      if (params?.status && params.status !== 'ALL') {
        query.append('status', params.status);
      }

      const qs = query.toString() ? `?${query.toString()}` : '';
      const data = await apiClient.get<Supplier[]>(`/api/Suppliers${qs}`);
      if (Array.isArray(data)) {
        return data;
      }
      return [];
    } catch (e) {
      console.error('Lỗi khi tải danh sách Nhà cung cấp:', e);
      throw e;
    }
  },

  /**
   * Lấy chi tiết hồ sơ Nhà cung cấp và lịch sử các đợt nhập kho liên kết
   */
  async getSupplierById(id: number | string): Promise<SupplierDetail> {
    try {
      return await apiClient.get<SupplierDetail>(`/api/Suppliers/${id}`);
    } catch (e) {
      console.error(`Lỗi khi lấy chi tiết Nhà cung cấp #${id}:`, e);
      throw e;
    }
  },

  /**
   * Thêm mới một Nhà cung cấp (tự động sinh mã NCCxxxxxx hoặc chỉ định mã thủ công)
   */
  async createSupplier(payload: CreateSupplierPayload): Promise<Supplier> {
    try {
      return await apiClient.post<Supplier>('/api/Suppliers', payload);
    } catch (e) {
      console.error('Lỗi khi tạo mới Nhà cung cấp:', e);
      throw e;
    }
  },

  /**
   * Cập nhật thông tin Nhà cung cấp và số dư nợ
   */
  async updateSupplier(id: number | string, payload: UpdateSupplierPayload): Promise<Supplier> {
    try {
      return await apiClient.put<Supplier>(`/api/Suppliers/${id}`, payload);
    } catch (e) {
      console.error(`Lỗi khi cập nhật Nhà cung cấp #${id}:`, e);
      throw e;
    }
  },

  /**
   * Bật / Tắt trạng thái giao dịch (ACTIVE <-> INACTIVE)
   */
  async toggleSupplierStatus(id: number | string): Promise<{ isActive: boolean }> {
    try {
      return await apiClient.patch<{ isActive: boolean }>(`/api/Suppliers/${id}/toggle-status`);
    } catch (e) {
      console.error(`Lỗi khi đổi trạng thái Nhà cung cấp #${id}:`, e);
      throw e;
    }
  },

  /**
   * Xóa Nhà cung cấp hoặc chuyển sang Ngừng hoạt động nếu có chứng từ / công nợ
   */
  async deleteSupplier(id: number | string): Promise<{ success: boolean }> {
    try {
      return await apiClient.delete<{ success: boolean }>(`/api/Suppliers/${id}`);
    } catch (e) {
      console.error(`Lỗi khi xóa Nhà cung cấp #${id}:`, e);
      throw e;
    }
  },
};
