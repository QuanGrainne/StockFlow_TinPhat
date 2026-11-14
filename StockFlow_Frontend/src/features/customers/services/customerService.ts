// src/features/customers/services/customerService.ts
// Service kết nối RESTful API Khách hàng (mst_business_partners, partner_type = 'CUSTOMER')

import { apiClient } from '@/lib/api/client';
import {
  Customer,
  CustomerStats,
  CustomerFilterState,
  CreateCustomerPayload,
  UpdateCustomerPayload,
  CustomerDetail,
  CustomerGender,
  CustomerPaymentResult,
  CreateCustomerPaymentPayload,
  CustomerReceiptDetail,
  DebtWarningSettings,
} from '../types';
import type { DebtAdjustmentDetail, DebtAdjustPayload, DebtAdjustResult } from '@/components/debt/types';

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
  phone2?: string | null;
  gender?: string | null;
  birthDate?: string | null;
  facebook?: string | null;
  notes?: string | null;
  createdAt?: string | null;
  createdByName?: string | null;
  createdWarehouseId?: number | null;
  createdWarehouseName?: string | null;
  totalSales?: number;
  totalSalesNetReturns?: number;
  lastTransactionDate?: string | null;
  debtWarning?: string | null;
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

type BackendRecentOrder = {
  orderId: number;
  orderCode: string;
  orderDate?: string | null;
  totalAmount: number;
  status?: string | null;
  sellerName?: string | null;
  warehouseName?: string | null;
  paidAmount?: number | null;
  outstandingAmount?: number | null;
};

const mapRecentOrder = (o: BackendRecentOrder) => ({
  orderId: o.orderId,
  orderCode: o.orderCode,
  orderDate: o.orderDate ?? undefined,
  totalAmount: Number(o.totalAmount) || 0,
  status: o.status ?? undefined,
  sellerName: o.sellerName ?? null,
  warehouseName: o.warehouseName ?? null,
  paidAmount: Number(o.paidAmount) || 0,
  outstandingAmount: Number(o.outstandingAmount) || 0,
});

interface BackendCustomerDetailDto extends BackendCustomerDto {
  /** Lịch sử đặt hàng (đơn đặt của khách) */
  recentBookings?: BackendRecentOrder[] | null;
  recentOrders?: Array<{
    orderId: number;
    orderCode: string;
    orderDate?: string | null;
    totalAmount: number;
    status?: string | null;
    sellerName?: string | null;
    warehouseName?: string | null;
    paidAmount?: number | null;
    outstandingAmount?: number | null;
  }>;
  debtLedger?: Array<{
    code: string;
    date?: string | null;
    type: string;
    typeLabel: string;
    referenceId?: number | null;
    amount: number;
    balanceAfter: number;
  }> | null;
}

const toGender = (g?: string | null): CustomerGender | null =>
  g?.toUpperCase() === 'MALE' ? 'MALE' : g?.toUpperCase() === 'FEMALE' ? 'FEMALE' : null;

/** "2026-11-05T00:00:00" → "2026-11-05" */
const toDateOnly = (v?: string | null): string | null => (v ? v.slice(0, 10) : null);

function mapDtoToCustomer(dto: BackendCustomerDto): Customer {
  return {
    id: dto.partnerId || Number(dto.id),
    partnerId: dto.partnerId,
    code: dto.code || `KH${String(dto.partnerId).padStart(5, '0')}`,
    name: dto.name,
    phone: dto.phone || '',
    phone2: dto.phone2 || '',
    email: dto.email || '',
    address: dto.address || '',
    gender: toGender(dto.gender),
    birthDate: toDateOnly(dto.birthDate),
    facebook: dto.facebook || '',
    notes: dto.notes || '',
    creditLimit: Number(dto.creditLimit) || 0,
    currentDebt: Number(dto.currentDebt) || 0,
    currentPayable: Number(dto.currentPayable) || 0,
    isOverCreditLimit:
      dto.isOverCreditLimit ??
      (Number(dto.creditLimit) > 0 && Number(dto.currentDebt) > Number(dto.creditLimit)),
    status: dto.status?.toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
    createdAt: dto.createdAt ?? null,
    createdByName: dto.createdByName ?? null,
    createdWarehouseId: dto.createdWarehouseId ?? null,
    createdWarehouseName: dto.createdWarehouseName ?? null,
    totalSales: Number(dto.totalSales) || 0,
    totalSalesNetReturns: Number(dto.totalSalesNetReturns ?? dto.totalSales) || 0,
    lastTransactionDate: dto.lastTransactionDate ?? null,
    debtWarning: dto.debtWarning ?? null,
  };
}

