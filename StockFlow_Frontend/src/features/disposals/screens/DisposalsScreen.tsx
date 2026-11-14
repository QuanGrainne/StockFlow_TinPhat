'use client';

// Danh sách phiếu xuất hủy (cùng bố cục màn Phiếu kiểm kho): lọc trạng thái / thời gian theo Kho làm việc,
// xem chi tiết dưới dòng (hàng hủy, SL, giá vốn, giá trị, lý do), mở lại phiếu tạm, xuất file Excel.

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { message } from 'antd';
import * as XLSX from 'xlsx';
import { FileDown, Inbox, Pencil, Plus, RefreshCcw, Search } from 'lucide-react';
import { linkDateFilter, readDocumentLink, scrollToWhenReady } from '@/lib/navigation/documentLink';
import { PurchaseFilterSidebar } from '@/features/purchases';
import type { PurchaseFilterState } from '@/features/purchases/types';
import { useActiveWarehouse } from '@/lib/warehouse/useActiveWarehouse';
import { getDateRangeForPreset } from '@/lib/utils/date';
import { ProductCodeLink } from '@/components/links/EntityLinks';
import { disposalService } from '@/features/disposals/services/disposalService';
import { DISPOSAL_STATUS_LABEL, type DisposalDetail, type DisposalStatus, type DisposalSummary } from '@/features/disposals/types';

const money = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });
const qty = (n: number) => n.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
/** Trạng thái của bộ lọc dùng chung → trạng thái phiếu xuất hủy */
const STATUS_MAP: Record<string, DisposalStatus> = { draft: 'DRAFT', completed: 'COMPLETED' };

