// src/features/production/utils/productionPlanFormat.ts
// Nhãn trạng thái, thông báo lỗi và kiểm tra form của Kế hoạch sản xuất.
// Luật kiểm tra khớp SaveProductionPlanRequestValidator (backend) để báo lỗi ngay trên form;
// backend vẫn kiểm lại và là nơi quyết định.

import type { ProductionPlanStatus } from '../types';

export const PLAN_STATUS_LABEL: Record<ProductionPlanStatus, string> = {
  DRAFT: 'Nháp',
  PENDING_APPROVAL: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Bị từ chối',
  CLOSED: 'Đã đóng',
  CANCELLED: 'Đã hủy',
};

export const PLAN_STATUS_CLS: Record<ProductionPlanStatus, string> = {
  DRAFT: 'bg-slate-50 text-slate-600 border-slate-200',
  PENDING_APPROVAL: 'bg-[#fffbeb] text-[#d97706] border-[#fde68a]',
  APPROVED: 'bg-[#e6f1fe] text-[#0070f4] border-[#0070f4]/25',
  REJECTED: 'bg-[#fef2f2] text-[#fb2c36] border-[#fecaca]',
  CLOSED: 'bg-[#e6f8ec] text-[#16a34a] border-[#bbf7d0]',
  CANCELLED: 'bg-slate-100 text-slate-500 border-slate-300',
};

export const PLAN_STATUS_OPTIONS: { value: ProductionPlanStatus; label: string }[] = (
  Object.keys(PLAN_STATUS_LABEL) as ProductionPlanStatus[]
).map((value) => ({ value, label: PLAN_STATUS_LABEL[value] }));

export const PLAN_NAME_MAX = 150;
export const PLAN_NOTES_MAX = 500;
export const PLAN_REASON_MAX = 200;
/** Q-V7: số lượng kế hoạch tối đa mỗi dòng (khớp ProductionPlanRules.MaxPlannedQuantity) */
export const PLAN_MAX_QTY = 999_999_999.99;
/** Q-V8: khoảng ngày hợp lệ (năm 2000 – 2100) */
export const PLAN_MIN_DATE = '2000-01-01';
export const PLAN_MAX_DATE = '2100-12-31';
/** Q-V2: loại hàng được đưa vào kế hoạch */
export const PLAN_PRODUCT_TYPES = ['FINISHED', 'SEMI_FINISHED'];
export const PAST_PERIOD_NOTE_REQUIRED = 'Kỳ kế hoạch đã kết thúc trước hôm nay. Vui lòng ghi lý do vào ô Ghi chú.';

interface ApiErrorShape {
  response?: { errors?: Record<string, string[] | string> };
}

/**
 * Lỗi API → thông báo. Lỗi validation (400 VALIDATION_FAILED) ghép thông báo chi tiết.
 * Lỗi đọc JSON của ASP.NET (khóa "$.field" / "request", tiếng Anh) đổi thành thông báo tiếng Việt (V-11).
 */
export function planErrorText(err: unknown, fallback: string): string {
  const base = err instanceof Error && err.message ? err.message : fallback;
  const errors = (err as ApiErrorShape | null)?.response?.errors;
  if (!errors) return base;
  const details: string[] = [];
  for (const [key, value] of Object.entries(errors)) {
    if (key.startsWith('$') || key === 'request') {
      details.push('Dữ liệu ngày hoặc số không đúng định dạng.');
      continue;
    }
    details.push(...(Array.isArray(value) ? value : [value]));
  }
  const unique = Array.from(new Set(details.filter(Boolean)));
  return unique.length > 0 ? unique.join(' ') : base;
}

/** dd/MM/yyyy từ chuỗi yyyy-MM-dd (không đổi múi giờ) */
export function fmtDateOnly(value?: string | null): string {
  if (!value) return '';
  const [y, m, d] = value.slice(0, 10).split('-');
  return y && m && d ? `${d}/${m}/${y}` : value;
}

export const isDateInRange = (iso: string): boolean => iso >= PLAN_MIN_DATE && iso <= PLAN_MAX_DATE;

export interface QtyParseResult {
  value: number;
  error: string | null;
  /** Giá trị đã hiểu, hiện dưới ô khi người dùng có gõ dấu chấm (dễ nhầm hàng nghìn / thập phân) */
  hint: string | null;
}

/**
 * Đọc số lượng người dùng gõ theo kiểu Việt Nam (V-05):
 * - Dấu phẩy là phần thập phân: "10,5" → 10,5.
 * - Dấu chấm theo sau đúng 3 chữ số là phân cách hàng nghìn: "1.000" → 1000; "1.000,5" → 1000,5.
 * - Dấu chấm theo sau 1–2 chữ số là phần thập phân: "10.5" → 10,5.
 * - Bỏ khoảng trắng; không nhận số âm, ký hiệu khoa học (1e3), quá 2 chữ số thập phân, vượt 999.999.999,99.
 */
