'use client';

// Định mức sản phẩm (BOM; UC-57, màn 3.2.2.6–3.2.2.8; Manager): danh sách BOM theo thành phẩm và phiên bản,
// xem chi tiết NVL (định mức, hao hụt, định mức sau hao hụt), thêm / sửa (BOM chưa dùng), tạo phiên bản mới,
// áp dụng / ngừng áp dụng (BR-30: mỗi thành phẩm tối đa 1 BOM đang áp dụng), xoá BOM chưa dùng (BR-06).

import React, { useEffect, useMemo, useState } from 'react';
import { message } from 'antd';
import * as XLSX from 'xlsx';
import { CheckCircle2, Copy, FileDown, Inbox, Pencil, Plus, Printer, RefreshCcw, Search, Trash2, XCircle } from 'lucide-react';
import { ProductCodeLink } from '@/components/links/EntityLinks';
import { useSearchParams } from 'next/navigation';
import { readDocumentLink, scrollToWhenReady } from '@/lib/navigation/documentLink';
import { productionService } from '../services/productionService';
import type { BomDetail, BomSummary, ProductionListFilter } from '../types';
import { useProductionFeatures } from '../hooks/useProductionFeatures';
import { errorText, fmtDateTime, fmtNorm, fmtPercent } from '../utils/productionFormat';
import { ProductionFilterSidebar, SidebarToggle } from '../components/ProductionFilterSidebar';
import { SmallTag } from '../components/ProductionStatusTag';
import { ConfirmDialog } from '../components/ProductionDialog';
import { BomFormModal } from '../components/BomFormModal';
import { exportBomDetailToXLSX, printBom } from '../utils/bomDocument';

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Đang áp dụng' },
  { value: 'INACTIVE', label: 'Ngừng áp dụng' },
];

type Confirm = { kind: 'activate' | 'deactivate' | 'delete'; bom: BomSummary } | null;

