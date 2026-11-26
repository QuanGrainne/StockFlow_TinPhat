// src/features/pos/components/PosPickerDialogs.tsx
// Hai popup trên thanh màn Bán hàng:
// - "Chọn hóa đơn trả hàng" (nút ↩): tìm hóa đơn đã hoàn thành ở chi nhánh → mở tab Trả hàng;
//   "Trả nhanh": khách quên hóa đơn → mở tab trả hàng không theo hóa đơn.
// - "Xử lý đặt hàng" (nút 🛍): tìm đơn đặt hàng còn mở ở chi nhánh → mở tab hóa đơn giao hàng từ đơn.
// Bên trái: ô tìm kiếm + khoảng thời gian; bên phải: bảng kết quả, nút "Chọn".

'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';
import { orderService } from '@/features/orders/services/orderService';
import type { OrderListItem } from '@/features/orders/types';
import { salesBookingService } from '@/features/sales-bookings/services/salesBookingService';
import type { SalesBookingListItem } from '@/features/sales-bookings/types';
import { BOOKING_STATUS } from '@/features/sales-bookings/utils/salesBookingUtils';
import { formatDateTimeVN } from '@/lib/utils/date';

const fmt = (n: number) => Math.round(n || 0).toLocaleString('vi-VN');
const pad = (n: number) => String(n).padStart(2, '0');
/** YYYY-MM-DD của hôm nay lùi n ngày */
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const norm = (s?: string | null) => (s ?? '').toLowerCase();

const fieldCls =
  'w-full h-9 bg-transparent border-b border-slate-300 focus:border-[#0070f4] outline-none text-[14px] placeholder-[#94a3b8]';
const thCls = 'py-2.5 px-3 font-semibold text-left whitespace-nowrap';
const pickBtnCls = 'h-8 px-5 rounded-[6px] border border-slate-300 bg-white hover:bg-[#eff6ff] hover:border-[#0070f4] text-[14px] cursor-pointer';

/** Khung chung: tiêu đề, cột lọc bên trái, bảng bên phải */
function PickerShell({
  title,
  onClose,
  filters,
  children,
}: {
  title: string;
  onClose: () => void;
  filters: React.ReactNode;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[900] bg-slate-900/45 flex items-start justify-center p-4 sm:p-10 overflow-y-auto"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-[1280px] bg-white rounded-2xl shadow-2xl text-[14px] text-[#15171a]">
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h3 className="text-[17px] font-bold">{title}</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100 cursor-pointer" aria-label="Đóng">
            <X size={20} />
          </button>
        </div>
        <div className="flex gap-6 px-6 pb-6 min-h-[480px]">
          <div className="w-[250px] shrink-0 space-y-4">{filters}</div>
          <div className="flex-1 min-w-0">{children}</div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function FilterCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl shadow-[0_2px_10px_rgba(15,23,42,0.08)] border border-slate-100 px-4 py-3 space-y-2">
      <div className="font-bold">{title}</div>
      {children}
    </div>
  );
}

function DateRange({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (v: { from: string; to: string }) => void;
}) {
  return (
    <FilterCard title="Thời gian">
      <input type="date" value={from} max={to || undefined} onChange={(e) => onChange({ from: e.target.value, to })} className={`${fieldCls} cursor-pointer`} title="Từ ngày" />
      <input type="date" value={to} min={from || undefined} onChange={(e) => onChange({ from, to: e.target.value })} className={`${fieldCls} cursor-pointer`} title="Đến ngày" />
    </FilterCard>
  );
}

/** Số dòng mỗi trang: popup giữ chiều cao cố định, nhiều hơn thì chuyển trang */
const PAGE_SIZE = 8;

/** Phân trang theo kết quả hiện tại; đổi bộ lọc (key) → về trang 1 */
function usePaged<T>(items: T[], key: string) {
  const [state, setState] = useState<{ key: string; page: number }>({ key, page: 1 });
  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const page = state.key === key ? Math.min(state.page, pageCount) : 1;
  return {
    page,
    pageCount,
    total: items.length,
    pageItems: items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    setPage: (p: number) => setState({ key, page: Math.max(1, Math.min(pageCount, p)) }),
  };
}

