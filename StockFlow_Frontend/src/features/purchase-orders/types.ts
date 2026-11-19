// src/features/purchase-orders/types.ts
// Kiểu dữ liệu Phiếu đặt hàng nhập (PDN...)

export type PurchaseOrderStatus = 'DRAFT' | 'ORDERED' | 'PARTIAL' | 'COMPLETED' | 'CANCELLED';

export interface PurchaseOrderListItem {
  poId: number;
  poCode: string;
  warehouseId: number;
  warehouseName: string;
  partnerId: number;
  partnerCode: string;
  partnerName: string;
  orderDate?: string | null;
  status: PurchaseOrderStatus;
  createdByName: string;
  totalOrderedQty: number;
  totalReceivedQty: number;
  totalAmount: number;
  notes?: string | null;
}

/** Dòng đối chiếu số lượng đặt ↔ thực nhập. orderedQty = 0: hàng nhập ngoài phiếu đặt. */
export interface PurchaseOrderItem {
  productId: number;
  productCode: string;
  productName: string;
  unit: string;
  orderedQty: number;
  receivedQty: number;
  unitPrice: number;
  discountPercent: number;
  lineTotal: number;
  /** Tổng SL lỗi ở các phiếu nhập hoàn thành: không tính là đã nhập, chờ NCC giao bù */
  defectiveQty?: number;
}

export interface PurchaseOrderReceipt {
  grId: number;
  grCode: string;
  receivedDate?: string | null;
  receivedByName: string;
  totalQuantity: number;
  status: string;
}

export interface PurchaseOrderDetail {
  poId: number;
  poCode: string;
  warehouseId: number;
  warehouseName: string;
  partnerId: number;
  partnerCode: string;
  partnerName: string;
  partnerPhone?: string | null;
  orderDate?: string | null;
  status: PurchaseOrderStatus;
  createdByName: string;
  totalGoodsAmount: number;
  discountAmount: number;
  totalAmount: number;
  notes?: string | null;
  items: PurchaseOrderItem[];
  receipts: PurchaseOrderReceipt[];
  partnerAddress?: string | null;
  /** Phiếu này đã được gộp vào phiếu nào */
  mergedIntoPoId?: number | null;
  mergedIntoCode?: string | null;
  /** Phiếu này được gộp từ các phiếu nào */
  mergedFromCodes?: string[] | null;
  /** Đã trả NCC cho các phiếu nhập theo phiếu đặt (cập nhật khi trả thêm NCC — khớp lịch sử thanh toán phiếu nhập) */
  paidAmount: number;
  /** Ngày hàng dự kiến về kho (yyyy-MM-dd); dùng cho MRP */
  expectedDate?: string | null;
}

export interface PurchaseOrderLinePayload {
  productId: number;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
}

export interface SavePurchaseOrderPayload {
  warehouseId?: number;
  partnerId: number;
  orderDate?: string;
  /** DRAFT = lưu tạm, ORDERED = đặt hàng */
  status: 'DRAFT' | 'ORDERED';
  notes?: string | null;
  poCode?: string;
  discountAmount: number;
  items: PurchaseOrderLinePayload[];
  /** Ngày hàng dự kiến về kho (yyyy-MM-dd), không trước ngày đặt; rỗng = chưa rõ */
  expectedDate?: string | null;
}

/** 1 dòng nhận hàng ngay trên phiếu đặt: SL đạt (vào kho) và SL lỗi (không vào kho, không tính tiền) */
export interface ReceivePurchaseOrderLine {
  productId: number;
  quantity: number;
  defectQuantity: number;
}

/** Nhập hàng ngay trong phiếu đặt: hệ thống tự sinh phiếu nhập Hoàn thành */
export interface ReceivePurchaseOrderPayload {
  receivedDate?: string;
  paidAmount: number;
  paymentMethod?: string;
  notes?: string | null;
  lines: ReceivePurchaseOrderLine[];
}

export interface PurchaseOrderListFilter {
  warehouseIds?: number[];
  statuses?: PurchaseOrderStatus[];
  fromDate?: string;
  toDate?: string;
  partnerId?: number;
  search?: string;
}
