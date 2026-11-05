// src/features/customers/types/index.ts
// Kiểu dữ liệu phân hệ Khách hàng (bố cục giống màn Nhà cung cấp: bộ lọc trái, bảng có dòng mở rộng)

export type CustomerStatus = 'ACTIVE' | 'INACTIVE';
export type CustomerGender = 'MALE' | 'FEMALE';
export type DebtStatusFilter = 'ALL' | 'HAS_DEBT' | 'NO_DEBT' | 'OVERDUE' | 'OVER_LIMIT';

export interface Customer {
  id: number;
  partnerId?: number;
  code: string; // e.g. KH00892
  name: string;
  subtext?: string;
  phone: string;
  phone2?: string;
  email: string;
  address: string;
  gender?: CustomerGender | null;
  /** YYYY-MM-DD */
  birthDate?: string | null;
  facebook?: string;
  notes?: string;
  creditLimit: number; // Hạn mức tín dụng (VNĐ)
  currentDebt: number; // Nợ hiện tại (VNĐ)
  currentPayable?: number;
  isOverCreditLimit?: boolean;
  status: CustomerStatus;
  createdAt?: string | null;
  createdByName?: string | null;
  createdWarehouseId?: number | null;
  createdWarehouseName?: string | null;
  /** Tổng tiền hóa đơn đã hoàn thành */
  totalSales?: number;
  /** Tổng bán trừ trả hàng */
  totalSalesNetReturns?: number;
  lastTransactionDate?: string | null;
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

/** Bộ lọc màn Khách hàng: chi nhánh tạo, ngày tạo, giới tính, tổng bán, nợ hiện tại, trạng thái */
export interface CustomerFilterState {
  search: string;
  status: 'ALL' | CustomerStatus;
  createdWarehouseId: number | 'ALL';
  /** Ngày tạo */
  createdTimeRange: string;
  createdFrom: string;
  createdTo: string;
  gender: 'ALL' | CustomerGender;
  /** Tổng bán: khoảng giá trị + khoảng thời gian tính tổng bán */
  minSales: string;
  maxSales: string;
  salesTimeRange: string;
  salesFrom: string;
  salesTo: string;
  /** Nợ hiện tại: khoảng giá trị */
  minDebt: string;
  maxDebt: string;
  /** Giữ tương thích bộ lọc cũ (POS / màn khác) */
  debtStatus?: DebtStatusFilter;
}

export interface CreateCustomerPayload {
  code?: string;
  name: string;
  subtext?: string;
  phone: string;
  phone2?: string;
  email: string;
  address: string;
  gender?: CustomerGender | null;
  birthDate?: string | null;
  facebook?: string;
  notes?: string;
  creditLimit: number;
  status?: CustomerStatus;
  /** Chi nhánh đang làm việc lúc tạo */
  createdWarehouseId?: number | null;
}

export interface UpdateCustomerPayload extends Partial<CreateCustomerPayload> {
  id: number;
  currentDebt?: number;
}

/** Hóa đơn trong tab "Lịch sử bán/trả hàng" */
export interface CustomerRecentOrder {
  orderId: number;
  orderCode: string;
  orderDate?: string;
  totalAmount: number;
  status?: string;
  sellerName?: string | null;
  warehouseName?: string | null;
}

/** Một dòng sổ "Nợ cần thu từ khách" (amount > 0 tăng nợ, < 0 giảm nợ) */
export interface CustomerDebtLedgerEntry {
  code: string;
  date?: string | null;
  type: 'SALE' | 'PAYMENT' | string;
  typeLabel: string;
  referenceId?: number | null;
  amount: number;
  balanceAfter: number;
}

export interface CustomerDetail extends Customer {
  recentOrders?: CustomerRecentOrder[];
  debtLedger?: CustomerDebtLedgerEntry[];
}
