'use client';

// Danh sách phiếu xuất hủy (cùng bố cục màn Phiếu kiểm kho / Nhập hàng):
// Header (tìm mã phiếu, + Xuất hủy, Xuất file, tùy chỉnh cột) → [Bộ lọc: Chi nhánh, Trạng thái, Thời gian | Bảng]
// Bấm 1 dòng → mở rộng chi tiết phiếu ngay dưới dòng (DisposalDetailPanel: Hủy, Sao chép, Xuất file, Lưu, In).

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { message } from 'antd';
import { FileDown, Inbox, Plus, RefreshCcw, Search } from 'lucide-react';
import { linkDateFilter, readDocumentLink, scrollToWhenReady } from '@/lib/navigation/documentLink';
import { PurchaseFilterSidebar } from '@/features/purchases';
import type { PurchaseFilterState } from '@/features/purchases/types';
import { useActiveWarehouse } from '@/lib/warehouse/useActiveWarehouse';
import { getDateRangeForPreset } from '@/lib/utils/date';
import { disposalService } from '../services/disposalService';
import { exportDisposalListExcel } from '../utils/disposalDocs';
import type { DisposalDetail, DisposalStatus, DisposalSummary } from '../types';
import { DisposalDetailPanel, DisposalStatusTag } from '../components/DisposalDetailPanel';
import {
  DisposalColumnSettings,
  loadDisposalColumns,
  type DisposalColumnKey,
} from '../components/DisposalColumnSettings';

const money = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });
const qty = (n: number) => n.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
/** Trạng thái của bộ lọc dùng chung → trạng thái phiếu xuất hủy */
const STATUS_MAP: Record<string, DisposalStatus> = { draft: 'DRAFT', completed: 'COMPLETED', canceled: 'CANCELLED' };