export function parsePlanQty(text: string): QtyParseResult {
  const s = text.replace(/\s/g, '');
  if (!s) return { value: NaN, error: 'Vui lòng nhập số lượng.', hint: null };

  let normalized: string | null = null;
  if (/^\d+$/.test(s)) normalized = s;
  else if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(s)) normalized = s.replace(/\./g, '').replace(',', '.');
  else if (/^\d+[.,]\d{1,2}$/.test(s)) normalized = s.replace(',', '.');

  if (normalized === null) {
    if (s.startsWith('-')) return { value: NaN, error: 'Số lượng phải lớn hơn 0.', hint: null };
    if (/^\d+([.,]\d+)?$/.test(s)) return { value: NaN, error: 'Số lượng có tối đa 2 chữ số thập phân.', hint: null };
    return {
      value: NaN,
      error: 'Số lượng không đúng định dạng. Dùng dấu phẩy cho phần thập phân, dấu chấm phân cách hàng nghìn (VD 1.000,5).',
      hint: null,
    };
  }

  const value = Number(normalized);
  const hint = s.includes('.') ? `Hiểu là: ${String(value).replace('.', ',')}` : null;
  if (!(value > 0)) return { value, error: 'Số lượng phải lớn hơn 0.', hint };
  if (value > PLAN_MAX_QTY) return { value, error: 'Số lượng tối đa 999.999.999,99.', hint };
  return { value, error: null, hint };
}

export interface PlanFormLine {
  productId: number;
  productCode: string;
  productName: string;
  unitName: string;
  hasActiveBom: boolean;
  quantityText: string;
  plannedStartDate: string;
  plannedEndDate: string;
  warehouseId: number | null;
  notes: string;
  /** Số đã lập lệnh (chỉ có khi sửa kế hoạch đã duyệt) */
  orderedQuantity: number;
  /** Dòng đã có trên kế hoạch đã lưu */
  existing: boolean;
}

export interface PlanFormState {
  planName: string;
  periodStart: string;
  periodEnd: string;
  notes: string;
  lines: PlanFormLine[];
}

/** Lỗi theo ô: khóa 'planName' | 'period' | 'notes' | 'lines' | `line:<productId>` */
export type PlanFormErrors = Record<string, string>;

/** Kỳ kế hoạch kết thúc trước hôm nay (Q-V1) */
export const isPastPeriod = (periodEnd: string, today: string): boolean => !!periodEnd && periodEnd < today;

export function validatePlanForm(form: PlanFormState, limited: boolean, today: string): PlanFormErrors {
  const errors: PlanFormErrors = {};
  const name = form.planName.trim();
  if (!name) errors.planName = 'Vui lòng nhập tên kế hoạch.';
  else if (name.length > PLAN_NAME_MAX) errors.planName = 'Tên kế hoạch tối đa 150 ký tự.';

  if (!form.periodStart || !form.periodEnd) errors.period = 'Vui lòng chọn kỳ kế hoạch.';
  else if (!isDateInRange(form.periodStart) || !isDateInRange(form.periodEnd)) errors.period = 'Ngày phải nằm trong khoảng năm 2000 – 2100.';
  else if (form.periodStart > form.periodEnd) errors.period = 'Ngày kết thúc kỳ kế hoạch không được trước ngày bắt đầu.';

  const notes = form.notes.trim();
  if (notes.length > PLAN_NOTES_MAX) errors.notes = 'Ghi chú tối đa 500 ký tự.';
  else if (isPastPeriod(form.periodEnd, today) && !notes) errors.notes = PAST_PERIOD_NOTE_REQUIRED;

  if (form.lines.length === 0) errors.lines = 'Kế hoạch phải có ít nhất một thành phẩm.';

  for (const l of form.lines) {
    const key = `line:${l.productId}`;
    const qty = parsePlanQty(l.quantityText);
    if (qty.error) {
      errors[key] = qty.error;
    } else if (limited && qty.value < l.orderedQuantity) {
      errors[key] = `Số lượng không được thấp hơn số đã lập lệnh (${l.orderedQuantity.toLocaleString('vi-VN')}).`;
    } else if (!l.plannedStartDate || !l.plannedEndDate) {
      errors[key] = 'Vui lòng chọn ngày bắt đầu và kết thúc.';
    } else if (!isDateInRange(l.plannedStartDate) || !isDateInRange(l.plannedEndDate)) {
      errors[key] = 'Ngày phải nằm trong khoảng năm 2000 – 2100.';
    } else if (l.plannedStartDate > l.plannedEndDate) {
      errors[key] = 'Ngày kết thúc của dòng không được trước ngày bắt đầu.';
    } else if (form.periodStart && form.periodEnd && (l.plannedStartDate < form.periodStart || l.plannedEndDate > form.periodEnd)) {
      errors[key] = 'Thời gian của dòng phải nằm trong kỳ kế hoạch.';
    } else if (l.notes.trim().length > PLAN_NOTES_MAX) {
      errors[key] = 'Ghi chú dòng tối đa 500 ký tự.';
    } else if (limited && !l.existing && !l.hasActiveBom) {
      errors[key] = 'Thành phẩm chưa có BOM đang áp dụng, không thêm được vào kế hoạch đã duyệt.';
    }
  }
  return errors;
}

/** Mã yêu cầu chống tạo trùng (Q-V6) */
export function newClientRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
