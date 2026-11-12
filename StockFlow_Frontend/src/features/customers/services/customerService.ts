// src/features/customers/services/customerService.ts
// Service kết nối RESTful API Khách hàng với backend ASP.NET Core & MediatR
// Truy vấn từ bảng mst_business_partners với quy tắc partner_type = 'CUSTOMER'

import { apiClient } from '@/lib/api/client';
import {
  Customer,
  CustomerStats,
  CustomerFilterState,
  CreateCustomerPayload,
  UpdateCustomerPayload,
  CustomerDetail,
} from '../types';

interface BackendCustomerDto {
  id: string;
  partnerId: number;
  code: string;
  name: string;
  type: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  creditLimit: number;
  currentDebt: number;
  currentPayable: number;
  status: string;
  isOverCreditLimit: boolean;
}

interface BackendStatsDto {
  totalCustomers: number;
  newThisMonth: number;
  activeCustomers: number;
  activePercentage: number;
  inactiveCustomers: number;
  totalDebt: number;
  debtCustomersCount: number;
  overdueCount: number;
  totalCreditLimit: number;
  creditUsagePercent: number;
}

interface BackendCustomerDetailDto extends BackendCustomerDto {
  recentOrders?: Array<{
    orderId: number;
    orderCode: string;
    orderDate?: string | null;
    totalAmount: number;
    status?: string | null;
  }>;
}

function mapDtoToCustomer(dto: BackendCustomerDto): Customer {
  return {
    id: dto.partnerId || Number(dto.id),
    partnerId: dto.partnerId,
    code: dto.code || `KH${String(dto.partnerId).padStart(5, '0')}`,
    name: dto.name,
    phone: dto.phone || '',
    email: dto.email || '',
    address: dto.address || '',
    creditLimit: Number(dto.creditLimit) || 0,
    currentDebt: Number(dto.currentDebt) || 0,
    currentPayable: Number(dto.currentPayable) || 0,
    isOverCreditLimit:
      dto.isOverCreditLimit ??
      (Number(dto.creditLimit) > 0 && Number(dto.currentDebt) > Number(dto.creditLimit)),
    status: dto.status?.toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
  };
}

