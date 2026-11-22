// src/features/reports/types.ts
// Kiểu dữ liệu màn Báo cáo (UC-86, 87, 88, 90) – khớp DTO của /api/reports

/** Mốc kỳ báo cáo trên bộ lọc */
export type PeriodPreset = 'today' | 'last_7_days' | 'this_month' | 'last_month' | 'custom';

/** Bộ lọc chung của các tab báo cáo (ngày dạng yyyy-MM-dd) */
export interface ReportFilter {
  preset: PeriodPreset;
  from: string;
  to: string;
  /** null = mọi kho được phân quyền */
  warehouseId: number | null;
}

export interface DashboardKpi {
  invoiceRevenue: number;
  returnValue: number;
  netRevenue: number;
  costOfGoodsSold: number;
  grossProfit: number;
  grossMarginPercent: number;
  invoiceCount: number;
  averageOrderValue: number;
  inventoryValue: number;
  receivable: number;
  payable: number;
}

export interface DailyRevenuePoint {
  date: string;
  netRevenue: number;
  grossProfit: number;
}

export interface TopProduct {
  productId: number;
  productCode: string;
  productName: string;
  quantity: number;
  revenue: number;
}

export interface PendingTasks {
  creditRequests: number;
  productionPlansPendingApproval: number;
  productionOrdersInProgress: number;
  transfersInTransit: number;
}

export interface LowStockItem {
  warehouseId: number;
  warehouseName: string;
  productId: number;
  productCode: string;
  productName: string;
  quantity: number;
  reorderPoint: number | null;
  minSafeStock: number | null;
}

export interface DashboardSummary {
  from: string;
  to: string;
  warehouseId: number | null;
  kpi: DashboardKpi;
  daily: DailyRevenuePoint[];
  topProducts: TopProduct[];
  pending: PendingTasks;
  lowStock: LowStockItem[];
  lowStockTotal: number;
}
