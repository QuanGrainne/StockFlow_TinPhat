'use client';

// Xuất NVL sản xuất (UC-46/47/48; Manager theo dõi ở UC-60): danh sách phiếu xuất NVL của các kho được phân quyền
// (BR-04), tạo phiếu xuất mới từ một lệnh sản xuất Chưa bắt đầu / Đang sản xuất.

import React, { useEffect, useMemo, useState } from 'react';
import { message } from 'antd';
import * as XLSX from 'xlsx';
import { FileDown, Inbox, Plus, RefreshCcw, Search } from 'lucide-react';
import { useActiveWarehouse } from '@/lib/warehouse/useActiveWarehouse';
import { ProductCodeLink } from '@/components/links/EntityLinks';
import { productionService } from '../services/productionService';
import type { MaterialIssue, ProductionListFilter } from '../types';
import { useProductionFeatures } from '../hooks/useProductionFeatures';
import { errorText, fmtDateTime, fmtQty } from '../utils/productionFormat';
import { useSearchParams } from 'next/navigation';
import { readDocumentLink, scrollToWhenReady } from '@/lib/navigation/documentLink';
import { ProductionFilterSidebar, SidebarToggle, defaultProductionFilter, linkProductionFilter } from '../components/ProductionFilterSidebar';
import { ProductionDocLink } from '../components/ProductionDocLink';
import { SmallTag } from '../components/ProductionStatusTag';
import { OrderPickerDialog } from '../components/OrderPickerDialog';
import { MaterialIssueModal } from '../components/MaterialIssueModal';

const TYPE_OPTIONS = [
  { value: 'MAIN', label: 'Xuất theo lệnh' },
  { value: 'SUPPLEMENTARY', label: 'Xuất bổ sung' },
];

