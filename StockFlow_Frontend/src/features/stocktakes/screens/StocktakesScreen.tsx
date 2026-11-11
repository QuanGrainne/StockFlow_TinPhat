'use client';

// Danh sách phiếu kiểm kho (KiotViet "Phiếu kiểm kho"): lọc kho / thời gian / trạng thái,
// xem chi tiết dưới dòng, gộp nhiều phiếu tạm, hủy, sao chép, in, xuất file.

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { linkDateFilter, readDocumentLink, scrollToWhenReady } from '@/lib/navigation/documentLink';
import { message } from 'antd';
import { StarFilled, StarOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import { AlertTriangle, Copy, FileDown, Inbox, Layers, Pencil, Plus, Printer, RefreshCcw, Search, Trash2, X } from 'lucide-react';
import PurchaseFilterSidebar from '@/components/PurchaseFilterSidebar';
import type { PurchaseFilterState } from '@/features/purchases/screens/PurchasesScreen';
import { useActiveWarehouse } from '@/lib/warehouse/useActiveWarehouse';
import { getDateRangeForPreset } from '@/features/transfers/utils/dateUtils';
import { stocktakeService } from '@/features/stocktakes/services/stocktakeService';
import type { StocktakeDetail, StocktakeStatus, StocktakeSummary } from '@/features/stocktakes/types';
import { ProductCodeLink } from '@/components/links/EntityLinks';
import { exportStocktakeExcel, printStocktake, STOCKTAKE_STATUS_LABEL } from '@/features/stocktakes/utils/stocktakeDocs';

const money = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });
const qty = (n: number) => n.toLocaleString('vi-VN', { maximumFractionDigits: 3 });
const STATUS_MAP: Record<string, StocktakeStatus> = { draft: 'DRAFT', completed: 'BALANCED', canceled: 'CANCELLED' };
const FAVORITES_KEY = 'stockflow_stocktake_favorites';