export default function BomManagementScreen() {
  const features = useProductionFeatures();
  // Link mở thẳng 1 định mức (?code=BOM-...&id=, VD bấm mã định mức ở chi tiết lệnh sản xuất):
  // điền mã vào ô tìm, mở sẵn chi tiết và cuộn tới dòng đó (khi có link: mọi trạng thái, toàn thời gian,
  // vì định mức được mở có thể đã ngừng áp dụng)
  const searchParams = useSearchParams();
  const [docLink] = useState(() => readDocumentLink(searchParams));
  const [query, setQuery] = useState(() => docLink?.code ?? '');
  // Mặc định chỉ xem định mức đang áp dụng; muốn xem bản ngừng áp dụng thì tick thêm ở sidebar
  const [filter, setFilter] = useState<ProductionListFilter>({
    statuses: docLink ? ['ACTIVE', 'INACTIVE'] : ['ACTIVE'],
    timeRange: 'all',
    warehouseIds: [],
    needsReviewOnly: false,
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  const [expandedId, setExpandedId] = useState<number | null>(() => docLink?.id ?? null);
  useEffect(() => {
    if (!docLink?.id) return;
    return scrollToWhenReady(`[data-doc-row="${docLink.id}"]`);
  }, [docLink]);
  const [details, setDetails] = useState<Record<number, BomDetail>>({});
  const [form, setForm] = useState<{ source: BomDetail | null; asNewVersion: boolean } | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [busy, setBusy] = useState(false);

  const [result, setResult] = useState<{ key: number; data: BomSummary[] }>({ key: -1, data: [] });
  const loading = result.key !== reloadTick;

  useEffect(() => {
    let stale = false;
    productionService
      .getBoms()
      .then((data) => {
        if (!stale) setResult({ key: reloadTick, data });
      })
      .catch((err: unknown) => {
        if (stale) return;
        message.error(errorText(err, 'Không thể tải danh sách định mức'));
        setResult({ key: reloadTick, data: [] });
      });
    return () => {
      stale = true;
    };
  }, [reloadTick]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return result.data.filter((b) => {
      if (!filter.statuses.includes(b.isActive ? 'ACTIVE' : 'INACTIVE')) return false;
      if (filter.timeRange !== 'all' && b.createdAt) {
        const d = b.createdAt.slice(0, 10);
        if (filter.dateFrom && d < filter.dateFrom) return false;
        if (filter.dateTo && d > filter.dateTo) return false;
      }
      if (!q) return true;
      return b.bomCode.toLowerCase().includes(q) || b.productCode.toLowerCase().includes(q) || b.productName.toLowerCase().includes(q);
    });
  }, [result.data, query, filter]);

  // Chi tiết BOM đang mở
  useEffect(() => {
    if (!expandedId || details[expandedId]) return;
    let stale = false;
    productionService
      .getBom(expandedId)
      .then((d) => {
        if (!stale) setDetails((prev) => ({ ...prev, [expandedId]: d }));
      })
      .catch((err: unknown) => {
        if (!stale) message.error(errorText(err, 'Không tải được chi tiết định mức'));
      });
    return () => {
      stale = true;
    };
  }, [expandedId, details]);

  const reload = () => {
    setDetails({});
    setReloadTick((t) => t + 1);
  };

  async function runConfirm(c: NonNullable<Confirm>) {
    setBusy(true);
    try {
      if (c.kind === 'activate') {
        await productionService.activateBom(c.bom.bomId);
        message.success(`Đã áp dụng định mức ${c.bom.bomCode} (phiên bản ${c.bom.version}).`);
      } else if (c.kind === 'deactivate') {
        await productionService.deactivateBom(c.bom.bomId);
        message.success(`Đã ngừng áp dụng định mức ${c.bom.bomCode}.`);
      } else {
        await productionService.deleteBom(c.bom.bomId);
        message.success(`Đã hủy định mức ${c.bom.bomCode}.`);
        setExpandedId(null);
      }
      setConfirm(null);
      reload();
    } catch (err) {
      message.error(errorText(err, 'Không thực hiện được thao tác'));
    } finally {
      setBusy(false);
    }
  }

  async function exportList() {
    const rows: Record<string, string | number>[] = [];
    for (const b of filtered) {
      const d = details[b.bomId] ?? (await productionService.getBom(b.bomId).catch(() => null));
      for (const it of d?.items ?? []) {
        rows.push({
          'Mã định mức': b.bomCode,
          'Phiên bản': b.version,
          'Mã thành phẩm': b.productCode,
          'Thành phẩm': b.productName,
          'Trạng thái': b.isActive ? 'Đang áp dụng' : 'Ngừng áp dụng',
          'Mã nguyên vật liệu': it.materialCode,
          'Tên nguyên vật liệu': it.materialName,
          'Đơn vị tính': it.unitName,
          'Định mức cho 1 đơn vị thành phẩm': it.quantity,
          'Hao hụt (%)': it.wastageRate,
          'Định mức sau hao hụt': it.totalPerUnit,
        });
      }
    }
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'DinhMuc');
    XLSX.writeFile(wb, `DinhMucSanPham_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  const th = 'sticky top-0 z-20 bg-[#f7f8f9] py-2.5 px-3 border-b border-slate-200 whitespace-nowrap';
  const actionBtn = 'flex items-center gap-1.5 px-3 py-1.5 text-xs hover:bg-[#f7f8f9] rounded-[8px] border border-slate-300 bg-white cursor-pointer';
  // Nút chữ (không viền) như thanh nút chi tiết đặt hàng nhập
  const textBtn = 'inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#15171a] rounded-[8px] hover:bg-[#f7f8f9] cursor-pointer';
  const canEdit = features.canManageBom;

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col bg-transparent overflow-hidden select-none text-[13px] text-[#15171a] font-sans">
      <header className="min-h-12 bg-white/84 backdrop-blur-[2px] border-b border-slate-200 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 shrink-0">
        <div className="flex items-center gap-4 flex-1 basis-[320px] min-w-[260px] max-w-xl">
          <h1 className="text-[20px] font-bold leading-7 tracking-tight whitespace-nowrap">Định mức sản phẩm</h1>
          <div className="relative flex-1">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#677484] pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Theo mã định mức, mã / tên thành phẩm"
              className="w-full h-8 pl-8 pr-3 rounded-full bg-[#f7f8f9] border border-slate-200 text-[13px] placeholder-[#677484] focus:outline-none focus:border-[#0070f4] focus:bg-white transition"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <button
              type="button"
              onClick={() => setForm({ source: null, asNewVersion: false })}
              className="inline-flex items-center gap-1.5 px-3.5 h-8 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white font-semibold text-[13px] shadow-xs transition cursor-pointer"
            >
              <Plus size={15} className="stroke-[2.5]" />
              <span>Thêm định mức</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => void exportList()}
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
            statusOptions={STATUS_OPTIONS}
            timeLabel="Ngày tạo"
          />
          <SidebarToggle collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((v) => !v)} />
        </div>

        <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden bg-white/62">
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-left border-collapse min-w-[960px]">
              <thead className="text-[12px] font-semibold text-[#677484]">
                <tr>
                  <th className={th}>Mã định mức</th>
                  <th className={th}>Thành phẩm</th>
                  <th className={th}>Phiên bản</th>
                  <th className={`${th} text-right`}>Số nguyên vật liệu</th>
                  <th className={th}>Ngày tạo</th>
                  <th className={th}>Ghi chú kỹ thuật</th>
                  <th className={`${th} text-center`}>Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-20 text-center text-[#677484]">
                      <RefreshCcw size={18} className="animate-spin mx-auto mb-2 text-[#0070f4]" />
                      Đang tải định mức...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-24 text-center text-[#677484]">
                      <Inbox size={28} className="mx-auto mb-2 text-[#0070f4]" />
                      Không tìm thấy định mức nào phù hợp
                    </td>
                  </tr>
                ) : (
                  filtered.map((b) => {
                    const isExpanded = expandedId === b.bomId;
                    const d = details[b.bomId];
                    return (
                      <React.Fragment key={b.bomId}>
                        <tr
                          data-doc-row={b.bomId}
                          onClick={() => setExpandedId(isExpanded ? null : b.bomId)}
                          className={`cursor-pointer text-[13px] ${isExpanded ? 'bg-[#e6f1fe]/80' : 'hover:bg-[#f7f8f9]'}`}
                        >
                          <td className="py-2.5 px-3 font-mono font-medium text-[#0070f4]">{b.bomCode}</td>
                          <td className="py-2.5 px-3">
                            <div className="font-medium">{b.productName}</div>
                            <div className="text-[11px] text-[#677484]">{b.productCode}</div>
                          </td>
                          <td className="py-2.5 px-3">{b.version}</td>
                          <td className="py-2.5 px-3 text-right">{b.materialCount}</td>
                          <td className="py-2.5 px-3 whitespace-nowrap">{fmtDateTime(b.createdAt)}</td>
                          <td className="py-2.5 px-3 max-w-[280px] truncate" title={b.description ?? ''}>
                            {b.description}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {b.isActive ? <SmallTag tone="green">Đang áp dụng</SmallTag> : <SmallTag tone="gray">Ngừng áp dụng</SmallTag>}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={7} className="p-0 border-b-2 border-[#0070f4] bg-white">
                              <div className="px-6 py-4">
                                {!d ? (
                                  <div className="py-8 text-center text-xs text-slate-400">
                                    <RefreshCcw size={18} className="animate-spin mx-auto mb-2 text-[#0070f4]" />
                                    Đang tải chi tiết định mức...
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex items-center gap-2.5 mb-2">
                                      <span className="text-base font-bold font-mono">{d.summary.bomCode}</span>
                                      {d.summary.isActive ? <SmallTag tone="green">Đang áp dụng</SmallTag> : <SmallTag tone="gray">Ngừng áp dụng</SmallTag>}
                                      {d.summary.isUsed && <SmallTag tone="blue">Đã dùng cho lệnh sản xuất</SmallTag>}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-1.5 text-xs text-slate-600 mb-3">
                                      <div>
                                        <span className="text-slate-400">Thành phẩm: </span>
                                        <span className="font-semibold text-slate-800">
                                          <ProductCodeLink code={d.summary.productCode} productId={d.summary.productId} /> · {d.summary.productName}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-slate-400">Phiên bản: </span>
                                        <span className="font-medium text-slate-800">{d.summary.version}</span>
                                      </div>
                                      <div>
                                        <span className="text-slate-400">Đơn vị thành phẩm: </span>
                                        <span className="font-medium text-slate-800">{d.summary.unitName}</span>
                                      </div>
                                    </div>
                                    <div className="border border-slate-200 rounded-[8px] overflow-x-auto mb-3">
                                      <table className="w-full text-left border-collapse text-xs">
                                        <thead className="bg-[#f7f8f9] border-b border-slate-200 font-semibold text-[#677484]">
                                          <tr>
                                            <th className="py-2 px-3 w-10 text-center">STT</th>
                                            <th className="py-2 px-3 w-36">Mã nguyên vật liệu</th>
                                            <th className="py-2 px-3">Tên nguyên vật liệu</th>
                                            <th className="py-2 px-3 w-24 text-center">Đơn vị tính</th>
                                            <th className="py-2 px-3 w-32 text-right">Định mức cho 1 thành phẩm</th>
                                            <th className="py-2 px-3 w-24 text-right">Hao hụt</th>
                                            <th className="py-2 px-3 w-36 text-right">Định mức sau hao hụt</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                          {d.items.map((it, i) => (
                                            <tr key={it.bomItemId}>
                                              <td className="py-2 px-3 text-center text-slate-400">{i + 1}</td>
                                              <td className="py-2 px-3 font-mono font-semibold">
                                                <ProductCodeLink code={it.materialCode} productId={it.materialId} />
                                              </td>
                                              <td className="py-2 px-3 font-medium">{it.materialName}</td>
                                              <td className="py-2 px-3 text-center text-slate-500">{it.unitName}</td>
                                              <td className="py-2 px-3 text-right">{fmtNorm(it.quantity)}</td>
                                              <td className="py-2 px-3 text-right">{fmtPercent(it.wastageRate)}</td>
                                              <td className="py-2 px-3 text-right font-semibold">{fmtNorm(it.totalPerUnit)}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                    <label className="text-xs text-slate-500 font-medium block mb-1">Ghi chú kỹ thuật</label>
                                    <div className="p-2.5 text-xs border border-slate-200 rounded-[8px] bg-slate-50/60 min-h-[44px] text-slate-700 whitespace-pre-line mb-4">
                                      {d.summary.description || 'Chưa có ghi chú'}
                                    </div>
                                    {/* Cùng bố cục với chi tiết đặt hàng nhập: trái Hủy / Xuất file, phải thao tác + In */}
                                    <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
                                      <div className="flex items-center gap-1">
                                        {canEdit && (
                                          <button
                                            type="button"
                                            disabled={d.summary.isUsed}
                                            onClick={() => setConfirm({ kind: 'delete', bom: d.summary })}
                                            title={
                                              d.summary.isUsed
                                                ? 'Định mức đã dùng cho lệnh sản xuất nên không hủy được; dùng "Ngừng áp dụng".'
                                                : 'Hủy (xoá) định mức chưa dùng'
                                            }
                                            className={`${textBtn} !text-[#fb2c36] disabled:opacity-40 disabled:cursor-not-allowed`}
                                          >
                                            <Trash2 size={14} /> Hủy
                                          </button>
                                        )}
                                        <button type="button" onClick={() => exportBomDetailToXLSX(d)} className={textBtn}>
                                          <FileDown size={14} /> Xuất file
                                        </button>
                                      </div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        {canEdit && (
                                          <>
                                            <button type="button" onClick={() => setForm({ source: d, asNewVersion: true })} className={actionBtn}>
                                              <Copy size={13} />
                                              <span>Tạo phiên bản mới</span>
                                            </button>
                                            {!d.summary.isUsed && (
                                              <button type="button" onClick={() => setForm({ source: d, asNewVersion: false })} className={actionBtn}>
                                                <Pencil size={13} />
                                                <span>Sửa</span>
                                              </button>
                                            )}
                                            {d.summary.isActive ? (
                                              <button type="button" onClick={() => setConfirm({ kind: 'deactivate', bom: d.summary })} className={actionBtn}>
                                                <XCircle size={13} />
                                                <span>Ngừng áp dụng</span>
                                              </button>
                                            ) : (
                                              <button
                                                type="button"
                                                onClick={() => setConfirm({ kind: 'activate', bom: d.summary })}
                                                className="flex items-center gap-1.5 px-4 py-1.5 text-xs bg-[#0070f4] hover:bg-[#005ac3] text-white rounded-[8px] font-semibold cursor-pointer"
                                              >
                                                <CheckCircle2 size={13} />
                                                <span>Áp dụng</span>
                                              </button>
                                            )}
                                          </>
                                        )}
                                        <button type="button" onClick={() => printBom(d)} className={actionBtn}>
                                          <Printer size={13} />
                                          <span>In</span>
                                        </button>
                                      </div>
                                    </div>
                                  </>
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
            Hiển thị <strong className="mx-1 text-[#15171a]">{filtered.length}</strong> định mức
          </footer>
        </div>
      </div>

      {form && (
        <BomFormModal
          source={form.source}
          asNewVersion={form.asNewVersion}
          onClose={() => setForm(null)}
          onDone={(saved) => {
            setForm(null);
            reload();
            setExpandedId(saved.summary.bomId);
          }}
        />
      )}

      {confirm && (
        <ConfirmDialog
          title={confirm.kind === 'activate' ? 'Áp dụng định mức' : confirm.kind === 'deactivate' ? 'Ngừng áp dụng định mức' : 'Hủy định mức'}
          danger={confirm.kind !== 'activate'}
          busy={busy}
          message={
            confirm.kind === 'activate'
              ? `Áp dụng phiên bản ${confirm.bom.version} sẽ ngừng áp dụng định mức đang dùng của ${confirm.bom.productName}. Tiếp tục?`
              : confirm.kind === 'deactivate'
                ? `Ngừng áp dụng định mức ${confirm.bom.bomCode}? Thành phẩm ${confirm.bom.productName} sẽ không lập được lệnh sản xuất mới cho đến khi có định mức đang áp dụng.`
                : `Bạn có chắc chắn muốn hủy định mức ${confirm.bom.bomCode}? Định mức sẽ bị xoá và không thể khôi phục.`
          }
          onCancel={() => setConfirm(null)}
          onConfirm={() => void runConfirm(confirm)}
        />
      )}
    </div>
  );
}
