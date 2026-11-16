'use client';

// Lập / sửa lệnh sản xuất (UC-59, A58.1) — bố cục giống form Kiểm kho / Chuyển hàng:
// thanh tiêu đề (tìm thành phẩm có BOM đang áp dụng, kho làm việc, avatar),
// bảng nhu cầu NVL bên trái, khung thông tin lệnh + Lưu bên phải.
// Nhu cầu NVL BẮT BUỘC đúng công thức BOM đang áp dụng (BR-31: SL kế hoạch × định mức × (1 + hao hụt %)),
// không sửa định mức / thêm bớt NVL tại đây. Thiếu NVL tại kho làm việc → cảnh báo, hỏi xác nhận trước khi lưu
// và hệ thống ghi cảnh báo vào ghi chú lệnh.
// ?edit=<id>: sửa lệnh còn Chưa bắt đầu (nhu cầu được tính lại theo BOM đang áp dụng).

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { message } from 'antd';
import { AlertTriangle, ArrowLeft, Factory, Inbox, RefreshCcw, ShoppingCart, Trash2 } from 'lucide-react';
import { useActiveWarehouse } from '@/lib/warehouse/useActiveWarehouse';
import { FormHeaderUserBar } from '@/components/layout/FormHeaderUserBar';
import { ProductCodeLink } from '@/components/links/EntityLinks';
import { productionService } from '../services/productionService';
import type { ProductionOrderDetail, ProductionProductLookup, SaveProductionOrderPayload } from '../types';
import { errorText, fmtNorm, fmtPercent, fmtQty, parseQty, todayIso } from '../utils/productionFormat';
import { ProductSearchInput } from '../components/ProductSearchInput';
import { ConfirmDialog, inputCls, labelCls } from '../components/ProductionDialog';

const CONFIRM_SHORTAGE = '[CONFIRM_SHORTAGE]';

interface MaterialDraft {
  materialId: number;
  materialCode: string;
  materialName: string;
  unitName: string;
  norm: number;
  rate: number;
  availableQty: number | null;
}

interface ProductDraft {
  productId: number;
  productCode: string;
  productName: string;
  unitName: string;
  planned: string;
  notes: string;
  bomCode: string;
  bomVersion: string;
  loadingBom: boolean;
  bomError?: string;
  materials: MaterialDraft[];
}

interface ShortageRow {
  materialId: number;
  materialCode: string;
  materialName: string;
  unitName: string;
  required: number;
  available: number;
  shortage: number;
}

const round2 = (n: number) => Math.round(n * 100 + Number.EPSILON) / 100;

/** BR-31: nhu cầu = SL kế hoạch × định mức × (1 + hao hụt %) */
const calcRequired = (planned: number, norm: number, rate: number) => round2(planned * norm * (1 + rate / 100));

const plannedOf = (it: ProductDraft) => {
  const q = parseQty(it.planned);
  return Number.isNaN(q) || q <= 0 ? null : q;
};

