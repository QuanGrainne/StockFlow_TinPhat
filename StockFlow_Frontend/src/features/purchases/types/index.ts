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
}

export interface CreatePurchasePayload {
  warehouseId?: number;
  partnerId: number;
  externalPoNumber?: string | null;
  receivedDate?: string | null;
  status: 'DRAFT' | 'COMPLETED';
  paidAmount: number;
  paymentMethod?: string;
  notes?: string | null;
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