export const customerService = {
  /**
   * Lấy danh sách khách hàng từ backend (đã lọc partner_type = 'CUSTOMER')
   */
  async getCustomers(filter?: CustomerFilterState): Promise<{ items: Customer[]; total: number }> {
    try {
      const params = new URLSearchParams();
      if (filter?.search && filter.search.trim()) {
        params.append('search', filter.search.trim());
      }
      if (filter?.debtStatus && filter.debtStatus !== 'ALL') {
        params.append('debtStatus', filter.debtStatus);
      }
      if (filter?.status && filter.status !== 'ALL') {
        params.append('status', filter.status);
      }

      const qs = params.toString() ? `?${params.toString()}` : '';
      const data = await apiClient.get<BackendCustomerDto[]>(`/api/customers${qs}`);

      if (Array.isArray(data)) {
        const items = data.map(mapDtoToCustomer);
        return {
          items,
          total: items.length,
        };
      }
      return { items: [], total: 0 };
    } catch (e) {
      console.error('Lỗi khi tải danh sách khách hàng từ backend:', e);
      throw e;
    }
  },

  /**
   * Lấy chỉ số thống kê KPI Khách hàng
   */
  async getCustomerStats(): Promise<CustomerStats> {
    try {
      const stats = await apiClient.get<BackendStatsDto>('/api/customers/stats');
      return {
        totalCustomers: stats.totalCustomers ?? 0,
        newThisMonth: stats.newThisMonth ?? 0,
        activeCustomers: stats.activeCustomers ?? 0,
        activePercentage: stats.activePercentage ?? 0,
        inactiveCustomers: stats.inactiveCustomers ?? 0,
        totalDebt: stats.totalDebt ?? 0,
        debtCustomersCount: stats.debtCustomersCount ?? 0,
        overdueCount: stats.overdueCount ?? 0,
        totalCreditLimit: stats.totalCreditLimit ?? 0,
        creditUsagePercent: stats.creditUsagePercent ?? 0,
      };
    } catch (e) {
      console.error('Lỗi khi lấy thống kê khách hàng từ backend:', e);
      return {
        totalCustomers: 0,
        newThisMonth: 0,
        activeCustomers: 0,
        activePercentage: 0,
        inactiveCustomers: 0,
        totalDebt: 0,
        debtCustomersCount: 0,
        overdueCount: 0,
        totalCreditLimit: 0,
        creditUsagePercent: 0,
      };
    }
  },

  /**
   * Lấy chi tiết hồ sơ khách hàng và các đơn hàng gần đây
   */
  async getCustomerById(id: number | string): Promise<CustomerDetail> {
    try {
      const dto = await apiClient.get<BackendCustomerDetailDto>(`/api/customers/${id}`);
      const customer = mapDtoToCustomer(dto);
      return {
        ...customer,
        recentOrders: dto.recentOrders?.map((o) => ({
          orderId: o.orderId,
          orderCode: o.orderCode,
          orderDate: o.orderDate ?? undefined,
          totalAmount: Number(o.totalAmount) || 0,
          status: o.status ?? undefined,
        })),
      };
    } catch (e) {
      console.error(`Lỗi khi lấy chi tiết khách hàng #${id}:`, e);
      throw e;
    }
  },

  /**
   * Thêm mới khách hàng (lưu vào mst_business_partners với partner_type = 'CUSTOMER')
   */
  async createCustomer(payload: CreateCustomerPayload): Promise<Customer> {
    try {
      const body = {
        code: payload.code?.trim() || null,
        name: payload.name.trim(),
        phone: payload.phone?.trim() || null,
        email: payload.email?.trim() || null,
        address: payload.address?.trim() || null,
        creditLimit: Number(payload.creditLimit) || 0,
        status: payload.status || 'ACTIVE',
      };
      const res = await apiClient.post<BackendCustomerDto>('/api/customers', body);
      return mapDtoToCustomer(res);
    } catch (e) {
      console.error('Lỗi khi tạo mới khách hàng:', e);
      throw e;
    }
  },

  /**
   * Cập nhật thông tin khách hàng
   */
  async updateCustomer(id: number, payload: UpdateCustomerPayload): Promise<Customer> {
    try {
      const body = {
        name: payload.name?.trim(),
        phone: payload.phone?.trim() || null,
        email: payload.email?.trim() || null,
        address: payload.address?.trim() || null,
        creditLimit: payload.creditLimit !== undefined ? Number(payload.creditLimit) : null,
        currentDebt: payload.currentDebt !== undefined ? Number(payload.currentDebt) : null,
        status: payload.status,
      };
      const res = await apiClient.put<BackendCustomerDto>(`/api/customers/${id}`, body);
      return mapDtoToCustomer(res);
    } catch (e) {
      console.error(`Lỗi khi cập nhật khách hàng #${id}:`, e);
      throw e;
    }
  },

  /**
   * Đổi trạng thái khách hàng (ACTIVE <-> INACTIVE)
   */
  async toggleCustomerStatus(id: number | string): Promise<{ isActive: boolean }> {
    try {
      return await apiClient.patch<{ isActive: boolean }>(`/api/customers/${id}/toggle-status`);
    } catch (e) {
      console.error(`Lỗi khi đổi trạng thái khách hàng #${id}:`, e);
      throw e;
    }
  },

  /**
   * Khóa / Kích hoạt hàng loạt khách hàng
   */
  async toggleBatchStatus(ids: number[], status: 'ACTIVE' | 'INACTIVE'): Promise<void> {
    try {
      await apiClient.patch('/api/customers/batch-status', {
        partnerIds: ids,
        status,
      });
    } catch (e) {
      console.error('Lỗi khi đổi trạng thái khách hàng hàng loạt:', e);
      throw e;
    }
  },

  /**
   * Xóa khách hàng (hoặc ngừng kích hoạt nếu có nợ / đơn hàng)
   */
  async deleteCustomer(id: number): Promise<void> {
    try {
      await apiClient.delete(`/api/customers/${id}`);
    } catch (e) {
      console.error(`Lỗi khi xóa khách hàng #${id}:`, e);
      throw e;
    }
  },
};
