// src/features/customers/types/index.ts
// Định nghĩa kiểu dữ liệu cho phân hệ Quản lý Khách hàng (Đã tinh gọn)

export type CustomerStatus = 'ACTIVE' | 'INACTIVE';
export type DebtStatusFilter = 'ALL' | 'HAS_DEBT' | 'NO_DEBT' | 'OVERDUE' | 'OVER_LIMIT';

export interface Customer {
  id: number;
  partnerId?: number;
  code: string; // e.g. KH00892
  name: string; // Tên khách hàng
  subtext?: string; // Ghi chú ngắn nhận diện
  phone: string;
  email: string;
  address: string;
  creditLimit: number; // Hạn mức tín dụng cấp (VNĐ)
  currentDebt: number; // Nợ hiện tại (VNĐ)
  currentPayable?: number;
  isOverCreditLimit?: boolean; // Vượt hạn mức
  status: CustomerStatus; // 'ACTIVE' | 'INACTIVE'
  createdAt?: string;
  assignedStaff?: string;
}

export interface CustomerStats {
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

export interface CustomerFilterState {
  search: string;
  debtStatus: DebtStatusFilter;
  status: string; // 'ALL' | CustomerStatus
}

export interface CreateCustomerPayload {
  code?: string;
  name: string;
  subtext?: string;
  phone: string;
  email: string;
  address: string;
  creditLimit: number;
  status?: CustomerStatus;
}

export interface UpdateCustomerPayload extends Partial<CreateCustomerPayload> {
  id: number;
  currentDebt?: number;
}

export interface CustomerRecentOrder {
  orderId: number;
  orderCode: string;
  orderDate?: string;
  totalAmount: number;
  status?: string;
}

export interface CustomerDetail extends Customer {
  recentOrders?: CustomerRecentOrder[];
}
