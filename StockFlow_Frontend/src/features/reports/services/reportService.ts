// src/features/reports/services/reportService.ts
// Kết nối API Báo cáo (/api/reports) – chỉ đọc dữ liệu

import { apiClient } from '@/lib/api/client';
import type {
  DashboardSummary,
  DebtReport,
  DebtReportType,
  PagedReport,
  RevenueProfitGroupBy,
  RevenueProfitReport,
  StockMovementReport,
} from '../types';

/** Tham số kỳ + kho dùng chung cho các báo cáo */
export interface ReportPeriodParams {
  from: string;
  to: string;
  warehouseId?: number | null;
}

export interface PagingParams {
  page: number;
  pageSize: number;
}

/** Số dòng tối đa mỗi trang backend cho phép (ReportValidation.MaxPageSize) */
export const MAX_REPORT_PAGE_SIZE = 500;

export function buildReportQuery(params: object): string {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    q.append(key, String(value));
  }
  const qs = q.toString();
  return qs ? `?${qs}` : '';
}

/** Lấy mọi trang của một báo cáo phân trang (dùng khi xuất Excel) */
export async function fetchAllPages<TRow, TTotals>(
  load: (paging: PagingParams) => Promise<PagedReport<TRow, TTotals>>
): Promise<{ items: TRow[]; totals: TTotals }> {
  const first = await load({ page: 1, pageSize: MAX_REPORT_PAGE_SIZE });
  const items = [...first.items];
  const pages = Math.ceil(first.totalCount / MAX_REPORT_PAGE_SIZE);
  for (let page = 2; page <= pages; page++) {
    const next = await load({ page, pageSize: MAX_REPORT_PAGE_SIZE });
    items.push(...next.items);
  }
  return { items, totals: first.totals };
}

export const reportService = {
  /** UC-90 – Báo cáo tổng quan */
  getDashboard(params: ReportPeriodParams): Promise<DashboardSummary> {
    return apiClient.get<DashboardSummary>(`/api/reports/dashboard${buildReportQuery(params)}`);
  },

  /** UC-88 – Doanh thu & lợi nhuận, nhóm theo ngày / hàng hóa / khách hàng */
  getRevenueProfit(
    params: ReportPeriodParams & PagingParams & { groupBy: RevenueProfitGroupBy; categoryId?: number | null }
  ): Promise<RevenueProfitReport> {
    return apiClient.get<RevenueProfitReport>(`/api/reports/revenue-profit${buildReportQuery(params)}`);
  },

  /** UC-87 – Nhập – xuất – tồn theo kho và kỳ (từ thẻ kho) */
  getStockMovement(
    params: ReportPeriodParams & PagingParams & { categoryId?: number | null; onlyMismatch?: boolean }
  ): Promise<StockMovementReport> {
    return apiClient.get<StockMovementReport>(`/api/reports/stock-movement${buildReportQuery(params)}`);
  },

  /** UC-86 – Công nợ phải thu / phải trả (không lọc theo kho) */
  getDebts(
    params: { from: string; to: string; type: DebtReportType; search?: string } & PagingParams
  ): Promise<DebtReport> {
    return apiClient.get<DebtReport>(`/api/reports/debts${buildReportQuery(params)}`);
  },
};