function formatDateTimeVN(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

const STATUS_CLS: Record<StocktakeStatus, string> = {
  DRAFT: 'bg-[#fffbeb] text-[#d97706] border-[#fde68a]',
  BALANCED: 'bg-[#e6f8ec] text-[#16a34a] border-[#bbf7d0]',
  CANCELLED: 'bg-[#fef2f2] text-[#fb2c36] border-[#fecaca]',
};

function StatusTag({ status }: { status: StocktakeStatus }) {
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap ${STATUS_CLS[status]}`}>
      {STOCKTAKE_STATUS_LABEL[status] ?? status}
    </span>
  );
}

const signed = (n: number) => (n > 0 ? `+${qty(n)}` : qty(n));

interface MergePreviewRow {
  productId: number;
  productCode: string;
  productName: string;
  systemQty: number;
  actualQty: number;
}

export default function StocktakesScreen() {
  const router = useRouter();
  const { activeWarehouse, warehouses } = useActiveWarehouse();

  // Link mở thẳng 1 phiếu (?code=&id=&date=&wh=, VD từ Thẻ kho)
  const searchParams = useSearchParams();
  const [docLink] = useState(() => readDocumentLink(searchParams));

  const [query, setQuery] = useState(() => docLink?.code ?? '');
  const [reloadTick, setReloadTick] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<number[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(() => docLink?.id ?? null);
  const [details, setDetails] = useState<Record<number, StocktakeDetail>>({});
  const [itemSearch, setItemSearch] = useState({ code: '', name: '' });
  const [cancelling, setCancelling] = useState<StocktakeSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [mergePreview, setMergePreview] = useState<MergePreviewRow[] | null>(null);
  const [mergeConfirm, setMergeConfirm] = useState(false);

  const [favorites, setFavorites] = useState<number[]>(() => {
    try {
      const raw = localStorage.getItem(FAVORITES_KEY);
      return raw ? (JSON.parse(raw) as number[]) : [];
    } catch {
      return [];
    }
  });

  const [filterState, setFilterState] = useState<PurchaseFilterState>(() => {
    const range = getDateRangeForPreset('this_month');
    if (docLink) return { statuses: ['draft', 'completed', 'canceled'], ...linkDateFilter(docLink.date) };
    return { statuses: ['draft', 'completed'], timeRange: 'this_month', dateFrom: range.from, dateTo: range.to, periodLabel: 'Tháng này' };
  });

  const activeWarehouseId = activeWarehouse?.warehouseId;
  // Không lọc chi nhánh trên màn này: luôn xem phiếu kiểm của Kho làm việc
  // (mở từ link thì xem đúng chi nhánh của phiếu đó)
  const warehouseIds = docLink?.warehouseId ? [docLink.warehouseId] : activeWarehouseId ? [activeWarehouseId] : [];

  const requestKey = JSON.stringify({
    warehouseIds,
    statuses: filterState.statuses.map((s) => STATUS_MAP[s]).filter(Boolean),
    fromDate: filterState.dateFrom,
    toDate: filterState.dateTo,
    reloadTick,
  });
  const [result, setResult] = useState<{ key: string; data: StocktakeSummary[] }>({ key: '', data: [] });
  const loading = result.key !== requestKey;

  useEffect(() => {
    let stale = false;
    const params = JSON.parse(requestKey) as { warehouseIds: number[]; statuses: string[]; fromDate?: string; toDate?: string };
    stocktakeService
      .getList(params)
      .then((data) => {
        if (!stale) setResult({ key: requestKey, data });
      })
      .catch((err: unknown) => {
        if (stale) return;
        message.error(err instanceof Error ? err.message : 'Không thể tải danh sách phiếu kiểm kho');
        setResult({ key: requestKey, data: [] });
      });
    return () => {
      stale = true;
    };
  }, [requestKey]);

  const filtered = useMemo(() => {
    if (filterState.statuses.length === 0) return [];
    const q = query.trim().toLowerCase();
    if (!q) return result.data;
    return result.data.filter((r) => r.stocktakeCode.toLowerCase().includes(q) || (r.notes ?? '').toLowerCase().includes(q));
  }, [result.data, query, filterState.statuses.length]);

  const reload = () => {
    setDetails({});
    setReloadTick((t) => t + 1);
  };

  async function loadDetail(id: number): Promise<StocktakeDetail | null> {
    if (details[id]) return details[id];
    try {
      const d = await stocktakeService.getById(id);
      setDetails((prev) => ({ ...prev, [id]: d }));
      return d;
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không tải được chi tiết phiếu kiểm');
      return null;
    }
  }

  // Mở thẳng phiếu theo link: tải chi tiết + cuộn tới dòng
  useEffect(() => {
    const linkedId = docLink?.id;
    if (!linkedId) return;
    let cancelled = false;
    stocktakeService
      .getById(linkedId)
      .then((d) => {
        if (!cancelled) setDetails((prev) => ({ ...prev, [linkedId]: d }));
      })
      .catch(() => {
        if (!cancelled) message.error(`Không tải được phiếu kiểm ${docLink.code}`);
      });
    const stopScroll = scrollToWhenReady(`[data-doc-row="${linkedId}"]`);
    return () => {
      cancelled = true;
      stopScroll();
    };
  }, [docLink]);

  function toggleExpand(r: StocktakeSummary) {
    if (expandedId === r.stocktakeId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(r.stocktakeId);
    setItemSearch({ code: '', name: '' });
    void loadDetail(r.stocktakeId);
  }

  function toggleFavorite(id: number) {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id];
      try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      } catch {
        // tiện ích hiển thị, bỏ qua
      }
      return next;
    });
  }

  // ─── Gộp phiếu ─────────────────────────────────────────────────────────────
  const selectedRecords = filtered.filter((r) => selectedKeys.includes(r.stocktakeId));
  const mergeError =
    selectedRecords.some((r) => r.status !== 'DRAFT')
      ? 'Chỉ gộp được các phiếu ở trạng thái Phiếu tạm.'
      : new Set(selectedRecords.map((r) => r.warehouseId)).size > 1
        ? 'Chỉ gộp được các phiếu của cùng một kho.'
        : null;

  async function openMerge() {
    if (mergeError) {
      message.warning(mergeError);
      return;
    }
    setBusy(true);
    try {
      const all = await Promise.all(selectedRecords.map((r) => loadDetail(r.stocktakeId)));
      const map = new Map<number, MergePreviewRow>();
      for (const d of all) {
        for (const it of d?.items ?? []) {
          const row = map.get(it.productId);
          if (row) row.actualQty += it.actualQty;
          else map.set(it.productId, { ...it, actualQty: it.actualQty });
        }
      }
      setMergePreview(Array.from(map.values()));
    } finally {
      setBusy(false);
    }
  }

  async function doMerge() {
    setBusy(true);
    try {
      const merged = await stocktakeService.merge(selectedRecords.map((r) => r.stocktakeId));
      message.success(`Đã gộp thành phiếu ${merged.summary.stocktakeCode}`);
      setMergeConfirm(false);
      setMergePreview(null);
      setSelectedKeys([]);
      reload();
      setExpandedId(merged.summary.stocktakeId);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không gộp được phiếu kiểm kho');
    } finally {
      setBusy(false);
    }
  }

  async function doCancel() {
    if (!cancelling) return;
    setBusy(true);
    try {
      await stocktakeService.cancel(cancelling.stocktakeId);
      message.success(`Đã hủy phiếu ${cancelling.stocktakeCode}`);
      setCancelling(null);
      reload();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không hủy được phiếu kiểm kho');
    } finally {
      setBusy(false);
    }
  }

  function exportList() {
    const rows = filtered.map((r) => ({
      'Mã kiểm kho': r.stocktakeCode,
      'Thời gian': formatDateTimeVN(r.stocktakeDate),
      'Kho': r.warehouseName,
      'Tổng thực tế': r.totalActualValue,
      'Tổng chênh lệch': r.totalDiscrepancyQty,
      'SL lệch tăng': r.increaseQty,
      'SL lệch giảm': r.decreaseQty,
      'Ngày cân bằng': formatDateTimeVN(r.balancedDate),
      'SL thực tế': r.totalActualQty,
      'Ghi chú': r.notes ?? '',
      'Trạng thái': STOCKTAKE_STATUS_LABEL[r.status],
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'KiemKho');
    XLSX.writeFile(wb, `DanhSachKiemKho_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  const th = 'sticky top-0 z-20 bg-[#f7f8f9] py-2.5 px-3 border-b border-slate-200 whitespace-nowrap';
  const allChecked = filtered.length > 0 && filtered.every((r) => selectedKeys.includes(r.stocktakeId));
  const mergeTotals = mergePreview
    ? mergePreview.reduce(
        (acc, r) => {
          const diff = r.actualQty - r.systemQty;
          return {
            actual: acc.actual + r.actualQty,
            inc: acc.inc + (diff > 0 ? diff : 0),
            dec: acc.dec + (diff < 0 ? diff : 0),
            diff: acc.diff + diff,
          };
        },
        { actual: 0, inc: 0, dec: 0, diff: 0 }
      )
    : null;

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col bg-[#f5f5f5] overflow-hidden select-none text-[13px] text-[#15171a] font-sans">
      {/* 1. Header */}
      <header className="min-h-12 bg-white border-b border-slate-200 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 shrink-0">
        <div className="flex items-center gap-4 flex-1 basis-[320px] min-w-[260px] max-w-xl">
          <h1 className="text-[20px] font-bold leading-7 tracking-tight whitespace-nowrap">Phiếu kiểm kho</h1>
          <div className="relative flex-1">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#677484] pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Theo mã phiếu kiểm, ghi chú"
              className="w-full h-8 pl-8 pr-3 rounded-full bg-[#f7f8f9] border border-slate-200 text-[13px] placeholder-[#677484] focus:outline-none focus:border-[#0070f4] focus:bg-white transition"
            />
          </div>
          {selectedKeys.length > 0 && (
            <span className="inline-flex items-center gap-1.5 text-[13px] whitespace-nowrap">
              Đã chọn {selectedKeys.length}
              <button type="button" onClick={() => setSelectedKeys([])} className="text-[#677484] hover:text-[#15171a] cursor-pointer" title="Bỏ chọn">
                <X size={14} />
              </button>
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedKeys.length >= 2 ? (
            <button
              type="button"
              disabled={busy}
              onClick={openMerge}
              title={mergeError ?? 'Gộp các phiếu tạm đã chọn thành 1 phiếu'}
              className="inline-flex items-center gap-1.5 px-3 h-8 rounded-[8px] border border-slate-300 hover:bg-[#f7f8f9] font-medium text-[13px] bg-white cursor-pointer disabled:opacity-60"
            >
              <Layers size={14} className="text-[#677484]" />
              <span>Gộp phiếu</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => router.push('/stocktakes/create')}
                className="inline-flex items-center gap-1.5 px-3.5 h-8 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white font-semibold text-[13px] shadow-xs transition cursor-pointer"
              >
                <Plus size={15} className="stroke-[2.5]" />
                <span>Kiểm kho</span>
              </button>
              <button
                type="button"
                onClick={exportList}
                className="inline-flex items-center gap-1 px-3 h-8 rounded-[8px] border border-slate-300 hover:bg-[#f7f8f9] font-medium text-[13px] bg-white cursor-pointer"
              >
                <FileDown size={14} className="text-[#677484]" />
                <span>Xuất file</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* 2. Sidebar lọc + bảng */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        <div className="relative shrink-0 h-full flex">
          <PurchaseFilterSidebar
            state={filterState}
            onChange={(patch) => setFilterState((prev) => ({ ...prev, ...patch }))}
            isCollapsed={sidebarCollapsed}
            warehouses={warehouses}
            activeWarehouse={activeWarehouse}
            statusLabels={{ completed: 'Đã cân bằng kho' }}
            hideSupplierFilter
            hideWarehouseFilter
          />
          <button
            type="button"
            onClick={() => setSidebarCollapsed((v) => !v)}
            className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white border border-[#0070f4] text-[#0070f4] hover:bg-[#e6f1fe] shadow-xs flex items-center justify-center cursor-pointer z-30 text-[11px]"
            title={sidebarCollapsed ? 'Mở rộng bộ lọc' : 'Thu gọn bộ lọc'}
          >
            {sidebarCollapsed ? '›' : '‹'}
          </button>
        </div>

        <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden bg-white">
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-left border-collapse min-w-[1100px]">
              <thead className="text-[12px] font-semibold text-[#677484]">
                <tr>
                  <th className={`${th} w-10 text-center`}>
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={(e) => setSelectedKeys(e.target.checked ? filtered.map((r) => r.stocktakeId) : [])}
                      className="rounded h-3.5 w-3.5 border-slate-300 cursor-pointer"
                    />
                  </th>
                  <th className={`${th} w-8`} />
                  <th className={th}>Mã kiểm kho</th>
                  <th className={th}>Thời gian</th>
                  <th className={`${th} text-right`}>Tổng thực tế</th>
                  <th className={`${th} text-right`}>Tổng chênh lệch</th>
                  <th className={`${th} text-right`}>SL lệch tăng</th>
                  <th className={`${th} text-right`}>SL lệch giảm</th>
                  <th className={th}>Ngày cân bằng</th>
                  <th className={`${th} text-right`}>SL thực tế</th>
                  <th className={th}>Ghi chú</th>
                  <th className={`${th} text-center`}>Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={12} className="py-20 text-center text-[#677484]">
                      <RefreshCcw size={18} className="animate-spin mx-auto mb-2 text-[#0070f4]" />
                      Đang tải phiếu kiểm kho...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-24 text-center text-[#677484]">
                      <Inbox size={28} className="mx-auto mb-2 text-[#0070f4]" />
                      Không tìm thấy phiếu kiểm kho nào phù hợp
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => {
                    const isExpanded = expandedId === r.stocktakeId;
                    const detail = details[r.stocktakeId];
                    return (
                      <React.Fragment key={r.stocktakeId}>
                        <tr
                          data-doc-row={r.stocktakeId}
                          onClick={() => toggleExpand(r)}
                          className={`cursor-pointer ${isExpanded ? 'bg-[#e6f1fe]/80' : 'hover:bg-[#f7f8f9]'}`}
                        >
                          <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedKeys.includes(r.stocktakeId)}
                              onChange={(e) =>
                                setSelectedKeys((prev) =>
                                  e.target.checked ? [...prev, r.stocktakeId] : prev.filter((k) => k !== r.stocktakeId)
                                )
                              }
                              className="rounded h-3.5 w-3.5 border-slate-300 cursor-pointer"
                            />
                          </td>
                          <td className="py-2.5 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                            <button type="button" onClick={() => toggleFavorite(r.stocktakeId)} className="text-amber-400 cursor-pointer">
                              {favorites.includes(r.stocktakeId) ? <StarFilled /> : <StarOutlined />}
                            </button>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-medium text-[#0070f4]">{r.stocktakeCode}</td>
                          <td className="py-2.5 px-3 whitespace-nowrap">{formatDateTimeVN(r.stocktakeDate)}</td>
                          <td className="py-2.5 px-3 text-right">{money.format(r.totalActualValue)}</td>
                          <td className="py-2.5 px-3 text-right">{signed(r.totalDiscrepancyQty)}</td>
                          <td className="py-2.5 px-3 text-right">{qty(r.increaseQty)}</td>
                          <td className="py-2.5 px-3 text-right">{qty(r.decreaseQty)}</td>
                          <td className="py-2.5 px-3 whitespace-nowrap">{formatDateTimeVN(r.balancedDate)}</td>
                          <td className="py-2.5 px-3 text-right">{qty(r.totalActualQty)}</td>
                          <td className="py-2.5 px-3 max-w-[240px] truncate" title={r.notes ?? ''}>
                            {r.notes}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <StatusTag status={r.status} />
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr>
                            <td colSpan={12} className="p-0 border-b-2 border-[#0070f4] bg-white">
                              <div className="px-6 py-4">
                                <div className="flex items-center gap-1 border-b border-slate-200 mb-4">
                                  <span className="px-4 py-2 text-sm border-b-2 -mb-px border-[#0070f4] text-[#0070f4] font-semibold">
                                    Thông tin
                                  </span>
                                </div>
                                {!detail ? (
                                  <div className="py-10 text-center text-xs text-slate-400">
                                    <RefreshCcw size={18} className="animate-spin mx-auto mb-2 text-[#0070f4]" />
                                    Đang tải chi tiết phiếu {r.stocktakeCode}...
                                  </div>
                                ) : (
                                  <StocktakeDetailPanel
                                    detail={detail}
                                    search={itemSearch}
                                    onSearch={setItemSearch}
                                    onCancel={() => setCancelling(r)}
                                    onCopy={() => router.push(`/stocktakes/create?copy=${r.stocktakeId}`)}
                                    onOpen={() => router.push(`/stocktakes/create?edit=${r.stocktakeId}`)}
                                  />
                                )}
                              </div>
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
          <footer className="h-10 bg-white border-t border-slate-200 px-4 flex items-center text-[12px] text-[#677484] shrink-0">
            Hiển thị <strong className="mx-1 text-[#15171a]">{filtered.length}</strong> phiếu kiểm kho
          </footer>
        </div>
      </div>

      {/* Gộp phiếu: xem trước */}
      {mergePreview && mergeTotals && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-[8px] shadow-lg max-w-3xl w-full border border-slate-200">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-[15px] font-bold">Gộp phiếu kiểm kho</h3>
              <button type="button" onClick={() => setMergePreview(null)} className="text-[#677484] hover:text-[#15171a] cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="px-5 py-4 max-h-[60vh] overflow-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-[#f7f8f9] font-semibold text-[#677484]">
                  <tr>
                    <th className="py-2 px-3">Mã hàng</th>
                    <th className="py-2 px-3">Tên hàng</th>
                    <th className="py-2 px-3 text-right">Tồn kho</th>
                    <th className="py-2 px-3 text-right">Thực tế</th>
                    <th className="py-2 px-3 text-right">SL lệch</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {mergePreview.map((row) => (
                    <tr key={row.productId}>
                      <td className="py-2 px-3 font-mono">
                        <ProductCodeLink code={row.productCode} productId={row.productId} />
                      </td>
                      <td className="py-2 px-3">{row.productName}</td>
                      <td className="py-2 px-3 text-right">{qty(row.systemQty)}</td>
                      <td className="py-2 px-3 text-right font-semibold">{qty(row.actualQty)}</td>
                      <td className="py-2 px-3 text-right">{signed(row.actualQty - row.systemQty)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 mt-4 text-xs max-w-md ml-auto">
                <div className="flex justify-between"><span className="text-[#677484]">SL lệch tăng:</span><b>{qty(mergeTotals.inc)}</b></div>
                <div className="flex justify-between"><span className="text-[#677484]">SL lệch giảm:</span><b>{qty(mergeTotals.dec)}</b></div>
                <div className="flex justify-between"><span className="text-[#677484]">Tổng SL thực tế:</span><b>{qty(mergeTotals.actual)}</b></div>
                <div className="flex justify-between"><span className="text-[#677484]">Tổng chênh lệch:</span><b>{signed(mergeTotals.diff)}</b></div>
              </div>
              <p className="mt-3 text-[11px] text-[#677484]">
                Tồn kho được lấy lại theo thời điểm gộp. SL thực tế của cùng một hàng trên các phiếu được cộng dồn.
              </p>
            </div>
            <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2">
              <button type="button" onClick={() => setMergePreview(null)} className="px-4 h-8 text-xs rounded-[8px] border border-slate-300 bg-white hover:bg-[#f7f8f9] cursor-pointer">
                Bỏ qua
              </button>
              <button type="button" onClick={() => setMergeConfirm(true)} className="px-4 h-8 text-xs rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white font-semibold cursor-pointer">
                Gộp phiếu
              </button>
            </div>
          </div>
        </div>
      )}

      {mergeConfirm && (
        <ConfirmModal
          title="Gộp phiếu kiểm kho"
          message="Hệ thống sẽ gộp thành phiếu tạm mới và hủy các phiếu cũ đã gộp. Bạn có chắc chắn muốn Gộp phiếu không?"
          busy={busy}
          onCancel={() => setMergeConfirm(false)}
          onConfirm={doMerge}
        />
      )}

      {cancelling && (
        <ConfirmModal
          title="Hủy phiếu kiểm kho"
          danger
          message={
            cancelling.status === 'BALANCED'
              ? `Phiếu ${cancelling.stocktakeCode} đã cân bằng kho. Hủy phiếu sẽ đảo lại tồn kho về như trước khi cân bằng. Bạn có chắc chắn muốn hủy?`
              : `Bạn có chắc chắn muốn hủy phiếu ${cancelling.stocktakeCode}?`
          }
          busy={busy}
          onCancel={() => setCancelling(null)}
          onConfirm={doCancel}
        />
      )}
    </div>
  );
}

function ConfirmModal({
  title,
  message: text,
  busy,
  danger,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  busy: boolean;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-[8px] shadow-lg max-w-md w-full border border-slate-200">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-[15px] font-bold">{title}</h3>
          <button type="button" onClick={onCancel} className="text-[#677484] hover:text-[#15171a] cursor-pointer">
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4 text-[13px] flex items-start gap-2.5">
          {danger && <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />}
          <span>{text}</span>
        </div>
        <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="px-4 h-8 text-xs rounded-[8px] border border-slate-300 bg-white hover:bg-[#f7f8f9] cursor-pointer">
            Bỏ qua
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={`px-4 h-8 text-xs rounded-[8px] text-white font-semibold cursor-pointer disabled:opacity-60 ${
              danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-[#0070f4] hover:bg-[#005ac3]'
            }`}
          >
            {busy ? 'Đang xử lý...' : 'Đồng ý'}
          </button>
        </div>
      </div>
    </div>
  );
}

function StocktakeDetailPanel({
  detail,
  search,
  onSearch,
  onCancel,
  onCopy,
  onOpen,
}: {
  detail: StocktakeDetail;
  search: { code: string; name: string };
  onSearch: (s: { code: string; name: string }) => void;
  onCancel: () => void;
  onCopy: () => void;
  onOpen: () => void;
}) {
  const s = detail.summary;
  const items = detail.items.filter(
    (it) =>
      (!search.code.trim() || it.productCode.toLowerCase().includes(search.code.trim().toLowerCase())) &&
      (!search.name.trim() || it.productName.toLowerCase().includes(search.name.trim().toLowerCase()))
  );

  return (
    <>
      <div className="mb-4">
        <div className="flex items-center gap-2.5 mb-2">
          <span className="text-base font-bold font-mono">{s.stocktakeCode}</span>
          <StatusTag status={s.status} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-1.5 text-xs text-slate-600">
          <div>
            <span className="text-slate-400">Người tạo: </span>
            <span className="font-medium text-slate-800">{s.createdByName}</span>
          </div>
          <div>
            <span className="text-slate-400">Ngày tạo: </span>
            <span className="font-medium text-slate-800">{formatDateTimeVN(s.stocktakeDate)}</span>
          </div>
          <div>
            <span className="text-slate-400">Kho kiểm: </span>
            <span className="font-semibold text-slate-800">{s.warehouseName}</span>
          </div>
          <div>
            <span className="text-slate-400">Người cân bằng: </span>
            <span className="font-medium text-slate-800">{s.balancedByName || <span className="text-slate-400">Chưa có</span>}</span>
          </div>
          <div>
            <span className="text-slate-400">Ngày cân bằng: </span>
            <span className="font-medium text-slate-800">
              {formatDateTimeVN(s.balancedDate) || <span className="text-slate-400">Chưa có</span>}
            </span>
          </div>
        </div>
      </div>

      <div className="border border-slate-200 rounded-[8px] overflow-x-auto mb-3">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-[#f7f8f9] border-b border-slate-200 font-semibold text-[#677484]">
            <tr>
              <th className="py-2 px-3 w-10 text-center">STT</th>
              <th className="py-2 px-3 w-36">Mã hàng</th>
              <th className="py-2 px-3">Tên hàng</th>
              <th className="py-2 px-3 w-16 text-center">ĐVT</th>
              <th className="py-2 px-3 w-24 text-right">Tồn kho</th>
              <th className="py-2 px-3 w-24 text-right">Thực tế</th>
              <th className="py-2 px-3 w-24 text-right">SL lệch</th>
              <th className="py-2 px-3 w-28 text-right">Giá trị lệch</th>
            </tr>
            <tr className="bg-white border-t border-slate-200">
              <th />
              <th className="py-1.5 px-3">
                <input
                  value={search.code}
                  onChange={(e) => onSearch({ ...search, code: e.target.value })}
                  placeholder="Tìm mã hàng"
                  className="w-full h-7 px-2 text-xs font-normal border border-slate-300 rounded-[6px] focus:outline-none focus:border-[#0070f4]"
                />
              </th>
              <th className="py-1.5 px-3">
                <input
                  value={search.name}
                  onChange={(e) => onSearch({ ...search, name: e.target.value })}
                  placeholder="Tìm tên hàng"
                  className="w-full h-7 px-2 text-xs font-normal border border-slate-300 rounded-[6px] focus:outline-none focus:border-[#0070f4]"
                />
              </th>
              <th colSpan={5} />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((it, i) => (
              <tr key={it.stocktakeItemId}>
                <td className="py-2 px-3 text-center text-slate-400">{i + 1}</td>
                <td className="py-2 px-3 font-mono font-semibold">
                  <ProductCodeLink code={it.productCode} productId={it.productId} />
                </td>
                <td className="py-2 px-3 font-medium">{it.productName}</td>
                <td className="py-2 px-3 text-center text-slate-500">{it.unit}</td>
                <td className="py-2 px-3 text-right">{qty(it.systemQty)}</td>
                <td className="py-2 px-3 text-right font-semibold">{qty(it.actualQty)}</td>
                <td className={`py-2 px-3 text-right ${it.discrepancy < 0 ? 'text-[#fb2c36]' : it.discrepancy > 0 ? 'text-[#16a34a]' : ''}`}>
                  {signed(it.discrepancy)}
                </td>
                <td className="py-2 px-3 text-right">{money.format(it.discrepancyValue)}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={8} className="py-6 text-center text-slate-400">
                  Không có mặt hàng nào phù hợp
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col md:flex-row items-start gap-6 mb-4">
        <div className="flex-1 w-full">
          <label className="text-xs text-slate-500 font-medium block mb-1">Ghi chú</label>
          <div className="p-2.5 text-xs border border-slate-200 rounded-[8px] bg-slate-50/60 min-h-[60px] text-slate-700">
            {s.notes || 'Chưa có ghi chú'}
          </div>
        </div>
        <div className="w-full md:w-80 shrink-0 space-y-1.5 text-xs bg-slate-50/60 p-3 rounded-[8px] border border-slate-200">
          <div className="flex justify-between text-slate-600">
            <span>Tổng thực tế ({qty(s.totalActualQty)}):</span>
            <span className="font-semibold text-slate-800">{money.format(s.totalActualValue)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Tổng lệch tăng ({qty(s.increaseQty)}):</span>
            <span className="font-semibold text-[#16a34a]">{money.format(s.increaseValue)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Tổng lệch giảm ({qty(s.decreaseQty)}):</span>
            <span className="font-semibold text-[#fb2c36]">{money.format(s.decreaseValue)}</span>
          </div>
          <div className="flex justify-between text-slate-700 border-t border-slate-200 pt-1.5 font-bold">
            <span>Tổng chênh lệch ({signed(s.totalDiscrepancyQty)}):</span>
            <span>{money.format(s.totalDiscrepancyValue)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <div className="flex items-center gap-2">
          {s.status !== 'CANCELLED' && (
            <button
              type="button"
              onClick={onCancel}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-[8px] border border-rose-200 bg-white cursor-pointer"
            >
              <Trash2 size={13} />
              <span>Hủy</span>
            </button>
          )}
          <button
            type="button"
            onClick={onCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs hover:bg-[#f7f8f9] rounded-[8px] border border-slate-300 bg-white cursor-pointer"
          >
            <Copy size={13} />
            <span>Sao chép</span>
          </button>
          <button
            type="button"
            onClick={() => exportStocktakeExcel(detail)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs hover:bg-[#f7f8f9] rounded-[8px] border border-slate-300 bg-white cursor-pointer"
          >
            <FileDown size={13} />
            <span>Xuất file</span>
          </button>
        </div>
        <div className="flex items-center gap-2">
          {s.status === 'DRAFT' && (
            <button
              type="button"
              onClick={onOpen}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs bg-[#0070f4] hover:bg-[#005ac3] text-white rounded-[8px] font-semibold cursor-pointer"
            >
              <Pencil size={13} />
              <span>Mở phiếu</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => printStocktake(detail)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-700 hover:bg-[#f7f8f9] rounded-[8px] border border-slate-300 bg-white cursor-pointer"
          >
            <Printer size={13} />
            <span>In</span>
          </button>
        </div>
      </div>
    </>
  );
}
