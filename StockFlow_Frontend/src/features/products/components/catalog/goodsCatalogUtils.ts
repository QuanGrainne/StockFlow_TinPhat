// src/features/products/components/catalog/goodsCatalogUtils.ts
// Hàm thuần của Danh mục Hàng hóa (T19 lát 1: chuyển nguyên văn từ screens/GoodsCatalogScreen.tsx).
import type { GoodsItem } from '../../types/goodsCatalog';

// ─── Hàm Tính Toán Thời Gian Dự Kiến Hết Hàng (Days Until Out Of Stock) ──────────
export interface DaysUntilOutOfStockResult {
  days: number | null;
  label: string;
  status: 'OUT_OF_STOCK' | 'CRITICAL' | 'WARNING' | 'NORMAL' | 'UNKNOWN';
}

export function calculateDaysUntilOutOfStock(
  actualStock: number,
  minSafeStock: number = 0,
  stockCardRecent?: { type: string; qtyChange: number; date?: string }[]
): DaysUntilOutOfStockResult {
  // 1. Phân tích tốc độ tiêu thụ/xuất kho thực tế
  let dailyBurnRate = 0;
  if (stockCardRecent && stockCardRecent.length > 0) {
    const outbounds = stockCardRecent.filter((tx) => tx.type === 'XUAT' || tx.qtyChange < 0);
    if (outbounds.length > 0) {
      const totalOutQty = outbounds.reduce((sum, tx) => sum + Math.abs(tx.qtyChange), 0);
      dailyBurnRate = totalOutQty / 30; // chu kỳ 30 ngày gần nhất
    }
  }

  // 2. Nếu chưa có lịch sử xuất kho nhưng có định mức tồn tối thiểu (> 0)
  if (dailyBurnRate <= 0 && minSafeStock > 0) {
    dailyBurnRate = minSafeStock / 14; // chu kỳ dự phòng 14 ngày
  }

  // 3. Nếu không có căn cứ tốc độ tiêu thụ (chưa bán bao giờ): hiển thị '---'
  if (dailyBurnRate <= 0) {
    return {
      days: null,
      label: '---',
      status: 'UNKNOWN',
    };
  }

  // 4. Nếu có tốc độ tiêu thụ nhưng tồn kho = 0: hiển thị '0 ngày'
  if (actualStock <= 0) {
    return {
      days: 0,
      label: '0 ngày',
      status: 'OUT_OF_STOCK',
    };
  }

  // 5. Nếu còn hàng: tính số ngày = Tồn kho / Tốc độ tiêu thụ ngày
  const calculatedDays = Math.max(1, Math.round(actualStock / dailyBurnRate));
  return {
    days: calculatedDays,
    label: `${calculatedDays} ngày`,
    status: calculatedDays <= 3 ? 'CRITICAL' : calculatedDays <= 7 ? 'WARNING' : 'NORMAL',
  };
}

// Khóa lưu trữ LocalStorage cho Danh mục Hàng hóa
export const STOCKFLOW_GOODS_STORAGE_KEY = 'stockflow_goods_catalog_v1';

/** Mọi mã đang dùng: mã hàng + mã của từng đơn vị quy đổi / hàng cùng loại (VD SP004330 = "bịch" của SP004328) */
export const usedProductCodes = (items: GoodsItem[]): string[] => {
  const codes: string[] = [];
  for (const item of items) {
    if (item.code) codes.push(item.code);
    for (const v of item.variants ?? []) if (v.code) codes.push(v.code);
  }
  return codes;
};

/**
 * Bộ cấp mã SP + 6 chữ số tuần tự, tiếp sau số lớn nhất đang dùng (tính cả mã đơn vị quy đổi),
 * không trùng mã đã có và không trùng mã đã cấp trong cùng lượt lưu. `reserved`: mã sắp dùng (chưa có trong danh sách).
 */
