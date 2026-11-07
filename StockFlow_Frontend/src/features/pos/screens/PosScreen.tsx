// src/features/pos/screens/PosScreen.tsx
// Màn hình Bán hàng tại quầy (POS) theo mẫu KiotViet:
// - Thanh trên màu xanh: tìm hàng hóa (F3), các tab hóa đơn, nút tải lại, người dùng, menu (Hiển thị, Về trang quản lý).
// - Bên trái: danh sách hàng trong hóa đơn (ảnh, mã, tên, ĐVT, SL ± có tồn/đặt, đơn giá có popover giảm giá, thành tiền, ghi chú),
//   ghi chú đơn hàng ở dưới.
// - Bên phải: người bán + thời gian, khách hàng (F4) + bảng giá, tổng tiền hàng, giảm giá, khách cần trả,
//   khách thanh toán, phương thức (Tiền mặt / Chuyển khoản), nút THANH TOÁN (F9).

'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { message } from 'antd';
import {
  ArrowLeftRight,
  Check,
  ChevronDown,
  CircleUserRound,
  Info,
  Menu,
  Minus,
  TriangleAlert,
  Pencil,
  Plus,
  PlusCircle,
  RefreshCw,
  Search,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import { ProductThumb } from '@/components/ProductThumb';
import { FormHeaderUserBar } from '@/components/FormHeaderUserBar';
import { CustomerFormModal } from '@/features/customers/components/CustomerFormModal';
import { customerService } from '@/features/customers/services/customerService';
import type { CreateCustomerPayload } from '@/features/customers/types';
import { orderSettingsService } from '@/features/settings/services/orderSettingsService';
import { salesBookingService } from '@/features/sales-bookings/services/salesBookingService';
import type { SaveSalesBookingPayload } from '@/features/sales-bookings/types';
import { permissionService } from '@/features/roles/services/permissionService';
import { getStoredRole } from '@/features/roles/config/currentRole';
import { getActiveWarehouse, TIN_PHAT_WAREHOUSES, useActiveWarehouse } from '@/lib/warehouse/useActiveWarehouse';
import { posService, type PosSaleRequest } from '../services/posService';
import type { PosCustomer, PosPriceBook, PosProduct } from '../types';
import {
  newPosId as newId,
  nextTabNumber,
  POS_TABS_KEY as TABS_KEY,
  readPosTabs,
  tabPrefix,
  type DiscountMode,
  type PayMethod,
  type PosLine,
  type PosTab,
  type PosTabKind,
} from '../utils/posTabs';

// ─── Kiểu dữ liệu ─────────────────────────────────────────────────────────────
interface DisplayPrefs {
  image: boolean;
  code: boolean;
  stock: boolean;
  note: boolean;
}

const PREFS_KEY = 'stockflow_pos_display_v1';
const DEFAULT_PREFS: DisplayPrefs = { image: true, code: true, stock: true, note: true };
const PAY_METHODS: { value: PayMethod; label: string }[] = [
  { value: 'CASH', label: 'Tiền mặt' },
  { value: 'VIETQR', label: 'Chuyển khoản' },
];

const fmt = (n: number) => Math.round(n || 0).toLocaleString('vi-VN');
const parseNum = (s: string) => Number(s.replace(/[^\d]/g, '')) || 0;

function emptyTab(index: number, priceBookId: number | null, kind: PosTabKind = 'INVOICE'): PosTab {
  return {
    id: newId(),
    kind,
    name: `${tabPrefix(kind)} ${index}`,
    lines: [],
    customer: null,
    priceBookId,
    discountMode: 'VND',
    discountValue: 0,
    paid: null,
    payMethod: 'CASH',
    notes: '',
  };
}

/** Giảm giá trên 1 đơn vị (không vượt đơn giá). Giá trị âm (VND) = bán cao hơn đơn giá. */
const unitDiscount = (price: number, mode: DiscountMode, value: number) =>
  Math.min(price, mode === 'PERCENT' ? Math.round((price * Math.min(value, 100)) / 100) : value);

/** Ngày giờ API (giờ VN, không múi giờ) → giá trị ô datetime-local */
function toLocalInput(value?: string | null): string | null {
  const m = value?.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
  return m ? `${m[1]}T${m[2]}` : null;
}

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

// ─── Ô nhập tiền có dấu chấm nghìn ────────────────────────────────────────────
function MoneyInput({
  value,
  onChange,
  className = '',
  autoFocus,
}: {
  value: number;
  onChange: (v: number) => void;
  className?: string;
  autoFocus?: boolean;
}) {
  return (
    <input
      inputMode="numeric"
      autoFocus={autoFocus}
      value={value ? value.toLocaleString('vi-VN') : '0'}
      onChange={(e) => onChange(parseNum(e.target.value))}
      onFocus={(e) => e.target.select()}
      className={`w-full bg-transparent text-right border-b border-slate-300 focus:border-[#0070f4] outline-none py-0.5 ${className}`}
    />
  );
}

/** Popover giảm giá: Đơn giá / Giảm giá (VND | %) / Giá bán — dùng cho dòng hàng (và giảm giá hóa đơn khi không có đơn giá) */
function DiscountPopover({
  base,
  baseLabel,
  editableBase,
  mode,
  value,
  resultLabel,
  costPrice = 0,
  onChange,
  onClose,
}: {
  base: number;
  baseLabel: string;
  editableBase?: (v: number) => void;
  mode: DiscountMode;
  value: number;
  /** Có ô Giá bán: được nhập giá bán cao hơn đơn giá */
  resultLabel?: string;
  /** Giá vốn: giá bán thấp hơn thì cảnh báo */
  costPrice?: number;
  onChange: (mode: DiscountMode, value: number) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const disc = unitDiscount(base, mode, value);
  const sale = base - disc;
  const belowCost = !!resultLabel && costPrice > 0 && sale < costPrice;
  return (
    <div
      ref={ref}
      onClick={(e) => e.stopPropagation()}
      className="absolute right-0 top-full mt-2 z-40 w-[330px] bg-white rounded-xl shadow-[0_8px_30px_rgba(15,23,42,0.18)] border border-slate-200 p-4 space-y-3 text-[13px] text-[#15171a]"
    >
      <div className="flex items-center gap-3">
        <span className="w-24 shrink-0">{baseLabel}</span>
        {editableBase ? <MoneyInput value={base} onChange={editableBase} /> : <span className="flex-1 text-right">{fmt(base)}</span>}
      </div>
      <div className="flex items-center gap-3">
        <span className="w-24 shrink-0">Giảm giá</span>
        {mode === 'PERCENT' ? (
          <input
            inputMode="decimal"
            autoFocus
            value={value}
            onChange={(e) => onChange('PERCENT', Math.min(100, Number(e.target.value.replace(/[^\d.]/g, '')) || 0))}
            onFocus={(e) => e.target.select()}
            className="w-full bg-transparent text-right border-b border-slate-300 focus:border-[#0070f4] outline-none py-0.5"
          />
        ) : (
          <MoneyInput value={Math.max(0, value)} onChange={(v) => onChange('VND', Math.min(v, base))} autoFocus />
        )}
        <div className="flex shrink-0">
          {(['VND', 'PERCENT'] as DiscountMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                // Đổi kiểu giảm giá: quy đổi giá trị đang có cho tương đương
                if (m === mode) return;
                const d = Math.max(0, disc);
                const converted = m === 'PERCENT' ? (base > 0 ? Math.round((d / base) * 10000) / 100 : 0) : d;
                onChange(m, converted);
              }}
              className={`px-2.5 h-7 text-[12px] font-semibold rounded-md cursor-pointer ${
                mode === m ? 'bg-[#0070f4] text-white' : 'bg-slate-100 text-[#15171a] hover:bg-slate-200'
              } ${m === 'VND' ? 'mr-1' : ''}`}
            >
              {m === 'VND' ? 'VND' : '%'}
            </button>
          ))}
        </div>
      </div>
      {resultLabel && (
        <div className="flex items-center gap-3">
          <span className="w-24 shrink-0">{resultLabel}</span>
          {/* Giá bán được phép cao hơn đơn giá (lưu dạng giảm giá âm) */}
          <MoneyInput value={sale} onChange={(v) => onChange('VND', base - v)} className="font-semibold" />
        </div>
      )}
      {belowCost && (
        <div className="flex items-center justify-end gap-1.5 text-[13px] text-[#fb2c36]">
          <TriangleAlert size={15} className="fill-[#fb2c36] text-white" />
          <span>Giá bán đang nhỏ hơn giá vốn</span>
        </div>
      )}
    </div>
  );
}

