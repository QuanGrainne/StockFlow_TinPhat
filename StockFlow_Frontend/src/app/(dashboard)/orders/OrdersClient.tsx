// src/app/(dashboard)/orders/OrdersClient.tsx
// Màn hình Hóa đơn — cùng bố cục với Khách hàng / Nhà cung cấp / Nhập hàng:
// Header 48px (tiêu đề + tìm kiếm + "+ Hóa đơn" mở màn Bán hàng + Xuất file)
// → [Sidebar bộ lọc | Bảng có dòng tổng + chi tiết mở rộng (Thông tin / Lịch sử thanh toán)] → footer phân trang.

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { message } from 'antd';
import { ChevronLeft, ChevronRight, FileDown, Inbox, Plus, RefreshCw, Search, Star, X } from 'lucide-react';

import { orderService } from '@/features/orders/services/orderService';
import type { OrderListFilter, OrderListItem } from '@/features/orders/types';
import { KiotVietOrderDetail } from '@/features/orders/components/KiotVietOrderDetail';
import OrderFilterSidebar, { type OrderSidebarState } from '@/features/orders/components/OrderFilterSidebar';
import { exportInvoicesToXLSX, formatDateTime } from '@/features/orders/utils/invoiceUtils';
import { priceBookService } from '@/features/price-books/services/priceBookService';
import { getTimeRangeForPreset } from '@/components/filters/TimeRangeFilter';
import { PartnerLink } from '@/components/links/EntityLinks';
import { useActiveWarehouse } from '@/lib/warehouse/useActiveWarehouse';
import { documentLinkHref, readDocumentLink, scrollToWhenReady } from '@/lib/navigation/documentLink';

const money = new Intl.NumberFormat('vi-VN');
const COLUMN_COUNT = 11;

/** Trạng thái hóa đơn (cột Trạng thái) */
const INVOICE_STATUS: Record<string, { label: string; cls: string }> = {
  COMPLETED: { label: 'Hoàn thành', cls: 'bg-[#e6f8ec] text-[#16a34a] border-[#bbf7d0]' },
  CANCELLED: { label: 'Đã hủy', cls: 'bg-[#fef2f2] text-[#fb2c36] border-[#fecaca]' },
  DRAFT: { label: 'Phiếu tạm', cls: 'bg-[#fffbeb] text-[#d97706] border-[#fde68a]' },
};
const STAR_KEY = 'stockflow_invoice_stars';
const WALK_IN_CODE = 'KH00000';
const thCls = 'sticky top-0 z-20 bg-[#f7f8f9] py-2.5 px-3 border-b border-slate-200 whitespace-nowrap';
const checkboxCls = 'rounded text-[#0070f4] focus:ring-[#0070f4] h-3.5 w-3.5 border-slate-300 cursor-pointer';

function readStars(): number[] {
  try {
    const raw = localStorage.getItem(STAR_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is number => typeof v === 'number') : [];
  } catch {
    return [];
  }
}

function defaultSidebar(warehouseId: number): OrderSidebarState {
  const month = getTimeRangeForPreset('this_month');
  return {
    warehouseIds: [warehouseId],
    timeRange: month.timeRange,
    dateFrom: month.dateFrom,
    dateTo: month.dateTo,
    statusCompleted: true,
    statusCancelled: false,
    noReturn: true,
    hasReturn: true,
    paymentMethod: '',
    priceBookName: '',
  };
}

interface OrdersClientProps {
  /** Điều hướng màn hình trong AppLayout (giữ tương thích) */
  onNavigate?: (screenId: string) => void;
}

