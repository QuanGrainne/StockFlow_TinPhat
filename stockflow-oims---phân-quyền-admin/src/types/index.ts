// src/types/index.ts
// Các kiểu dữ liệu cốt lõi cho hệ thống StockFlow OIMS (Phân quyền Sales & Manager)

export type UserRole = 'SALES' | 'MANAGER' | 'ADMIN' | 'WAREHOUSE' | 'PRODUCTION';

export interface UserProfile {
  id: string;
  name: string;
  code: string;
  email: string;
  role: UserRole;
  avatar?: string;
  assignedWarehouses: string[];
}

// ─── Master Data Types ────────────────────────────────────────────────────────
export interface Customer {
  id: string;
  code: string;           // Vd: KH001, KH002
  name: string;
  phone: string;
  address: string;
  currentDebt: number;    // Nợ hiện tại (VND)
  creditLimit: number;    // Hạn mức nợ tối đa (VND)
  paymentTermDays: number;// Thời hạn công nợ (ngày: 15, 30, 45)
  status: 'ACTIVE' | 'LOCKED';
}

export interface Product {
  id: string;
  code: string;           // Vd: TP-MC-300, NVL-TON-15
  name: string;
  type: 'FINISHED' | 'RAW_MATERIAL' | 'SEMI_FINISHED';
  uom: string;            // Đơn vị tính: Cây, Cuộn, Kg, Mét
  standardPrice: number;  // Giá tiêu chuẩn (VND)
  costPrice: number;      // Giá vốn (VND)
  stockQuantity: number;  // Tồn kho hiện tại
}

// ─── Sales Types ─────────────────────────────────────────────────────────────
export type OrderStatus = 'DRAFT' | 'PENDING' | 'CONSOLIDATED' | 'DISPATCHED' | 'CANCELLED';

export interface OrderItem {
  productId: string;
  productCode: string;
  productName: string;
  uom: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  subtotal: number;
}

export interface PendingOrder {
  id: string;
  orderCode: string;      // Vd: SO-2026-001
  customerId: string;
  customerName: string;
  customerPhone: string;
  orderDate: string;
  deliveryDate: string;
  items: OrderItem[];
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: OrderStatus;
  notes?: string;
  createdBy: string;
}

export interface ConsolidateOrdersPayload {
  customerId: string;
  selectedOrderIds: string[];
  shippingAddress: string;
  notes?: string;
}

export interface CreditLimitRequest {
  id: string;
  requestCode: string;    // Vd: CLR-2026-001
  customerId: string;
  customerName: string;
  currentDebt: number;
  currentCreditLimit: number;
  requestedCreditLimit: number;
  pendingOrderCode: string;
  expectedNewDebt: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedBy: string;
  requestedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
}

// ─── Manager Types ───────────────────────────────────────────────────────────
export interface BomItem {
  id: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  uom: string;
  standardQuantity: number; // Định mức tiêu hao cho 1 đơn vị thành phẩm
  scrapPercent: number;      // Tỉ lệ hao hụt cho phép (%)
}

export interface BomFormula {
  id: string;
  bomCode: string;          // Vd: BOM-MC-300
  finishedProductId: string;
  finishedProductCode: string;
  finishedProductName: string;
  finishedProductUom: string;
  version: string;
  status: 'ACTIVE' | 'DRAFT' | 'OBSOLETE';
  items: BomItem[];
  notes?: string;
  updatedAt: string;
}

export interface ProductionOrder {
  id: string;
  mfgOrderCode: string;     // Vd: MO-2026-001
  bomId: string;
  finishedProductId: string;
  finishedProductName: string;
  targetQuantity: number;
  completedQuantity: number;
  startDate: string;
  dueDate: string;
  assignedWorkshop: string;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
}

export type VoucherType = 'RECEIPT' | 'PAYMENT'; // Thu tiền / Chi tiền

export interface CashFlowVoucher {
  id: string;
  voucherCode: string;      // Vd: VCH-2026-001
  type: VoucherType;
  category: string;         // 'Thu tiền khách hàng' | 'Chi trả NCC' | 'Chi phí vận hành' | 'Khác'
  partnerId?: string;
  partnerName: string;
  amount: number;
  paymentMethod: 'CASH' | 'BANK_TRANSFER';
  voucherDate: string;
  description: string;
  createdBy: string;
  referenceDoc?: string;    // Số hóa đơn / Số đơn hàng tham chiếu
}

export interface PaginationParams {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
