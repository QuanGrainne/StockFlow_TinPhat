// src/features/suppliers/types/index.ts
// Các kiểu dữ liệu đại diện cho thực thể Nhà cung cấp và các thao tác liên quan

export interface Supplier {
  id: string;
  partnerId: number;
  code: string;
  name: string;
  type: string;
  phone?: string;
  email?: string;
  address?: string;
  creditLimit: number;
  currentPayable: number; // Công nợ phải trả NCC
  currentDebt: number;
  status: 'ACTIVE' | 'INACTIVE' | string;
}

export interface SupplierRecentReceipt {
  receiptId: number;
  receiptNumber: string;
  receiptDate?: string;
  warehouseName?: string;
  totalAmount: number;
  status?: string;
}

export interface SupplierDetail extends Supplier {
  totalReceiptsCount: number;
  totalPurchasedAmount: number;
  recentReceipts: SupplierRecentReceipt[];
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
}
