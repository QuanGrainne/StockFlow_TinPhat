'use client';

// Nhập thành phẩm (UC-49/50; Manager theo dõi ở UC-61): danh sách phiếu nhập thành phẩm của các kho được phân quyền
// (BR-04), lọc phiếu cần Manager xem xét (BR-37). Chỉ để xem: phiếu do hệ thống tự sinh khi Manager
// bấm "Duyệt hoàn thành" ở lệnh sản xuất (không ghi nhận phiếu thủ công tại đây).

import React, { useEffect, useMemo, useState } from 'react';
import { message } from 'antd';
import * as XLSX from 'xlsx';
import { AlertTriangle, FileDown, Inbox, RefreshCcw, Search } from 'lucide-react';
import { useActiveWarehouse } from '@/lib/warehouse/useActiveWarehouse';
import { ProductCodeLink } from '@/components/links/EntityLinks';
import { productionService } from '../services/productionService';
import type { FinishedGoodsReceipt, ProductionListFilter } from '../types';
import { errorText, fmtDate, fmtDateTime, fmtQty } from '../utils/productionFormat';
import { useSearchParams } from 'next/navigation';
import { readDocumentLink, scrollToWhenReady } from '@/lib/navigation/documentLink';
import { ProductionFilterSidebar, SidebarToggle, defaultProductionFilter, linkProductionFilter } from '../components/ProductionFilterSidebar';
import { ProductionDocLink } from '../components/ProductionDocLink';
import { SmallTag } from '../components/ProductionStatusTag';

