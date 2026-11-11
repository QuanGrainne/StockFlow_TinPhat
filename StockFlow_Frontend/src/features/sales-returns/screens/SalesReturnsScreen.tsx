// src/features/sales-returns/screens/SalesReturnsScreen.tsx
// Màn hình Trả hàng (khách trả lại hàng đã mua) — cùng bố cục với Đặt hàng / Hóa đơn:
// Header 48px (tiêu đề + tìm kiếm + "+ Trả hàng" + Xuất file) → [Sidebar bộ lọc | Bảng + chi tiết mở rộng] → footer phân trang.
// "+ Trả hàng": chọn hóa đơn gốc (BR-18) → mở tab Trả hàng ở màn Bán hàng (tab mới).

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { message } from 'antd';
import { ChevronLeft, ChevronRight, FileDown, Inbox, Plus, RefreshCw, Search, X } from 'lucide-react';

import SalesReturnExpandedRow from '@/features/sales-returns/components/SalesReturnExpandedRow';
import SalesReturnFilterSidebar from '@/features/sales-returns/components/SalesReturnFilterSidebar';
import SelectInvoiceModal from '@/features/sales-returns/components/SelectInvoiceModal';
import { salesReturnService } from '@/features/sales-returns/services/salesReturnService';
import type { SalesReturnListFilter, SalesReturnListItem, SalesReturnSidebarState } from '@/features/sales-returns/types';
import {
  exportReturnsToXLSX,
  formatVnd,
  RETURN_DEFAULT_STATUSES,
  RETURN_STATUS,
  RETURN_STATUS_OPTIONS,
} from '@/features/sales-returns/utils/salesReturnUtils';
import { formatDateTimeVN } from '@/features/transfers/utils/dateUtils';
import { getTimeRangeForPreset } from '@/components/filters/TimeRangeFilter';
import { PartnerLink } from '@/components/links/EntityLinks';
import { readDocumentLink, scrollToWhenReady } from '@/lib/navigation/documentLink';
import { useActiveWarehouse } from '@/lib/warehouse/useActiveWarehouse';

const COLUMN_COUNT = 10;
const thCls = 'sticky top-0 z-20 bg-[#f7f8f9] py-2.5 px-3 border-b border-slate-200 whitespace-nowrap';
const checkboxCls = 'rounded text-[#0070f4] focus:ring-[#0070f4] h-3.5 w-3.5 border-slate-300 cursor-pointer';

function defaultSidebar(warehouseId: number): SalesReturnSidebarState {
  const month = getTimeRangeForPreset('this_month');
  return {
    warehouseIds: [warehouseId],
    statuses: [...RETURN_DEFAULT_STATUSES],
    timeRange: month.timeRange,
    dateFrom: month.dateFrom,
    dateTo: month.dateTo,
  };
}

