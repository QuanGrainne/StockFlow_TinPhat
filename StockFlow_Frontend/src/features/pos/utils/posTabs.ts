// src/features/pos/utils/posTabs.ts
// Kiểu dữ liệu tab của màn POS (Hóa đơn / Đặt hàng) + hàm mở sẵn 1 tab (VD "Sao chép" từ màn Hóa đơn).
// Các tab được lưu ở localStorage để tải lại trang không mất giỏ hàng.

import type { PosCustomer } from '../types';

export type DiscountMode = 'VND' | 'PERCENT';
/** Phương thức thanh toán tại quầy: Tiền mặt / Chuyển khoản */
export type PayMethod = 'CASH' | 'VIETQR';
/** Loại tab: Hóa đơn (bán, trừ kho ngay) hoặc Đặt hàng (đơn đặt của khách, không trừ kho) */
export type PosTabKind = 'INVOICE' | 'BOOKING' | 'RETURN';

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
  /** Trả hàng: dòng hóa đơn gốc, SL còn được trả */
  orderItemId?: number;
  maxQty?: number;
  /** Trả hàng theo hóa đơn: giá bán trên hóa đơn (cơ sở phân bổ giảm giá hóa đơn) */
  returnSalePrice?: number;
}

export interface PosTab {
  id: string;
  name: string;
  lines: PosLine[];
  customer: PosCustomer | null;
  priceBookId: number | null;
  discountMode: DiscountMode;
  discountValue: number;
  /** null = mặc định (hóa đơn: bằng Khách cần trả; đặt hàng: 0) */
  paid: number | null;
  payMethod: PayMethod;
  notes: string;
  /** Mặc định INVOICE (tab cũ đã lưu không có trường này) */
  kind?: PosTabKind;
  /** BOOKING: đơn đặt đang sửa; INVOICE: hóa đơn giao hàng tạo từ đơn đặt này */
  bookingId?: number | null;
  bookingCode?: string | null;
  /** BOOKING (sửa): tiền khách đã trả trước; INVOICE từ đơn: tiền trả trước còn lại được trừ vào hóa đơn */
  bookingPaid?: number;
  /** INVOICE từ đơn: các dòng hàng đã đặt (so với SL khách lấy để hỏi tạo đơn chờ cho phần còn lại) */
  bookingItems?: { productId: number; code: string; name: string; unit: string; quantity: number }[];
  /** Chi nhánh xử lý của đơn đặt (hóa đơn từ đơn / sửa đơn phải ở đúng chi nhánh này) */
  warehouseId?: number | null;
  /** Thời gian giao hàng (YYYY-MM-DDTHH:mm) */
  deliveryDate?: string | null;
  /** Sửa đơn đặt hàng: thời gian đặt của đơn (YYYY-MM-DDTHH:mm), chỉ hiển thị */
  orderDate?: string | null;
  /** Trả hàng: hóa đơn gốc, người bán, phí trả hàng, khách lẻ (phải trả đủ tiền) */
  returnInvoiceId?: number | null;
  returnInvoiceCode?: string | null;
  returnSellerName?: string | null;
  returnFee?: number;
  returnWalkIn?: boolean;
  /** Trả hàng theo hóa đơn: tổng tiền hàng và giảm giá tổng của hóa đơn gốc (phân bổ giảm giá như KiotViet) */
  returnInvoiceSubTotal?: number;
  returnInvoiceDiscount?: number;
  /** Người dùng đã tự sửa Giảm giá (không còn lấy theo phân bổ) */
  returnDiscountEdited?: boolean;
  /** Hóa đơn: khách trả thừa và còn nợ cũ → true = tính phần thừa vào công nợ (trừ nợ cũ) thay vì trả lại tiền */
  excessToDebt?: boolean;
  /** Trả nhanh: khách quên hóa đơn — tự tìm hàng, tự chọn khách, không giới hạn theo hóa đơn */
  returnQuick?: boolean;
  /** Chuyển khoản đã được payOS xác nhận (QR) cho tab này */
  payosPaid?: { orderCode: number; amount: number } | null;
}

export const POS_TABS_KEY = 'stockflow_pos_tabs_v2';

export const tabPrefix = (kind: PosTabKind) => (kind === 'BOOKING' ? 'Đặt hàng' : kind === 'RETURN' ? 'Trả hàng' : 'Hóa đơn');

/** Số thứ tự nhỏ nhất chưa dùng cho tab cùng loại (Hóa đơn 1, 2... / Đặt hàng 1, 2...) */
export function nextTabNumber(tabs: PosTab[], kind: PosTabKind): number {
  const prefix = `${tabPrefix(kind)} `;
  const used = new Set(tabs.filter((t) => t.name.startsWith(prefix)).map((t) => Number(t.name.slice(prefix.length)) || 0));
  let n = 1;
  while (used.has(n)) n++;
  return n;
}

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

/** Thêm 1 tab mới lên đầu danh sách tab của POS (lần mở POS tiếp theo sẽ mở tab này) */
export function queuePosTab(tab: Omit<PosTab, 'id' | 'name'>) {
  const tabs = readPosTabs();
  const kind = tab.kind ?? 'INVOICE';
  const next: PosTab = { ...tab, id: newPosId(), name: `${tabPrefix(kind)} ${nextTabNumber(tabs, kind)}` };
  try {
    localStorage.setItem(POS_TABS_KEY, JSON.stringify([next, ...tabs]));
  } catch {
    // trình duyệt chặn localStorage: bỏ qua
  }
}