export default function CreateProductionOrderScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = Number(searchParams.get('edit')) || null;
  const { activeWarehouse } = useActiveWarehouse();
  const warehouseId = activeWarehouse.warehouseId;

  const [items, setItems] = useState<ProductDraft[]>([]);
  const [activeProductId, setActiveProductId] = useState<number | null>(null);
  const [deadline, setDeadline] = useState('');
  const [workshop, setWorkshop] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [shortageConfirm, setShortageConfirm] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ loaded: boolean; detail: ProductionOrderDetail | null; error?: string }>({
    loaded: !editId,
    detail: null,
  });

  /** Lấy định mức BOM đang áp dụng + tồn NVL tại kho làm việc cho 1 thành phẩm */
  function loadBomForProduct(productId: number) {
    setItems((prev) => prev.map((it) => (it.productId === productId ? { ...it, loadingBom: true, bomError: undefined } : it)));
    productionService
      .getRequirementPreview(productId, 1, warehouseId)
      .then((preview) => {
        setItems((prev) =>
          prev.map((it) =>
            it.productId !== productId
              ? it
              : {
                  ...it,
                  bomCode: preview.bomCode,
                  bomVersion: preview.bomVersion,
                  loadingBom: false,
                  bomError: undefined,
                  materials: preview.materials.map((m) => ({
                    materialId: m.materialId,
                    materialCode: m.materialCode,
                    materialName: m.materialName,
                    unitName: m.unitName,
                    norm: m.normPerUnit,
                    rate: m.wastageRate,
                    availableQty: m.availableQty,
                  })),
                }
          )
        );
      })
      .catch((err: unknown) => {
        setItems((prev) =>
          prev.map((it) =>
            it.productId === productId ? { ...it, loadingBom: false, bomError: errorText(err, 'Không tải được định mức BOM') } : it
          )
        );
      });
  }

  // Mở lệnh để sửa: giữ thành phẩm + SL kế hoạch, định mức lấy lại theo BOM đang áp dụng
  useEffect(() => {
    if (!editId) return;
    let stale = false;
    productionService
      .getOrder(editId, warehouseId)
      .then((d) => {
        if (stale) return;
        if (d.summary.status !== 'NOT_STARTED') {
          setEditing({ loaded: true, detail: null, error: `Lệnh ${d.summary.code} không còn ở trạng thái Chưa bắt đầu nên không sửa được.` });
          return;
        }
        setEditing({ loaded: true, detail: d });
        const orderItems =
          d.summary.items && d.summary.items.length > 0
            ? d.summary.items.map((oi) => ({ ...oi, notes: oi.notes ?? '' }))
            : [
                {
                  productId: d.summary.productId,
                  productCode: d.summary.productCode,
                  productName: d.summary.productName,
                  unitName: d.summary.unitName,
                  bomCode: d.summary.bomCode,
                  bomVersion: d.summary.bomVersion,
                  plannedQuantity: d.summary.plannedQuantity,
                  notes: '',
                },
              ];
        const drafts: ProductDraft[] = orderItems.map((oi) => ({
          productId: oi.productId,
          productCode: oi.productCode,
          productName: oi.productName,
          unitName: oi.unitName,
          planned: String(oi.plannedQuantity),
          notes: oi.notes,
          bomCode: oi.bomCode,
          bomVersion: oi.bomVersion,
          loadingBom: true,
          materials: [],
        }));
        setItems(drafts);
        setActiveProductId(drafts[0]?.productId ?? null);
        setDeadline(d.summary.deadline ? d.summary.deadline.slice(0, 10) : '');
        setWorkshop(d.summary.workshop ?? '');
        setNotes(d.notes ?? '');
        drafts.forEach((dr) => loadBomForProduct(dr.productId));
      })
      .catch((err: unknown) => {
        if (!stale) setEditing({ loaded: true, detail: null, error: errorText(err, 'Không tải được lệnh sản xuất') });
      });
    return () => {
      stale = true;
    };
    // loadBomForProduct chỉ dùng setState + warehouseId nên không cần đưa vào deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, warehouseId]);

  function pickProduct(p: ProductionProductLookup) {
    if (items.some((it) => it.productId === p.productId)) {
      setActiveProductId(p.productId);
      message.info(`Thành phẩm ${p.productCode} đã có trong danh sách.`);
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        productId: p.productId,
        productCode: p.productCode,
        productName: p.productName,
        unitName: p.unitName,
        planned: '1',
        notes: '',
        bomCode: '',
        bomVersion: '',
        loadingBom: true,
        materials: [],
      },
    ]);
    setActiveProductId(p.productId);
    loadBomForProduct(p.productId);
  }

  function removeProduct(productId: number) {
    setItems((prev) => {
      const next = prev.filter((it) => it.productId !== productId);
      if (activeProductId === productId) setActiveProductId(next[0]?.productId ?? null);
      return next;
    });
  }

  function updateProduct(productId: number, patch: Partial<Pick<ProductDraft, 'planned' | 'notes'>>) {
    setItems((prev) => prev.map((it) => (it.productId === productId ? { ...it, ...patch } : it)));
  }

  const activeItem = items.find((it) => it.productId === activeProductId) ?? items[0] ?? null;

  // Tổng nhu cầu từng NVL của cả lệnh (nhiều thành phẩm có thể dùng chung NVL) so với tồn tại kho làm việc
  const shortages = useMemo<ShortageRow[]>(() => {
    const byMaterial = new Map<number, ShortageRow>();
    for (const it of items) {
      const q = plannedOf(it);
      if (q === null || it.loadingBom) continue;
      for (const m of it.materials) {
        if (m.availableQty === null) continue;
        const row = byMaterial.get(m.materialId) ?? {
          materialId: m.materialId,
          materialCode: m.materialCode,
          materialName: m.materialName,
          unitName: m.unitName,
          required: 0,
          available: Math.max(0, m.availableQty),
          shortage: 0,
        };
        row.required = round2(row.required + calcRequired(q, m.norm, m.rate));
        row.shortage = Math.max(0, round2(row.required - row.available));
        byMaterial.set(m.materialId, row);
      }
    }
    return [...byMaterial.values()].filter((r) => r.shortage > 0);
  }, [items]);

  const shortageIds = new Set(shortages.map((s) => s.materialId));
  const deadlineError = deadline && deadline < todayIso() ? 'Hạn hoàn thành không được trước ngày hôm nay.' : null;

  async function save(confirmShortage = false) {
    if (items.length === 0) {
      message.error('Vui lòng chọn ít nhất một thành phẩm cần sản xuất.');
      return;
    }
    for (const it of items) {
      if (plannedOf(it) === null) {
        message.error(`Số lượng kế hoạch của thành phẩm ${it.productCode} phải lớn hơn 0.`);
        setActiveProductId(it.productId);
        return;
      }
      if (it.loadingBom) {
        message.warning('Đang tải định mức BOM, vui lòng đợi trong giây lát.');
        return;
      }
      if (it.bomError) {
        message.error(it.bomError);
        setActiveProductId(it.productId);
        return;
      }
      if (it.materials.length === 0) {
        message.error(`BOM của thành phẩm ${it.productCode} chưa có nguyên vật liệu.`);
        setActiveProductId(it.productId);
        return;
      }
    }
    if (deadlineError) {
      message.error(deadlineError);
      return;
    }

    const first = items[0];
    const payload: SaveProductionOrderPayload = {
      productId: first.productId,
      plannedQuantity: round2(plannedOf(first) ?? 0),
      deadline: deadline || null,
      workshop: workshop.trim() || null,
      notes: notes.trim() || null,
      items: items.map((it) => ({
        productId: it.productId,
        plannedQuantity: round2(plannedOf(it) ?? 0),
        notes: it.notes.trim() || null,
      })),
      warehouseId,
      confirmShortage,
    };

    setSaving(true);
    try {
      const saved = editId ? await productionService.updateOrder(editId, payload) : await productionService.createOrder(payload);
      setShortageConfirm(null);
      if (confirmShortage) message.warning(`Đã lưu lệnh ${saved.summary.code} kèm cảnh báo thiếu nguyên vật liệu.`);
      else message.success(`Đã lưu lệnh sản xuất ${saved.summary.code}.`);
      router.push('/production');
    } catch (err) {
      const msg = errorText(err, 'Không lưu được lệnh sản xuất');
      if (msg.startsWith(CONFIRM_SHORTAGE)) {
        setShortageConfirm(msg.slice(CONFIRM_SHORTAGE.length).trim());
      } else {
        setShortageConfirm(null);
        message.error(msg);
      }
    } finally {
      setSaving(false);
    }
  }

  const title = editId ? 'Sửa lệnh sản xuất' : 'Lập lệnh sản xuất';
  const activePlanned = activeItem ? plannedOf(activeItem) : null;

  return (
    <div className="flex flex-col h-screen stockflow-brand-bg text-[13px] text-[#15171a] select-none overflow-hidden font-sans">
      {/* ─── 1. Thanh tiêu đề ─── */}
      <header className="h-12 bg-white/85 backdrop-blur-[2px] border-b border-slate-200 px-4 flex items-center justify-between gap-3 shrink-0 relative z-30">
        <div className="flex items-center gap-3">
          <Link
            href="/production"
            className="p-1 rounded-[8px] text-[#677484] hover:text-[#15171a] hover:bg-[#f7f8f9] transition"
            title="Quay lại danh sách lệnh sản xuất"
          >
            <ArrowLeft size={18} className="stroke-[2.5]" />
          </Link>
          <span className="text-[20px] font-semibold tracking-tight whitespace-nowrap leading-[36px]">{title}</span>
        </div>
        <div className="flex-1 max-w-xl ml-4 mr-auto">
          <ProductSearchInput
            placeholder="Thêm thành phẩm cần sản xuất vào lệnh (mã hoặc tên)"
            activeBomOnly
            productType="FINISHED"
            excludeIds={items.map((it) => it.productId)}
            onSelect={pickProduct}
            disabled={!editing.loaded || !!editing.error}
          />
        </div>
        <FormHeaderUserBar />
      </header>

      {/* ─── 2. Trên: thành phẩm / Dưới: nhu cầu NVL theo BOM + khung thông tin phải ─── */}
      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-white/62 border-r border-slate-200">
          {!editing.loaded ? (
            <div className="flex-1 flex items-center justify-center text-[#677484]">
              <RefreshCcw size={18} className="animate-spin mr-2 text-[#0070f4]" /> Đang tải lệnh sản xuất...
            </div>
          ) : editing.error ? (
            <div className="flex-1 flex items-center justify-center text-[#fb2c36]">{editing.error}</div>
          ) : items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-[#677484] text-center px-6">
              <div className="w-16 h-16 rounded-full bg-[#e6f1fe] text-[#0070f4] flex items-center justify-center mb-3">
                <Factory size={30} className="stroke-[1.5]" />
              </div>
              <div className="font-bold text-[#15171a] text-sm mb-1">Chọn thành phẩm cần sản xuất</div>
              <p className="text-xs max-w-md">
                Một lệnh sản xuất có thể chứa một hoặc nhiều thành phẩm. Nhu cầu nguyên vật liệu được hệ thống tính đúng theo công thức BOM
                đang áp dụng của từng thành phẩm.
              </p>
            </div>
          ) : (
            <>
              {/* ─── BẢNG TRÊN: THÀNH PHẨM TRONG LỆNH ─── */}
              <div className="border-b border-slate-200 bg-white/90 shrink-0 max-h-[38%] flex flex-col">
                <div className="px-4 py-2 bg-[#f7f8f9] border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#15171a]">
                    1. Danh sách thành phẩm sản xuất ({items.length} thành phẩm)
                  </span>
                  <span className="text-[11px] text-[#677484]">Bấm chọn dòng thành phẩm để xem nhu cầu NVL bên dưới</span>
                </div>
                <div className="overflow-auto">
                  <table className="w-full text-left border-collapse min-w-[760px]">
                    <thead className="text-[11px] font-semibold text-[#677484] bg-[#f7f8f9] border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3 w-10 text-center">STT</th>
                        <th className="py-2 px-3 w-36">Mã thành phẩm</th>
                        <th className="py-2 px-3">Tên thành phẩm</th>
                        <th className="py-2 px-3 w-16 text-center">ĐVT</th>
                        <th className="py-2 px-3 w-36 text-right">Số lượng KH *</th>
                        <th className="py-2 px-3 w-40">Định mức BOM</th>
                        <th className="py-2 px-3 w-48">Diễn giải dòng</th>
                        <th className="py-2 px-3 w-10" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((it, idx) => {
                        const isSelected = activeItem?.productId === it.productId;
                        const itemShort = it.materials.some((m) => shortageIds.has(m.materialId));
                        return (
                          <tr
                            key={it.productId}
                            onClick={() => setActiveProductId(it.productId)}
                            className={`text-xs cursor-pointer transition ${isSelected ? 'bg-[#e6f1fe]/75 font-medium' : 'hover:bg-slate-50'}`}
                          >
                            <td className="py-2 px-3 text-center text-slate-400">{idx + 1}</td>
                            <td className="py-2 px-3 font-mono font-bold text-[#0070f4]">{it.productCode}</td>
                            <td className="py-2 px-3">
                              {it.productName}
                              {itemShort && (
                                <span className="ml-1.5 px-1.5 py-0.5 rounded bg-[#fef2f2] text-[#fb2c36] text-[10px] font-semibold">
                                  Thiếu NVL
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center text-slate-500">{it.unitName}</td>
                            <td className="py-1.5 px-3" onClick={(e) => e.stopPropagation()}>
                              <input
                                inputMode="decimal"
                                value={it.planned}
                                onChange={(e) => updateProduct(it.productId, { planned: e.target.value })}
                                placeholder="0"
                                className={`w-full h-7 px-2 text-right text-xs border rounded-[6px] focus:outline-none ${
                                  plannedOf(it) === null ? 'border-[#fb2c36] bg-[#fef2f2]' : 'border-slate-300 focus:border-[#0070f4]'
                                }`}
                              />
                            </td>
                            <td className="py-2 px-3 text-[11px] text-[#677484]">
                              {it.loadingBom ? (
                                'Đang tải BOM...'
                              ) : it.bomError ? (
                                <span className="text-[#fb2c36]">{it.bomError}</span>
                              ) : (
                                `${it.bomCode} (v${it.bomVersion})`
                              )}
                            </td>
                            <td className="py-1.5 px-3" onClick={(e) => e.stopPropagation()}>
                              <input
                                value={it.notes}
                                onChange={(e) => updateProduct(it.productId, { notes: e.target.value })}
                                placeholder="Ghi chú thành phẩm..."
                                className="w-full h-7 px-2 text-xs border border-slate-300 rounded-[6px] focus:outline-none focus:border-[#0070f4] bg-white"
                              />
                            </td>
                            <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => removeProduct(it.productId)}
                                className="text-slate-400 hover:text-rose-600 cursor-pointer"
                                title="Xóa thành phẩm khỏi lệnh"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ─── BẢNG DƯỚI: NHU CẦU NVL THEO BOM CỦA THÀNH PHẨM ĐANG CHỌN (chỉ xem) ─── */}
              {activeItem && (
                <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-slate-200 bg-white/85 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#0070f4]">
                      2. Nhu cầu NVL theo BOM của: {activeItem.productCode} — {activeItem.productName}
                    </span>
                    <span className="text-xs text-[#677484]">
                      Tồn tại kho: <b className="text-[#15171a]">{activeWarehouse.name}</b>
                    </span>
                  </div>

                  <div className="flex-1 min-h-0 overflow-auto">
                    <table className="w-full text-left border-collapse min-w-[860px]">
                      <thead className="text-[12px] font-semibold text-[#677484]">
                        <tr>
                          {['STT', 'Mã NVL', 'Tên nguyên vật liệu', 'ĐVT', 'Định mức / 1 đv', 'Hao hụt %', 'Tổng SL cần', 'Tồn kho', 'Thiếu'].map(
                            (h, i) => (
                              <th
                                key={h}
                                className={`sticky top-0 z-20 bg-[#f7f8f9] py-2 px-3 border-b border-slate-200 whitespace-nowrap ${
                                  i === 0 ? 'w-10 text-center' : i === 3 ? 'w-14 text-center' : i >= 4 ? 'text-right w-28' : ''
                                }`}
                              >
                                {h}
                              </th>
                            )
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeItem.loadingBom ? (
                          <tr>
                            <td colSpan={9} className="py-14 text-center text-[#677484]">
                              <RefreshCcw size={18} className="animate-spin mx-auto mb-2 text-[#0070f4]" />
                              Đang tính nhu cầu nguyên vật liệu...
                            </td>
                          </tr>
                        ) : activeItem.bomError ? (
                          <tr>
                            <td colSpan={9} className="py-14 text-center text-[#fb2c36]">
                              <AlertTriangle size={20} className="mx-auto mb-2" />
                              {activeItem.bomError}
                            </td>
                          </tr>
                        ) : activeItem.materials.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="py-14 text-center text-[#677484]">
                              <Inbox size={24} className="mx-auto mb-2 text-[#0070f4]" />
                              BOM chưa có nguyên vật liệu
                            </td>
                          </tr>
                        ) : (
                          activeItem.materials.map((m, i) => {
                            const required = activePlanned === null ? null : calcRequired(activePlanned, m.norm, m.rate);
                            const short =
                              m.availableQty === null || required === null ? null : Math.max(0, round2(required - Math.max(0, m.availableQty)));
                            return (
                              <tr key={m.materialId} className="text-[13px]">
                                <td className="py-2 px-3 text-center text-slate-400">{i + 1}</td>
                                <td className="py-2 px-3 font-mono font-semibold">
                                  <ProductCodeLink code={m.materialCode} productId={m.materialId} />
                                </td>
                                <td className="py-2 px-3">{m.materialName}</td>
                                <td className="py-2 px-3 text-center text-slate-500">{m.unitName}</td>
                                <td className="py-2 px-3 text-right">{fmtNorm(m.norm)}</td>
                                <td className="py-2 px-3 text-right">{fmtPercent(m.rate)}</td>
                                <td className="py-2 px-3 text-right font-semibold">{required === null ? '—' : fmtQty(required)}</td>
                                <td className="py-2 px-3 text-right">{m.availableQty === null ? '—' : fmtQty(m.availableQty)}</td>
                                <td
                                  className={`py-2 px-3 text-right font-semibold ${
                                    short && short > 0 ? 'text-[#fb2c36]' : 'text-[#16a34a]'
                                  }`}
                                >
                                  {short === null ? '—' : short > 0 ? fmtQty(short) : 'Đủ'}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                  <footer className="h-9 bg-white/82 border-t border-slate-200 px-4 flex items-center justify-between text-[12px] text-[#677484] shrink-0">
                    <span>
                      Tổng SL cần = SL kế hoạch × Định mức × (1 + Hao hụt %), theo đúng công thức BOM đang áp dụng.
                    </span>
                    {shortages.length > 0 && (
                      <span className="text-[#fb2c36] font-semibold">{shortages.length} NVL của lệnh chưa đủ tồn tại kho đang chọn</span>
                    )}
                  </footer>
                </div>
              )}
            </>
          )}
        </div>

        {/* Khung thông tin lệnh */}
        <aside className="w-80 shrink-0 bg-white/90 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div>
              <label className={labelCls}>Mã lệnh</label>
              <input value={editing.detail?.summary.code ?? 'Mã lệnh tự động'} disabled className={`${inputCls} text-[#677484] font-mono`} />
            </div>
            <div>
              <label className={labelCls}>Hạn hoàn thành</label>
              <input
                type="date"
                value={deadline}
                min={todayIso()}
                onChange={(e) => setDeadline(e.target.value)}
                className={`${inputCls} ${deadlineError ? 'border-[#fb2c36]' : ''}`}
              />
              {deadlineError && <p className="mt-1 text-xs text-[#fb2c36]">{deadlineError}</p>}
            </div>
            <div>
              <label className={labelCls}>Xưởng phụ trách</label>
              <input
                value={workshop}
                onChange={(e) => setWorkshop(e.target.value)}
                maxLength={200}
                placeholder="VD: Xưởng ép đùn 1"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Diễn giải / Ghi chú lệnh</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="VD: Lệnh sản xuất ngày..."
                className="w-full px-2.5 py-1.5 text-[13px] border border-slate-300 rounded-[6px] focus:outline-none focus:border-[#0070f4]"
              />
            </div>

            {shortages.length > 0 && (
              <div className="p-2.5 rounded-[8px] bg-[#fef2f2] border border-[#fecaca] space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#b91c1c]">
                  <AlertTriangle size={14} /> Thiếu nguyên vật liệu tại {activeWarehouse.name}
                </div>
                <ul className="text-[11px] text-[#7f1d1d] space-y-0.5 max-h-40 overflow-y-auto">
                  {shortages.map((s) => (
                    <li key={s.materialId}>
                      <b className="font-mono">{s.materialCode}</b> {s.materialName}: cần {fmtQty(s.required)}, tồn {fmtQty(s.available)} →
                      thiếu <b>{fmtQty(s.shortage)}</b> {s.unitName}
                    </li>
                  ))}
                </ul>
                <p className="text-[11px] text-[#7f1d1d]">
                  Vẫn có thể lưu lệnh (cần xác nhận); cảnh báo thiếu được ghi vào ghi chú lệnh để lên kế hoạch mua / nhập bù.
                </p>
                {/* Nhập luôn hàng thiếu: mở phiếu đặt hàng nhập (tab mới) điền sẵn NVL + SL còn thiếu, không mất lệnh đang lập */}
                <Link
                  href={`/purchase-orders/create?products=${shortages.map((s) => `${s.materialId}:${s.shortage}`).join(',')}`}
                  target="_blank"
                  className="mt-1 h-8 w-full rounded-[8px] border border-[#fb2c36]/40 bg-white hover:bg-[#fff5f5] text-[#b91c1c] text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <ShoppingCart size={13} /> Đặt hàng nhập NVL thiếu
                </Link>
              </div>
            )}

            <p className="text-[11px] text-[#677484] leading-relaxed">
              Nhu cầu NVL lấy đúng theo BOM đang áp dụng, không chỉnh tay tại đây. Lệnh được lưu ở trạng thái <b>Chưa bắt đầu</b>, chuyển{' '}
              <b>Đang sản xuất</b> khi có phiếu xuất NVL đầu tiên, và <b>Hoàn thành</b> khi quản lý bấm <b>Duyệt hoàn thành</b> (hệ thống tự
              sinh phiếu nhập thành phẩm).
            </p>
          </div>
          <div className="p-4 border-t border-slate-200 flex gap-2">
            <Link
              href="/production"
              className="flex-1 h-10 rounded-[8px] border border-slate-300 bg-white hover:bg-[#f7f8f9] flex items-center justify-center font-semibold"
            >
              Bỏ qua
            </Link>
            <button
              type="button"
              disabled={saving || !editing.loaded || !!editing.error}
              onClick={() => save(false)}
              className="flex-1 h-10 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white font-semibold cursor-pointer disabled:opacity-60"
            >
              {saving ? 'Đang lưu...' : 'Lưu lệnh'}
            </button>
          </div>
        </aside>
      </div>

      {shortageConfirm && (
        <ConfirmDialog
          title="Thiếu nguyên vật liệu"
          message={<p className="text-[13px] leading-relaxed whitespace-pre-line">{shortageConfirm}</p>}
          busy={saving}
          danger
          confirmText="Vẫn lưu lệnh"
          onCancel={() => setShortageConfirm(null)}
          onConfirm={() => save(true)}
        />
      )}
    </div>
  );
}
