// src/features/stocktakes/types/index.ts
// Kiểu dữ liệu module Kiểm kho

export type StocktakeStatus = 'DRAFT' | 'BALANCED' | 'CANCELLED';

export interface StocktakeSummary {
  stocktakeId: number;
  stocktakeCode: string;
  stocktakeDate?: string | null;
  warehouseId: number;
  warehouseName: string;
  status: StocktakeStatus;
  itemCount: number;
  totalActualQty: number;
  totalActualValue: number;
  increaseQty: number;
  increaseValue: number;
  decreaseQty: number;
  decreaseValue: number;
  totalDiscrepancyQty: number;
  totalDiscrepancyValue: number;
  balancedDate?: string | null;
  createdByName: string;
  balancedByName?: string | null;
  notes?: string | null;
}

export interface StocktakeItem {
  stocktakeItemId: number;
  productId: number;
  productCode: string;
  productName: string;
  unit: string;
  systemQty: number;
  actualQty: number;
  discrepancy: number;
  unitCost: number;
  discrepancyValue: number;
  /** Lý do chênh lệch (BR-43) */
  reason?: string | null;
}

export interface StocktakeDetail {
  summary: StocktakeSummary;
  items: StocktakeItem[];
}

export interface SaveStocktakePayload {
  warehouseId?: number;
  stocktakeCode?: string | null;
  notes?: string | null;
  status: 'DRAFT' | 'BALANCED';
  /** reason: lý do chênh lệch, bắt buộc khi Hoàn thành nếu dòng lệch (BR-43, MSG51) */
  items: { productId: number; actualQty: number; reason?: string | null }[];
}
