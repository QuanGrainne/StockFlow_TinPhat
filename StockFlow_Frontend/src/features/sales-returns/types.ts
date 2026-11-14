// src/features/sales-returns/types.ts
// Kiểu dữ liệu Trả hàng (khách trả lại hàng đã mua theo hóa đơn — BR-18/19).

export type SalesReturnStatus = 'COMPLETED' | 'CANCELLED';


export interface SalesReturnListItem {
  returnId: number;
  returnCode: string;
  returnDate?: string | null;
  invoiceId: number;
  invoiceCode: string;
  warehouseId: number;
  warehouseName: string;
  partnerId: number;
  partnerCode: string;
  partnerName: string;
  createdByName: string;
  totalQuantity: number;
  totalGoodsAmount: number;
  /** Cần trả khách */
  totalAmount: number;
  /** Đã trả khách */
  refundAmount: number;
  status: SalesReturnStatus;
  notes?: string | null;
}

export interface SalesReturnItem {
  returnItemId: number;
  orderItemId: number;
  productId: number;
  productCode: string;
  productName: string;
  unit: string;
  quantity: number;
  /** Giá bán trên hóa đơn */
  salePrice: number;
  /** Giá nhập lại */
  returnPrice: number;
  lineTotal: number;
}

export interface SalesReturnDetail {
  returnId: number;
  returnCode: string;
  returnDate?: string | null;
  invoiceId: number;
  invoiceCode: string;
  invoiceDate?: string | null;
  warehouseId: number;
  warehouseName: string;
  partnerId: number;
  partnerCode: string;
  partnerName: string;
  createdByName: string;
  status: SalesReturnStatus;
  totalGoodsAmount: number;
  discountAmount: number;
  returnFee: number;
  totalAmount: number;
  refundAmount: number;
  paymentMethod?: string | null;
  notes?: string | null;
  items: SalesReturnItem[];
  /** Phiếu chi trả tiền khách (lúc trả hàng + trả thêm sau) */
  refunds?: SalesReturnRefund[] | null;
}

export interface SalesReturnRefund {
  code: string;
  date?: string | null;
  paymentMethod?: string | null;
  amount: number;
  createdByName: string;
  status: string;
  notes?: string | null;
}

/** Dòng hóa đơn gốc để trả */
export interface SalesReturnSourceItem {
  orderItemId: number;
  productId: number;
  productCode: string;
  productName: string;
  unit: string;
  unitId: number;
  imageUrl?: string | null;
  soldQuantity: number;
  returnedQuantity: number;
  remainingQuantity: number;
  salePrice: number;
}

export interface SalesReturnSource {
  invoiceId: number;
  invoiceCode: string;
  invoiceDate?: string | null;
  warehouseId: number;
  warehouseName: string;
  partnerId: number;
  partnerCode: string;
  partnerName: string;
  partnerPhone?: string | null;
  partnerDebt: number;
  isWalkIn: boolean;
  sellerName: string;
  items: SalesReturnSourceItem[];
  /** Tổng tiền hàng của hóa đơn (trước giảm giá hóa đơn) — cơ sở phân bổ giảm giá cho hàng trả */
  invoiceSubTotal: number;
  /** Giảm giá tổng hóa đơn */
  invoiceDiscount: number;
}

export interface CreateSalesReturnPayload {
  /** 0 = Trả nhanh (không có hóa đơn gốc) */
  invoiceId: number;
  /** Trả nhanh: khách hàng (0 = Khách lẻ) */
  partnerId?: number;
  /** Trả nhanh: chi nhánh nhận hàng trả */
  warehouseId?: number;
  returnDate?: string;
  discountAmount: number;
  returnFee: number;
  refundAmount: number;
  paymentMethod: 'CASH' | 'VIETQR';
  notes?: string | null;
  items: { orderItemId: number; productId: number; quantity: number; returnPrice: number }[];
}

export interface SalesReturnResult {
  returnId: number;
  returnCode: string;
  totalAmount: number;
  refundAmount: number;
}

export interface SalesReturnListFilter {
  warehouseIds?: number[];
  statuses?: SalesReturnStatus[];
  fromDate?: string;
  toDate?: string;
  search?: string;
}

export interface SalesReturnSidebarState {
  /** [] = tất cả chi nhánh */
  warehouseIds: number[];
  statuses: SalesReturnStatus[];
  timeRange: string;
  dateFrom: string;
  dateTo: string;
}
