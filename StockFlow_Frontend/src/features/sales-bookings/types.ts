// src/features/sales-bookings/types.ts
// Kiểu dữ liệu Đơn đặt hàng của khách (DH...): đặt trước, không trừ kho; giao bằng hóa đơn tạo từ đơn.

export type SalesBookingStatus = 'DRAFT' | 'CONFIRMED' | 'DELIVERING' | 'FINISHED' | 'CANCELLED';

export interface SalesBookingListItem {
  orderId: number;
  orderCode: string;
  orderDate?: string | null;
  deliveryDate?: string | null;
  warehouseId: number;
  warehouseName: string;
  partnerId: number;
  partnerCode: string;
  partnerName: string;
  partnerPhone?: string | null;
  status: SalesBookingStatus;
  createdByName: string;
  totalQuantity: number;
  deliveredQuantity: number;
  totalAmount: number;
  paidAmount: number;
  notes?: string | null;
  /** Khách đã trả: trả trước + trả thêm ở các hóa đơn giao hàng */
  customerPaidAmount: number;
}

export interface SalesBookingItem {
  orderItemId: number;
  productId: number;
  productCode: string;
  productName: string;
  unit: string;
  unitId: number;
  quantity: number;
  deliveredQuantity: number;
  originalPrice: number;
  discountType: 'AMOUNT' | 'PERCENT';
  discountValue: number;
  unitPrice: number;
  lineTotal: number;
}

export interface SalesBookingInvoice {
  orderId: number;
  orderCode: string;
  orderDate?: string | null;
  createdByName: string;
  totalAmount: number;
  depositAmount: number;
  status: string;
}

export interface SalesBookingPayment {
  code: string;
  date?: string | null;
  paymentMethod?: string | null;
  amount: number;
  createdByName: string;
  /** COMPLETED | CANCELLED */
  status: string;
}

export interface SalesBookingDetail {
  orderId: number;
  orderCode: string;
  orderDate?: string | null;
  deliveryDate?: string | null;
  warehouseId: number;
  warehouseName: string;
  partnerId: number;
  partnerCode: string;
  partnerName: string;
  partnerPhone?: string | null;
  partnerAddress?: string | null;
  partnerDebt: number;
  partnerCreditLimit: number;
  status: SalesBookingStatus;
  createdByName: string;
  subTotal: number;
  discountType: 'AMOUNT' | 'PERCENT';
  discountValue: number;
  discountAmount: number;
  totalAmount: number;
  /** Tổng tiền khách đã trả trước */
  paidAmount: number;
  /** Tiền trả trước chưa trừ vào hóa đơn nào */
  remainingDeposit: number;
  notes?: string | null;
  mergedIntoId?: number | null;
  mergedIntoCode?: string | null;
  mergedFromCodes: string[];
  items: SalesBookingItem[];
  invoices: SalesBookingInvoice[];
  payments: SalesBookingPayment[];
  /** Khách đã trả: trả trước + trả thêm ở các hóa đơn giao hàng */
  customerPaidAmount: number;
}

export interface SalesBookingLinePayload {
  productId: number;
  unitId: number;
  quantity: number;
  originalPrice: number;
  discountType: 'AMOUNT' | 'PERCENT';
  discountValue: number;
}

export interface SaveSalesBookingPayload {
  partnerId: number;
  warehouseId: number;
  orderDate?: string;
  deliveryDate?: string | null;
  discountType: 'AMOUNT' | 'PERCENT';
  discountValue: number;
  /** Tạo đơn: khách trả trước; sửa đơn: khách trả thêm */
  paidAmount: number;
  paymentMethod: 'CASH' | 'VIETQR';
  notes?: string | null;
  items: SalesBookingLinePayload[];
}

export interface SalesBookingSaveResult {
  orderId: number;
  orderCode: string;
  status: SalesBookingStatus;
  totalAmount: number;
  paidAmount: number;
}

export interface SalesBookingListFilter {
  warehouseIds?: number[];
  statuses?: SalesBookingStatus[];
  fromDate?: string;
  toDate?: string;
  search?: string;
  /** Tìm theo mã hàng / tên hàng trong đơn */
  productSearch?: string;
}
