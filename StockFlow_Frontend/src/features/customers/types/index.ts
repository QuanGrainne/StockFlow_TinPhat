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
  /** Lý do cảnh báo công nợ theo "Thiết lập cảnh báo công nợ" (null = không cảnh báo) */
  debtWarning?: string | null;
  assignedStaff?: string;
}

/** Thiết lập cảnh báo công nợ khách hàng (GET/PUT /api/settings/debt-warning) */
export type DebtDaysFrom = 'FIRST_DEBT' | 'LAST_TRANSACTION';
export interface DebtWarningSettings {
  enableDebtAmountWarning: boolean;
  debtAmountThreshold: number;
  enableDebtDaysWarning: boolean;
  debtDaysThreshold: number;
  debtDaysFrom: DebtDaysFrom;
  allowDebtOverLimit: boolean;
  /** Hạn mức công nợ mặc định cho khách tạo mới (Manager cài đặt) */
  defaultCreditLimit: number;
  /** Khách lẻ luôn phải thanh toán đủ — chỉ hiển thị */
  noDebtForWalkIn?: boolean;
  updatedAt?: string;
  updatedByName?: string | null;
}

/** SET: đặt cố định · PERCENT: tăng/giảm theo % · RESET_DEFAULT: về hạn mức mặc định */
export type CreditLimitBatchMode = 'SET' | 'PERCENT' | 'RESET_DEFAULT';

export interface CreditLimitChange {
  partnerId: number;
  partnerCode: string | null;
  partnerName: string | null;
  oldLimit: number;
  newLimit: number;
  currentDebt: number;
}

export interface CreditLimitSkip {
  partnerId: number;
  partnerCode: string | null;
  partnerName: string | null;
  currentLimit: number;
  proposedLimit: number;
  currentDebt: number;
  reason: string;
}

export interface BatchCreditLimitResult {
  updated: CreditLimitChange[];
  skipped: CreditLimitSkip[];
}

/** INITIAL · MANUAL · BULK · REQUEST_APPROVED */
export interface CreditLimitHistoryItem {
  historyId: number;
  changedAt: string;
  oldLimit: number;
  newLimit: number;
  source: string;
  reason: string | null;
  requestId: number | null;
  requestCode: string | null;
  changedByName: string | null;
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
  /** Chi nhánh tạo: [] = tất cả */
  createdWarehouseIds: number[];
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
  /** Khách đã trả / còn nợ của hóa đơn */
  paidAmount: number;
  outstandingAmount: number;
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
  /** Lịch sử đặt hàng (đơn đặt của khách) */
  recentBookings?: CustomerRecentOrder[];
}

/** Kết quả tạo phiếu thu nợ khách hàng */
export interface CustomerPaymentResult {
  voucherCode: string;
  amount: number;
  allocatedAmount: number;
  remainingDebt: number;
}

export interface CreateCustomerPaymentPayload {
  amount: number;
  paymentDate?: string;
  paymentMethod: string;
  notes?: string;
  allocations: { orderId: number; amount: number }[];
}

/** 1 dòng phân bổ của phiếu thu vào hóa đơn */
export interface CustomerReceiptAllocation {
  orderId: number;
  orderCode: string;
  orderDate?: string | null;
  orderTotal: number;
  paidBefore: number;
  amount: number;
  paymentStatus?: string | null;
  /** INVOICE (hóa đơn) | BOOKING (đơn đặt hàng — tiền khách trả trước) */
  orderType?: string | null;
}

/** Chi tiết 1 phiếu thu của khách (TTHD... / PT...) */
export interface CustomerReceiptDetail {
  code: string;
  transactionDate?: string | null;
  createdByName?: string | null;
  paymentMethod: string;
  totalAmount: number;
  description?: string | null;
  status: string;
  partnerId: number;
  partnerCode: string;
  partnerName: string;
  allocations: CustomerReceiptAllocation[];
}
