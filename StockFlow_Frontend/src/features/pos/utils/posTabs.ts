// src/features/pos/utils/posTabs.ts
// Kiểu dữ liệu tab hóa đơn của màn POS + hàm mở sẵn 1 tab (VD "Sao chép" từ màn Hóa đơn).
// Các tab được lưu ở localStorage để tải lại trang không mất giỏ hàng.

import type { PosCustomer } from '../types';

export type DiscountMode = 'VND' | 'PERCENT';
/** Phương thức thanh toán tại quầy: Tiền mặt / Chuyển khoản */
export type PayMethod = 'CASH' | 'VIETQR';

export interface PosLine {
  key: string;
  productId: number;
  code: string;
  name: string;
  imageUrl?: string | null;
  uom: string;
  unitId: number;
  stock: number;
  /** Đơn giá theo bảng giá */
  unitPrice: number;
  discountMode: DiscountMode;
  /** Giảm trên 1 đơn vị: VNĐ hoặc % */
  discountValue: number;
  quantity: number;
  note: string;
}

export interface PosTab {
  id: string;
  name: string;
  lines: PosLine[];
  customer: PosCustomer | null;
  priceBookId: number | null;
  discountMode: DiscountMode;
  discountValue: number;
  /** null = tự bằng Khách cần trả */
  paid: number | null;
  payMethod: PayMethod;
  notes: string;
}

export const POS_TABS_KEY = 'stockflow_pos_tabs_v2';

export const newPosId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export function readPosTabs(): PosTab[] {
  try {
    const raw = localStorage.getItem(POS_TABS_KEY);
    const tabs = raw ? (JSON.parse(raw) as PosTab[]) : [];
    // Phương thức cũ (Thẻ / Ví) đã bỏ → quy về Tiền mặt
    return tabs.map((t) => ({ ...t, payMethod: t.payMethod === 'VIETQR' ? 'VIETQR' : 'CASH' }));
  } catch {
    return [];
  }
}

/** Thêm 1 tab hóa đơn mới lên đầu danh sách tab của POS (lần mở POS tiếp theo sẽ mở tab này) */
export function queuePosTab(tab: Omit<PosTab, 'id' | 'name'>) {
  const tabs = readPosTabs();
  const used = new Set(tabs.map((t) => Number(t.name.replace(/\D/g, '')) || 0));
  let n = 1;
  while (used.has(n)) n++;
  const next: PosTab = { ...tab, id: newPosId(), name: `Hóa đơn ${n}` };
  try {
    localStorage.setItem(POS_TABS_KEY, JSON.stringify([next, ...tabs]));
  } catch {
    // trình duyệt chặn localStorage: bỏ qua
  }
}