export const createProductCodeAllocator = (items: GoodsItem[], reserved: string[] = []): (() => string) => {
  const used = new Set([...usedProductCodes(items), ...reserved].map((c) => c.trim().toUpperCase()).filter(Boolean));
  let maxNum = 0;
  used.forEach((c) => {
    const match = c.match(/^SP(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  });
  let counter = maxNum;
  return () => {
    let code: string;
    do {
      counter++;
      code = `SP${String(counter).padStart(6, '0')}`;
    } while (used.has(code));
    used.add(code);
    return code;
  };
};

// Quy tắc sinh mã hàng hóa tự động chuẩn SP + 6 chữ số tuần tự (SP000001, SP000002, ...)
export const getNextProductCode = (items: GoodsItem[]): string => createProductCodeAllocator(items)();

// Định dạng ngày giờ tạo sản phẩm theo thời gian thực chuẩn Việt Nam (DD/MM/YYYY HH:mm)
export const formatRealDateTime = (dateInput?: string | Date | null): string => {
  if (!dateInput) {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  if (typeof dateInput === 'string' && /^\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}/.test(dateInput)) {
    return dateInput;
  }
  try {
    let d: Date;
    if (typeof dateInput === 'string') {
      let isoStr = dateInput.trim();
      // Nếu là ISO string (e.g. "2026-10-22T20:48:04.69192") từ C# UTC nhưng không có 'Z',
      // bổ sung 'Z' để Date() chuyển đổi chính xác sang múi giờ địa phương của client (GMT+7 Việt Nam).
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(isoStr) && !isoStr.endsWith('Z') && !/[+-]\d{2}(:\d{2})?$/.test(isoStr)) {
        isoStr += 'Z';
      }
      d = new Date(isoStr);
      if (isNaN(d.getTime())) {
        d = new Date(dateInput);
      }
    } else {
      d = dateInput;
    }
    if (isNaN(d.getTime())) return String(dateInput);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return String(dateInput);
  }
};

// Định dạng hiển thị số với dấu phẩy ngăn cách hàng nghìn (VD: 50,000; 500,000; 999,999,999)
export const formatNumberWithCommas = (val: number | string | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '';
  // Số thực (VD giá vốn bình quân 74285.72) phải làm tròn trước, nếu không dấu "." bị xóa → 7,428,572
  const str = toIntegerString(val);
  if (!str) return '';
  return str.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// Chuẩn hóa về chuỗi số nguyên: số / chuỗi số thập phân ("74285.72") thì làm tròn, chuỗi đã định dạng ("1,234") thì bỏ ký tự thừa
const toIntegerString = (val: number | string): string => {
  if (typeof val === 'number') return Number.isFinite(val) ? String(Math.max(0, Math.round(val))) : '';
  const trimmed = val.trim();
  if (/^\d+\.\d+$/.test(trimmed)) return String(Math.round(Number(trimmed)));
  return trimmed.replace(/\D/g, '');
};

// Chuyển chuỗi định dạng có dấu phẩy về số nguyên an toàn
export const parseCleanNumber = (val: string | number | undefined | null): number => {
  if (val === undefined || val === null || val === '') return 0;
  const str = toIntegerString(val);
  return str ? Number(str) : 0;
};

// Lấy thời gian tạo chuẩn: từ item.createdAt, hoặc suy từ timestamp của ID, hoặc thời gian thực hiện tại
export const getItemCreatedTime = (item: GoodsItem): string => {
  if (item.createdAt && item.createdAt !== '23/09/2026 10:28') {
    return formatRealDateTime(item.createdAt);
  }
  if (item.id && /^G-\d{10,}$/.test(item.id)) {
    const ts = parseInt(item.id.replace('G-', ''), 10);
    if (!isNaN(ts)) {
      const formatted = formatRealDateTime(new Date(ts));
      item.createdAt = formatted;
      return formatted;
    }
  }
  // Nếu là mặt hàng mới tạo hoặc chưa lưu thời gian tạo, gán thời gian thực ngay tại thời điểm này
  const nowTime = formatRealDateTime(new Date());
  item.createdAt = nowTime;
  return nowTime;
};

// Chuyển chuỗi ngày (DD/MM/YYYY hoặc ISO YYYY-MM-DD) sang Date để so sánh khoảng thời gian
export const parseDateToComparable = (str?: string): Date | null => {
  if (!str) return null;
  const dmyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    return new Date(year, month, day);
  }
  const ymdMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    return new Date(year, month, day);
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
};