function formatDateTimeVN(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Định nghĩa từng cột (ngoài cột Mã xuất hủy luôn hiện) */
const COLUMN_DEFS: Record<
  DisposalColumnKey,
  { label: string; align?: 'right' | 'center'; cell: (r: DisposalSummary) => React.ReactNode; total?: (rows: DisposalSummary[]) => string }
> = {
  totalValue: {
    label: 'Tổng giá trị hủy',
    align: 'right',
    cell: (r) => money.format(r.totalValue),
    total: (rows) => money.format(rows.filter((r) => r.status !== 'CANCELLED').reduce((s, r) => s + r.totalValue, 0)),
  },
  time: { label: 'Thời gian', cell: (r) => <span className="whitespace-nowrap">{formatDateTimeVN(r.disposalDate)}</span> },
  warehouse: { label: 'Chi nhánh', cell: (r) => <span className="whitespace-nowrap">{r.warehouseName}</span> },
  notes: {
    label: 'Ghi chú',
    cell: (r) => (
      <span className="block max-w-[260px] truncate" title={r.reason ?? ''}>
        {r.reason}
      </span>
    ),
  },
  status: { label: 'Trạng thái', align: 'center', cell: (r) => <DisposalStatusTag status={r.status} /> },
  totalQty: {
    label: 'Tổng SL hủy',
    align: 'right',
    cell: (r) => qty(r.totalQuantity),
    total: (rows) => qty(rows.filter((r) => r.status !== 'CANCELLED').reduce((s, r) => s + r.totalQuantity, 0)),
  },
  itemCount: { label: 'Số mặt hàng', align: 'right', cell: (r) => r.itemCount },
  createdBy: { label: 'Người tạo', cell: (r) => <span className="whitespace-nowrap">{r.createdByName}</span> },
  processedBy: { label: 'Người xuất hủy', cell: (r) => <span className="whitespace-nowrap">{r.processedByName}</span> },
};

export default function DisposalsScreen() {
  const router = useRouter();
  const { activeWarehouse, warehouses } = useActiveWarehouse();

  // Link mở thẳng 1 phiếu (?code=&id=&date=&wh=, VD từ Thẻ kho)
  const searchParams = useSearchParams();
  const [docLink] = useState(() => readDocumentLink(searchParams));

  const [query, setQuery] = useState(() => docLink?.code ?? '');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(() => docLink?.id ?? null);
  const [details, setDetails] = useState<Record<number, DisposalDetail>>({});
  const [columns, setColumns] = useState<DisposalColumnKey[]>(loadDisposalColumns);
  const [reloadTick, setReloadTick] = useState(0);

  // Chi nhánh: chưa chọn = Kho làm việc; [] = tất cả kho được phân quyền
  const [filterState, setFilterState] = useState<PurchaseFilterState>(() => {
    const range = getDateRangeForPreset('this_month');
    if (docLink) {
      return {
        statuses: ['draft', 'completed', 'canceled'],
        warehouseIds: docLink.warehouseId ? [docLink.warehouseId] : [],
        ...linkDateFilter(docLink.date),
      };
    }
    return { statuses: ['draft', 'completed'], timeRange: 'this_month', dateFrom: range.from, dateTo: range.to, periodLabel: 'Tháng này' };
  });

  const activeWarehouseId = activeWarehouse?.warehouseId;
  const warehouseIds =
    filterState.warehouseIds !== undefined ? filterState.warehouseIds : activeWarehouseId ? [activeWarehouseId] : [];

  const requestKey = JSON.stringify({
    warehouseIds,
    statuses: filterState.statuses.map((s) => STATUS_MAP[s]).filter(Boolean),
    fromDate: filterState.dateFrom,
    toDate: filterState.dateTo,
    reloadTick,
  });
  const [result, setResult] = useState<{ key: string; data: DisposalSummary[] }>({ key: '', data: [] });
  const loading = result.key !== requestKey;

  useEffect(() => {
    let stale = false;
    const params = JSON.parse(requestKey) as { warehouseIds: number[]; statuses: string[]; fromDate?: string; toDate?: string };
    disposalService
      .getList(params)
      .then((data) => {
        if (!stale) setResult({ key: requestKey, data });
      })
      .catch((err: unknown) => {
        if (stale) return;
        message.error(err instanceof Error ? err.message : 'Không thể tải danh sách phiếu xuất hủy');
        setResult({ key: requestKey, data: [] });
      });
    return () => {
      stale = true;
    };
  }, [requestKey]);

  // Mở thẳng phiếu theo link: tải chi tiết + cuộn tới dòng
  useEffect(() => {
    const linkedId = docLink?.id;
    if (!linkedId) return;
    let cancelled = false;
    disposalService
      .getById(linkedId)
      .then((d) => {
        if (!cancelled) setDetails((prev) => ({ ...prev, [linkedId]: d }));
      })
      .catch(() => {
        if (!cancelled) message.error(`Không tải được phiếu xuất hủy ${docLink.code}`);
      });
    const stopScroll = scrollToWhenReady(`[data-doc-row="${linkedId}"]`);
    return () => {
      cancelled = true;
      stopScroll();
    };
  }, [docLink]);

  const filtered = useMemo(() => {
    // Bỏ tick hết trạng thái = không hiện phiếu nào
    if (filterState.statuses.length === 0) return [];
    const q = query.trim().toLowerCase();
    if (!q) return result.data;
    return result.data.filter((r) => r.disposalCode.toLowerCase().includes(q) || (r.reason ?? '').toLowerCase().includes(q));
  }, [result.data, query, filterState.statuses.length]);

  function toggleExpand(r: DisposalSummary) {
    if (expandedId === r.disposalId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(r.disposalId);
    if (details[r.disposalId]) return;
    disposalService
      .getById(r.disposalId)
      .then((d) => setDetails((prev) => ({ ...prev, [r.disposalId]: d })))
      .catch((err: unknown) => message.error(err instanceof Error ? err.message : 'Không tải được chi tiết phiếu xuất hủy'));
  }

  /** Sau Lưu / Hủy ở chi tiết: cập nhật chi tiết đang mở và tải lại danh sách */
  function handleChanged(d: DisposalDetail) {
    setDetails((prev) => ({ ...prev, [d.summary.disposalId]: d }));
    setReloadTick((t) => t + 1);
  }

  const th = 'sticky top-0 z-20 bg-[#f7f8f9] py-2.5 px-3 border-b border-slate-200 whitespace-nowrap';
  const alignCls = (a?: 'right' | 'center') => (a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : '');
  const colSpan = columns.length + 1;
  const hasTotals = columns.some((c) => COLUMN_DEFS[c].total);

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col bg-transparent overflow-hidden select-none text-[13px] text-[#15171a] font-sans">
      {/* 1. Header */}
      <header className="min-h-12 bg-white/84 backdrop-blur-[2px] border-b border-slate-200 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 shrink-0">
        <div className="flex items-center gap-4 flex-1 basis-[320px] min-w-[260px] max-w-xl">
          <h1 className="text-[20px] font-bold leading-7 tracking-tight whitespace-nowrap">Xuất hủy</h1>
          <div className="relative flex-1">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#677484] pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Theo mã xuất hủy"
              className="w-full h-8 pl-8 pr-3 rounded-full bg-[#f7f8f9] border border-slate-200 text-[13px] placeholder-[#677484] focus:outline-none focus:border-[#0070f4] focus:bg-white transition"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => router.push('/disposals/create')}
            className="inline-flex items-center gap-1.5 px-3.5 h-8 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white font-semibold text-[13px] shadow-xs transition cursor-pointer"
          >
            <Plus size={15} className="stroke-[2.5]" />
            <span>Xuất hủy</span>
          </button>
          <button
            type="button"
            onClick={() => exportDisposalListExcel(filtered)}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-1 px-3 h-8 rounded-[8px] border border-slate-300 hover:bg-[#f7f8f9] font-medium text-[13px] bg-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileDown size={14} className="text-[#677484]" />
            <span>Xuất file</span>
          </button>
          <DisposalColumnSettings value={columns} onChange={setColumns} />
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
            statusLabels={{ completed: 'Hoàn thành' }}
            hideSupplierFilter
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

        <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden bg-white/62">
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead className="text-[12px] font-semibold text-[#677484]">
                <tr>
                  <th className={th}>Mã xuất hủy</th>
                  {columns.map((c) => (
                    <th key={c} className={`${th} ${alignCls(COLUMN_DEFS[c].align)}`}>
                      {COLUMN_DEFS[c].label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* Dòng tổng (không tính phiếu đã hủy) */}
                {!loading && filtered.length > 0 && hasTotals && (
                  <tr className="bg-white/75 font-bold">
                    <td />
                    {columns.map((c) => (
                      <td key={c} className={`py-2.5 px-3 ${alignCls(COLUMN_DEFS[c].align)}`}>
                        {COLUMN_DEFS[c].total?.(filtered) ?? ''}
                      </td>
                    ))}
                  </tr>
                )}
                {loading ? (
                  <tr>
                    <td colSpan={colSpan} className="py-20 text-center text-[#677484]">
                      <RefreshCcw size={18} className="animate-spin mx-auto mb-2 text-[#0070f4]" />
                      Đang tải phiếu xuất hủy...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={colSpan} className="py-24 text-center text-[#677484]">
                      <Inbox size={28} className="mx-auto mb-2 text-[#0070f4]" />
                      Không tìm thấy phiếu xuất hủy nào phù hợp
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => {
                    const isExpanded = expandedId === r.disposalId;
                    const detail = details[r.disposalId];
                    return (
                      <React.Fragment key={r.disposalId}>
                        <tr
                          data-doc-row={r.disposalId}
                          onClick={() => toggleExpand(r)}
                          className={`cursor-pointer ${isExpanded ? 'bg-[#e6f1fe]/80' : 'hover:bg-[#f7f8f9]'}`}
                        >
                          <td className="py-2.5 px-3 font-mono font-medium text-[#0070f4] whitespace-nowrap">{r.disposalCode}</td>
                          {columns.map((c) => (
                            <td key={c} className={`py-2.5 px-3 ${alignCls(COLUMN_DEFS[c].align)}`}>
                              {COLUMN_DEFS[c].cell(r)}
                            </td>
                          ))}
                        </tr>

                        {isExpanded && (
                          <tr>
                            <td colSpan={colSpan} className="p-0 border-b-2 border-[#0070f4] bg-white">
                              <div className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center gap-1 border-b border-slate-200 mb-4">
                                  <span className="px-4 py-2 text-sm border-b-2 -mb-px border-[#0070f4] text-[#0070f4] font-semibold">
                                    Thông tin
                                  </span>
                                </div>
                                {!detail ? (
                                  <div className="py-10 text-center text-xs text-slate-400">
                                    <RefreshCcw size={18} className="animate-spin mx-auto mb-2 text-[#0070f4]" />
                                    Đang tải chi tiết phiếu {r.disposalCode}...
                                  </div>
                                ) : (
                                  <DisposalDetailPanel
                                    // Phiếu đổi (sau Lưu / Hủy) → khởi tạo lại ô nhập theo dữ liệu mới
                                    key={`${detail.summary.status}|${detail.summary.processedBy}|${detail.summary.disposalDate}|${detail.summary.reason}`}
                                    detail={detail}
                                    onChanged={handleChanged}
                                    onCopy={() => router.push(`/disposals/create?copy=${r.disposalId}`)}
                                    onOpenDraft={() => router.push(`/disposals/create?edit=${r.disposalId}`)}
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
          <footer className="h-10 bg-white/82 backdrop-blur-[2px] border-t border-slate-200 px-4 flex items-center text-[12px] text-[#677484] shrink-0">
            Hiển thị <strong className="mx-1 text-[#15171a]">{filtered.length}</strong> phiếu xuất hủy
          </footer>
        </div>
      </div>
    </div>
  );
}
