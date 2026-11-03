// src/features/purchase-returns/types/index.ts
// Kiểu dữ liệu module Trả hàng nhập (trả hàng cho nhà cung cấp)

export type PurchaseReturnStatus = 'DRAFT' | 'COMPLETED' | 'CANCELLED';

export interface PurchaseReturnItem {
  prItemId: number;
  productId: number;
  productCode: string;
  productName: string;
  unit: string;
  quantity: number;
  importPrice: number;
  returnPrice: number;
  totalPrice: number;
  grItemId?: number | null;
}

export interface PurchaseReturnListRecord {
  purchaseReturnId: number;
  returnCode: string;
  returnDate?: string | null;
  grId?: number | null;
  grCode?: string | null;
  warehouseId: number;
  warehouseName: string;
  partnerId: number;
  partnerCode: string;
  partnerName: string;
  /** Tổng tiền hàng (trước giảm giá) */
  totalGoodsAmount: number;
  discountAmount: number;
  /** Nhà cung cấp cần trả = Tổng tiền hàng − Giảm giá */
  totalAmount: number;
  /** Tiền nhà cung cấp đã trả lại */
  refundAmount: number;
  status: PurchaseReturnStatus;
  createdByName: string;
  notes?: string | null;
  /** Phần "tính vào công nợ" đã trừ vào số còn nợ của phiếu nhập gốc */
  offsetAmount?: number;
}

export interface PurchaseReturnDetail extends PurchaseReturnListRecord {
  partnerPhone?: string | null;
  partnerAddress?: string | null;
  partnerCurrentPayable: number;
  paymentMethod?: string | null;
  createdBy: number;
  items: PurchaseReturnItem[];
  /** Lịch sử tiền NCC trả lại (trả ngay lúc trả hàng + phiếu thu PT...) */
  payments?: PurchaseReturnPayment[];
}

export interface PurchaseReturnPayment {
  code: string;
  paymentDate?: string | null;
  createdByName: string;
  paymentMethod: string;
  status: string;
  amount: number;
}

export interface CreateSupplierRefundPayload {
  amount: number;
  paymentMethod?: string;
  paymentDate?: string;
  notes?: string | null;
}

export interface SavePurchaseReturnPayload {
  partnerId: number;
  warehouseId?: number;
  grId?: number | null;
  returnCode?: string | null;
  returnDate?: string | null;
  status: 'DRAFT' | 'COMPLETED';
  discountAmount: number;
  refundAmount: number;
  paymentMethod?: string;
  notes?: string | null;
  items: {
    productId: number;
    quantity: number;
    returnPrice: number;
    grItemId?: number | null;
  }[];
}

/** Dòng phiếu nhập gốc kèm SL còn được trả */
export interface ReturnSourceItem {
  grItemId: number;
  productId: number;
  productCode: string;
  productName: string;
  unit: string;
  imageUrl?: string | null;
  receivedQty: number;
  returnedQty: number;
  remainingQty: number;
  importPrice: number;
  currentStock: number;
  /** Giá vốn thực = Giá nhập sau khi phân bổ giảm giá cả phiếu nhập */
  landedCost?: number;
}

export interface ReturnSource {
  grId: number;
  grCode: string;
  warehouseId: number;
  warehouseName: string;
  partnerId: number;
  partnerCode: string;
  partnerName: string;
  partnerCurrentPayable: number;
  items: ReturnSourceItem[];
}
