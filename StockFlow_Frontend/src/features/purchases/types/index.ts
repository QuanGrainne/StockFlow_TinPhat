// src/features/purchases/types/index.ts
// Định nghĩa kiểu dữ liệu cho module Quản lý Nhập hàng (Purchase Inbound)

export * from './formTypes';
export * from './filterTypes';

export interface PurchaseItem {
  id?: string;
  grItemId?: number;
  productId: number;
  productCode: string;
  productName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  totalPrice: number;
  lotId?: number | null;
  lotNumber?: string | null;
  currentStock?: number;
  currentUnitCost?: number;
  /** SL lỗi khi nhận hàng: không vào tồn kho, không tính tiền trả NCC */
  defectQuantity?: number;
  /** SL lỗi đã trả NCC (phiếu trả hàng lỗi đã hoàn thành) */
  defectReturnedQty?: number;
}

/** Cách tính giá vốn bình quân gia quyền của 1 dòng phiếu nhập đã hoàn thành (lấy từ thẻ kho) */
export interface PurchaseCosting {
  productId: number;
  productCode: string;
  productName: string;
  qtyBefore: number;
  costBefore: number;
  qtyIn: number;
  priceIn: number;
  qtyAfter: number;
  costAfter: number;
}

export interface PurchaseListRecord {
  grId: number;
  grCode: string;
  externalPoNumber?: string | null;
  warehouseId: number;
  warehouseCode: string;
  warehouseName: string;
  partnerId: number;
  partnerCode: string;
  partnerName: string;
  receivedDate?: string | null;
  status: 'DRAFT' | 'COMPLETED' | 'CANCELLED';
  receivedBy: number;
  receivedByName: string;
  totalItemsCount: number;
  totalQuantity: number;
  totalAmount: number;
  paidAmount: number;
  debtAmount: number;
  notes?: string | null;
}

export interface PurchaseDetail {
  grId: number;
  grCode: string;
  externalPoNumber?: string | null;
  warehouseId: number;
  warehouseCode: string;
  warehouseName: string;
  partnerId: number;
  partnerCode: string;
  partnerName: string;
  partnerPhone?: string | null;
  partnerAddress?: string | null;
  partnerCurrentPayable: number;
  receivedDate?: string | null;
  status: 'DRAFT' | 'COMPLETED' | 'CANCELLED';
  receivedBy: number;
  receivedByName: string;
  totalAmount: number;
  paidAmount: number;
  debtAmount: number;
  paymentMethod?: string | null;
  notes?: string | null;
  items: PurchaseItem[];
  /** Tổng tiền hàng (trước giảm giá phiếu) */
  totalGoodsAmount?: number;
  /** Giảm giá phiếu (VND) */
  discountAmount?: number;
  payments?: PurchasePayment[];
  /** Lịch sử trả hàng: các phiếu trả hàng nhập lập từ phiếu này */
  returns?: PurchaseReturnSummary[];
  /** Trả hàng nhập (phần tính vào công nợ) đã trừ vào số cần trả NCC của phiếu này */
  returnOffsetAmount?: number;
  /** Cách tính giá vốn BQ gia quyền (chỉ phiếu đã hoàn thành) */
  costing?: PurchaseCosting[];
}

export interface PurchaseReturnSummary {
  purchaseReturnId: number;
  returnCode: string;
  returnDate?: string | null;
  createdByName: string;
  totalAmount: number;
  status: string;
  /** STOCK: trả hàng đã nhập kho; DEFECT: trả hàng lỗi (không trừ kho, không tính tiền) */
  returnType?: 'STOCK' | 'DEFECT';
}

export interface PurchasePayment {
  code: string;
  paymentDate?: string | null;
  createdByName: string;
  paymentMethod: string;
  status: string;
  amount: number;
}

export interface CreatePurchasePayload {
  warehouseId?: number;
  partnerId: number;
  purchaseCode?: string | null;
  /** Nhập hàng theo phiếu đặt hàng nhập */
  purchaseOrderId?: number;
  externalPoNumber?: string | null;
  receivedDate?: string | null;
  status: 'DRAFT' | 'COMPLETED';
  paidAmount: number;
  paymentMethod?: string;
  notes?: string | null;
  discountAmount?: number;
  items: {
    productId: number;
    quantity: number;
    unitPrice: number;
    discountPercent?: number;
    lotId?: number | null;
    lotNumber?: string | null;
    /** SL lỗi: quantity là SL đạt (vào kho, tính tiền) */
    defectQuantity?: number;
  }[];
}

export interface UpdatePurchasePayload {
  partnerId: number;
  externalPoNumber?: string | null;
  receivedDate?: string | null;
  notes?: string | null;
  discountAmount?: number;
  items: {
    productId: number;
    quantity: number;
    unitPrice: number;
    discountPercent?: number;
    lotId?: number | null;
    lotNumber?: string | null;
    /** SL lỗi: quantity là SL đạt (vào kho, tính tiền) */
    defectQuantity?: number;
  }[];
}

export interface CompletePurchasePayload {
  paidAmount: number;
  paymentMethod?: string;
}

export interface CancelPurchasePayload {
  reason?: string;
}