export default function FinishedGoodsReceiptsScreen() {
  const { warehouses } = useActiveWarehouse();
  // Link mở thẳng 1 phiếu nhập thành phẩm (?code=NTP...&id=&date=, VD bấm mã phiếu ở chi tiết lệnh sản xuất):
  // điền mã vào ô tìm, lọc đúng ngày phiếu, mở sẵn chi tiết và cuộn tới dòng đó
  const searchParams = useSearchParams();
  const [docLink] = useState(() => readDocumentLink(searchParams));
  const [query, setQuery] = useState(() => docLink?.code ?? '');
  const [filter, setFilter] = useState<ProductionListFilter>(() =>
    docLink ? linkProductionFilter([], docLink.date) : defaultProductionFilter([])
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(() => docLink?.id ?? null);
  useEffect(() => {
    if (!docLink?.id) return;
    return scrollToWhenReady(`[data-doc-row="${docLink.id}"]`);
  }, [docLink]);

  const requestKey = JSON.stringify({
    warehouseIds: filter.warehouseIds,
    fromDate: filter.dateFrom,
    toDate: filter.dateTo,
    needsReviewOnly: filter.needsReviewOnly,
  });
  const [result, setResult] = useState<{ key: string; data: FinishedGoodsReceipt[] }>({ key: '', data: [] });
  const loading = result.key !== requestKey;

  useEffect(() => {
    let stale = false;
    const p = JSON.parse(requestKey) as { warehouseIds: number[]; fromDate?: string; toDate?: string; needsReviewOnly: boolean };
    productionService
      .getFinishedGoodsReceipts(p)
      .then((data) => {
        if (!stale) setResult({ key: requestKey, data });
      })
      .catch((err: unknown) => {
        if (stale) return;
        message.error(errorText(err, 'Không thể tải danh sách phiếu nhập thành phẩm'));
        setResult({ key: requestKey, data: [] });
      });
    return () => {
      stale = true;
    };
  }, [requestKey]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return result.data;
    return result.data.filter(
      (r) =>
        r.fgrCode.toLowerCase().includes(q) ||
        r.productionOrderCode.toLowerCase().includes(q) ||
        r.productCode.toLowerCase().includes(q) ||
        r.productName.toLowerCase().includes(q) ||
        (r.lotNumber ?? '').toLowerCase().includes(q)
    );
  }, [result.data, query]);

  const totals = useMemo(
    () => filtered.reduce((acc, r) => ({ accepted: acc.accepted + r.acceptedQuantity, defect: acc.defect + r.defectQuantity }), { accepted: 0, defect: 0 }),
    [filtered]
  );

  function exportList() {
    const rows = filtered.map((r) => ({
      'Mã phiếu': r.fgrCode,
      'Thời gian': fmtDateTime(r.receivedDate),
      'Lệnh sản xuất': r.productionOrderCode,
      'Mã thành phẩm': r.productCode,
      'Thành phẩm': r.productName,
      'Kho': r.warehouseName,
      'Vị trí': r.locationName ?? '',
      'Số lô': r.lotNumber ?? '',
      'Ngày sản xuất': fmtDate(r.productionDate),
      'SL đạt': r.acceptedQuantity,
      'SL lỗi': r.defectQuantity,
      'Lý do lỗi': r.defectReason ?? '',
      'Cần xem xét': r.needsReview ? 'Có' : '',
      'Ghi chú cảnh báo': r.reviewNote ?? '',
      'Người nhập': r.receivedByName,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'NhapThanhPham');
    XLSX.writeFile(wb, `PhieuNhapThanhPham_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  const th = 'sticky top-0 z-20 bg-[#f7f8f9] py-2.5 px-3 border-b border-slate-200 whitespace-nowrap';

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col bg-transparent overflow-hidden select-none text-[13px] text-[#15171a] font-sans">
      <header className="min-h-12 bg-white/84 backdrop-blur-[2px] border-b border-slate-200 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 shrink-0">
        <div className="flex items-center gap-4 flex-1 basis-[320px] min-w-[260px] max-w-xl">
          <h1 className="text-[20px] font-bold leading-7 tracking-tight whitespace-nowrap">Nhập thành phẩm</h1>
          <div className="relative flex-1">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#677484] pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Theo mã phiếu, mã lệnh, thành phẩm, số lô"
              className="w-full h-8 pl-8 pr-3 rounded-full bg-[#f7f8f9] border border-slate-200 text-[13px] placeholder-[#677484] focus:outline-none focus:border-[#0070f4] focus:bg-white transition"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
            timeLabel="Ngày nhập"
            reviewLabel="Chỉ phiếu cần Quản lý xem xét"
          />
          <SidebarToggle collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((v) => !v)} />
        </div>

        <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden bg-white/62">
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-left border-collapse min-w-[1100px]">
              <thead className="text-[12px] font-semibold text-[#677484]">
                <tr>
                  <th className={th}>Mã phiếu</th>
                  <th className={th}>Thời gian</th>
                  <th className={th}>Lệnh sản xuất</th>
                  <th className={th}>Thành phẩm</th>
                  <th className={th}>Kho</th>
                  <th className={th}>Số lô</th>
                  <th className={`${th} text-right`}>SL đạt</th>
                  <th className={`${th} text-right`}>SL lỗi</th>
                  <th className={`${th} text-center`}>Định mức NVL</th>
                  <th className={th}>Người nhập</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length > 0 && !loading && (
                  <tr className="bg-white/75 font-bold text-[13px]">
                    <td colSpan={6} />
                    <td className="py-2.5 px-3 text-right text-[#16a34a]">{fmtQty(totals.accepted)}</td>
                    <td className="py-2.5 px-3 text-right text-[#fb2c36]">{fmtQty(totals.defect)}</td>
                    <td colSpan={2} />
                  </tr>
                )}
                {loading ? (
                  <tr>
                    <td colSpan={10} className="py-20 text-center text-[#677484]">
                      <RefreshCcw size={18} className="animate-spin mx-auto mb-2 text-[#0070f4]" />
                      Đang tải phiếu nhập thành phẩm...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-24 text-center text-[#677484]">
                      <Inbox size={28} className="mx-auto mb-2 text-[#0070f4]" />
                      Không tìm thấy phiếu nhập thành phẩm nào phù hợp
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => {
                    const isExpanded = expandedId === r.fgrId;
                    return (
                      <React.Fragment key={r.fgrId}>
                        <tr
                          data-doc-row={r.fgrId}
                          onClick={() => setExpandedId(isExpanded ? null : r.fgrId)}
                          className={`cursor-pointer text-[13px] ${isExpanded ? 'bg-[#e6f1fe]/80' : r.needsReview ? 'bg-[#fef2f2]/40 hover:bg-[#fef2f2]' : 'hover:bg-[#f7f8f9]'}`}
                        >
                          <td className="py-2.5 px-3 font-mono font-medium text-[#0070f4]">{r.fgrCode}</td>
                          <td className="py-2.5 px-3 whitespace-nowrap">{fmtDateTime(r.receivedDate)}</td>
                          <td className="py-2.5 px-3">
                            <ProductionDocLink kind="order" code={r.productionOrderCode} id={r.productionOrderId} className="!font-normal" />
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-medium">{r.productName}</div>
                            <div className="text-[11px] text-[#677484]">{r.productCode}</div>
                          </td>
                          <td className="py-2.5 px-3">{r.warehouseName}</td>
                          <td className="py-2.5 px-3 font-mono text-[12px]">{r.lotNumber}</td>
                          <td className="py-2.5 px-3 text-right font-semibold text-[#16a34a]">{fmtQty(r.acceptedQuantity)}</td>
                          <td className="py-2.5 px-3 text-right text-[#fb2c36]">{fmtQty(r.defectQuantity)}</td>
                          <td className="py-2.5 px-3 text-center">
                            {r.needsReview ? <SmallTag tone="red">Cần xem xét</SmallTag> : <SmallTag tone="green">Hợp lệ</SmallTag>}
                          </td>
                          <td className="py-2.5 px-3">{r.receivedByName}</td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={10} className="p-0 border-b-2 border-[#0070f4] bg-white">
                              <div className="px-6 py-4">
                                <div className="flex items-center gap-2.5 mb-3">
                                  <span className="text-base font-bold font-mono">{r.fgrCode}</span>
                                  {r.needsReview && <SmallTag tone="red">Cần Quản lý xem xét</SmallTag>}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-1.5 text-xs text-slate-600 mb-3">
                                  <div>
                                    <span className="text-slate-400">Thành phẩm: </span>
                                    <span className="font-semibold text-slate-800">
                                      <ProductCodeLink code={r.productCode} productId={r.productId} /> · {r.productName}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400">Kho / vị trí: </span>
                                    <span className="font-medium text-slate-800">
                                      {r.warehouseName}
                                      {r.locationName ? ` · ${r.locationName}` : ''}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400">Số lô / NSX: </span>
                                    <span className="font-medium text-slate-800">
                                      {r.lotNumber} {r.productionDate ? `· ${fmtDate(r.productionDate)}` : ''}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400">SL đạt (nhập kho): </span>
                                    <span className="font-semibold text-[#16a34a]">
                                      {fmtQty(r.acceptedQuantity)} {r.unitName}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400">SL lỗi: </span>
                                    <span className="font-semibold text-[#fb2c36]">
                                      {fmtQty(r.defectQuantity)} {r.unitName}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400">Lý do lỗi: </span>
                                    <span className="font-medium text-slate-800">{r.defectReason || 'Không có'}</span>
                                  </div>
                                </div>
                                {r.reviewNote && (
                                  <div className="mb-3 p-2.5 text-xs rounded-[8px] border border-amber-200 bg-amber-50 text-[#92400e] flex items-start gap-2">
                                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                                    <span>
                                      <b>Cảnh báo định mức NVL:</b> {r.reviewNote}
                                    </span>
                                  </div>
                                )}
                                <label className="text-xs text-slate-500 font-medium block mb-1">Ghi chú</label>
                                <div className="p-2.5 text-xs border border-slate-200 rounded-[8px] bg-slate-50/60 min-h-[40px] text-slate-700">
                                  {r.notes || 'Chưa có ghi chú'}
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
            Hiển thị <strong className="mx-1 text-[#15171a]">{filtered.length}</strong> phiếu nhập thành phẩm
          </footer>
        </div>
      </div>

    </div>
  );
}