export default function MaterialIssuesScreen() {
  const features = useProductionFeatures();
  const { warehouses } = useActiveWarehouse();
  // Link mở thẳng 1 phiếu xuất (?code=XK...&id=&date=, VD bấm mã phiếu ở chi tiết lệnh sản xuất):
  // điền mã vào ô tìm, lọc đúng ngày phiếu, mở sẵn chi tiết và cuộn tới dòng đó
  const searchParams = useSearchParams();
  const [docLink] = useState(() => readDocumentLink(searchParams));
  const [query, setQuery] = useState(() => docLink?.code ?? '');
  const [filter, setFilter] = useState<ProductionListFilter>(() =>
    docLink ? linkProductionFilter(['MAIN', 'SUPPLEMENTARY'], docLink.date) : defaultProductionFilter(['MAIN', 'SUPPLEMENTARY'])
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  const [expandedId, setExpandedId] = useState<number | null>(() => docLink?.id ?? null);
  useEffect(() => {
    if (!docLink?.id) return;
    return scrollToWhenReady(`[data-doc-row="${docLink.id}"]`);
  }, [docLink]);
  const [picking, setPicking] = useState(false);
  const [issueOrderId, setIssueOrderId] = useState<number | null>(null);

  const requestKey = JSON.stringify({
    warehouseIds: filter.warehouseIds,
    fromDate: filter.dateFrom,
    toDate: filter.dateTo,
    reloadTick,
  });
  const [result, setResult] = useState<{ key: string; data: MaterialIssue[] }>({ key: '', data: [] });
  const loading = result.key !== requestKey;

  useEffect(() => {
    let stale = false;
    const p = JSON.parse(requestKey) as { warehouseIds: number[]; fromDate?: string; toDate?: string };
    productionService
      .getMaterialIssues(p)
      .then((data) => {
        if (!stale) setResult({ key: requestKey, data });
      })
      .catch((err: unknown) => {
        if (stale) return;
        message.error(errorText(err, 'Không thể tải danh sách phiếu xuất NVL'));
        setResult({ key: requestKey, data: [] });
      });
    return () => {
      stale = true;
    };
  }, [requestKey]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return result.data.filter((i) => {
      const type = i.isSupplementary ? 'SUPPLEMENTARY' : 'MAIN';
      if (!filter.statuses.includes(type)) return false;
      if (!q) return true;
      return (
        i.issueCode.toLowerCase().includes(q) ||
        i.productionOrderCode.toLowerCase().includes(q) ||
        i.productName.toLowerCase().includes(q) ||
        i.items.some((it) => it.materialCode.toLowerCase().includes(q) || it.materialName.toLowerCase().includes(q))
      );
    });
  }, [result.data, query, filter.statuses]);

  function exportList() {
    const rows = filtered.flatMap((i) =>
      i.items.map((it) => ({
        'Mã phiếu': i.issueCode,
        'Thời gian': fmtDateTime(i.issueDate),
        'Lệnh sản xuất': i.productionOrderCode,
        'Thành phẩm': i.productName,
        'Kho xuất': i.warehouseName,
        'Loại': i.isSupplementary ? 'Bổ sung' : 'Theo lệnh',
        'Mã NVL': it.materialCode,
        'Tên NVL': it.materialName,
        'ĐVT': it.unitName,
        'SL xuất': it.quantity,
        'Lý do': i.reason ?? '',
        'Người lập': i.createdByName,
      }))
    );
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'XuatNVL');
    XLSX.writeFile(wb, `PhieuXuatNVL_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  const th = 'sticky top-0 z-20 bg-[#f7f8f9] py-2.5 px-3 border-b border-slate-200 whitespace-nowrap';

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col bg-transparent overflow-hidden select-none text-[13px] text-[#15171a] font-sans">
      <header className="min-h-12 bg-white/84 backdrop-blur-[2px] border-b border-slate-200 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 shrink-0">
        <div className="flex items-center gap-4 flex-1 basis-[320px] min-w-[260px] max-w-xl">
          <h1 className="text-[20px] font-bold leading-7 tracking-tight whitespace-nowrap">Xuất NVL sản xuất</h1>
          <div className="relative flex-1">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#677484] pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Theo mã phiếu, mã lệnh, thành phẩm, NVL"
              className="w-full h-8 pl-8 pr-3 rounded-full bg-[#f7f8f9] border border-slate-200 text-[13px] placeholder-[#677484] focus:outline-none focus:border-[#0070f4] focus:bg-white transition"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {features.canIssue && (
            <button
              type="button"
              onClick={() => setPicking(true)}
              className="inline-flex items-center gap-1.5 px-3.5 h-8 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white font-semibold text-[13px] shadow-xs transition cursor-pointer"
            >
              <Plus size={15} className="stroke-[2.5]" />
              <span>Xuất NVL</span>
            </button>
          )}
          <button
            type="button"
            onClick={exportList}
            className="inline-flex items-center gap-1 px-3 h-8 rounded-[8px] border border-slate-300 hover:bg-[#f7f8f9] font-medium text-[13px] bg-white cursor-pointer"
          >
            <FileDown size={14} className="text-[#677484]" />
            <span>Xuất file</span>
          </button>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex overflow-hidden">
        <div className="relative shrink-0 h-full flex">
          <ProductionFilterSidebar
            state={filter}
            onChange={(patch) => setFilter((prev) => ({ ...prev, ...patch }))}
            isCollapsed={sidebarCollapsed}
            warehouses={warehouses}
            statusOptions={TYPE_OPTIONS}
            timeLabel="Ngày xuất"
          />
          <SidebarToggle collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((v) => !v)} />
        </div>

        <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden bg-white/62">
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead className="text-[12px] font-semibold text-[#677484]">
                <tr>
                  <th className={th}>Mã phiếu</th>
                  <th className={th}>Thời gian</th>
                  <th className={th}>Lệnh sản xuất</th>
                  <th className={th}>Thành phẩm</th>
                  <th className={th}>Kho xuất</th>
                  <th className={`${th} text-right`}>Số NVL</th>
                  <th className={`${th} text-right`}>Tổng SL xuất</th>
                  <th className={`${th} text-center`}>Loại</th>
                  <th className={th}>Người lập</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-20 text-center text-[#677484]">
                      <RefreshCcw size={18} className="animate-spin mx-auto mb-2 text-[#0070f4]" />
                      Đang tải phiếu xuất NVL...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-24 text-center text-[#677484]">
                      <Inbox size={28} className="mx-auto mb-2 text-[#0070f4]" />
                      Không tìm thấy phiếu xuất NVL nào phù hợp
                    </td>
                  </tr>
                ) : (
                  filtered.map((i) => {
                    const isExpanded = expandedId === i.stockIssueId;
                    return (
                      <React.Fragment key={i.stockIssueId}>
                        <tr
                          data-doc-row={i.stockIssueId}
                          onClick={() => setExpandedId(isExpanded ? null : i.stockIssueId)}
                          className={`cursor-pointer text-[13px] ${isExpanded ? 'bg-[#e6f1fe]/80' : 'hover:bg-[#f7f8f9]'}`}
                        >
                          <td className="py-2.5 px-3 font-mono font-medium text-[#0070f4]">{i.issueCode}</td>
                          <td className="py-2.5 px-3 whitespace-nowrap">{fmtDateTime(i.issueDate)}</td>
                          <td className="py-2.5 px-3">
                            <ProductionDocLink kind="order" code={i.productionOrderCode} id={i.productionOrderId} className="!font-normal" />
                          </td>
                          <td className="py-2.5 px-3">{i.productName}</td>
                          <td className="py-2.5 px-3">{i.warehouseName}</td>
                          <td className="py-2.5 px-3 text-right">{i.items.length}</td>
                          <td className="py-2.5 px-3 text-right font-semibold">{fmtQty(i.totalQuantity)}</td>
                          <td className="py-2.5 px-3 text-center">
                            {i.isSupplementary ? <SmallTag tone="amber">Bổ sung</SmallTag> : <SmallTag tone="blue">Theo lệnh</SmallTag>}
                          </td>
                          <td className="py-2.5 px-3">{i.createdByName}</td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={9} className="p-0 border-b-2 border-[#0070f4] bg-white">
                              <div className="px-6 py-4">
                                <div className="flex items-center gap-2.5 mb-3">
                                  <span className="text-base font-bold font-mono">{i.issueCode}</span>
                                  {i.isSupplementary ? <SmallTag tone="amber">Xuất bổ sung</SmallTag> : <SmallTag tone="blue">Xuất theo lệnh</SmallTag>}
                                </div>
                                <div className="border border-slate-200 rounded-[8px] overflow-x-auto mb-3">
                                  <table className="w-full text-left border-collapse text-xs">
                                    <thead className="bg-[#f7f8f9] border-b border-slate-200 font-semibold text-[#677484]">
                                      <tr>
                                        <th className="py-2 px-3 w-10 text-center">STT</th>
                                        <th className="py-2 px-3 w-36">Mã NVL</th>
                                        <th className="py-2 px-3">Tên NVL</th>
                                        <th className="py-2 px-3 w-16 text-center">ĐVT</th>
                                        <th className="py-2 px-3 w-28 text-right">SL thực xuất</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {i.items.map((it, idx) => (
                                        <tr key={it.requirementId}>
                                          <td className="py-2 px-3 text-center text-slate-400">{idx + 1}</td>
                                          <td className="py-2 px-3 font-mono font-semibold">
                                            <ProductCodeLink code={it.materialCode} productId={it.materialId} />
                                          </td>
                                          <td className="py-2 px-3 font-medium">{it.materialName}</td>
                                          <td className="py-2 px-3 text-center text-slate-500">{it.unitName}</td>
                                          <td className="py-2 px-3 text-right font-semibold">{fmtQty(it.quantity)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                                <label className="text-xs text-slate-500 font-medium block mb-1">Lý do / ghi chú</label>
                                <div className="p-2.5 text-xs border border-slate-200 rounded-[8px] bg-slate-50/60 min-h-[40px] text-slate-700">
                                  {i.reason || 'Không có'}
                                </div>
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
            Hiển thị <strong className="mx-1 text-[#15171a]">{filtered.length}</strong> phiếu xuất NVL
          </footer>
        </div>
      </div>

      {picking && (
        <OrderPickerDialog
          title="Chọn lệnh sản xuất cần xuất NVL"
          statuses={['NOT_STARTED', 'IN_PROGRESS']}
          emptyText="Không có lệnh sản xuất nào đang chờ xuất NVL"
          onClose={() => setPicking(false)}
          onPick={(o) => {
            setPicking(false);
            setIssueOrderId(o.productionOrderId);
          }}
        />
      )}
      {issueOrderId !== null && (
        <MaterialIssueModal
          productionOrderId={issueOrderId}
          onClose={() => setIssueOrderId(null)}
          onDone={(issue) => {
            setIssueOrderId(null);
            setExpandedId(issue.stockIssueId);
            setReloadTick((t) => t + 1);
          }}
        />
      )}
    </div>
  );
}
