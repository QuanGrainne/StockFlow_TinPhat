// src/features/purchases/types/filterTypes.ts
// Kiểu bộ lọc danh sách phiếu nhập (dùng chung cho Nhập hàng, Trả hàng nhập, Kiểm kho)

export type PurchaseStatus = 'draft' | 'completed' | 'canceled';

export type PurchaseFilterState = {
  statuses: PurchaseStatus[];
  timeRange: string;
  periodLabel?: string;
  dateFrom?: string;
  dateTo?: string;
  createdBy?: string;
  invoiceCode?: string;
  importedBy?: string;
  warehouseIds?: number[];
  partnerId?: number;
};
