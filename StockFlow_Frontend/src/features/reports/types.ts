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

// ─── UC-88 – Doanh thu & lợi nhuận ───

export type RevenueProfitGroupBy = 'DAY' | 'PRODUCT' | 'CUSTOMER';

export interface RevenueProfitRow {
  /** yyyy-MM-dd (theo ngày) hoặc id hàng / khách */
  key: string;
  /** Ngày / mã hàng / mã khách */
  code: string;
  name: string;
  quantitySold: number;
  revenue: number;
  discount: number;
  returnValue: number;
  netRevenue: number;
  costOfGoodsSold: number;
  grossProfit: number;
  marginPercent: number;
}

/** Trang kết quả báo cáo phân trang phía server, kèm dòng tổng của mọi trang */
export interface PagedReport<TRow, TTotals = TRow> {
  items: TRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  totals: TTotals;
}

export type RevenueProfitReport = PagedReport<RevenueProfitRow>;

// ─── UC-87 – Nhập – xuất – tồn ───

/** Số lượng tách theo nhóm loại giao dịch thẻ kho */
export interface MovementByGroup {
  purchase: number;
  sale: number;
  transfer: number;
  stocktake: number;
  production: number;
  disposal: number;
  other: number;
}

export interface StockMovementRow {
  key: string;
  warehouseId: number;
  warehouseCode: string;
  warehouseName: string;
  productId: number;
  productCode: string;
  productName: string;
  unitName: string;
  openingQuantity: number;
  openingValue: number;
  inQuantity: number;
  inValue: number;
  outQuantity: number;
  outValue: number;
  inByGroup: MovementByGroup;
  outByGroup: MovementByGroup;
  closingQuantity: number;
  closingValue: number;
  /** balance_after của dòng thẻ kho cuối kỳ */
  ledgerBalanceAfter: number | null;
  isLedgerMismatch: boolean;
  /** Tồn hiện tại – chỉ có khi kỳ kéo tới hôm nay */
  currentQuantity: number | null;
  isCurrentMismatch: boolean;
}

export interface StockMovementReport extends PagedReport<StockMovementRow> {
  ledgerMismatchCount: number;
  currentMismatchCount: number;
}

// ─── UC-86 – Công nợ ───

export type DebtReportType = 'RECEIVABLE' | 'PAYABLE';

export type DebtAgingBucket = '0-30' | '31-60' | '61-90' | '90+';

export interface DebtReportRow {
  partnerId: number;
  code: string;
  name: string;
  phone: string | null;
  opening: number;
  increase: number;
  decrease: number;
  closing: number;
  /** Hạn mức (chỉ khách hàng) */
  creditLimit: number | null;
  /** Số ngày nợ tính đến hôm nay (chỉ khách đang còn nợ) */
  debtDays: number | null;
  agingBucket: DebtAgingBucket | null;
}

export interface DebtAgingSummary {
  bucket: DebtAgingBucket;
  count: number;
  amount: number;
}

export interface DebtReport extends PagedReport<DebtReportRow> {
  type: DebtReportType;
  /** FIRST_DEBT / LAST_TRANSACTION; null với phải trả */
  debtDaysFrom: string | null;
  aging: DebtAgingSummary[];
}
