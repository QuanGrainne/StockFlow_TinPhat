// src/features/sales-returns/types.ts
// Kiểu dữ liệu Trả hàng (khách trả lại hàng đã mua theo hóa đơn — BR-18/19/20).
// Giao diện đã dựng; API lưu / danh sách phiếu trả sẽ nối ở bước làm nghiệp vụ.

export type SalesReturnStatus = 'DRAFT' | 'COMPLETED' | 'CANCELLED';

/** Tình trạng hàng khách trả (BR-20): hàng tốt nhập lại kho bán tiếp, hàng lỗi để riêng chờ xử lý */
export type ReturnCondition = 'GOOD' | 'DEFECTIVE';

export interface SalesReturnListItem {
  returnId: number;
  returnCode: string;
  returnDate?: string | null;
  sellerName: string;
  partnerId: number;
  partnerCode: string;
  partnerName: string;
  invoiceId: number;
  invoiceCode: string;
  warehouseId: number;
  warehouseName: string;
  totalGoodsAmount: number;
  /** Cần trả khách (sau phí trả hàng) */
  totalAmount: number;
  /** Đã trả khách */
  refundAmount: number;
  status: SalesReturnStatus;
}

/** Dòng hàng trên form trả hàng */
export interface SalesReturnLine {
  key: string;
  orderItemId: number;
  productId: number;
  productCode: string;
  productName: string;
  imageUrl?: string | null;
  unitName: string;
  /** SL đã mua trên hóa đơn */
  soldQty: number;
  /** SL tối đa còn được trả (BR-19) */
  maxQty: number;
  quantity: number;
  /** Giá bán trên hóa đơn (sau giảm giá dòng) */
  salePrice: number;
  /** Giá nhập lại (tiền trả khách cho 1 đơn vị) */
  returnPrice: number;
  condition: ReturnCondition;
}

export interface SalesReturnSidebarState {
  /** [] = tất cả chi nhánh */
  warehouseIds: number[];
  statuses: SalesReturnStatus[];
  timeRange: string;
  dateFrom: string;
  dateTo: string;
}