export default function OrdersClient({}: OrdersClientProps = {}) {
  const { activeWarehouse, warehouses } = useActiveWarehouse();
  // Link mở thẳng 1 hóa đơn (?code=HD...&id=..., VD từ sổ công nợ khách hàng): tìm theo mã, mọi chi nhánh, toàn thời gian
  const searchParams = useSearchParams();
  const [docLink] = useState(() => readDocumentLink(searchParams));

  const [sidebar, setSidebar] = useState<OrderSidebarState>(() =>
    docLink
      ? {
          ...defaultSidebar(activeWarehouse.warehouseId),
          warehouseIds: [],
          timeRange: 'all_time',
          dateFrom: '',
          dateTo: '',
          statusCancelled: true,
        }
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
  const [priceBooks, setPriceBooks] = useState<string[]>([]);
  const [stars, setStars] = useState<number[]>(() => (typeof window === 'undefined' ? [] : readStars()));

  // Mở theo link: cuộn tới dòng hóa đơn khi dữ liệu tải xong
  useEffect(() => {
    if (!docLink?.id) return;
    return scrollToWhenReady(`[data-doc-row="${docLink.id}"]`);
  }, [docLink]);

  // Tìm kiếm: chờ ngừng gõ 300ms rồi mới gọi API
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    priceBookService
      .getPriceBooks()
      .then((list) => setPriceBooks(Array.from(new Set(list.map((p) => p.priceBookName).filter(Boolean)))))
      .catch(() => setPriceBooks([]));
  }, []);

  // ── Bộ lọc gửi lên server; đang tải khi kết quả chưa khớp khóa hiện tại ──
  const serverFilter = useMemo<OrderListFilter>(() => {
    const statuses = [sidebar.statusCompleted && 'COMPLETED', sidebar.statusCancelled && 'CANCELLED'].filter(Boolean).join(',');
    return {
      search: search || undefined,
      // API nhận 1 kho; chọn nhiều kho thì tải tất cả rồi lọc tiếp ở client
      warehouseId: sidebar.warehouseIds.length === 1 ? sidebar.warehouseIds[0] : undefined,
      fromDate: sidebar.dateFrom || undefined,
      toDate: sidebar.dateTo || undefined,
      status: statuses || undefined,
      returnStatus: sidebar.noReturn === sidebar.hasReturn ? 'ALL' : sidebar.noReturn ? 'NO_RETURN' : 'HAS_RETURN',
      paymentMethod: sidebar.paymentMethod || undefined,
      priceBookName: sidebar.priceBookName || undefined,
    };
  }, [sidebar, search]);

  // Bỏ hết trạng thái → không có hóa đơn nào (API coi rỗng là "tất cả")
  const noStatus = !sidebar.statusCompleted && !sidebar.statusCancelled;
  const requestKey = JSON.stringify({ ...serverFilter, reloadTick });
  const [result, setResult] = useState<{ key: string; items: OrderListItem[] }>({ key: '', items: [] });
  const loading = !noStatus && result.key !== requestKey;

  useEffect(() => {
    if (noStatus) return;
    let stale = false;
    const { reloadTick: _tick, ...params } = JSON.parse(requestKey) as OrderListFilter & { reloadTick: number };
    void _tick;
    orderService
      .getOrders(params)
      .then((items) => {
        if (!stale) setResult({ key: requestKey, items });
      })
      .catch((err: unknown) => {
        if (stale) return;
        message.error(err instanceof Error ? err.message : 'Không thể tải danh sách hóa đơn.');
        setResult({ key: requestKey, items: [] });
      });
    return () => {
      stale = true;
    };
  }, [requestKey, noStatus]);

  const rows = useMemo(() => {
    if (noStatus) return [];
    if (sidebar.warehouseIds.length <= 1) return result.items;
    const set = new Set(sidebar.warehouseIds);
    return result.items.filter((r) => r.warehouseId != null && set.has(r.warehouseId));
  }, [noStatus, result.items, sidebar.warehouseIds]);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const paged = rows.slice((safePage - 1) * pageSize, safePage * pageSize);
  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({
          subTotal: acc.subTotal + (r.subTotal || 0),
          discount: acc.discount + (r.discountAmount || 0),
          paid: acc.paid + (r.paidAmount || 0),
        }),
        { subTotal: 0, discount: 0, paid: 0 }
      ),
    [rows]
  );

  const changeSidebar = (patch: Partial<OrderSidebarState>) => {
    setSidebar((prev) => ({ ...prev, ...patch }));
    setPage(1);
    setExpandedId(null);
  };
  const reload = () => setReloadTick((t) => t + 1);

  const toggleStar = (orderId: number) => {
    setStars((prev) => {
      const next = prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId];
      try {
        localStorage.setItem(STAR_KEY, JSON.stringify(next));
      } catch {
        // trình duyệt chặn localStorage: chỉ giữ trong phiên
      }
      return next;
    });
  };

  /** "+ Hóa đơn" / "Sao chép" → mở màn Bán hàng ở tab mới, giữ nguyên màn Hóa đơn đang xem */
  const openPos = () => {
    window.open('/pos', '_blank', 'noopener');
  };

  const handleExport = (source: OrderListItem[]) => {
    if (source.length === 0) {
      message.warning('Không có hóa đơn nào để xuất file.');
      return;
    }
    exportInvoicesToXLSX(source);
    message.success(`Đã xuất ${source.length} hóa đơn ra file Excel.`);
  };

  // Phím tắt: F1 mở màn bán hàng, F3 tìm hóa đơn
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        window.open('/pos', '_blank', 'noopener');
      } else if (e.key === 'F3') {
        e.preventDefault();
        document.getElementById('invoice-search')?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const allPageSelected = paged.length > 0 && paged.every((r) => selectedIds.includes(r.orderId));

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col bg-[#f5f5f5] overflow-hidden select-none text-[13px] text-[#15171a] font-sans">
      {/* 1. Header */}
      <header className="h-12 bg-white border-b border-slate-200 px-4 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-4 flex-1 max-w-xl">
          <h1 className="text-[20px] font-bold text-[#15171a] leading-7 tracking-tight whitespace-nowrap">Hóa đơn</h1>
          <div className="relative flex-1">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#677484] pointer-events-none" />
            <input
              id="invoice-search"
              type="text"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setPage(1);
              }}
              placeholder="Theo mã hóa đơn, tên hoặc SĐT khách (F3)"
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
            onClick={openPos}
            title="Mở màn hình Bán hàng (F1)"
            className="inline-flex items-center gap-1.5 px-3.5 h-8 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white font-semibold text-[13px] shadow-xs transition cursor-pointer"
          >
            <Plus size={15} className="stroke-[2.5]" />
            <span>Hóa đơn</span>
          </button>
          <button
            type="button"
            onClick={() => handleExport(rows)}
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
        <OrderFilterSidebar
          state={sidebar}
          warehouses={warehouses}
          priceBooks={priceBooks}
          fallbackWarehouseId={activeWarehouse.warehouseId}
          onChange={changeSidebar}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
        />

        <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden bg-white">
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-left border-collapse min-w-[980px]">
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
                  <th className={`${thCls} w-9 text-center`}>
                    <Star size={13} className="mx-auto text-[#677484]" />
                  </th>
                  <th className={thCls}>Mã hóa đơn</th>
                  <th className={thCls}>Thời gian</th>
                  <th className={thCls}>Mã trả hàng</th>
                  <th className={thCls}>Mã KH</th>
                  <th className={thCls}>Khách hàng</th>
                  <th className={`${thCls} text-right`}>Tổng tiền hàng</th>
                  <th className={`${thCls} text-right`}>Giảm giá</th>
                  <th className={`${thCls} text-right`}>Khách đã trả</th>
                  <th className={thCls}>Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* Dòng tổng */}
                {!loading && paged.length > 0 && (
                  <tr className="bg-white border-b border-slate-200 font-bold text-[13px]">
                    <td colSpan={7}></td>
                    <td className="py-2.5 px-3 text-right font-mono">{money.format(totals.subTotal)}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{money.format(totals.discount)}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{money.format(totals.paid)}</td>
                    <td></td>
                  </tr>
                )}

                {loading ? (
                  <tr>
                    <td colSpan={COLUMN_COUNT} className="py-20 text-center text-[#677484]">
                      <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-[#0070f4]" />
                      Đang tải danh sách hóa đơn...
                    </td>
                  </tr>
                ) : paged.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMN_COUNT} className="py-24 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 rounded-full bg-[#e6f1fe] text-[#0070f4] flex items-center justify-center mb-3">
                          <Inbox size={32} className="stroke-[1.5]" />
                        </div>
                        <h3 className="font-bold text-sm mb-1">Không tìm thấy hóa đơn</h3>
                        <p className="text-xs text-[#677484] max-w-sm">
                          Chưa có hóa đơn phù hợp.{' '}
                          <button
                            type="button"
                            onClick={() => {
                              setSidebar(defaultSidebar(activeWarehouse.warehouseId));
                              setSearchInput('');
                              setPage(1);
                            }}
                            className="text-[#0070f4] font-semibold hover:underline cursor-pointer"
                          >
                            Xóa bộ lọc
                          </button>{' '}
                          hoặc bấm <strong>+ Hóa đơn</strong> để bán hàng.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paged.map((r) => {
                    const isExpanded = expandedId === r.orderId;
                    const isSelected = selectedIds.includes(r.orderId);
                    const cancelled = r.status === 'CANCELLED';
                    const walkIn = !r.partnerCode || r.partnerCode === WALK_IN_CODE;
                    const starred = stars.includes(r.orderId);
                    return (
                      <React.Fragment key={r.orderId}>
                        <tr
                          data-doc-row={r.orderId}
                          onClick={() => setExpandedId(isExpanded ? null : r.orderId)}
                          className={`hover:bg-[#f7f8f9] transition cursor-pointer select-none border-b border-slate-100 ${
                            isExpanded ? 'bg-[#e6f1fe]/80 font-medium' : isSelected ? 'bg-[#e6f1fe]/50' : ''
                          } ${cancelled ? 'text-[#677484]' : ''}`}
                        >
                          <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) =>
                                setSelectedIds((prev) =>
                                  e.target.checked ? [...prev, r.orderId] : prev.filter((id) => id !== r.orderId)
                                )
                              }
                              className={checkboxCls}
                            />
                          </td>
                          <td className="py-2.5 px-1 text-center">
                            <button
                              type="button"
                              aria-label="Đánh dấu hóa đơn"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleStar(r.orderId);
                              }}
                              className="cursor-pointer align-middle"
                            >
                              <Star
                                size={14}
                                className={starred ? 'fill-amber-400 text-amber-400' : 'text-slate-300 hover:text-slate-400'}
                              />
                            </button>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-[#0070f4] whitespace-nowrap">
                            {r.orderCode}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">{formatDateTime(r.orderDate)}</td>
                          <td className="py-2.5 px-3 font-mono text-[12px] whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            {r.returnCode ? (
                              <a
                                href={documentLinkHref('/sales-returns', { code: r.returnCode })}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#0070f4] hover:underline"
                                title={`Mở phiếu trả hàng ${r.returnCode}`}
                              >
                                {r.returnCode}
                              </a>
                            ) : (
                              ''
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[12px] whitespace-nowrap">
                            {walkIn ? (
                              ''
                            ) : (
                              <PartnerLink kind="customer" code={r.partnerCode} />
                            )}
                          </td>
                          <td className="py-2.5 px-3">{walkIn ? 'Khách lẻ' : r.partnerName}</td>
                          <td className="py-2.5 px-3 text-right font-mono">{money.format(r.subTotal || 0)}</td>
                          <td className="py-2.5 px-3 text-right font-mono">{money.format(r.discountAmount || 0)}</td>
                          {/* Khách trả chưa đủ (còn nợ) → đỏ */}
                          <td
                            className={`py-2.5 px-3 text-right font-mono ${
                              !cancelled && (r.paidAmount || 0) < (r.totalAmount || 0) ? 'text-[#fb2c36]' : ''
                            }`}
                            title={!cancelled && (r.paidAmount || 0) < (r.totalAmount || 0) ? 'Khách chưa trả đủ' : undefined}
                          >
                            {money.format(r.paidAmount || 0)}
                          </td>
                          <td className="py-2.5 px-3">
                            {(() => {
                              const st = INVOICE_STATUS[(r.status || '').toUpperCase()] ?? {
                                label: r.status || '—',
                                cls: 'bg-slate-50 text-slate-600 border-slate-200',
                              };
                              return (
                                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap ${st.cls}`}>
                                  {st.label}
                                </span>
                              );
                            })()}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={COLUMN_COUNT} className="p-0 bg-white">
                              <KiotVietOrderDetail
                                orderId={r.orderId}
                                onClose={() => setExpandedId(null)}
                                onReloadList={reload}
                                onOpenPos={openPos}
                              />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer phân trang */}
          <footer className="h-10 bg-white border-t border-slate-200 px-4 flex items-center justify-between text-[12px] text-[#677484] shrink-0">
            <div className="flex items-center gap-3">
              <span>
                Hiển thị{' '}
                <strong className="text-[#15171a]">
                  {rows.length === 0 ? 0 : (safePage - 1) * pageSize + 1} - {Math.min(safePage * pageSize, rows.length)}
                </strong>{' '}
                trên <strong className="text-[#15171a]">{rows.length}</strong> hóa đơn
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

      {/* 3. Thao tác hàng loạt */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#15171a] text-white rounded-xl shadow-2xl px-4 py-2.5 flex items-center gap-3 text-[13px]">
          <span>
            <strong>{selectedIds.length}</strong> hóa đơn đã chọn
          </span>
          <button
            type="button"
            onClick={() => handleExport(rows.filter((r) => selectedIds.includes(r.orderId)))}
            className="inline-flex items-center gap-1 px-2.5 h-7 rounded-[6px] bg-white/10 hover:bg-white/20 cursor-pointer"
          >
            <FileDown size={13} /> Xuất file
          </button>
          <button type="button" onClick={() => setSelectedIds([])} className="p-1 rounded hover:bg-white/10 cursor-pointer" title="Bỏ chọn">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