// ─── Màn hình chính ───────────────────────────────────────────────────────────
export default function PosScreen() {
  const { activeWarehouse, setActiveWarehouse } = useActiveWarehouse();
  const warehouseId = activeWarehouse?.warehouseId ?? 3;
  /** Hàng khách đặt chưa giao tại chi nhánh (productId → SL) */
  const [reserved, setReserved] = useState<Record<number, number>>({});
  /** Quyền theo ma trận chức năng: Bán hàng (hóa đơn) / Đặt hàng */
  const [canInvoice, setCanInvoice] = useState(true);
  const [canBooking, setCanBooking] = useState(true);
  /** Menu thêm tab theo loại (vẽ ngoài vùng cuộn ngang của thanh tab để không bị cắt) */
  const [tabMenu, setTabMenu] = useState<{ left: number; top: number } | null>(null);
  const openAddMenu = (e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setTabMenu((m) => (m ? null : { left: r.left, top: r.bottom + 6 }));
  };

  const [products, setProducts] = useState<PosProduct[]>([]);
  const [priceBooks, setPriceBooks] = useState<PosPriceBook[]>([]);
  const [priceMatrix, setPriceMatrix] = useState<Record<number, Record<number, number>>>({});
  const [allowNegativeStock, setAllowNegativeStock] = useState(false);
  // Thiết lập "Khóa thời gian giao dịch": bật thì không cho chọn ngày giờ bán (luôn lấy giờ hiện tại)
  const [lockSaleTime, setLockSaleTime] = useState(false);
  /** Ngày giờ bán do người dùng chọn (YYYY-MM-DDTHH:mm); null = bán theo giờ hiện tại */
  const [saleTime, setSaleTime] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  // Tab đã lưu; mở từ "+ Đặt hàng" (?newBooking=1) thì thêm sẵn 1 tab đặt hàng trống và mở tab đó
  const [initialTabs] = useState(() => {
    const saved = readPosTabs();
    const base = saved.length > 0 ? saved : [emptyTab(1, null)];
    if (new URLSearchParams(window.location.search).has('newBooking')) {
      const t = emptyTab(nextTabNumber(base, 'BOOKING'), null, 'BOOKING');
      return { tabs: [...base, t], activeId: t.id };
    }
    return { tabs: base, activeId: base[0]?.id ?? '' };
  });
  const [tabs, setTabs] = useState<PosTab[]>(initialTabs.tabs);
  const [activeTabId, setActiveTabId] = useState<string>(initialTabs.activeId);
  const [prefs, setPrefs] = useState<DisplayPrefs>(() => ({ ...DEFAULT_PREFS, ...readStorage<Partial<DisplayPrefs>>(PREFS_KEY, {}) }));

  const [productQuery, setProductQuery] = useState('');
  const [productDropdown, setProductDropdown] = useState(false);
  const [productActive, setProductActive] = useState(0);
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerResults, setCustomerResults] = useState<{ q: string; items: PosCustomer[] }>({ q: '', items: [] });
  const [customerDropdown, setCustomerDropdown] = useState(false);
  const [customerFormOpen, setCustomerFormOpen] = useState(false);
  const [pricePopoverKey, setPricePopoverKey] = useState<string | null>(null);
  const [orderDiscountOpen, setOrderDiscountOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState(() => new Date());

  const productSearchRef = useRef<HTMLInputElement>(null);
  const customerSearchRef = useRef<HTMLInputElement>(null);
  const productBoxRef = useRef<HTMLDivElement>(null);
  const customerBoxRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [userName] = useState(() => {
    const u = readStorage<{ fullName?: string; username?: string } | null>('stockflow_user', null);
    return u?.fullName || u?.username || 'Thu ngân';
  });

  const tab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];
  const defaultPriceBookId = priceBooks.find((p) => p.isDefault)?.priceBookId ?? priceBooks[0]?.priceBookId ?? null;
  const priceBookId = tab.priceBookId ?? defaultPriceBookId;

  // ── Tải dữ liệu: hàng hóa theo kho làm việc, bảng giá, ma trận giá, thiết lập bán âm ──
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      posService.getProducts(undefined, undefined, warehouseId),
      posService.getPriceBooks(),
      posService.getPriceMatrix(),
      orderSettingsService.getSettings().catch(() => null),
      salesBookingService.getReserved(warehouseId),
    ]).then(([prods, pbs, matrix, settings, reservedMap]) => {
      if (cancelled) return;
      setReserved(reservedMap);
      setProducts(prods.filter((p) => p.status !== 'INACTIVE'));
      setPriceBooks(pbs.filter((p) => p.isActive !== false));
      setPriceMatrix(matrix);
      setAllowNegativeStock(Boolean(settings?.allowNegativeStockSale));
      setLockSaleTime(Boolean(settings?.lockTransactionTime));
      // Đổi kho làm việc → tồn kho của các dòng đang có trong giỏ lấy theo kho mới
      // (dòng nạp từ đơn đặt hàng chưa có ảnh → lấy ảnh theo danh mục hàng)
      const prodOf = new Map(prods.map((p) => [p.productId, p]));
      setTabs((prev) =>
        prev.map((t) => ({
          ...t,
          lines: t.lines.map((l) => ({
            ...l,
            stock: prodOf.get(l.productId)?.stockQuantity ?? 0,
            imageUrl: l.imageUrl ?? prodOf.get(l.productId)?.imageUrl ?? null,
          })),
        }))
      );
    });
    return () => {
      cancelled = true;
    };
  }, [warehouseId, reloadTick]);

  // Quyền: chỉ hiện loại tab người dùng được dùng (backend vẫn chặn API)
  useEffect(() => {
    let alive = true;
    permissionService
      .getAllowedFeatures(`ROLE_${getStoredRole()}`)
      .then((feats) => {
        if (!alive) return;
        const inv = feats.has('feat-pos');
        const bk = feats.has('feat-sales-booking');
        setCanInvoice(inv);
        setCanBooking(bk);
        // Chỉ được đặt hàng: tab hóa đơn trống đổi thành tab đặt hàng
        if (!inv && bk) {
          setTabs((prev) =>
            prev.map((t) =>
              (t.kind ?? 'INVOICE') === 'INVOICE' && !t.bookingId && t.lines.length === 0
                ? { ...t, kind: 'BOOKING', name: `${tabPrefix('BOOKING')} ${nextTabNumber(prev, 'BOOKING')}` }
                : t
            )
          );
        }
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  // Mở từ màn Đặt hàng: ?booking=<id> (sửa đơn), ?bookingInvoice=<id> (tạo hóa đơn giao hàng), ?newBooking=1
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const editId = Number(params.get('booking')) || 0;
    const invoiceId = Number(params.get('bookingInvoice')) || 0;
    const isNew = params.has('newBooking');
    if (!editId && !invoiceId && !isNew) return;
    window.history.replaceState(null, '', window.location.pathname);

    if (isNew) return; // tab đặt hàng trống đã thêm lúc khởi tạo

    const kind: PosTabKind = editId ? 'BOOKING' : 'INVOICE';
    const id = editId || invoiceId;
    salesBookingService
      .getBooking(id)
      .then((b) => {
        // Đơn thuộc chi nhánh khác → chuyển chi nhánh làm việc sang chi nhánh xử lý của đơn
        if (b.warehouseId !== getActiveWarehouse().warehouseId) {
          const wh = TIN_PHAT_WAREHOUSES.find((w) => w.warehouseId === b.warehouseId);
          if (wh) {
            setActiveWarehouse(wh);
            message.info(`Đã chuyển chi nhánh làm việc sang ${wh.name} (chi nhánh xử lý của đơn ${b.orderCode}).`);
          }
        }
        const firstDelivery = b.invoices.every((i) => i.status !== 'COMPLETED');
        const lines: PosLine[] = b.items
          .map((it) => ({ it, qty: kind === 'BOOKING' ? it.quantity : Math.max(0, it.quantity - it.deliveredQuantity) }))
          .filter((x) => x.qty > 0)
          .map(({ it, qty }) => ({
            key: newId(),
            productId: it.productId,
            code: it.productCode,
            name: it.productName,
            imageUrl: null,
            uom: it.unit,
            unitId: it.unitId,
            stock: 0,
            unitPrice: it.originalPrice,
            discountMode: it.discountType === 'PERCENT' ? 'PERCENT' : 'VND',
            discountValue: it.discountType === 'PERCENT' ? it.discountValue : it.originalPrice - it.unitPrice,
            quantity: qty,
            note: '',
          }));
        if (lines.length === 0) {
          message.warning(`Đơn ${b.orderCode} đã giao đủ hàng.`);
          return;
        }
        // Giảm giá đơn: áp vào đơn khi sửa, và vào hóa đơn giao đầu tiên
        const keepDiscount = kind === 'BOOKING' || firstDelivery;
        const tabData: PosTab = {
          id: newId(),
          kind,
          name: kind === 'BOOKING' ? b.orderCode : `Hóa đơn · ${b.orderCode}`,
          lines,
          customer: {
            id: b.partnerId,
            partnerId: b.partnerId,
            code: b.partnerCode,
            name: b.partnerName,
            phone: b.partnerPhone ?? '',
            creditLimit: b.partnerCreditLimit,
            currentDebt: b.partnerDebt,
            isOverCreditLimit: false,
          },
          priceBookId: null,
          discountMode: keepDiscount && b.discountType === 'PERCENT' ? 'PERCENT' : 'VND',
          discountValue: !keepDiscount ? 0 : b.discountType === 'PERCENT' ? b.discountValue : b.discountAmount,
          paid: null,
          payMethod: 'CASH',
          // Bảng giá được ghi lại khi lưu → bỏ thẻ cũ để không lặp
          notes: (b.notes ?? '').replace(/\[Bảng giá:[^\]]*\]\s*/g, '').trim(),
          bookingId: b.orderId,
          bookingCode: b.orderCode,
          bookingPaid: kind === 'BOOKING' ? b.paidAmount : b.remainingDeposit,
          warehouseId: b.warehouseId,
          deliveryDate: toLocalInput(b.deliveryDate),
        };
        setTabs((prev) => {
          // Đã mở đơn này ở 1 tab cùng loại → thay bằng dữ liệu mới nhất
          const rest = prev.filter((t) => !(t.bookingId === b.orderId && (t.kind ?? 'INVOICE') === kind));
          // Bỏ tab hóa đơn trống mặc định cho gọn
          const cleaned = rest.filter((t) => t.lines.length > 0 || t.bookingId);
          return [...cleaned, tabData];
        });
        setActiveTabId(tabData.id);
        setReloadTick((t) => t + 1); // nạp tồn kho cho các dòng
      })
      .catch((err: unknown) => message.error(err instanceof Error ? err.message : 'Không tải được đơn đặt hàng.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lưu các tab hóa đơn để tải lại trang không mất giỏ hàng
  useEffect(() => {
    try {
      localStorage.setItem(TABS_KEY, JSON.stringify(tabs));
    } catch {
      // trình duyệt chặn localStorage: bỏ qua
    }
  }, [tabs]);

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      // bỏ qua
    }
  }, [prefs]);

  // Đồng hồ hiển thị thời gian bán
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(t);
  }, []);

  // Tìm khách hàng (debounce)
  useEffect(() => {
    const q = customerQuery.trim();
    if (!q) return;
    const timer = window.setTimeout(() => {
      posService.getCustomers(q).then((items) => setCustomerResults({ q, items }));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [customerQuery]);

  // Đóng các dropdown khi bấm ra ngoài
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (productBoxRef.current && !productBoxRef.current.contains(t)) setProductDropdown(false);
      if (customerBoxRef.current && !customerBoxRef.current.contains(t)) setCustomerDropdown(false);
      if (menuRef.current && !menuRef.current.contains(t)) setMenuOpen(false);
      if (!(t instanceof Element) || !t.closest('[data-pos-menu]')) setTabMenu(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  // ── Tính tiền ──
  const priceOf = (productId: number, standard: number) =>
    (priceBookId != null ? priceMatrix[productId]?.[priceBookId] : undefined) ?? standard;

  const lineCalc = (l: PosLine) => {
    const disc = unitDiscount(l.unitPrice, l.discountMode, l.discountValue);
    return { disc, sale: l.unitPrice - disc, total: (l.unitPrice - disc) * l.quantity };
  };
  const subTotal = tab.lines.reduce((s, l) => s + lineCalc(l).total, 0);
  const totalQty = tab.lines.reduce((s, l) => s + l.quantity, 0);
  const orderDiscount = Math.min(subTotal, unitDiscount(subTotal, tab.discountMode, tab.discountValue));
  const due = Math.max(0, subTotal - orderDiscount);
  const isBooking = (tab.kind ?? 'INVOICE') === 'BOOKING';
  /** Hóa đơn từ đơn đặt: tiền khách đã trả trước được trừ vào hóa đơn */
  const depositApplied = !isBooking && tab.bookingId ? Math.min(due, tab.bookingPaid ?? 0) : 0;
  const dueNow = due - depositApplied;
  // Đơn đặt hàng: khách trả trước mặc định 0; hóa đơn: mặc định trả đủ
  const paid = tab.paid ?? (isBooking ? 0 : dueNow);
  const change = paid - dueNow;
  /** Đặt hàng: tiền đã trả trước (khi sửa đơn) + trả thêm lần này không vượt giá trị đơn */
  const bookingPaidTotal = isBooking ? (tab.bookingPaid ?? 0) + paid : 0;

  const qtyByProduct = useMemo(() => {
    const m = new Map<number, number>();
    tab.lines.forEach((l) => m.set(l.productId, (m.get(l.productId) ?? 0) + l.quantity));
    return m;
  }, [tab.lines]);

  // ── Cập nhật tab đang mở ──
  const updateTab = (patch: Partial<PosTab> | ((t: PosTab) => Partial<PosTab>)) =>
    setTabs((prev) =>
      prev.map((t) => (t.id === tab.id ? { ...t, ...(typeof patch === 'function' ? patch(t) : patch) } : t))
    );
  const updateLine = (key: string, patch: Partial<PosLine>) =>
    updateTab((t) => ({ lines: t.lines.map((l) => (l.key === key ? { ...l, ...patch } : l)), paid: null }));

  const addProduct = (p: PosProduct, asNewLine = false) => {
    updateTab((t) => {
      const existing = !asNewLine ? t.lines.find((l) => l.productId === p.productId) : undefined;
      if (existing) {
        return { lines: t.lines.map((l) => (l.key === existing.key ? { ...l, quantity: l.quantity + 1 } : l)), paid: null };
      }
      const line: PosLine = {
        key: newId(),
        productId: p.productId,
        code: p.code,
        name: p.name,
        imageUrl: p.imageUrl,
        uom: p.uom,
        unitId: p.baseUnitId,
        stock: p.stockQuantity,
        unitPrice: priceOf(p.productId, p.standardPrice),
        discountMode: 'VND',
        discountValue: 0,
        quantity: 1,
        note: '',
      };
      return { lines: [...t.lines, line], paid: null };
    });
    setProductQuery('');
    setProductDropdown(false);
    productSearchRef.current?.focus();
  };

  // Đổi bảng giá → đơn giá các dòng lấy lại theo bảng giá mới
  const changePriceBook = (id: number) => {
    const book = (pid: number, std: number) => priceMatrix[pid]?.[id] ?? std;
    updateTab((t) => ({
      priceBookId: id,
      paid: null,
      lines: t.lines.map((l) => {
        const p = products.find((x) => x.productId === l.productId);
        return { ...l, unitPrice: book(l.productId, p?.standardPrice ?? l.unitPrice) };
      }),
    }));
  };

  const productMatches = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((p) => p.code.toLowerCase().includes(q) || p.name.toLowerCase().includes(q) || (p.barcode || '').toLowerCase() === q)
      .slice(0, 30);
  }, [products, productQuery]);

  // ── Tab hóa đơn / đặt hàng ──
  const defaultKind: PosTabKind = canInvoice || !canBooking ? 'INVOICE' : 'BOOKING';
  const addTab = (kind: PosTabKind = defaultKind) => {
    const t = emptyTab(nextTabNumber(tabs, kind), defaultPriceBookId, kind);
    setTabs((prev) => [...prev, t]);
    setActiveTabId(t.id);
    setTabMenu(null);
  };
  const closeTab = (id: string) => {
    const remaining = tabs.filter((t) => t.id !== id);
    if (remaining.length === 0) {
      const t = emptyTab(1, defaultPriceBookId, defaultKind);
      setTabs([t]);
      setActiveTabId(t.id);
      return;
    }
    setTabs(remaining);
    if (id === activeTabId) setActiveTabId(remaining[remaining.length - 1].id);
  };
  /** Chuyển tab Hóa đơn ↔ Đặt hàng (giữ nguyên hàng hóa, khách hàng) */
  const switchTabKind = (t: PosTab) => {
    const next: PosTabKind = (t.kind ?? 'INVOICE') === 'BOOKING' ? 'INVOICE' : 'BOOKING';
    const others = tabs.filter((x) => x.id !== t.id);
    setTabs((prev) =>
      prev.map((x) =>
        x.id === t.id ? { ...x, kind: next, name: `${tabPrefix(next)} ${nextTabNumber(others, next)}`, paid: null } : x
      )
    );
  };

  // ── Khách hàng ──
  const customerItems = customerResults.q === customerQuery.trim() ? customerResults.items : [];
  const selectCustomer = (c: PosCustomer | null) => {
    updateTab({ customer: c, paid: null });
    setCustomerQuery('');
    setCustomerDropdown(false);
  };
  const handleCreateCustomer = async (payload: CreateCustomerPayload) => {
    const created = await customerService.createCustomer(payload);
    selectCustomer({
      id: created.id,
      partnerId: created.id,
      code: created.code,
      name: created.name,
      phone: created.phone,
      creditLimit: created.creditLimit,
      currentDebt: created.currentDebt,
      isOverCreditLimit: false,
    });
    setCustomerFormOpen(false);
    message.success(`Đã thêm khách hàng ${created.name}`);
  };

  /** Ghi chú gửi server: bảng giá + ghi chú đơn + ghi chú từng dòng */
  const buildNotes = () => {
    const lineNotes = tab.lines.filter((l) => l.note.trim()).map((l) => `${l.code}: ${l.note.trim()}`);
    const bookName = priceBooks.find((p) => p.priceBookId === priceBookId)?.priceBookName;
    return [bookName ? `[Bảng giá: ${bookName}]` : '', tab.notes.trim(), ...lineNotes].filter(Boolean).join(' ');
  };

  // ── Đặt hàng: lưu đơn đặt (không trừ kho), khách có thể trả trước ──
  const handleSaveBooking = async () => {
    if (submitting) return;
    if (!canBooking) return message.error('Vai trò của bạn chưa được phân quyền chức năng Đặt hàng.');
    if (!tab.customer) {
      customerSearchRef.current?.focus();
      return message.warning('Vui lòng chọn khách hàng đặt hàng.');
    }
    if (tab.lines.length === 0) return message.warning('Đơn đặt hàng chưa có hàng hóa.');
    if (tab.lines.some((l) => l.quantity <= 0)) return message.warning('Số lượng hàng hóa phải lớn hơn 0.');
    if (tab.warehouseId && tab.warehouseId !== warehouseId)
      return message.error('Đơn thuộc chi nhánh khác — hãy đổi chi nhánh làm việc về chi nhánh xử lý của đơn.');
    if (bookingPaidTotal > due) return message.error(`Tiền khách trả trước (${fmt(bookingPaidTotal)}) vượt quá giá trị đơn (${fmt(due)}).`);
    if (!tab.bookingId && !lockSaleTime && saleTime && new Date(saleTime).getTime() > Date.now())
      return message.error('Không được đặt hàng với thời gian trong tương lai.');

    const payload: SaveSalesBookingPayload = {
      partnerId: tab.customer.id,
      warehouseId,
      orderDate: !tab.bookingId && !lockSaleTime && saleTime ? new Date(saleTime).toISOString() : undefined,
      deliveryDate: tab.deliveryDate ? new Date(tab.deliveryDate).toISOString() : null,
      discountType: tab.discountMode === 'PERCENT' ? 'PERCENT' : 'AMOUNT',
      discountValue: tab.discountMode === 'PERCENT' ? tab.discountValue : orderDiscount,
      paidAmount: paid,
      paymentMethod: tab.payMethod,
      notes: buildNotes() || null,
      items: tab.lines.map((l) => {
        const c = lineCalc(l);
        const markup = c.disc < 0; // bán cao hơn đơn giá: gửi giá bán làm đơn giá
        return {
          productId: l.productId,
          unitId: l.unitId,
          quantity: l.quantity,
          originalPrice: markup ? c.sale : l.unitPrice,
          discountType: l.discountMode === 'PERCENT' && !markup ? 'PERCENT' : 'AMOUNT',
          discountValue: markup ? 0 : l.discountMode === 'PERCENT' ? l.discountValue : c.disc,
        };
      }),
    };

    setSubmitting(true);
    try {
      const res = tab.bookingId
        ? await salesBookingService.updateBooking(tab.bookingId, payload)
        : await salesBookingService.createBooking(payload);
      message.success(tab.bookingId ? `Đã lưu đơn đặt hàng ${res.orderCode}` : `Đã tạo đơn đặt hàng ${res.orderCode}`);
      closeTab(tab.id);
      setSaleTime(null);
      setReloadTick((t) => t + 1); // cập nhật SL khách đặt
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không lưu được đơn đặt hàng.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Thanh toán ──
  const handleCheckout = async () => {
    if (isBooking) return handleSaveBooking();
    if (submitting) return;
    if (!canInvoice) return message.error('Vai trò của bạn chưa được phân quyền chức năng Bán hàng.');
    if (tab.lines.length === 0) return message.warning('Hóa đơn chưa có hàng hóa.');
    if (tab.lines.some((l) => l.quantity <= 0)) return message.warning('Số lượng hàng hóa phải lớn hơn 0.');
    if (!allowNegativeStock) {
      const over = tab.lines.find((l) => (qtyByProduct.get(l.productId) ?? 0) > l.stock);
      if (over) return message.error(`"${over.name}" không đủ tồn kho (tồn ${fmt(over.stock)}). Thiết lập hiện không cho bán âm kho.`);
    }
    if (!lockSaleTime && saleTime && new Date(saleTime).getTime() > Date.now())
      return message.error('Không được bán với thời gian trong tương lai.');
    if (tab.warehouseId && tab.warehouseId !== warehouseId)
      return message.error('Hóa đơn của đơn đặt hàng phải xuất từ chi nhánh xử lý của đơn — hãy đổi chi nhánh làm việc.');
    if (!tab.customer && paid < dueNow) return message.error('Khách lẻ phải thanh toán đủ. Chọn khách hàng để ghi nợ phần còn thiếu.');

    const notes = buildNotes();

    const req: PosSaleRequest = {
      partnerId: tab.customer?.id ?? 0,
      warehouseId,
      paymentMethod: tab.payMethod,
      subTotal,
      discountType: tab.discountMode === 'PERCENT' ? 'PERCENT' : 'AMOUNT',
      discountValue: tab.discountValue,
      discountAmount: orderDiscount,
      totalAmount: due,
      paidAmount: paid,
      notes,
      clientRequestId: `${tab.id}-${tab.lines.length}-${subTotal}`,
      orderDate: !lockSaleTime && saleTime ? new Date(saleTime).toISOString() : undefined,
      bookingOrderId: tab.bookingId ?? undefined,
      items: tab.lines.map((l) => {
        const c = lineCalc(l);
        // Bán cao hơn đơn giá: gửi giá bán làm đơn giá gốc, không giảm giá (server không nhận giảm giá âm)
        const markup = c.disc < 0;
        return {
          productId: l.productId,
          quantity: l.quantity,
          unitId: l.unitId,
          originalPrice: markup ? c.sale : l.unitPrice,
          unitPrice: c.sale,
          discountType: l.discountMode === 'PERCENT' ? 'PERCENT' : 'AMOUNT',
          discountValue: markup ? 0 : l.discountValue,
          discountAmount: markup ? 0 : c.disc * l.quantity,
        };
      }),
    };

    setSubmitting(true);
    try {
      const res = await posService.submitSale(req);
      message.success(
        [
          `Đã thanh toán hóa đơn ${res.orderCode}`,
          tab.bookingCode ? ` (giao theo đơn ${tab.bookingCode})` : '',
          res.depositAmount ? `. Đã trừ ${fmt(res.depositAmount)} tiền khách trả trước` : '',
          res.changeAmount > 0 ? `. Tiền thừa trả khách: ${fmt(res.changeAmount)}` : '',
        ].join('')
      );
      closeTab(tab.id);
      setSaleTime(null);
      setReloadTick((t) => t + 1); // tồn kho thay đổi
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Thanh toán không thành công.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Phím tắt: F3 tìm hàng, F4 tìm khách, F9 thanh toán ──
  const checkoutRef = useRef(handleCheckout);
  useEffect(() => {
    checkoutRef.current = handleCheckout;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F3') {
        e.preventDefault();
        productSearchRef.current?.focus();
      } else if (e.key === 'F4') {
        e.preventDefault();
        customerSearchRef.current?.focus();
      } else if (e.key === 'F9') {
        e.preventDefault();
        void checkoutRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const pad = (n: number) => String(n).padStart(2, '0');
  const nowLocal = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;

  return (
    <div className="h-screen w-full flex flex-col bg-[#e9ebef] text-[14px] text-[#15171a] select-none overflow-hidden">
      {/* ═══ 1. THANH TRÊN ═══ */}
      <header className="h-[52px] shrink-0 bg-[#0070f4] flex items-end gap-2 px-2 pt-2">
        {/* Tìm hàng hóa */}
        <div ref={productBoxRef} className="relative w-[480px] max-w-[38vw] self-center mb-2">
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#677484]" />
          <input
            ref={productSearchRef}
            value={productQuery}
            onChange={(e) => {
              setProductQuery(e.target.value);
              setProductDropdown(true);
              setProductActive(0);
            }}
            onFocus={() => productQuery && setProductDropdown(true)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setProductActive((i) => Math.min(i + 1, productMatches.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setProductActive((i) => Math.max(i - 1, 0));
              } else if (e.key === 'Enter' && productMatches[productActive]) {
                e.preventDefault();
                addProduct(productMatches[productActive]);
              } else if (e.key === 'Escape') setProductDropdown(false);
            }}
            placeholder="Tìm hàng hóa (F3)"
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-white text-[14px] placeholder-[#94a3b8] outline-none"
          />
          {productDropdown && productQuery.trim() && (
            <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-[0_10px_30px_rgba(15,23,42,0.2)] border border-slate-200 max-h-[440px] overflow-y-auto divide-y divide-slate-100">
              {productMatches.length === 0 ? (
                <div className="p-4 text-center text-[13px] text-[#677484]">Không tìm thấy hàng hóa phù hợp</div>
              ) : (
                productMatches.map((p, idx) => (
                  <button
                    key={p.productId}
                    type="button"
                    onMouseEnter={() => setProductActive(idx)}
                    onClick={() => addProduct(p)}
                    className={`w-full text-left px-3 py-2.5 flex items-center gap-3 cursor-pointer ${idx === productActive ? 'bg-[#eff6ff]' : 'bg-white'}`}
                  >
                    <ProductThumb src={p.imageUrl} alt={p.name} size={44} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-semibold truncate">
                        {p.name} <span className="font-normal text-[#0070f4]">{p.uom}</span>
                      </div>
                      <div className="text-[12px] text-[#677484]">
                        {p.code} • Giá bán: {fmt(priceOf(p.productId, p.standardPrice))}
                      </div>
                      <div className="text-[12px] text-[#677484]">
                        Tồn: <span className={p.stockQuantity > 0 ? 'text-[#16a34a] font-semibold' : ''}>{fmt(p.stockQuantity)}</span> • Khách
                        đặt: {fmt(reserved[p.productId] ?? 0)}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Tab hóa đơn */}
        <div className="flex-1 min-w-0 flex items-end gap-1 overflow-x-auto">
          {tabs.map((t) => {
            const active = t.id === tab.id;
            const tabIsBooking = (t.kind ?? 'INVOICE') === 'BOOKING';
            // Tab gắn với đơn đặt (sửa đơn / hóa đơn giao hàng) không chuyển loại được
            const canSwitch = !t.bookingId && (tabIsBooking ? canInvoice : canBooking);
            return (
              <div
                key={t.id}
                onClick={() => setActiveTabId(t.id)}
                className={`relative h-[44px] shrink-0 px-4 flex items-center gap-2.5 rounded-t-lg cursor-pointer ${
                  active ? 'bg-[#e9ebef] text-[#15171a] font-bold' : 'text-white/90 hover:bg-white/10'
                }`}
              >
                <button
                  type="button"
                  disabled={!canSwitch}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTabId(t.id);
                    switchTabKind(t);
                  }}
                  title={canSwitch ? (tabIsBooking ? 'Chuyển sang hóa đơn' : 'Chuyển sang đặt hàng') : undefined}
                  className={`p-1 rounded-full ${canSwitch ? 'cursor-pointer hover:bg-black/10' : 'cursor-default'} ${
                    active ? (tabIsBooking ? 'bg-[#fff1e6] text-[#f97316]' : 'bg-[#e6f1fe] text-[#0070f4]') : ''
                  }`}
                >
                  <ArrowLeftRight size={15} />
                </button>
                <span className={tabIsBooking && active ? 'text-[#f97316]' : ''}>{t.name}</span>
                {t.lines.length > 0 && !active && <span className="text-[11px] opacity-80">({t.lines.length})</span>}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(t.id);
                  }}
                  className="p-0.5 rounded hover:bg-black/10 cursor-pointer"
                  title="Đóng hóa đơn"
                >
                  <X size={15} />
                </button>
              </div>
            );
          })}
          <div className="h-[44px] shrink-0 flex items-center">
            <button
              type="button"
              onClick={() => addTab()}
              className="h-full px-2 text-white hover:bg-white/10 rounded-t-lg cursor-pointer"
              title={defaultKind === 'BOOKING' ? 'Thêm đặt hàng mới' : 'Thêm hóa đơn mới'}
            >
              <PlusCircle size={20} />
            </button>
            {canInvoice && canBooking && (
              <button
                type="button"
                data-pos-menu
                onClick={openAddMenu}
                className="h-full px-1 text-white hover:bg-white/10 rounded-t-lg cursor-pointer"
                title="Thêm hóa đơn / đặt hàng"
              >
                <ChevronDown size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Menu nổi của thanh tab */}
        {tabMenu && (
          <div
            data-pos-menu
            style={{ left: tabMenu.left, top: tabMenu.top }}
            className="fixed z-[60] min-w-44 bg-white rounded-lg shadow-[0_8px_24px_rgba(15,23,42,0.18)] border border-slate-200 py-1 text-[14px] text-[#15171a] whitespace-nowrap"
          >
            <button type="button" onClick={() => addTab('INVOICE')} className="w-full text-left px-4 py-2 hover:bg-[#eff6ff] cursor-pointer">
              Thêm hóa đơn
            </button>
            <button type="button" onClick={() => addTab('BOOKING')} className="w-full text-left px-4 py-2 hover:bg-[#eff6ff] cursor-pointer">
              Thêm đặt hàng
            </button>
          </div>
        )}

        {/* Bên phải: kho làm việc + người dùng, menu */}
        <div className="self-center mb-2 flex items-center gap-1 text-white">
          <div className="bg-white rounded-lg px-2 py-1 text-[#15171a]">
            <FormHeaderUserBar />
          </div>
          <div ref={menuRef} className="relative">
            <button type="button" onClick={() => setMenuOpen((v) => !v)} className="p-2 rounded-lg hover:bg-white/15 cursor-pointer">
              <Menu size={20} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 z-50 w-[320px] bg-white text-[#15171a] rounded-xl shadow-[0_10px_30px_rgba(15,23,42,0.2)] border border-slate-200 p-4 space-y-4">
                <div>
                  <div className="font-bold mb-3">Hiển thị</div>
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                    {(
                      [
                        ['image', 'Ảnh hàng hóa'],
                        ['code', 'Mã hàng'],
                        ['stock', 'Tồn kho'],
                        ['note', 'Ghi chú hàng hóa'],
                      ] as [keyof DisplayPrefs, string][]
                    ).map(([k, label]) => (
                      <label key={k} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={prefs[k]}
                          onChange={(e) => setPrefs((p) => ({ ...p, [k]: e.target.checked }))}
                          className="h-4 w-4 accent-[#0070f4] cursor-pointer"
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-200 text-[13px] space-y-1">
                  <div className="text-[#677484]">
                    Chi nhánh: <strong className="text-[#15171a]">{activeWarehouse?.name}</strong>
                  </div>
                  <Link href="/orders" className="block py-1.5 text-[#0070f4] hover:underline">
                    Danh sách hóa đơn
                  </Link>
                  {canBooking && (
                    <Link href="/sales-booking" className="block py-1.5 text-[#0070f4] hover:underline">
                      Danh sách đặt hàng
                    </Link>
                  )}
                  <Link href="/products" className="block py-1.5 text-[#0070f4] hover:underline">
                    Về trang quản lý
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ═══ 2. NỘI DUNG ═══ */}
      <div className="flex-1 min-h-0 flex gap-2 p-2">
        {/* ── Bên trái: hàng trong hóa đơn ── */}
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden space-y-2 pr-1">
            {tab.lines.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-[#94a3b8]">
                <Search size={36} strokeWidth={1.5} />
                <p className="mt-2 text-[14px]">Tìm hàng hóa (F3) để thêm vào {isBooking ? 'đơn đặt hàng' : 'hóa đơn'}</p>
              </div>
            ) : (
              tab.lines.map((l, idx) => {
                const c = lineCalc(l);
                // Đặt hàng không trừ kho → không chặn theo tồn
                const overStock = !isBooking && !allowNegativeStock && (qtyByProduct.get(l.productId) ?? 0) > l.stock;
                const active = pricePopoverKey === l.key;
                return (
                  <div
                    key={l.key}
                    className={`bg-white rounded-xl border px-4 py-3 ${active ? 'border-[#0070f4]' : 'border-transparent hover:border-[#0070f4]/60'}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-5 text-center">{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => updateTab((t) => ({ lines: t.lines.filter((x) => x.key !== l.key), paid: null }))}
                        className="text-[#15171a] hover:text-[#fb2c36] cursor-pointer"
                        title="Xóa hàng"
                      >
                        <Trash2 size={18} />
                      </button>
                      {prefs.image && <ProductThumb src={l.imageUrl} alt={l.name} size={48} />}
                      {prefs.code && <span className="w-24 shrink-0 truncate">{l.code}</span>}
                      <div className="flex-1 min-w-[110px] flex items-center gap-2">
                        <span className="line-clamp-2" title={l.name}>{l.name}</span>
                        <span title={`${l.code} • ${l.name}`}>
                          <Info size={15} className="text-[#677484] shrink-0" />
                        </span>
                      </div>
                      <span className="shrink-0 max-w-[110px] truncate px-2 py-0.5 rounded bg-[#e6f1fe] text-[#0070f4] text-[13px]" title={l.uom}>
                        {l.uom}
                      </span>

                      {/* Số lượng ± (rê chuột xem tồn / đặt) */}
                      <div className="relative group shrink-0 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateLine(l.key, { quantity: Math.max(1, l.quantity - 1) })}
                          className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center cursor-pointer"
                        >
                          <Minus size={15} />
                        </button>
                        <input
                          inputMode="numeric"
                          value={l.quantity}
                          onChange={(e) => updateLine(l.key, { quantity: Math.max(0, Number(e.target.value.replace(/[^\d]/g, '')) || 0) })}
                          onFocus={(e) => e.target.select()}
                          className={`w-12 text-center bg-transparent border-b outline-none py-0.5 ${
                            overStock ? 'border-[#fb2c36] text-[#fb2c36]' : 'border-slate-300 focus:border-[#0070f4]'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => updateLine(l.key, { quantity: l.quantity + 1 })}
                          className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center cursor-pointer"
                        >
                          <Plus size={15} />
                        </button>
                        {prefs.stock && (
                          <div className="hidden group-hover:block absolute left-1/2 -translate-x-1/2 top-full mt-2 z-30 bg-white rounded-lg shadow-lg border border-slate-200 px-4 py-2 text-[13px] whitespace-nowrap">
                            <div>Tồn: {fmt(l.stock)}</div>
                            <div>Khách đặt: {fmt(reserved[l.productId] ?? 0)}</div>
                          </div>
                        )}
                      </div>

                      {/* Đơn giá / giá bán (bấm để giảm giá) */}
                      <div className="relative w-28 shrink-0 text-right">
                        <button
                          type="button"
                          onClick={() => setPricePopoverKey((k) => (k === l.key ? null : l.key))}
                          className="w-full text-right border-b border-slate-300 hover:border-[#0070f4] py-0.5 cursor-pointer"
                        >
                          {fmt(c.sale)}
                        </button>
                        {c.disc > 0 && <div className="text-[13px] text-[#fb2c36] mt-0.5">- {fmt(c.disc)}</div>}
                        {pricePopoverKey === l.key && (
                          <DiscountPopover
                            base={l.unitPrice}
                            baseLabel="Đơn giá"
                            editableBase={(v) => updateLine(l.key, { unitPrice: v })}
                            mode={l.discountMode}
                            value={l.discountValue}
                            resultLabel="Giá bán"
                            costPrice={products.find((x) => x.productId === l.productId)?.costPrice ?? 0}
                            onChange={(mode, value) => updateLine(l.key, { discountMode: mode, discountValue: value })}
                            onClose={() => setPricePopoverKey(null)}
                          />
                        )}
                      </div>

                      <span className="w-24 shrink-0 text-right font-bold">{fmt(c.total)}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const p = products.find((x) => x.productId === l.productId);
                          if (p) addProduct(p, true);
                        }}
                        className="p-1 rounded hover:bg-slate-100 cursor-pointer"
                        title="Thêm dòng cho hàng này"
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                    {prefs.note && (
                      <div className={`mt-1 ${prefs.image ? 'pl-[160px]' : 'pl-[60px]'}`}>
                        <input
                          value={l.note}
                          onChange={(e) => updateLine(l.key, { note: e.target.value })}
                          placeholder="Ghi chú..."
                          className="w-80 max-w-full text-[13px] text-[#677484] placeholder-[#94a3b8] bg-transparent outline-none border-b border-transparent focus:border-slate-300"
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Ghi chú đơn hàng */}
          <div className="shrink-0 bg-white rounded-xl px-4 h-12 flex items-center gap-2">
            <Pencil size={16} className="text-[#677484]" />
            <input
              value={tab.notes}
              onChange={(e) => updateTab({ notes: e.target.value })}
              placeholder="Ghi chú đơn hàng"
              className="flex-1 bg-transparent outline-none placeholder-[#677484]"
            />
          </div>
        </div>

        {/* ── Bên phải: khách hàng & thanh toán ── */}
        <aside className="w-[420px] max-w-[34vw] shrink-0 bg-white rounded-xl flex flex-col p-4">
          {/* Người bán + thời gian */}
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-[#f1f3f6] text-[14px]">
              <CircleUserRound size={16} className="text-[#677484]" />
              {userName}
              <ChevronDown size={14} className="text-[#677484]" />
            </span>
            <input
              type="datetime-local"
              value={lockSaleTime ? nowLocal : saleTime ?? nowLocal}
              max={nowLocal}
              disabled={lockSaleTime}
              onChange={(e) => {
                const v = e.target.value;
                // Không cho bán trong tương lai: chọn quá giờ hiện tại thì lấy giờ hiện tại
                setSaleTime(!v || v >= nowLocal ? null : v);
              }}
              title={
                lockSaleTime
                  ? "Đang bật Khóa thời gian giao dịch (Thiết lập đơn hàng) — hóa đơn lấy giờ hiện tại"
                  : "Thời gian bán (không được chọn thời gian trong tương lai)"
              }
              className="h-8 px-2 rounded-lg border border-slate-300 text-[14px] text-[#15171a] outline-none focus:border-[#0070f4] disabled:bg-[#f7f8f9] disabled:text-[#677484] disabled:cursor-not-allowed cursor-pointer"
            />
          </div>

          {/* Khách hàng + bảng giá */}
          <div className="mt-3 flex items-center gap-2">
            <div ref={customerBoxRef} className="relative flex-1 min-w-0">
              {tab.customer ? (
                <div className="h-9 px-3 rounded-lg bg-[#e6f1fe] flex items-center gap-2">
                  <span className="text-[#0070f4] font-semibold truncate">{tab.customer.name}</span>
                  <span className="text-[12px] text-[#677484] shrink-0">{tab.customer.phone}</span>
                  {tab.customer.currentDebt > 0 && (
                    <span className="text-[12px] text-[#fb2c36] shrink-0">Nợ: {fmt(tab.customer.currentDebt)}</span>
                  )}
                  {/* Tab gắn với đơn đặt: khách hàng cố định theo đơn */}
                  {!tab.bookingId && (
                    <button type="button" onClick={() => selectCustomer(null)} className="ml-auto p-0.5 rounded hover:bg-black/5 cursor-pointer">
                      <X size={15} />
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#677484]" />
                  <input
                    ref={customerSearchRef}
                    value={customerQuery}
                    onChange={(e) => {
                      setCustomerQuery(e.target.value);
                      setCustomerDropdown(true);
                    }}
                    onFocus={() => setCustomerDropdown(true)}
                    placeholder="Tìm khách hàng (F4)"
                    className="w-full h-9 pl-9 pr-9 rounded-lg bg-[#f1f3f6] outline-none focus:bg-white focus:ring-1 focus:ring-[#0070f4]"
                  />
                  <button
                    type="button"
                    onClick={() => setCustomerFormOpen(true)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-black/5 cursor-pointer"
                    title="Thêm khách hàng mới"
                  >
                    <UserPlus size={17} />
                  </button>
                  {customerDropdown && customerQuery.trim() && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-[0_10px_30px_rgba(15,23,42,0.2)] border border-slate-200 max-h-80 overflow-y-auto divide-y divide-slate-100">
                      {customerItems.length === 0 ? (
                        <div className="p-3 text-center text-[13px] text-[#677484]">Không tìm thấy khách hàng</div>
                      ) : (
                        customerItems.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => selectCustomer(c)}
                            className="w-full text-left px-3 py-2 hover:bg-[#eff6ff] cursor-pointer"
                          >
                            <div className="font-semibold">{c.name}</div>
                            <div className="text-[12px] text-[#677484]">
                              {c.code} • {c.phone || '—'} {c.currentDebt > 0 && <span className="text-[#fb2c36]">• Nợ: {fmt(c.currentDebt)}</span>}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="relative shrink-0">
              <select
                value={priceBookId ?? ''}
                onChange={(e) => changePriceBook(Number(e.target.value))}
                className="h-9 pl-3 pr-8 rounded-lg bg-[#f1f3f6] outline-none appearance-none cursor-pointer max-w-[170px] truncate"
              >
                {priceBooks.map((p) => (
                  <option key={p.priceBookId} value={p.priceBookId}>
                    {p.priceBookName}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#677484] pointer-events-none" />
            </div>
          </div>

          {/* Tổng tiền */}
          <div className="mt-5 space-y-4 text-[15px]">
            <div className="flex items-center justify-between">
              <span>
                Tổng tiền hàng <span className="ml-8 text-[#677484]">{fmt(totalQty)}</span>
              </span>
              <span>{fmt(subTotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Giảm giá</span>
              <div className="relative w-36">
                <button
                  type="button"
                  onClick={() => setOrderDiscountOpen((v) => !v)}
                  className="w-full text-right border-b border-slate-300 hover:border-[#0070f4] py-0.5 cursor-pointer"
                >
                  {fmt(orderDiscount)}
                  {tab.discountMode === 'PERCENT' && tab.discountValue > 0 && (
                    <span className="ml-1 text-[12px] text-[#677484]">({tab.discountValue}%)</span>
                  )}
                </button>
                {orderDiscountOpen && (
                  <DiscountPopover
                    base={subTotal}
                    baseLabel="Tổng tiền hàng"
                    mode={tab.discountMode}
                    value={tab.discountValue}
                    onChange={(mode, value) => updateTab({ discountMode: mode, discountValue: value, paid: null })}
                    onClose={() => setOrderDiscountOpen(false)}
                  />
                )}
              </div>
            </div>
            {!isBooking && tab.bookingId && (
              <div className="flex items-center justify-between">
                <span>
                  Khách đã trả trước <span className="text-[13px] text-[#677484]">({tab.bookingCode})</span>
                </span>
                <span>{fmt(depositApplied)}</span>
              </div>
            )}
            <div className="flex items-center justify-between font-bold">
              <span>Khách cần trả</span>
              <span className="text-[20px] text-[#0070f4]">{fmt(isBooking ? due : dueNow)}</span>
            </div>
            {isBooking && (tab.bookingPaid ?? 0) > 0 && (
              <div className="flex items-center justify-between">
                <span>Khách đã trả</span>
                <span>{fmt(tab.bookingPaid ?? 0)}</span>
              </div>
            )}
            <div className="flex items-center justify-between font-bold">
              <span>{isBooking ? (tab.bookingId ? 'Khách trả thêm' : 'Khách trả trước') : 'Khách thanh toán'}</span>
              <div className="w-36">
                <MoneyInput value={paid} onChange={(v) => updateTab({ paid: v })} className="text-[18px] font-semibold" />
              </div>
            </div>

            {/* Phương thức thanh toán */}
            <div className="flex items-center gap-5 pt-1 text-[14px]">
              {PAY_METHODS.map((m) => (
                <label key={m.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={`pay-${tab.id}`}
                    checked={tab.payMethod === m.value}
                    onChange={() => updateTab({ payMethod: m.value })}
                    className="h-[18px] w-[18px] accent-[#0070f4] cursor-pointer"
                  />
                  {m.label}
                </label>
              ))}
            </div>

            {tab.payMethod === 'VIETQR' && (
              <div className="rounded-xl bg-[#f7f8fa] px-4 py-5 text-center text-[14px] text-[#677484]">
                Chưa cấu hình tài khoản ngân hàng nhận chuyển khoản.
                <div className="mt-1 text-[13px]">Ghi nhận thủ công số tiền khách đã chuyển ở ô Khách thanh toán.</div>
              </div>
            )}

            {isBooking ? (
              <>
                <div className="flex items-center justify-between">
                  <span>Còn phải thu khi giao</span>
                  <span className={`font-semibold ${bookingPaidTotal > due ? 'text-[#fb2c36]' : ''}`}>{fmt(Math.max(0, due - bookingPaidTotal))}</span>
                </div>
                {/* Thời gian giao hàng dự kiến */}
                <div className="flex items-center justify-between gap-3">
                  <span>Thời gian giao hàng</span>
                  <input
                    type="datetime-local"
                    value={tab.deliveryDate ?? ''}
                    onChange={(e) => updateTab({ deliveryDate: e.target.value || null })}
                    className="h-8 px-2 rounded-lg border border-slate-300 text-[14px] text-[#15171a] outline-none focus:border-[#0070f4] cursor-pointer"
                  />
                </div>
              </>
            ) : (
              <>
                {change > 0 && (
                  <div className="flex items-center justify-between">
                    <span>Tiền thừa trả khách</span>
                    <span className="font-semibold">{fmt(change)}</span>
                  </div>
                )}
                {change < 0 && (
                  <div className="flex items-center justify-between">
                    <span>{tab.customer ? 'Tính vào công nợ' : 'Còn thiếu'}</span>
                    <span className="font-semibold text-[#fb2c36]">{fmt(-change)}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Thanh toán */}
          <button
            type="button"
            onClick={() => void handleCheckout()}
            disabled={submitting || (isBooking ? !canBooking : !canInvoice)}
            title={isBooking ? (canBooking ? undefined : 'Chưa được phân quyền Đặt hàng') : canInvoice ? 'F9' : 'Chưa được phân quyền Bán hàng'}
            className="mt-auto h-14 rounded-xl bg-[#0070f4] hover:bg-[#005ac3] text-white text-[17px] font-bold tracking-wide flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? <RefreshCw size={18} className="animate-spin" /> : <Check size={18} className="hidden" />}
            {isBooking ? (tab.bookingId ? 'LƯU ĐƠN ĐẶT HÀNG' : 'ĐẶT HÀNG') : 'THANH TOÁN'}
          </button>
        </aside>
      </div>

      <CustomerFormModal open={customerFormOpen} onCancel={() => setCustomerFormOpen(false)} onSuccess={handleCreateCustomer} />
    </div>
  );
}