function formatDateTimeVN(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

const STATUS_CLS: Record<DisposalStatus, string> = {
  DRAFT: 'bg-[#fffbeb] text-[#d97706] border-[#fde68a]',
  COMPLETED: 'bg-[#e6f8ec] text-[#16a34a] border-[#bbf7d0]',
};

function StatusTag({ status }: { status: DisposalStatus }) {
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap ${STATUS_CLS[status] ?? ''}`}>
      {DISPOSAL_STATUS_LABEL[status] ?? status}
    </span>
  );
}

function exportDisposalExcel(detail: DisposalDetail) {
  const s = detail.summary;
  const rows = detail.items.map((it, i) => ({
    STT: i + 1,
    'Mã hàng': it.productCode,
    'Tên hàng': it.productName,
    ĐVT: it.unit,
    'SL hủy': it.quantity,
    'Giá vốn': it.unitCost,
    'Giá trị hủy': it.value,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'XuatHuy');
  XLSX.writeFile(wb, `PhieuXuatHuy_${s.disposalCode}.xlsx`);
}

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

  const [filterState, setFilterState] = useState<PurchaseFilterState>(() => {
    const range = getDateRangeForPreset('this_month');
    if (docLink) return { statuses: ['draft', 'completed'], ...linkDateFilter(docLink.date) };
    return { statuses: ['draft', 'completed'], timeRange: 'this_month', dateFrom: range.from, dateTo: range.to, periodLabel: 'Tháng này' };
  });

  // Luôn xem phiếu của Kho làm việc (mở từ link thì xem đúng kho của phiếu đó)
  const activeWarehouseId = activeWarehouse?.warehouseId;
  const warehouseIds = docLink?.warehouseId ? [docLink.warehouseId] : activeWarehouseId ? [activeWarehouseId] : [];

  const requestKey = JSON.stringify({
    warehouseIds,
    statuses: filterState.statuses.map((s) => STATUS_MAP[s]).filter(Boolean),
    fromDate: filterState.dateFrom,
    toDate: filterState.dateTo,
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

  function exportList() {
    const rows = filtered.map((r) => ({
      'Mã xuất hủy': r.disposalCode,
      'Thời gian': formatDateTimeVN(r.disposalDate),
      Kho: r.warehouseName,
      'Số mặt hàng': r.itemCount,
      'Tổng SL hủy': r.totalQuantity,
      'Tổng giá trị hủy': r.totalValue,
      'Lý do': r.reason ?? '',
      'Người lập': r.processedByName,
      'Trạng thái': DISPOSAL_STATUS_LABEL[r.status] ?? r.status,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'XuatHuy');
    XLSX.writeFile(wb, `DanhSachXuatHuy_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  const th = 'sticky top-0 z-20 bg-[#f7f8f9] py-2.5 px-3 border-b border-slate-200 whitespace-nowrap';
  const totals = filtered.reduce((acc, r) => ({ qty: acc.qty + r.totalQuantity, value: acc.value + r.totalValue }), { qty: 0, value: 0 });

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
              placeholder="Theo mã phiếu xuất hủy, lý do"
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
            onClick={exportList}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-1 px-3 h-8 rounded-[8px] border border-slate-300 hover:bg-[#f7f8f9] font-medium text-[13px] bg-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileDown size={14} className="text-[#677484]" />
            <span>Xuất file</span>
          </button>
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
            hiddenStatuses={['canceled']}
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

        <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden bg-white/62">
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead className="text-[12px] font-semibold text-[#677484]">
                <tr>
                  <th className={th}>Mã xuất hủy</th>
                  <th className={th}>Thời gian</th>
                  <th className={`${th} text-right`}>Số mặt hàng</th>
                  <th className={`${th} text-right`}>Tổng SL hủy</th>
                  <th className={`${th} text-right`}>Tổng giá trị hủy</th>
                  <th className={th}>Lý do</th>
                  <th className={th}>Người lập</th>
                  <th className={`${th} text-center`}>Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!loading && filtered.length > 0 && (
                  <tr className="bg-white/75 font-bold">
                    <td colSpan={3} />
                    <td className="py-2.5 px-3 text-right">{qty(totals.qty)}</td>
                    <td className="py-2.5 px-3 text-right">{money.format(totals.value)}</td>
                    <td colSpan={3} />
                  </tr>
                )}
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-20 text-center text-[#677484]">
                      <RefreshCcw size={18} className="animate-spin mx-auto mb-2 text-[#0070f4]" />
                      Đang tải phiếu xuất hủy...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-24 text-center text-[#677484]">
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
                          <td className="py-2.5 px-3 font-mono font-medium text-[#0070f4]">{r.disposalCode}</td>
                          <td className="py-2.5 px-3 whitespace-nowrap">{formatDateTimeVN(r.disposalDate)}</td>
                          <td className="py-2.5 px-3 text-right">{r.itemCount}</td>
                          <td className="py-2.5 px-3 text-right">{qty(r.totalQuantity)}</td>
                          <td className="py-2.5 px-3 text-right">{money.format(r.totalValue)}</td>
                          <td className="py-2.5 px-3 max-w-[260px] truncate" title={r.reason ?? ''}>
                            {r.reason}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">{r.processedByName}</td>
                          <td className="py-2.5 px-3 text-center">
                            <StatusTag status={r.status} />
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr>
                            <td colSpan={8} className="p-0 border-b-2 border-[#0070f4] bg-white">
                              <div className="px-6 py-4">
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
                                    detail={detail}
                                    onOpen={() => router.push(`/disposals/create?edit=${r.disposalId}`)}
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

function DisposalDetailPanel({ detail, onOpen }: { detail: DisposalDetail; onOpen: () => void }) {
  const s = detail.summary;
  return (
    <>
      <div className="mb-4">
        <div className="flex items-center gap-2.5 mb-2">
          <span className="text-base font-bold font-mono">{s.disposalCode}</span>
          <StatusTag status={s.status} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-1.5 text-xs text-slate-600">
          <div>
            <span className="text-slate-400">Người lập: </span>
            <span className="font-medium text-slate-800">{s.processedByName}</span>
          </div>
          <div>
            <span className="text-slate-400">{s.status === 'COMPLETED' ? 'Ngày hủy: ' : 'Ngày lập: '}</span>
            <span className="font-medium text-slate-800">{formatDateTimeVN(s.disposalDate)}</span>
          </div>
          <div>
            <span className="text-slate-400">Kho xuất hủy: </span>
            <span className="font-semibold text-slate-800">{s.warehouseName}</span>
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
              <th className="py-2 px-3 w-24 text-right">SL hủy</th>
              <th className="py-2 px-3 w-28 text-right">Giá vốn</th>
              <th className="py-2 px-3 w-32 text-right">Giá trị hủy</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {detail.items.map((it, i) => (
              <tr key={it.disposalItemId}>
                <td className="py-2 px-3 text-center text-slate-400">{i + 1}</td>
                <td className="py-2 px-3 font-mono font-semibold">
                  <ProductCodeLink code={it.productCode} productId={it.productId} />
                </td>
                <td className="py-2 px-3 font-medium">{it.productName}</td>
                <td className="py-2 px-3 text-center text-slate-500">{it.unit}</td>
                <td className="py-2 px-3 text-right font-semibold">{qty(it.quantity)}</td>
                <td className="py-2 px-3 text-right">{money.format(it.unitCost)}</td>
                <td className="py-2 px-3 text-right">{money.format(it.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col md:flex-row items-start gap-6 mb-4">
        <div className="flex-1 w-full">
          <label className="text-xs text-slate-500 font-medium block mb-1">Lý do xuất hủy</label>
          <div className="p-2.5 text-xs border border-slate-200 rounded-[8px] bg-slate-50/60 min-h-[60px] text-slate-700 whitespace-pre-wrap">
            {s.reason || 'Chưa có lý do'}
          </div>
        </div>
        <div className="w-full md:w-80 shrink-0 space-y-1.5 text-xs bg-slate-50/60 p-3 rounded-[8px] border border-slate-200">
          <div className="flex justify-between text-slate-600">
            <span>Số mặt hàng:</span>
            <span className="font-semibold text-slate-800">{s.itemCount}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Tổng SL hủy:</span>
            <span className="font-semibold text-slate-800">{qty(s.totalQuantity)}</span>
          </div>
          <div className="flex justify-between text-slate-700 border-t border-slate-200 pt-1.5 font-bold">
            <span>Tổng giá trị hủy:</span>
            <span>{money.format(s.totalValue)}</span>
          </div>
          {s.status === 'DRAFT' && (
            <p className="text-[11px] text-slate-400 pt-1">Phiếu tạm: giá trị tính theo giá vốn hiện tại, chưa trừ tồn kho.</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <button
          type="button"
          onClick={() => exportDisposalExcel(detail)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs hover:bg-[#f7f8f9] rounded-[8px] border border-slate-300 bg-white cursor-pointer"
        >
          <FileDown size={13} />
          <span>Xuất file</span>
        </button>
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
      </div>
    </>
  );
}
