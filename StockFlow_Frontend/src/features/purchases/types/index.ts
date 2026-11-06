// src/features/purchases/types/index.ts
// Định nghĩa kiểu dữ liệu cho module Quản lý Nhập hàng (Purchase Inbound)

export * from './formTypes';

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
}

export interface PurchaseReturnSummary {
  purchaseReturnId: number;
  returnCode: string;
  returnDate?: string | null;
  createdByName: string;
  totalAmount: number;
  status: string;
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
  }[];
}

export interface CompletePurchasePayload {
  paidAmount: number;
  paymentMethod?: string;
}

export interface CancelPurchasePayload {
  reason?: string;
}
