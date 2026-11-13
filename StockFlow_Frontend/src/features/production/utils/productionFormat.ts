// src/features/production/utils/productionFormat.ts
// Định dạng số lượng / ngày và nhãn trạng thái dùng chung trong module Sản xuất.

import type { ProductionOrderStatus } from '../types';

/** Số lượng: tối đa 2 chữ số thập phân (khớp numeric(18,2) của tồn kho) */
export const fmtQty = (n: number | null | undefined): string =>
  (n ?? 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 });

/** Định mức: tối đa 4 chữ số thập phân (numeric(18,4)) */
export const fmtNorm = (n: number | null | undefined): string =>
  (n ?? 0).toLocaleString('vi-VN', { maximumFractionDigits: 4 });

export const fmtPercent = (n: number | null | undefined): string =>
  `${(n ?? 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%`;

export function fmtDateTime(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function fmtDate(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** yyyy-MM-dd theo giờ máy người dùng (dùng cho ô ngày) */
export function todayIso(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Chuyển chuỗi người dùng nhập (dấu phẩy hoặc chấm thập phân) thành số; rỗng / sai → NaN */
export function parseQty(value: string): number {
  const s = value.trim().replace(/\s/g, '').replace(',', '.');
  if (!s) return NaN;
  return Number(s);
}

export const ORDER_STATUS_LABEL: Record<ProductionOrderStatus, string> = {
  NOT_STARTED: 'Chưa bắt đầu',
  IN_PROGRESS: 'Đang sản xuất',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

export const ORDER_STATUS_CLS: Record<ProductionOrderStatus, string> = {
  NOT_STARTED: 'bg-[#e6f1fe] text-[#0070f4] border-[#0070f4]/25',
  IN_PROGRESS: 'bg-[#fffbeb] text-[#d97706] border-[#fde68a]',
  COMPLETED: 'bg-[#e6f8ec] text-[#16a34a] border-[#bbf7d0]',
  CANCELLED: 'bg-[#fef2f2] text-[#fb2c36] border-[#fecaca]',
};

export const ALL_ORDER_STATUSES: ProductionOrderStatus[] = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

/** Lỗi API → thông báo hiển thị */
export const errorText = (err: unknown, fallback: string): string =>
  err instanceof Error && err.message ? err.message : fallback;
