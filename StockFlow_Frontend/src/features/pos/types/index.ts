// src/features/pos/types/index.ts
// Các kiểu dữ liệu cốt lõi cho màn hình bán hàng StockFlow POS

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
  standardPrice: number; // Giá niêm yết chuẩn
  unitPrice: number; // Đơn giá sau áp dụng bảng giá
  quantity: number;
  stockQuantity: number;
  minSafeStock?: number | null;
  total: number; // unitPrice * quantity
  discountType?: 'PERCENT' | 'AMOUNT'; // Loại chiết khấu dòng: % hoặc VNĐ
  discountValue?: number; // Giá trị nhập (% hoặc VNĐ)
  discountPercent?: number; // % giảm giá (vd: 2%, 5%, 10%)
  discountAmount?: number; // Số tiền chiết khấu (standardPrice - unitPrice) * quantity
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

export interface PosPriceBook {
  priceBookId: number;
  priceBookCode: string;
  priceBookName: string;
  isActive: boolean;
  isDefault: boolean;
}

export interface PosWarehouse {
  warehouseId: number;
  code: string;
  name: string;
  branchName?: string;
  address?: string;
  status: string;
}

export type PaymentMethod = 'CASH' | 'VIETQR' | 'DEBT';

export interface PosOrderTab {
  id: string; // e.g. 'order-1', 'order-2'
  code: string; // e.g. 'Hóa đơn 1'
  status: 'PROCESSING' | 'WAITING' | 'COMPLETED';
  items: CartItem[];
  selectedCustomer: PosCustomer | null;
  priceBookId: number; // ID bảng giá bán đang chọn
  priceBookName: string; // Tên bảng giá bán đang chọn
  autoPrintK80: boolean;
  warehouseId: number;
  warehouseName: string;
  notes: string;
  paymentMethod: PaymentMethod;
  prepaidAmount: number; // Khách thanh toán trước
  excessAction?: 'RETURN_CASH' | 'RECORD_DEBT'; // Xử lý tiền thừa: Trả khách hay Ghi công nợ
  discountType?: 'PERCENT' | 'AMOUNT'; // Loại chiết khấu hóa đơn: % hoặc VNĐ
  discountValue?: number; // Giá trị chiết khấu hóa đơn (% hoặc VNĐ)
  discountAmount: number; // Số tiền giảm giá hóa đơn quy đổi (VNĐ)
  vatRate?: number; // Tỷ lệ VAT (mặc định 8%)
  applyVat?: boolean; // Bật/tắt tính thuế VAT
  deliveryType?: 'COUNTER' | 'TRUCK' | 'GRAB';
}

export interface PosCategory {
  categoryId: number;
  categoryName: string;
  description?: string;
}
