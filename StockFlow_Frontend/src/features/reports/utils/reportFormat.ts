// src/features/reports/utils/reportFormat.ts
// Định dạng số liệu và kỳ báo cáo (AI_CODING_RULES.md §5.12)

import { getDateRangeForPreset } from '@/lib/utils/date';
import type { PeriodPreset } from '../types';

const currencyFormatter = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });
const quantityFormatter = new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

/** Số tiền VND, giữ cả số 0 và số âm (báo cáo cần thấy 0 ₫) */
export function formatMoney(value: number): string {
  return `${currencyFormatter.format(value)} ₫`;
}

export function formatQuantity(value: number): string {
  return quantityFormatter.format(value);
}

export function formatPercent(value: number): string {
  return `${quantityFormatter.format(value)}%`;
}

/** Số tiền rút gọn cho trục biểu đồ: 1,2 tr / 3,4 tỷ */
export function formatMoneyShort(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${quantityFormatter.format(value / 1_000_000_000)} tỷ`;
  if (abs >= 1_000_000) return `${quantityFormatter.format(value / 1_000_000)} tr`;
  if (abs >= 1_000) return `${quantityFormatter.format(value / 1_000)} k`;
  return quantityFormatter.format(value);
}

export const PERIOD_PRESETS: { key: PeriodPreset; label: string }[] = [
  { key: 'today', label: 'Hôm nay' },
  { key: 'last_7_days', label: '7 ngày' },
  { key: 'this_month', label: 'Tháng này' },
  { key: 'last_month', label: 'Tháng trước' },
  { key: 'custom', label: 'Tùy chỉnh' },
];

/** Khoảng ngày của mốc kỳ (Tùy chỉnh giữ nguyên ngày đang chọn) */
export function rangeOfPreset(preset: Exclude<PeriodPreset, 'custom'>): { from: string; to: string } {
  const { from, to } = getDateRangeForPreset(preset);
  return { from, to };
}

/** Số ngày của kỳ (tính cả hai đầu) */
export function periodDays(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  return Math.round((end - start) / 86_400_000) + 1;
}

export const MAX_PERIOD_DAYS = 366;