export default function SalesReturnsScreen() {
  const { activeWarehouse, warehouses } = useActiveWarehouse();
  // ?code=TH...&id=...: mở thẳng 1 phiếu (mọi chi nhánh, toàn thời gian)
  const searchParams = useSearchParams();
  const [docLink] = useState(() => readDocumentLink(searchParams));

  const [sidebar, setSidebar] = useState<SalesReturnSidebarState>(() =>
    docLink
      ? { ...defaultSidebar(activeWarehouse.warehouseId), warehouseIds: [], timeRange: 'all_time', dateFrom: '', dateTo: '', statuses: [...RETURN_STATUS_OPTIONS] }
      : defaultSidebar(activeWarehouse.warehouseId)
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchInput, setSearchInput] = useState(() => docLink?.code ?? '');
  const [search, setSearch] = useState(() => docLink?.code ?? '');
  const [reloadTick, setReloadTick] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(() => docLink?.id ?? null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!docLink) return;
    window.history.replaceState(null, '', window.location.pathname);
    if (!docLink.id) return;
    return scrollToWhenReady(`[data-doc-row="${docLink.id}"]`);
  }, [docLink]);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Trả hàng xong ở tab Bán hàng → quay lại tab này thì tải lại danh sách
  useEffect(() => {
    const onFocus = () => setReloadTick((t) => t + 1);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const filter = useMemo<SalesReturnListFilter>(
    () => ({
      warehouseIds: sidebar.warehouseIds,
      statuses: sidebar.statuses,
      fromDate: sidebar.dateFrom || undefined,
      toDate: sidebar.dateTo || undefined,
      search: search || undefined,
    }),
    [sidebar, search]
  );

  const noStatus = sidebar.statuses.length === 0;
  const requestKey = JSON.stringify({ ...filter, reloadTick });
  const [result, setResult] = useState<{ key: string; items: SalesReturnListItem[] }>({ key: '', items: [] });
  const loading = !noStatus && result.key === '';

  useEffect(() => {
    if (noStatus) return;
    let stale = false;
    const params = JSON.parse(requestKey) as SalesReturnListFilter;
    salesReturnService
      .getReturns(params)
      .then((items) => {
        if (!stale) setResult({ key: requestKey, items });
      })
      .catch((err: unknown) => {
        if (stale) return;
        message.error(err instanceof Error ? err.message : 'Không thể tải danh sách trả hàng.');
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
    () =>
      rows
        .filter((r) => r.status !== 'CANCELLED')
        .reduce(
          (a, r) => ({ goods: a.goods + r.totalGoodsAmount, total: a.total + r.totalAmount, refund: a.refund + r.refundAmount }),
          { goods: 0, total: 0, refund: 0 }
        ),
    [rows]
  );
  const selectedRows = rows.filter((r) => selectedIds.includes(r.returnId));
  const allPageSelected = paged.length > 0 && paged.every((r) => selectedIds.includes(r.returnId));

  const changeSidebar = (patch: Partial<SalesReturnSidebarState>) => {
    setSidebar((prev) => ({ ...prev, ...patch }));
    setPage(1);
    setExpandedId(null);
  };

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col bg-[#f5f5f5] overflow-hidden select-none text-[13px] text-[#15171a] font-sans">
      {/* 1. Header */}
      <header className="h-12 bg-white border-b border-slate-200 px-4 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-4 flex-1 max-w-xl">
          <h1 className="text-[20px] font-bold text-[#15171a] leading-7 tracking-tight whitespace-nowrap">Trả hàng</h1>
          <div className="relative flex-1">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#677484] pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setPage(1);
              }}
              placeholder="Theo mã phiếu trả, mã hóa đơn, khách hàng"
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
            onClick={() => setPickerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 h-8 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white font-semibold text-[13px] shadow-xs transition cursor-pointer"
          >
            <Plus size={15} className="stroke-[2.5]" />
            <span>Trả hàng</span>
          </button>
          <button
            type="button"
            onClick={() => exportReturnsToXLSX(selectedRows.length > 0 ? selectedRows : rows)}
            disabled={rows.length === 0}
            className="inline-flex items-center gap-1 px-3 h-8 rounded-[8px] border border-slate-300 hover:bg-[#f7f8f9] font-medium text-[13px] transition cursor-pointer bg-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileDown size={14} className="text-[#677484]" />
            <span>Xuất file</span>
          </button>
        </div>
      </header>

      {/* 2. Bộ lọc + bảng */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        <SalesReturnFilterSidebar
          state={sidebar}
          warehouses={warehouses}
          fallbackWarehouseId={activeWarehouse.warehouseId}
          onChange={changeSidebar}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
        />

        <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden bg-white">
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-left border-collapse min-w-[1080px]">
              <thead className="bg-[#f7f8f9] sticky top-0 z-20 border-b border-slate-200 text-[12px] font-semibold text-[#677484] shadow-xs">
                <tr>
                  <th className={`${thCls} w-10 text-center`}>
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={(e) =>
                        setSelectedIds((prev) =>
                          e.target.checked
                            ? Array.from(new Set([...prev, ...paged.map((r) => r.returnId)]))
                            : prev.filter((id) => !paged.some((r) => r.returnId === id))
                        )
                      }
                      className={checkboxCls}
                    />
                  </th>
                  <th className={thCls}>Mã trả hàng</th>
                  <th className={thCls}>Người tạo</th>
                  <th className={thCls}>Thời gian</th>
                  <th className={thCls}>Mã KH</th>
                  <th className={thCls}>Khách hàng</th>
                  <th className={`${thCls} text-right`}>Tổng tiền hàng</th>
                  <th className={`${thCls} text-right`}>Cần trả khách</th>
                  <th className={`${thCls} text-right`}>Đã trả khách</th>
                  <th className={thCls}>Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!loading && paged.length > 0 && (
                  <tr className="bg-white border-b border-slate-200 font-bold text-[13px]">
                    <td colSpan={6}></td>
                    <td className="py-2.5 px-3 text-right font-mono">{formatVnd(totals.goods)}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{formatVnd(totals.total)}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{formatVnd(totals.refund)}</td>
                    <td></td>
                  </tr>
                )}

                {loading ? (
                  <tr>
                    <td colSpan={COLUMN_COUNT} className="py-20 text-center text-[#677484]">
                      <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-[#0070f4]" />
                      Đang tải danh sách trả hàng...
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
                          Không tìm thấy phiếu trả hàng nào phù hợp. Bấm{' '}
                          <button
                            type="button"
                            onClick={() => setPickerOpen(true)}
                            className="text-[#0070f4] font-semibold hover:underline cursor-pointer"
                          >
                            + Trả hàng
                          </button>{' '}
                          để chọn hóa đơn khách trả.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paged.map((r) => {
                    const isExpanded = expandedId === r.returnId;
                    const isSelected = selectedIds.includes(r.returnId);
                    const st = RETURN_STATUS[r.status] ?? { label: r.status, cls: 'bg-slate-50 text-slate-600 border-slate-200' };
                    const cancelled = r.status === 'CANCELLED';
                    return (
                      <React.Fragment key={r.returnId}>
                        <tr
                          data-doc-row={r.returnId}
                          onClick={() => setExpandedId(isExpanded ? null : r.returnId)}
                          className={`hover:bg-[#f7f8f9] transition cursor-pointer select-none border-b border-slate-100 ${
                            isExpanded ? 'bg-[#e6f1fe]/80 font-medium' : isSelected ? 'bg-[#e6f1fe]/50' : ''
                          } ${cancelled ? 'text-[#677484]' : ''}`}
                        >
                          <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) =>
                                setSelectedIds((prev) => (e.target.checked ? [...prev, r.returnId] : prev.filter((id) => id !== r.returnId)))
                              }
                              className={checkboxCls}
                            />
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-[#0070f4] whitespace-nowrap">{r.returnCode}</td>
                          <td className="py-2.5 px-3">{r.createdByName}</td>
                          <td className="py-2.5 px-3 whitespace-nowrap">{formatDateTimeVN(r.returnDate)}</td>
                          <td className="py-2.5 px-3 whitespace-nowrap">{r.partnerCode}</td>
                          <td className="py-2.5 px-3">
                            <PartnerLink kind="customer" code={r.partnerCode} partnerId={r.partnerId}>
                              {r.partnerName}
                            </PartnerLink>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono">{formatVnd(r.totalGoodsAmount)}</td>
                          <td className="py-2.5 px-3 text-right font-mono">{formatVnd(r.totalAmount)}</td>
                          <td
                            className={`py-2.5 px-3 text-right font-mono ${!cancelled && r.refundAmount < r.totalAmount ? 'text-[#fb2c36]' : ''}`}
                            title={!cancelled && r.refundAmount < r.totalAmount ? 'Chưa trả đủ tiền cho khách (phần còn lại trừ vào công nợ)' : undefined}
                          >
                            {formatVnd(r.refundAmount)}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap ${st.cls}`}>{st.label}</span>
                          </td>
                        </tr>
                        {isExpanded && (
                          <SalesReturnExpandedRow
                            returnId={r.returnId}
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

          <footer className="h-10 bg-white border-t border-slate-200 px-4 flex items-center justify-between text-[12px] text-[#677484] shrink-0">
            <div className="flex items-center gap-3">
              <span>
                Hiển thị{' '}
                <strong className="text-[#15171a]">
                  {rows.length === 0 ? 0 : (safePage - 1) * pageSize + 1} - {Math.min(safePage * pageSize, rows.length)}
                </strong>{' '}
                trên <strong className="text-[#15171a]">{rows.length}</strong> phiếu
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

      <SelectInvoiceModal
        open={pickerOpen}
        warehouseId={activeWarehouse.warehouseId}
        onClose={() => setPickerOpen(false)}
        onQuickReturn={() => {
          setPickerOpen(false);
          window.open('/pos?quickReturn=1', '_blank', 'noopener,noreferrer');
        }}
        onSelect={(orderId) => {
          setPickerOpen(false);
          // Trả hàng ở màn Bán hàng (tab mới), như KiotViet
          window.open(`/pos?returnInvoice=${orderId}`, '_blank', 'noopener,noreferrer');
        }}
      />
    </div>
  );
}
