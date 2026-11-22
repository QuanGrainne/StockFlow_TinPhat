// src/features/reports/services/reportService.ts
// Kết nối API Báo cáo (/api/reports) – chỉ đọc dữ liệu

import { apiClient } from '@/lib/api/client';
import type { DashboardSummary } from '../types';

/** Tham số kỳ + kho dùng chung cho các báo cáo */
export interface ReportPeriodParams {
  from: string;
  to: string;
  warehouseId?: number | null;
}

export function buildReportQuery(params: object): string {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    q.append(key, String(value));
  }
  const qs = q.toString();
  return qs ? `?${qs}` : '';
}

export const reportService = {
  /** UC-90 – Báo cáo tổng quan */
  getDashboard(params: ReportPeriodParams): Promise<DashboardSummary> {
    return apiClient.get<DashboardSummary>(`/api/reports/dashboard${buildReportQuery(params)}`);
  },
};
