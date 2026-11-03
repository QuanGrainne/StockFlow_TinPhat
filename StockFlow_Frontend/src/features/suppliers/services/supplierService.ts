// src/features/suppliers/services/supplierService.ts
// Service kết nối RESTful API Nhà cung cấp với backend ASP.NET Core & MediatR

import { apiClient } from '@/lib/api/client';
import {
  Supplier,
  SupplierDetail,
  CreateSupplierPayload,
  UpdateSupplierPayload,
  CreateSupplierPaymentPayload,
  SupplierPaymentResult,
} from '../types';

export const supplierService = {
  /**
   * Lấy danh sách Nhà cung cấp kèm tìm kiếm và bộ lọc công nợ, trạng thái, chi nhánh/kho
   */
  async getSuppliers(params?: {
    search?: string;
    debtStatus?: string;
    status?: string;
    warehouseId?: number | string;
    fromDate?: string;
    toDate?: string;
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
      if (params?.warehouseId && params.warehouseId !== 'ALL' && Number(params.warehouseId) > 0) {
        query.append('warehouseId', String(params.warehouseId));
      }
      // Lọc theo thời gian phát sinh nhập hàng (YYYY-MM-DD)
      if (params?.fromDate) {
        query.append('fromDate', params.fromDate);
      }
      if (params?.toDate) {
        query.append('toDate', params.toDate);
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
   * Lấy danh sách các Chi nhánh / Kho nhập hàng hoạt động
   */
  async getWarehouses(): Promise<{ warehouseId: number; code: string; name: string }[]> {
    try {
      const data = await apiClient.get<any[]>('/api/Suppliers/warehouses');
      if (Array.isArray(data)) {
        return data.map((w) => ({
          warehouseId: w.warehouseId,
          code: w.code || `K${w.warehouseId}`,
          name: w.name || `Kho #${w.warehouseId}`,
        }));
      }
      return [];
    } catch (e) {
      console.warn('Không thể tải danh sách kho từ API, dùng danh sách kho mặc định Tín Phát:', e);
      return [
        { warehouseId: 3, code: 'K001', name: 'Kho Tổng Gia Lâm' },
        { warehouseId: 4, code: 'K002', name: 'Kho Đông Anh' },
        { warehouseId: 5, code: 'K003', name: 'Kho Hà Đông' },
        { warehouseId: 6, code: 'K004', name: 'Kho Hoàn Kiếm' },
      ];
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

  /** Tạo phiếu chi thanh toán nợ NCC (PC000001...), có phân bổ vào phiếu nhập */
  async createSupplierPayment(id: number, payload: CreateSupplierPaymentPayload): Promise<SupplierPaymentResult> {
    return apiClient.post<SupplierPaymentResult>(`/api/Suppliers/${id}/payments`, payload);
  },
};
