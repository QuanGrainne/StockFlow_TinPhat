// src/features/suppliers/types/index.ts
// Các kiểu dữ liệu đại diện cho thực thể Nhà cung cấp và các thao tác liên quan

export interface WarehouseDebtBreakdown {
  warehouseId: number;
  warehouseCode: string;
  warehouseName: string;
  totalPurchasedAmount: number;
  branchPayableAmount: number;
  receiptsCount: number;
}

export interface Supplier {
  id: string;
  partnerId: number;
  code: string;
  name: string;
  type: string;
  phone?: string;
  email?: string;
  address?: string;
  creditLimit?: number;
  totalPurchased: number; // Tổng giá trị hàng đã mua từ NCC
  currentPayable: number; // Công nợ phải trả NCC
  currentDebt: number;
  status: 'ACTIVE' | 'INACTIVE' | string;
  branchPayable?: number;
  branchReceiptsCount?: number;
}

export interface SupplierRecentReceipt {
  receiptId: number;
  receiptNumber: string;
  receiptDate?: string;
  warehouseId?: number;
  warehouseName?: string;
  totalAmount: number;
  status?: string;
  createdByName?: string | null;
  /** GOODS_RECEIPT (phiếu nhập) | PURCHASE_RETURN (phiếu trả hàng nhập) */
  type?: string;
}

/** Một dòng sổ "Nợ cần trả nhà cung cấp" (amount > 0 tăng nợ, < 0 giảm nợ) */
export interface SupplierDebtLedgerEntry {
  code: string;
  date?: string | null;
  type: 'GOODS_RECEIPT' | 'PAYMENT' | 'OPENING' | string;
  typeLabel: string;
  referenceId?: number | null;
  amount: number;
  balanceAfter: number;
}

export interface SupplierDetail extends Supplier {
  totalReceiptsCount: number;
  totalPurchasedAmount: number;
  recentReceipts: SupplierRecentReceipt[];
  warehouseBreakdown?: WarehouseDebtBreakdown[];
  debtLedger?: SupplierDebtLedgerEntry[];
  /** Ngày tạo NCC (giờ Việt Nam); null với NCC tạo trước khi có cột này */
  createdAt?: string | null;
  /** Tên tài khoản đã tạo NCC */
  createdByName?: string | null;
  /** Phiếu nhập còn nợ (cũ nhất trước) để phân bổ khi thanh toán */
  openReceipts?: SupplierOpenReceipt[];
}

export interface SupplierOpenReceipt {
  receiptId: number;
  receiptNumber: string;
  receiptDate?: string | null;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
}

export interface CreateSupplierPaymentPayload {
  amount: number;
  /** ISO string; backend đổi về giờ Việt Nam */
  paymentDate?: string;
  paymentMethod: 'CASH' | 'BANK_TRANSFER';
  notes?: string;
  allocations?: { receiptId: number; amount: number }[];
}

export interface SupplierPaymentResult {
  voucherCode: string;
  amount: number;
  allocatedAmount: number;
  remainingPayable: number;
}

export interface CreateSupplierPayload {
  code?: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  creditLimit?: number;
  initialPayable?: number;
}

export interface UpdateSupplierPayload {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  creditLimit?: number;
  currentPayable?: number;
  isActive?: boolean;
}

export interface SupplierFilterState {
  search: string;
  debtStatus: 'ALL' | 'HAS_DEBT' | 'NO_DEBT';
  status: 'ALL' | 'ACTIVE' | 'INACTIVE';
  warehouseId: number | 'ALL';
  /** Lọc theo thời gian phát sinh nhập hàng: preset (all_time, this_month...) hoặc 'custom' */
  timeRange: string;
  /** YYYY-MM-DD, rỗng = không giới hạn */
  dateFrom: string;
  /** YYYY-MM-DD, rỗng = không giới hạn */
  dateTo: string;
}

export interface WarehouseOption {
  warehouseId: number;
  code: string;
  name: string;
}
