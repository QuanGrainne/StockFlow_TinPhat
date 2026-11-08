// src/features/orders/types.ts
// Các kiểu dữ liệu chi tiết cho màn hình Chi tiết đơn hàng StockFlow

export interface OrderCustomer {
  partnerId: number;
  partnerCode: string;
  partnerName: string;
  phone: string;
  email: string;
  address: string;
  taxCode: string;
  partnerGroup: string;
  currentDebt: number;
  creditLimit: number;
}

export interface OrderItemDetail {
  orderItemId: number;
  productId: number;
  productCode: string;
  productName: string;
  imageUrl?: string | null;
  barcode?: string | null;
  unitId: number;
  unitName: string;
  quantity: number;
  originalPrice: number;
  discountType: 'PERCENT' | 'AMOUNT' | string;
  discountValue: number;
  discountAmount: number;
  unitPrice: number;
  lineTotal: number;
  warehouseName?: string;
  lotNumber?: string | null;
  expiryDate?: string | null;
}

export interface OrderPaymentTransaction {
  txId: number;
  txCode: string;
  transactionDate?: string;
  paymentMethod: string;
  amount: number;
  createdByName: string;
  status: string;
  description?: string;
}

export interface OrderStockIssueItem {
  productId: number;
  productCode: string;
  productName: string;
  unitName: string;
  requestedQty: number;
  actualIssuedQty: number;
  lotNumber?: string | null;
  expiryDate?: string | null;
}

export interface OrderStockIssue {
  stockIssueId: number;
  issueCode: string;
  status: string;
  issueDate?: string;
  warehouseName: string;
  processedByName: string;
  items: OrderStockIssueItem[];
}

export interface OrderReturnItem {
  productId: number;
  productCode: string;
  productName: string;
  quantity: number;
  condition: string;
  notes?: string;
}

export interface OrderReturnRequest {
  returnRequestId: number;
  returnCode: string;
  requestDate?: string;
  status: string;
  reason: string;
  createdByName: string;
  items: OrderReturnItem[];
}

export interface OrderTimelineEvent {
  timestamp: string;
  title: string;
  description: string;
  actor: string;
  eventType: 'CREATED' | 'PAYMENT' | 'ISSUE' | 'RETURN' | 'STATUS' | 'INFO';
}

export interface OrderDetail {
  orderId: number;
  orderCode: string;
  orderType?: 'INVOICE' | 'BOOKING' | string;
  documentType: 'SALES_INVOICE' | 'SALES_ORDER';
  status: 'COMPLETED' | 'PENDING' | 'DRAFT' | 'CANCELLED' | string;
  paymentStatus: 'PAID' | 'PARTIAL' | 'DEBT' | 'UNPAID' | string;
  orderDate?: string;
  updatedAt?: string;
  createdById?: number;
  createdByName: string;
  createdByUsername: string;
  updatedById?: number;
  updatedByName?: string;
  warehouseId?: number;
  warehouseName: string;
  warehouseCode: string;
  salesRepName: string;
  notes?: string | null;
  priceBookName?: string;

  customer: OrderCustomer;
  items: OrderItemDetail[];
  totalQuantity: number;
  itemsTotalAmount: number;
  itemsDiscountAmount: number;

  subTotal: number;
  itemDiscountTotal: number;
  subTotalAfterItemDiscount: number;
  orderDiscountType: string;
  orderDiscountValue: number;
  orderDiscountAmount: number;
  deliveryFee: number;
  vatAmount: number;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;

  paymentTransactions: OrderPaymentTransaction[];
  stockIssues: OrderStockIssue[];
  returnRequests: OrderReturnRequest[];
  timelineEvents: OrderTimelineEvent[];
}


/** 1 dòng danh sách Hóa đơn (GET /api/orders) */
export interface OrderListItem {
  orderId: number;
  orderCode: string;
  partnerName: string;
  partnerPhone: string;
  partnerCode: string;
  subTotal: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  paymentStatus: string;
  status: string;
  orderDate?: string | null;
  totalItems: number;
  warehouseId?: number | null;
  warehouseName: string;
  paymentMethod: string;
  hasReturn: boolean;
  /** Mã phiếu trả hàng gần nhất của hóa đơn (nếu có) */
  returnCode?: string | null;
  /** Nhân viên tạo hóa đơn */
  createdByName?: string;
  notes?: string | null;
}

/** Bộ lọc màn Hóa đơn */
export interface OrderListFilter {
  search?: string;
  warehouseId?: number | null;
  fromDate?: string;
  toDate?: string;
  /** VD "COMPLETED,CANCELLED" */
  status?: string;
  /** ALL | NO_RETURN | HAS_RETURN */
  returnStatus?: string;
  /** ALL | CASH | VIETQR */
  paymentMethod?: string;
  priceBookName?: string;
  /** Tìm theo mã hàng / tên hàng trong hóa đơn */
  productSearch?: string;
}
