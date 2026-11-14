// src/features/sales-bookings/screens/SalesBookingsScreen.tsx
// Màn hình Đặt hàng (đơn đặt của khách) — cùng bố cục với Đặt hàng nhập / Hóa đơn:
// Header 48px (tiêu đề + tìm kiếm + Gộp đơn + "+ Đặt hàng" + Xuất file)
// → [Sidebar bộ lọc | Bảng có dòng tổng + chi tiết mở rộng] → footer phân trang.
// Tạo / sửa đơn ở màn Bán hàng (tab "Đặt hàng"); đơn đặt không trừ tồn kho cho tới khi tạo hóa đơn giao hàng.

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { message } from 'antd';
import { ChevronLeft, ChevronRight, FileDown, Inbox, Loader2, Merge, Plus, RefreshCw, Search, X } from 'lucide-react';

import SalesBookingExpandedRow from '@/features/sales-bookings/components/SalesBookingExpandedRow';
import SalesBookingFilterSidebar, {
  type SalesBookingSidebarState,
} from '@/features/sales-bookings/components/SalesBookingFilterSidebar';
import { salesBookingService } from '@/features/sales-bookings/services/salesBookingService';
import type { SalesBookingListFilter, SalesBookingListItem } from '@/features/sales-bookings/types';
import {
  BOOKING_DEFAULT_STATUSES,
  BOOKING_STATUS,
  BOOKING_STATUS_OPTIONS,
  exportBookingsToXLSX,
} from '@/features/sales-bookings/utils/salesBookingUtils';
import { formatDateTimeVN } from '@/lib/utils/date';
import { getTimeRangeForPreset } from '@/components/filters/TimeRangeFilter';
import { PartnerLink } from '@/components/links/EntityLinks';
import { readDocumentLink, scrollToWhenReady } from '@/lib/navigation/documentLink';
import { useActiveWarehouse } from '@/lib/warehouse/useActiveWarehouse';

const money = new Intl.NumberFormat('vi-VN');
const COLUMN_COUNT = 8;
const thCls = 'sticky top-0 z-20 bg-[#f7f8f9] py-2.5 px-3 border-b border-slate-200 whitespace-nowrap';
const checkboxCls = 'rounded text-[#0070f4] focus:ring-[#0070f4] h-3.5 w-3.5 border-slate-300 cursor-pointer';

function defaultSidebar(warehouseId: number): SalesBookingSidebarState {
  const month = getTimeRangeForPreset('this_month');
  return {
    warehouseIds: [warehouseId],
    timeRange: month.timeRange,
    dateFrom: month.dateFrom,
    dateTo: month.dateTo,
    statuses: [...BOOKING_DEFAULT_STATUSES],
  };
}

