// src/features/purchases/types/formTypes.ts
// Các kiểu dữ liệu form cho màn hình Tạo phiếu nhập hàng

export interface TablePurchaseItem {
  id: string;
  productId: number;
  code: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  currentStock: number;
  currentUnitCost: number;
  lotNumber?: string;
}
