// src/features/pos/types/index.ts
// Các kiểu dữ liệu cốt lõi cho màn hình bán hàng StockFlow POS (Đã tinh gọn theo ERD hiện hành)

export interface PosProduct {
  id: string;
  productId: number;
  code: string;
  name: string;
  type: string;
  categoryId: number;
  categoryName: string;
  baseUnitId: number;
  uom: string;
  standardPrice: number;
  costPrice: number;
  stockQuantity: number;
  status: string;
  barcode?: string | null;
  brand?: string | null;
  minSafeStock?: number | null;
  imageUrl?: string | null;
  description?: string | null;
}

export interface CartItem {
  stt: number;
  productId: number;
  code: string;
  name: string;
  imageUrl?: string | null;
  uom: string;
  unitId: number;
  unitPrice: number;
  quantity: number;
  stockQuantity: number;
  minSafeStock?: number | null;
  total: number; // unitPrice * quantity
  discountPercent?: number;
  discountAmount?: number;
}

export interface PosCustomer {
  id: number;
  partnerId: number;
  code: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  creditLimit: number;
  currentDebt: number;
  isOverCreditLimit: boolean;
  taxCode?: string;
  salesRep?: string;
}

export type PaymentMethod = 'CASH' | 'VIETQR' | 'POS_CARD' | 'DEBT';

export interface PosOrderTab {
  id: string; // e.g. 'order-1', 'order-2'
  code: string; // e.g. 'Hóa đơn 1'
  status: 'PROCESSING' | 'WAITING' | 'COMPLETED';
  items: CartItem[];
  selectedCustomer: PosCustomer | null;
  autoPrintK80: boolean;
  warehouseId: number;
  warehouseName: string;
  notes: string;
  paymentMethod: PaymentMethod;
  prepaidAmount: number; // Khách thanh toán trước
  discountAmount: number; // Số tiền giảm giá nhập tay (VNĐ)
}

export interface PosCategory {
  categoryId: number;
  categoryName: string;
  description?: string;
}