export default function SalesBookingsScreen() {
  const { activeWarehouse, warehouses } = useActiveWarehouse();
  // ?code=DH...&id=...: mở thẳng 1 đơn (mọi chi nhánh, toàn thời gian); ?open=<id>: mở sẵn dòng (VD sau khi lưu ở POS)
  const searchParams = useSearchParams();
  const [docLink] = useState(() => readDocumentLink(searchParams));
  const [openId] = useState(() => Number(searchParams.get('open')) || null);

  const [sidebar, setSidebar] = useState<SalesBookingSidebarState>(() =>
    docLink
      ? { ...defaultSidebar(activeWarehouse.warehouseId), warehouseIds: [], timeRange: 'all_time', dateFrom: '', dateTo: '', statuses: [...BOOKING_STATUS_OPTIONS] }
      : defaultSidebar(activeWarehouse.warehouseId)
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchInput, setSearchInput] = useState(() => docLink?.code ?? '');
  const [search, setSearch] = useState(() => docLink?.code ?? '');
  const [reloadTick, setReloadTick] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(() => docLink?.id ?? openId);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [merging, setMerging] = useState(false);

  useEffect(() => {
    if (!docLink && !openId) return;
    // Link chỉ dùng 1 lần: gỡ tham số khỏi URL để F5 không nạp lại
    window.history.replaceState(null, '', window.location.pathname);
    const rowId = docLink?.id ?? openId;
    if (!rowId) return;
    return scrollToWhenReady(`[data-doc-row="${rowId}"]`);
  }, [docLink, openId]);

  // Quay lại từ tab Bán hàng (đặt / giao hàng ở tab khác) → tải lại danh sách
  useEffect(() => {
    const onFocus = () => setReloadTick((t) => t + 1);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const filter = useMemo<SalesBookingListFilter>(
    () => ({
      warehouseIds: sidebar.warehouseIds,
      statuses: sidebar.statuses,
      fromDate: sidebar.dateFrom || undefined,
      toDate: sidebar.dateTo || undefined,
      search: search || undefined,
    }),
    [sidebar, search]
  );

  // Bỏ hết trạng thái → không có đơn nào (API coi rỗng là "tất cả")
  const noStatus = sidebar.statuses.length === 0;
  const requestKey = JSON.stringify({ ...filter, reloadTick });
  const [result, setResult] = useState<{ key: string; items: SalesBookingListItem[] }>({ key: '', items: [] });
  const loading = !noStatus && result.key === '';

  useEffect(() => {
    if (noStatus) return;
    let stale = false;
    const params = JSON.parse(requestKey) as SalesBookingListFilter;
    salesBookingService
      .getBookings(params)
      .then((items) => {
        if (!stale) setResult({ key: requestKey, items });
      })
      .catch((err: unknown) => {
        if (stale) return;
        message.error(err instanceof Error ? err.message : 'Không thể tải danh sách đặt hàng.');
        setResult({ key: requestKey, items: [] });
      });
    return () => {
      stale = true;
    };
  }, [requestKey, noStatus]);

  const rows = useMemo(() => (noStatus ? [] : result.items), [noStatus, result.items]);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const paged = rows.slice((safePage - 1) * pageSize, safePage * pageSize);
  const totals = useMemo(
    () => rows.reduce((acc, r) => ({ amount: acc.amount + r.totalAmount, paid: acc.paid + r.customerPaidAmount }), { amount: 0, paid: 0 }),
    [rows]
  );

  const changeSidebar = (patch: Partial<SalesBookingSidebarState>) => {
    setSidebar((prev) => ({ ...prev, ...patch }));
    setPage(1);
    setExpandedId(null);
  };

  const allPageSelected = paged.length > 0 && paged.every((r) => selectedIds.includes(r.orderId));

  // Gộp đơn: cùng khách, cùng chi nhánh, chưa giao (BR-09)
  const selectedRows = rows.filter((r) => selectedIds.includes(r.orderId));
  const mergeError = (() => {
    if (selectedRows.length < 2) return 'Cần chọn ít nhất 2 đơn để gộp.';
    const bad = selectedRows.find((r) => r.status !== 'DRAFT');
    if (bad) return `Đơn ${bad.orderCode} (${BOOKING_STATUS[bad.status].label}) không gộp được: chỉ gộp đơn ở trạng thái Phiếu tạm.`;
    if (new Set(selectedRows.map((r) => r.partnerId)).size > 1) return 'Chỉ gộp được các đơn của cùng 1 khách hàng.';
    if (new Set(selectedRows.map((r) => r.warehouseId)).size > 1) return 'Chỉ gộp được các đơn cùng chi nhánh xử lý.';
    return null;
  })();

  const handleMerge = async () => {
    setMerging(true);
    try {
      const res = await salesBookingService.mergeBookings(selectedRows.map((r) => r.orderId));
      message.success(`Đã gộp ${selectedRows.length} đơn thành đơn ${res.orderCode}`);
      setMergeOpen(false);
      setSelectedIds([]);
      setExpandedId(res.orderId);
      setReloadTick((t) => t + 1);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không gộp được đơn.');
    } finally {
      setMerging(false);
    }
  };

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col bg-transparent overflow-hidden select-none text-[13px] text-[#15171a] font-sans">
      {/* 1. Header */}
      <header className="h-12 bg-white/84 backdrop-blur-[2px] border-b border-slate-200 px-4 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-4 flex-1 max-w-xl">
          <h1 className="text-[20px] font-bold text-[#15171a] leading-7 tracking-tight whitespace-nowrap">Đặt hàng</h1>
          <div className="relative flex-1">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#677484] pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setPage(1);
              }}
              placeholder="Theo mã phiếu đặt, khách hàng, điện thoại"
              className="w-full h-8 pl-8 pr-8 rounded-full bg-[#f7f8f9] border border-slate-200 text-[13px] placeholder-[#677484] focus:outline-none focus:border-[#0070f4] focus:bg-white transition"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#677484] hover:text-[#15171a] cursor-pointer"
                title="Xóa từ khóa"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMergeOpen(true)}
            disabled={selectedRows.length < 2}
            title={selectedRows.length < 2 ? 'Tick chọn từ 2 đơn cùng khách hàng để gộp' : `Gộp ${selectedRows.length} đơn đã chọn`}
            className="inline-flex items-center gap-1 px-3 h-8 rounded-[8px] border border-slate-300 hover:bg-[#f7f8f9] font-medium text-[13px] transition cursor-pointer bg-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Merge size={14} className="text-[#677484]" />
            <span>Gộp đơn{selectedRows.length >= 2 ? ` (${selectedRows.length})` : ''}</span>
          </button>
          {/* Mở màn Bán hàng ở tab mới, giữ nguyên danh sách đặt hàng */}
          <Link
            href="/pos?newBooking=1"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 h-8 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white font-semibold text-[13px] shadow-xs transition cursor-pointer"
          >
            <Plus size={15} className="stroke-[2.5]" />
            <span>Đặt hàng</span>
          </Link>
          <button
            type="button"
            onClick={() => exportBookingsToXLSX(selectedRows.length > 0 ? selectedRows : rows)}
            disabled={rows.length === 0}
            title={selectedRows.length > 0 ? `Xuất ${selectedRows.length} đơn đã chọn` : 'Xuất toàn bộ danh sách đang lọc'}
            className="inline-flex items-center gap-1 px-3 h-8 rounded-[8px] border border-slate-300 hover:bg-[#f7f8f9] font-medium text-[13px] transition cursor-pointer bg-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileDown size={14} className="text-[#677484]" />
            <span>Xuất file</span>
          </button>
        </div>
      </header>

      {/* 2. Bộ lọc + bảng */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        <SalesBookingFilterSidebar
          state={sidebar}
          warehouses={warehouses}
          fallbackWarehouseId={activeWarehouse.warehouseId}
          onChange={changeSidebar}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
        />

        <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden bg-white/62">
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-left border-collapse min-w-[940px]">
              <thead className="bg-[#f7f8f9] sticky top-0 z-20 border-b border-slate-200 text-[12px] font-semibold text-[#677484] shadow-xs">
                <tr>
                  <th className={`${thCls} w-10 text-center`}>
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={(e) =>
                        setSelectedIds((prev) =>
                          e.target.checked
                            ? Array.from(new Set([...prev, ...paged.map((r) => r.orderId)]))
                            : prev.filter((id) => !paged.some((r) => r.orderId === id))
                        )
                      }
                      className={checkboxCls}
                    />
                  </th>
                  <th className={thCls}>Mã đặt hàng</th>
                  <th className={thCls}>Thời gian</th>
                  <th className={thCls}>Mã KH</th>
                  <th className={thCls}>Khách hàng</th>
                  <th className={`${thCls} text-right`}>Khách cần trả</th>
                  <th className={`${thCls} text-right`}>Khách đã trả</th>
                  <th className={thCls}>Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!loading && paged.length > 0 && (
                  <tr className="bg-white/75 border-b border-slate-200 font-bold text-[13px]">
                    <td colSpan={5}></td>
                    <td className="py-2.5 px-3 text-right font-mono">{money.format(totals.amount)}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{money.format(totals.paid)}</td>
                    <td></td>
                  </tr>
                )}

                {loading ? (
                  <tr>
                    <td colSpan={COLUMN_COUNT} className="py-20 text-center text-[#677484]">
                      <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-[#0070f4]" />
                      Đang tải danh sách đặt hàng...
                    </td>
                  </tr>
                ) : paged.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMN_COUNT} className="py-24 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 rounded-full bg-[#e6f1fe] text-[#0070f4] flex items-center justify-center mb-3">
                          <Inbox size={32} className="stroke-[1.5]" />
                        </div>
                        <h3 className="font-bold text-sm mb-1">Không tìm thấy kết quả</h3>
                        <p className="text-xs text-[#677484] max-w-sm">
                          Không tìm thấy đơn đặt hàng nào phù hợp.{' '}
                          <button
                            type="button"
                            onClick={() => {
                              setSidebar({ ...defaultSidebar(activeWarehouse.warehouseId), timeRange: 'all_time', dateFrom: '', dateTo: '' });
                              setSearchInput('');
                              setPage(1);
                            }}
                            className="text-[#0070f4] font-semibold hover:underline cursor-pointer"
                          >
                            Xem toàn thời gian
                          </button>{' '}
                          hoặc bấm <strong>+ Đặt hàng</strong> để tạo đơn.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paged.map((r) => {
                    const isExpanded = expandedId === r.orderId;
                    const isSelected = selectedIds.includes(r.orderId);
                    const st = BOOKING_STATUS[r.status] ?? { label: r.status, cls: 'bg-slate-50 text-slate-600 border-slate-200' };
                    return (
                      <React.Fragment key={r.orderId}>
                        <tr
                          data-doc-row={r.orderId}
                          onClick={() => setExpandedId(isExpanded ? null : r.orderId)}
                          className={`hover:bg-[#f7f8f9] transition cursor-pointer select-none border-b border-slate-100 ${
                            isExpanded ? 'bg-[#e6f1fe]/80 font-medium' : isSelected ? 'bg-[#e6f1fe]/50' : ''
                          } ${r.status === 'CANCELLED' ? 'text-[#677484]' : ''}`}
                        >
                          <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) =>
                                setSelectedIds((prev) => (e.target.checked ? [...prev, r.orderId] : prev.filter((id) => id !== r.orderId)))
                              }
                              className={checkboxCls}
                            />
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-[#0070f4] whitespace-nowrap">{r.orderCode}</td>
                          <td className="py-2.5 px-3 whitespace-nowrap">{formatDateTimeVN(r.orderDate)}</td>
                          <td className="py-2.5 px-3 whitespace-nowrap">{r.partnerCode}</td>
                          <td className="py-2.5 px-3">
                            <PartnerLink kind="customer" code={r.partnerCode} partnerId={r.partnerId}>
                              {r.partnerName}
                            </PartnerLink>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono">{money.format(r.totalAmount)}</td>
                          <td
                            className={`py-2.5 px-3 text-right font-mono ${
                              r.status !== 'CANCELLED' && r.customerPaidAmount < r.totalAmount ? 'text-[#fb2c36]' : ''
                            }`}
                            title={r.customerPaidAmount < r.totalAmount ? 'Khách chưa trả đủ' : undefined}
                          >
                            {money.format(r.customerPaidAmount)}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap ${st.cls}`}>{st.label}</span>
                          </td>
                        </tr>
                        {isExpanded && (
                          <SalesBookingExpandedRow
                            orderId={r.orderId}
                            colSpan={COLUMN_COUNT}
                            onClose={() => setExpandedId(null)}
                            onChanged={() => setReloadTick((t) => t + 1)}
                          />
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer phân trang */}
          <footer className="h-10 bg-white/82 backdrop-blur-[2px] border-t border-slate-200 px-4 flex items-center justify-between text-[12px] text-[#677484] shrink-0">
            <div className="flex items-center gap-3">
              <span>
                Hiển thị{' '}
                <strong className="text-[#15171a]">
                  {rows.length === 0 ? 0 : (safePage - 1) * pageSize + 1} - {Math.min(safePage * pageSize, rows.length)}
                </strong>{' '}
                trên <strong className="text-[#15171a]">{rows.length}</strong> đơn
              </span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="h-7 rounded-[6px] border border-slate-300 bg-white px-1.5 text-[12px] text-[#15171a] focus:outline-none focus:border-[#0070f4] cursor-pointer"
              >
                <option value={15}>15 dòng</option>
                <option value={30}>30 dòng</option>
                <option value={50}>50 dòng</option>
              </select>
            </div>
            {pageCount > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage(Math.max(1, safePage - 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-slate-300 bg-white hover:bg-[#f7f8f9] disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="px-2 font-semibold text-[#15171a]">
                  {safePage}/{pageCount}
                </span>
                <button
                  type="button"
                  disabled={safePage >= pageCount}
                  onClick={() => setPage(Math.min(pageCount, safePage + 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-slate-300 bg-white hover:bg-[#f7f8f9] disabled:opacity-40 cursor-pointer"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </footer>
        </div>
      </div>

      {/* 3. Xác nhận gộp đơn */}
      {mergeOpen && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl">
            <div className="px-5 pt-4 pb-2 text-[16px] font-bold">Gộp đơn đặt hàng</div>
            <div className="px-5 pb-4 space-y-3">
              {mergeError ? (
                <div className="px-3 py-2 rounded-[8px] bg-[#fef2f2] border border-[#fecaca] text-[#fb2c36]">{mergeError}</div>
              ) : (
                <p>
                  Gộp <strong>{selectedRows.length}</strong> đơn của khách <strong>{selectedRows[0]?.partnerName}</strong> thành 1 đơn mới. Hàng
                  trùng nhau (cùng giá) được cộng số lượng, tiền khách đã trả trước chuyển sang đơn mới; các đơn gốc chuyển sang{' '}
                  <strong>Đã hủy</strong>.
                </p>
              )}
              <div className="rounded-[8px] border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#f7f8f9] border-b border-slate-200 text-[12px] font-semibold text-[#677484]">
                    <tr>
                      <th className="py-2 px-3">Mã đặt hàng</th>
                      <th className="py-2 px-3">Khách hàng</th>
                      <th className="py-2 px-3 text-right">Khách cần trả</th>
                      <th className="py-2 px-3 text-right">Đã trả</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedRows.map((r) => (
                      <tr key={r.orderId}>
                        <td className="py-2 px-3 font-mono font-bold text-[#0070f4]">{r.orderCode}</td>
                        <td className="py-2 px-3">{r.partnerName}</td>
                        <td className="py-2 px-3 text-right font-mono">{money.format(r.totalAmount)}</td>
                        <td className="py-2 px-3 text-right font-mono">{money.format(r.paidAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-200">
              <button
                type="button"
                disabled={merging}
                onClick={() => setMergeOpen(false)}
                className="h-9 px-4 rounded-[8px] border border-slate-300 bg-white hover:bg-[#f7f8f9] font-semibold cursor-pointer disabled:opacity-50"
              >
                Bỏ qua
              </button>
              <button
                type="button"
                disabled={merging || !!mergeError}
                onClick={() => void handleMerge()}
                className="h-9 px-4 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white font-semibold cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {merging && <Loader2 size={14} className="animate-spin" />}
                Gộp đơn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