function Pager({ page, pageCount, total, setPage, unit }: { page: number; pageCount: number; total: number; setPage: (p: number) => void; unit: string }) {
  if (total === 0) return null;
  return (
    <div className="mt-3 flex items-center justify-between text-[13px] text-[#677484]">
      <span>
        Hiển thị <strong className="text-[#15171a]">{(page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, total)}</strong> trên{' '}
        <strong className="text-[#15171a]">{total}</strong> {unit}
      </span>
      {pageCount > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="flex h-8 w-8 items-center justify-center rounded-[6px] border border-slate-300 bg-white hover:bg-[#f7f8f9] disabled:opacity-40 cursor-pointer"
            aria-label="Trang trước"
          >
            <ChevronLeft size={15} />
          </button>
          <span className="px-2 font-semibold text-[#15171a]">
            {page}/{pageCount}
          </span>
          <button
            type="button"
            disabled={page >= pageCount}
            onClick={() => setPage(page + 1)}
            className="flex h-8 w-8 items-center justify-center rounded-[6px] border border-slate-300 bg-white hover:bg-[#f7f8f9] disabled:opacity-40 cursor-pointer"
            aria-label="Trang sau"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

/** Ô tìm kiếm có trễ 300ms */
function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

// ─── Chọn hóa đơn trả hàng ───────────────────────────────────────────────
export function PickInvoiceDialog({
  warehouseId,
  onClose,
  onSelect,
  onQuickReturn,
}: {
  warehouseId: number;
  onClose: () => void;
  onSelect: (orderId: number) => void;
  /** Khách quên hóa đơn: trả hàng không theo hóa đơn */
  onQuickReturn: () => void;
}) {
  const [f, setF] = useState({ code: '', customer: '', productCode: '', productName: '', from: daysAgo(30), to: '' });
  const q = useDebounced(f);
  const key = JSON.stringify({ q, warehouseId });
  const [result, setResult] = useState<{ key: string; items: OrderListItem[] }>({ key: '', items: [] });
  const loading = result.key !== key;
  const pg = usePaged(result.items, key);

  useEffect(() => {
    let alive = true;
    orderService
      .getOrders({
        warehouseId,
        status: 'COMPLETED',
        search: q.code || q.customer || undefined,
        productSearch: q.productCode || q.productName || undefined,
        fromDate: q.from || undefined,
        toDate: q.to || undefined,
      })
      .then((items) => {
        if (!alive) return;
        // Nhập cả mã hóa đơn lẫn khách hàng: API tìm theo mã, lọc tiếp khách ở đây
        const filtered = items.filter(
          (o) =>
            !q.code || !q.customer || norm(o.partnerName).includes(norm(q.customer)) || norm(o.partnerPhone).includes(norm(q.customer))
        );
        setResult({ key, items: filtered });
      })
      .catch(() => alive && setResult({ key, items: [] }));
    return () => {
      alive = false;
    };
  }, [key, q, warehouseId]);

  return (
    <PickerShell
      title="Chọn hóa đơn trả hàng"
      onClose={onClose}
      filters={
        <>
          <FilterCard title="Tìm kiếm">
            <input autoFocus value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} placeholder="Theo mã hóa đơn" className={fieldCls} />
            <input value={f.customer} onChange={(e) => setF({ ...f, customer: e.target.value })} placeholder="Theo khách hàng hoặc ĐT" className={fieldCls} />
            <input value={f.productCode} onChange={(e) => setF({ ...f, productCode: e.target.value })} placeholder="Theo mã hàng" className={fieldCls} />
            <input value={f.productName} onChange={(e) => setF({ ...f, productName: e.target.value })} placeholder="Theo tên hàng" className={fieldCls} />
          </FilterCard>
          <DateRange from={f.from} to={f.to} onChange={(r) => setF({ ...f, ...r })} />
        </>
      }
    >
      <div className="rounded-[6px] border border-slate-200 overflow-hidden">
        <table className="w-full border-collapse">
          <thead className="bg-[#3b94f7] text-white">
            <tr>
              <th className={thCls}>Mã hóa đơn</th>
              <th className={thCls}>Thời gian</th>
              <th className={thCls}>Nhân viên</th>
              <th className={thCls}>Khách hàng</th>
              <th className={`${thCls} !text-right`}>Tổng cộng</th>
              <th className={`${thCls} w-28`} />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-[#677484]">
                  <Loader2 size={16} className="inline animate-spin mr-2 text-[#0070f4]" />
                  Đang tải hóa đơn...
                </td>
              </tr>
            ) : result.items.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-[#677484]">
                  Không tìm thấy hóa đơn đã hoàn thành phù hợp ở chi nhánh đang làm việc
                </td>
              </tr>
            ) : (
              pg.pageItems.map((o) => (
                <tr key={o.orderId} className="hover:bg-[#f7f8f9]">
                  <td className="py-2.5 px-3 text-[#0070f4] whitespace-nowrap">{o.orderCode}</td>
                  <td className="py-2.5 px-3 whitespace-nowrap">{formatDateTimeVN(o.orderDate)}</td>
                  <td className="py-2.5 px-3">{o.createdByName || '—'}</td>
                  <td className="py-2.5 px-3">{o.partnerName || 'Khách lẻ'}</td>
                  <td className="py-2.5 px-3 text-right">{fmt(o.totalAmount)}</td>
                  <td className="py-2 px-3 text-right">
                    <button type="button" onClick={() => onSelect(o.orderId)} className={pickBtnCls}>
                      Chọn
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Pager page={pg.page} pageCount={pg.pageCount} total={pg.total} setPage={pg.setPage} unit="hóa đơn" />
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onQuickReturn}
          title="Khách quên hóa đơn: tự chọn hàng và khách để trả"
          className="h-10 px-6 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white font-semibold cursor-pointer"
        >
          Trả nhanh
        </button>
      </div>
    </PickerShell>
  );
}

// ─── Xử lý đặt hàng ──────────────────────────────────────────────────────
export function PickBookingDialog({
  warehouseId,
  onClose,
  onSelect,
}: {
  warehouseId: number;
  onClose: () => void;
  onSelect: (orderId: number) => void;
}) {
  const [f, setF] = useState({ code: '', customer: '', notes: '', productCode: '', productName: '', from: daysAgo(30), to: '' });
  const q = useDebounced(f);
  const key = JSON.stringify({ q, warehouseId });
  const [result, setResult] = useState<{ key: string; items: SalesBookingListItem[] }>({ key: '', items: [] });
  const loading = result.key !== key;
  const pg = usePaged(result.items, key);

  useEffect(() => {
    let alive = true;
    salesBookingService
      .getBookings({
        warehouseIds: [warehouseId],
        // Chỉ đơn còn tạo hóa đơn được: Phiếu tạm
        statuses: ['DRAFT'],
        search: q.code || q.customer || q.notes || undefined,
        productSearch: q.productCode || q.productName || undefined,
        fromDate: q.from || undefined,
        toDate: q.to || undefined,
      })
      .then((items) => {
        if (!alive) return;
        // Nhập nhiều ô cùng lúc: API tìm theo ô đầu tiên, các ô còn lại lọc tiếp ở đây
        const filtered = items.filter(
          (b) =>
            (!q.customer || norm(b.partnerName).includes(norm(q.customer)) || norm(b.partnerPhone).includes(norm(q.customer)) || norm(b.partnerCode).includes(norm(q.customer))) &&
            (!q.notes || norm(b.notes).includes(norm(q.notes)))
        );
        setResult({ key, items: filtered });
      })
      .catch(() => alive && setResult({ key, items: [] }));
    return () => {
      alive = false;
    };
  }, [key, q, warehouseId]);

  return (
    <PickerShell
      title="Xử lý đặt hàng"
      onClose={onClose}
      filters={
        <>
          <FilterCard title="Tìm kiếm">
            <input autoFocus value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} placeholder="Theo mã đặt hàng" className={fieldCls} />
            <input value={f.customer} onChange={(e) => setF({ ...f, customer: e.target.value })} placeholder="Theo khách hàng" className={fieldCls} />
            <input value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Theo ghi chú đặt hàng" className={fieldCls} />
            <input value={f.productCode} onChange={(e) => setF({ ...f, productCode: e.target.value })} placeholder="Theo mã hàng" className={fieldCls} />
            <input value={f.productName} onChange={(e) => setF({ ...f, productName: e.target.value })} placeholder="Theo tên hàng" className={fieldCls} />
          </FilterCard>
          <DateRange from={f.from} to={f.to} onChange={(r) => setF({ ...f, ...r })} />
        </>
      }
    >
      <div className="rounded-[6px] border border-slate-200 overflow-hidden">
        <table className="w-full border-collapse">
          <thead className="bg-[#3b94f7] text-white">
            <tr>
              <th className={thCls}>Mã đặt hàng</th>
              <th className={thCls}>Thời gian</th>
              <th className={thCls}>Khách hàng</th>
              <th className={`${thCls} !text-right`}>Tổng cộng</th>
              <th className={thCls}>Trạng thái</th>
              <th className={thCls}>Ghi chú</th>
              <th className={`${thCls} w-28`} />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-[#677484]">
                  <Loader2 size={16} className="inline animate-spin mr-2 text-[#0070f4]" />
                  Đang tải đơn đặt hàng...
                </td>
              </tr>
            ) : result.items.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-[#677484]">
                  Không có đơn đặt hàng cần xử lý ở chi nhánh đang làm việc
                </td>
              </tr>
            ) : (
              pg.pageItems.map((b) => (
                <tr key={b.orderId} className="hover:bg-[#f7f8f9]">
                  <td className="py-2.5 px-3 text-[#0070f4] whitespace-nowrap">{b.orderCode}</td>
                  <td className="py-2.5 px-3 whitespace-nowrap">{formatDateTimeVN(b.orderDate)}</td>
                  <td className="py-2.5 px-3">{b.partnerName}</td>
                  <td className="py-2.5 px-3 text-right">{fmt(b.totalAmount)}</td>
                  <td className="py-2.5 px-3 whitespace-nowrap">{BOOKING_STATUS[b.status]?.label ?? b.status}</td>
                  <td className="py-2.5 px-3 max-w-[220px] truncate" title={b.notes ?? undefined}>
                    {(b.notes ?? '').replace(/\[Bảng giá:[^\]]*\]\s*/g, '')}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <button type="button" onClick={() => onSelect(b.orderId)} className={pickBtnCls}>
                      Chọn
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Pager page={pg.page} pageCount={pg.pageCount} total={pg.total} setPage={pg.setPage} unit="đơn đặt hàng" />
    </PickerShell>
  );
}