/** Body gửi lên khi tạo / sửa (các trường hồ sơ) */
function profileBody(p: Partial<CreateCustomerPayload>) {
  return {
    name: p.name?.trim(),
    phone: p.phone?.trim() || null,
    phone2: p.phone2?.trim() || null,
    email: p.email?.trim() || null,
    address: p.address?.trim() || null,
    gender: p.gender || null,
    birthDate: p.birthDate || null,
    facebook: p.facebook?.trim() || null,
    notes: p.notes?.trim() || null,
  };
}

export const customerService = {
  /** Danh sách khách hàng theo bộ lọc */
  async getCustomers(filter?: Partial<CustomerFilterState>): Promise<{ items: Customer[]; total: number }> {
    const params = new URLSearchParams();
    const add = (key: string, value: string | number | undefined | null) => {
      if (value !== undefined && value !== null && String(value).trim() !== '') params.append(key, String(value).trim());
    };
    add('search', filter?.search);
    if (filter?.debtStatus && filter.debtStatus !== 'ALL') add('debtStatus', filter.debtStatus);
    if (filter?.status && filter.status !== 'ALL') add('status', filter.status);
    // API nhận 1 chi nhánh; chọn nhiều thì màn danh sách lọc tiếp ở client
    if (filter?.createdWarehouseIds?.length === 1) add('createdWarehouseId', filter.createdWarehouseIds[0]);
    add('createdFrom', filter?.createdFrom);
    add('createdTo', filter?.createdTo);
    if (filter?.gender && filter.gender !== 'ALL') add('gender', filter.gender);
    add('minSales', filter?.minSales);
    add('maxSales', filter?.maxSales);
    add('salesFrom', filter?.salesFrom);
    add('salesTo', filter?.salesTo);
    add('minDebt', filter?.minDebt);
    add('maxDebt', filter?.maxDebt);

    const qs = params.toString() ? `?${params.toString()}` : '';
    const data = await apiClient.get<BackendCustomerDto[]>(`/api/customers${qs}`);
    const items = Array.isArray(data) ? data.map(mapDtoToCustomer) : [];
    return { items, total: items.length };
  },

  /** Chỉ số thống kê KPI Khách hàng */
  async getCustomerStats(): Promise<CustomerStats> {
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
  },

  /** Chi tiết hồ sơ khách hàng + lịch sử bán + sổ nợ cần thu */
  /** Chi tiết 1 phiếu thu của khách theo mã (TTHD... / PT...) */
  async getCustomerReceipt(partnerId: number, code: string): Promise<CustomerReceiptDetail> {
    return apiClient.get<CustomerReceiptDetail>(`/api/customers/${partnerId}/receipts/${encodeURIComponent(code)}`);
  },

  /** Sửa phiếu thu: thời gian, phương thức, ghi chú */
  async updateCustomerReceipt(
    partnerId: number,
    code: string,
    payload: { transactionDate?: string; paymentMethod: string; notes?: string }
  ): Promise<void> {
    await apiClient.put(`/api/customers/${partnerId}/receipts/${encodeURIComponent(code)}`, payload);
  },

  /** Hủy phiếu thu: hoàn lại số đã trả của hóa đơn, cộng lại nợ khách */
  async cancelCustomerReceipt(partnerId: number, code: string): Promise<void> {
    await apiClient.post(`/api/customers/${partnerId}/receipts/${encodeURIComponent(code)}/cancel`, {});
  },

  /** Tạo phiếu thu nợ khách hàng (PT...), có phân bổ vào hóa đơn còn nợ */
  /** Điều chỉnh công nợ: tạo phiếu DC..., nợ cần thu = payload.newDebt */
  async adjustCustomerDebt(partnerId: number, payload: DebtAdjustPayload): Promise<DebtAdjustResult> {
    return apiClient.post<DebtAdjustResult>(`/api/customers/${partnerId}/debt-adjustments`, payload);
  },

  async getDebtAdjustment(partnerId: number, code: string): Promise<DebtAdjustmentDetail> {
    return apiClient.get<DebtAdjustmentDetail>(`/api/customers/${partnerId}/debt-adjustments/${encodeURIComponent(code)}`);
  },

  /** Sửa phiếu điều chỉnh: payload.newDebt = nợ cần thu ngay sau phiếu */
  async updateDebtAdjustment(partnerId: number, code: string, payload: DebtAdjustPayload): Promise<void> {
    await apiClient.put(`/api/customers/${partnerId}/debt-adjustments/${encodeURIComponent(code)}`, payload);
  },

  async cancelDebtAdjustment(partnerId: number, code: string): Promise<void> {
    await apiClient.post(`/api/customers/${partnerId}/debt-adjustments/${encodeURIComponent(code)}/cancel`, {});
  },

  async createCustomerPayment(partnerId: number, payload: CreateCustomerPaymentPayload): Promise<CustomerPaymentResult> {
    return apiClient.post<CustomerPaymentResult>(`/api/customers/${partnerId}/payments`, payload);
  },

  async getCustomerById(id: number | string): Promise<CustomerDetail> {
    const dto = await apiClient.get<BackendCustomerDetailDto>(`/api/customers/${id}`);
    return {
      ...mapDtoToCustomer(dto),
      recentOrders: (dto.recentOrders ?? []).map(mapRecentOrder),
      recentBookings: (dto.recentBookings ?? []).map(mapRecentOrder),
      debtLedger: (dto.debtLedger ?? []).map((l) => ({
        code: l.code,
        date: l.date ?? null,
        type: l.type,
        typeLabel: l.typeLabel,
        referenceId: l.referenceId ?? null,
        amount: Number(l.amount) || 0,
        balanceAfter: Number(l.balanceAfter) || 0,
      })),
    };
  },

  /** Thêm mới khách hàng */
  async createCustomer(payload: CreateCustomerPayload): Promise<Customer> {
    const body = {
      code: payload.code?.trim() || null,
      ...profileBody(payload),
      name: payload.name.trim(),
      creditLimit: Number(payload.creditLimit) || 0,
      status: payload.status || 'ACTIVE',
      createdWarehouseId: payload.createdWarehouseId ?? null,
    };
    const res = await apiClient.post<BackendCustomerDto>('/api/customers', body);
    return mapDtoToCustomer(res);
  },

  /** Cập nhật thông tin khách hàng */
  async updateCustomer(id: number, payload: UpdateCustomerPayload): Promise<Customer> {
    const body = {
      ...profileBody(payload),
      creditLimit: payload.creditLimit !== undefined ? Number(payload.creditLimit) : null,
      currentDebt: payload.currentDebt !== undefined ? Number(payload.currentDebt) : null,
      status: payload.status,
    };
    const res = await apiClient.put<BackendCustomerDto>(`/api/customers/${id}`, body);
    return mapDtoToCustomer(res);
  },

  /** Đổi trạng thái khách hàng (ACTIVE <-> INACTIVE) */
  async toggleCustomerStatus(id: number | string): Promise<{ isActive: boolean }> {
    return apiClient.patch<{ isActive: boolean }>(`/api/customers/${id}/toggle-status`);
  },

  /** Khóa / Kích hoạt hàng loạt khách hàng */
  async toggleBatchStatus(ids: number[], status: 'ACTIVE' | 'INACTIVE'): Promise<void> {
    await apiClient.patch('/api/customers/batch-status', { partnerIds: ids, status });
  },

  /** Xóa khách hàng (hoặc ngừng hoạt động nếu đã có giao dịch / còn nợ) */
  async deleteCustomer(id: number): Promise<void> {
    await apiClient.delete(`/api/customers/${id}`);
  },

  /** Thiết lập cảnh báo công nợ khách hàng */
  async getDebtWarningSettings(): Promise<DebtWarningSettings> {
    return apiClient.get<DebtWarningSettings>('/api/settings/debt-warning');
  },

  /** Lưu thiết lập cảnh báo công nợ (Manager / Kế toán trưởng / Admin) */
  async updateDebtWarningSettings(
    payload: Omit<DebtWarningSettings, 'noDebtForWalkIn' | 'updatedAt' | 'updatedByName'>
  ): Promise<DebtWarningSettings> {
    return apiClient.put<DebtWarningSettings>('/api/settings/debt-warning', payload);
  },
};
