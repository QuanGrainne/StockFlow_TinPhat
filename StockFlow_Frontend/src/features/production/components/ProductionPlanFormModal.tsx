'use client';

// Lập / sửa kế hoạch sản xuất (UC-PP-02).
// - Lập mới, sửa Nháp / Bị từ chối: sửa toàn bộ.
// - Sửa kế hoạch Đã duyệt (isLimitedEdit): không đổi tên, kỳ; số lượng không thấp hơn số đã lập lệnh;
//   không xóa dòng đã có lệnh; dòng thêm mới phải có BOM đang áp dụng (BR-PP-13).
// Mỗi thành phẩm một dòng (BR-PP-06). Thành phẩm chưa có BOM được lưu nháp kèm cảnh báo (BR-PP-09).
// Chỉ chọn thành phẩm / bán thành phẩm (Q-V2); số lượng đọc kiểu Việt Nam, tối đa 999.999.999,99 (V-05, Q-V7);
// kỳ đã qua bắt buộc ghi chú (Q-V1); gửi kèm mã phiên bản để phát hiện sửa đồng thời (Q-V5).

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { message } from 'antd';
import { useActiveWarehouse } from '@/lib/warehouse/useActiveWarehouse';
import { productionPlanService } from '../services/productionPlanService';
import type { ProductionPlanDetail, ProductionProductLookup, SaveProductionPlanPayload } from '../types';
import { todayIso } from '../utils/productionFormat';
import {
  PLAN_MAX_DATE,
  PLAN_MIN_DATE,
  PLAN_NAME_MAX,
  PLAN_NOTES_MAX,
  PLAN_PRODUCT_TYPES,
  type PlanFormLine,
  type PlanFormState,
  isDateInRange,
  isPastPeriod,
  parsePlanQty,
  planErrorText,
  validatePlanForm,
} from '../utils/productionPlanFormat';
import { ProductionDialog, btnPrimary, btnSecondary, inputCls, labelCls } from './ProductionDialog';
import { ProductSearchInput } from './ProductSearchInput';
import { PlanMaterialRequirementsPanel } from './PlanMaterialRequirementsPanel';

interface ProductionPlanFormModalProps {
  /** Kế hoạch đang sửa; null = lập mới */
  detail: ProductionPlanDetail | null;
  onClose: () => void;
  onSaved: (detail: ProductionPlanDetail) => void;
}

/** Ngày đã nhập đủ yyyy-MM-dd và trong khoảng hợp lệ (ô ngày gửi cả giá trị dở khi đang gõ năm, VD 0002-11-15) */
const isFullDate = (iso: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(iso) && isDateInRange(iso);

/**
 * Kéo ngày của từng dòng vào trong kỳ và bảo đảm ngày kết thúc dòng không trước ngày bắt đầu dòng.
 * Chỉ chạy khi rời ô ngày (onBlur) để không phá dữ liệu lúc đang gõ.
 */
function clampLinesToPeriod(lines: PlanFormLine[], start: string, end: string): PlanFormLine[] {
  return lines.map((l) => {
    let s = l.plannedStartDate;
    let e = l.plannedEndDate;
    if (isFullDate(s)) s = s < start ? start : s > end ? end : s;
    if (isFullDate(e)) e = e > end ? end : e < start ? start : e;
    if (isFullDate(s) && isFullDate(e) && e < s) e = s;
    return s === l.plannedStartDate && e === l.plannedEndDate ? l : { ...l, plannedStartDate: s, plannedEndDate: e };
  });
}

function endOfMonthIso(iso: string): string {
  const [y, m] = iso.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
}

function initialState(detail: ProductionPlanDetail | null): PlanFormState {
  if (!detail) {
    const start = todayIso();
    return { planName: '', periodStart: start, periodEnd: endOfMonthIso(start), notes: '', lines: [] };
  }
  return {
    planName: detail.summary.planName,
    periodStart: detail.summary.periodStart,
    periodEnd: detail.summary.periodEnd,
    notes: detail.notes ?? '',
    lines: detail.items.map((i) => ({
      productId: i.productId,
      productCode: i.productCode,
      productName: i.productName,
      unitName: i.unitName,
      hasActiveBom: i.hasActiveBom,
      quantityText: String(i.plannedQuantity).replace('.', ','),
      plannedStartDate: i.plannedStartDate,
      plannedEndDate: i.plannedEndDate,
      warehouseId: i.warehouseId,
      notes: i.notes ?? '',
      orderedQuantity: i.orderedQuantity,
      existing: true,
    })),
  };
}

export function ProductionPlanFormModal({ detail, onClose, onSaved }: ProductionPlanFormModalProps) {
  const { warehouses, activeWarehouse } = useActiveWarehouse();
  const limited = !!detail?.actions.isLimitedEdit;
  const [form, setForm] = useState<PlanFormState>(() => initialState(detail));
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showMaterials, setShowMaterials] = useState(false);
  // V-03(a): chặn bấm Lưu lặp trước khi nút kịp khóa
  const savingRef = useRef(false);
  const today = todayIso();

  const errors = useMemo(() => validatePlanForm(form, limited, today), [form, limited, today]);
  const hasErrors = Object.keys(errors).length > 0;
  const showErr = (key: string) => touched && errors[key];
  const missingBom = form.lines.filter((l) => !l.hasActiveBom);
  const pastPeriod = isPastPeriod(form.periodEnd, today);
  const periodDateOrderInvalid = !!form.periodStart && !!form.periodEnd && form.periodStart > form.periodEnd;
  const showPeriodErr = Boolean(showErr('period') || periodDateOrderInvalid);

  // Nhu cầu NVL xem trước: chỉ các dòng có số lượng hợp lệ; trễ 400ms để không gọi API mỗi lần gõ
  const previewItems = useMemo(
    () =>
      form.lines
        .map((l) => ({ productId: l.productId, parsed: parsePlanQty(l.quantityText) }))
        .filter((i) => !i.parsed.error)
        .map((i) => ({ productId: i.productId, plannedQuantity: i.parsed.value })),
    [form.lines]
  );
  const previewKey = JSON.stringify(previewItems);
  const [debouncedKey, setDebouncedKey] = useState(previewKey);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedKey(previewKey), 400);
    return () => clearTimeout(t);
  }, [previewKey]);

  const patchLine = (productId: number, patch: Partial<PlanFormLine>) =>
    setForm((f) => ({ ...f, lines: f.lines.map((l) => (l.productId === productId ? { ...l, ...patch } : l)) }));

  /**
   * Rời ô ngày của kỳ: ngày kết thúc không được trước ngày bắt đầu → đặt bằng ngày bắt đầu và báo;
   * kéo ngày các dòng vào trong kỳ. Không làm khi ngày chưa nhập đủ.
   */
  function normalizePeriod() {
    const { periodStart: start, periodEnd: end } = form;
    if (!isFullDate(start) || !isFullDate(end)) return;
    const fixedEnd = end < start ? start : end;
    if (fixedEnd !== end) message.warning('Ngày kết thúc kỳ không được trước ngày bắt đầu, đã đặt bằng ngày bắt đầu.');
    setForm((f) => ({ ...f, periodEnd: fixedEnd, lines: clampLinesToPeriod(f.lines, start, fixedEnd) }));
  }

  /** Rời ô ngày của dòng: ngày kết thúc dòng không được trước ngày bắt đầu dòng → đặt bằng ngày bắt đầu và báo. */
  function normalizeLineDates(productId: number) {
    const line = form.lines.find((l) => l.productId === productId);
    if (!line || !isFullDate(line.plannedStartDate) || !isFullDate(line.plannedEndDate)) return;
    if (line.plannedEndDate < line.plannedStartDate) {
      message.warning(`Ngày kết thúc của ${line.productCode} không được trước ngày bắt đầu, đã đặt bằng ngày bắt đầu.`);
      patchLine(productId, { plannedEndDate: line.plannedStartDate });
    }
  }

  const addProduct = (p: ProductionProductLookup) =>
    setForm((f) => ({
      ...f,
      lines: [
        ...f.lines,
        {
          productId: p.productId,
          productCode: p.productCode,
          productName: p.productName,
          unitName: p.unitName,
          hasActiveBom: p.hasActiveBom,
          quantityText: '',
          plannedStartDate: f.periodStart,
          plannedEndDate: f.periodEnd,
          warehouseId: null,
          notes: '',
          orderedQuantity: 0,
          existing: false,
        },
      ],
    }));

  async function save() {
    setTouched(true);
    if (hasErrors) {
      const firstError = Object.values(errors)[0];
      if (firstError) {
        message.warning(firstError);
      }
      return;
    }
    if (savingRef.current) return;
    const payload: SaveProductionPlanPayload = {
      planName: form.planName.trim(),
      periodStart: form.periodStart,
      periodEnd: form.periodEnd,
      notes: form.notes.trim() || null,
      items: form.lines.map((l) => ({
        productId: l.productId,
        plannedQuantity: parsePlanQty(l.quantityText).value,
        plannedStartDate: l.plannedStartDate,
        plannedEndDate: l.plannedEndDate,
        warehouseId: l.warehouseId,
        notes: l.notes.trim() || null,
      })),
      // Q-V5: backend từ chối nếu kế hoạch đã bị người khác lưu sau khi mở form
      expectedUpdatedAt: detail?.summary.updatedAt ?? null,
    };
    savingRef.current = true;
    setSaving(true);
    try {
      const saved = detail
        ? await productionPlanService.updatePlan(detail.summary.productionPlanId, payload)
        : await productionPlanService.createPlan(payload);
      message.success(detail ? `Đã lưu kế hoạch ${saved.summary.planCode}.` : `Đã lập kế hoạch ${saved.summary.planCode} (Nháp).`);
      onSaved(saved);
    } catch (err) {
      message.error(planErrorText(err, 'Không lưu được kế hoạch sản xuất'));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  const lineInput = 'h-7 px-2 text-xs border rounded-[6px] bg-white focus:outline-none disabled:bg-slate-50';

  return (
    <ProductionDialog
      title={detail ? `Sửa kế hoạch ${detail.summary.planCode}` : 'Lập kế hoạch sản xuất'}
      onClose={onClose}
      widthClass="max-w-6xl"
      footer={
        <>
          <button type="button" onClick={onClose} className={btnSecondary}>
            Bỏ qua
          </button>
          <button type="button" disabled={saving} onClick={() => void save()} className={btnPrimary}>
            {saving ? 'Đang lưu...' : 'Lưu kế hoạch'}
          </button>
        </>
      }
    >
      {limited && (
        <div className="mb-3 flex items-start gap-2 px-3 py-2 rounded-[8px] border border-[#0070f4]/25 bg-[#e6f1fe] text-xs text-[#1e3a8a]">
          <AlertTriangle size={14} className="shrink-0 mt-0.5 text-[#0070f4]" />
          <span>
            Kế hoạch đã duyệt: chỉ sửa được số lượng (không thấp hơn số đã lập lệnh), ngày, kho nhận, ghi chú và thêm thành phẩm có BOM.
            Không đổi tên, kỳ kế hoạch; không xóa dòng đã có lệnh.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <div className="md:col-span-2">
          <label className={labelCls}>
            Tên kế hoạch <span className="text-[#fb2c36]">*</span>
          </label>
          <input
            value={form.planName}
            maxLength={PLAN_NAME_MAX}
            disabled={limited}
            onChange={(e) => setForm((f) => ({ ...f, planName: e.target.value }))}
            placeholder="VD: Kế hoạch sản xuất tháng 12"
            className={`${inputCls} ${showErr('planName') ? 'border-[#fb2c36]' : ''}`}
          />
          {showErr('planName') && <p className="mt-1 text-xs text-[#fb2c36]">{errors.planName}</p>}
        </div>
        <div>
          <label className={labelCls}>
            Kỳ từ ngày <span className="text-[#fb2c36]">*</span>
          </label>
          <input
            type="date"
            value={form.periodStart}
            min={PLAN_MIN_DATE}
            max={form.periodEnd || PLAN_MAX_DATE}
            disabled={limited}
            onChange={(e) => {
              const value = e.target.value;
              setForm((f) => ({ ...f, periodStart: value }));
            }}
            // Chặn ngày kết thúc trước ngày bắt đầu: sửa khi rời ô (gõ tay vượt được min / max của ô ngày)
            onBlur={normalizePeriod}
            className={`${inputCls} ${showPeriodErr ? 'border-[#fb2c36]' : ''}`}
          />
        </div>
        <div>
          <label className={labelCls}>
            Đến ngày <span className="text-[#fb2c36]">*</span>
          </label>
          <input
            type="date"
            value={form.periodEnd}
            min={form.periodStart || PLAN_MIN_DATE}
            max={PLAN_MAX_DATE}
            disabled={limited}
            onChange={(e) => {
              const value = e.target.value;
              setForm((f) => ({ ...f, periodEnd: value }));
            }}
            onBlur={normalizePeriod}
            className={`${inputCls} ${showPeriodErr ? 'border-[#fb2c36]' : ''}`}
          />
        </div>
        {showPeriodErr && (
          <p className="md:col-span-4 -mt-2 text-xs text-[#fb2c36] font-medium flex items-center gap-1">
            <AlertTriangle size={13} />
            {errors.period || 'Ngày kết thúc kỳ kế hoạch không được trước ngày bắt đầu.'}
          </p>
        )}
        {pastPeriod && (
          <div className="md:col-span-4 flex items-start gap-2 px-3 py-2 rounded-[8px] border border-[#fde68a] bg-[#fffbeb] text-xs text-[#92400e]">
            <AlertTriangle size={14} className="shrink-0 mt-0.5 text-[#d97706]" />
            <span>Kỳ kế hoạch đã kết thúc trước hôm nay. Bắt buộc ghi lý do lập kế hoạch cho kỳ đã qua vào ô Ghi chú.</span>
          </div>
        )}
        <div className="md:col-span-4">
          <label className={labelCls}>
            Ghi chú {pastPeriod && <span className="text-[#fb2c36]">*</span>}
          </label>
          <textarea
            value={form.notes}
            maxLength={PLAN_NOTES_MAX}
            rows={2}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder={pastPeriod ? 'Lý do lập kế hoạch cho kỳ đã qua' : undefined}
            className={`w-full px-2.5 py-1.5 text-[13px] border rounded-[6px] focus:outline-none ${
              showErr('notes') ? 'border-[#fb2c36]' : 'border-slate-300 focus:border-[#0070f4]'
            }`}
          />
          {showErr('notes') && <p className="mt-1 text-xs text-[#fb2c36]">{errors.notes}</p>}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="text-xs font-semibold text-[#15171a]">
          Thành phẩm cần sản xuất <span className="text-[#fb2c36]">*</span>
        </div>
        <div className="w-full md:w-96">
          <ProductSearchInput
            placeholder="Theo mã, tên hàng,..."
            variant="catalog"
            productTypes={PLAN_PRODUCT_TYPES}
            excludeIds={form.lines.map((l) => l.productId)}
            onSelect={addProduct}
          />
        </div>
      </div>

      <div className="border border-slate-200 rounded-[8px] overflow-x-auto mb-2">
        <table className="w-full text-left border-collapse text-xs min-w-[980px]">
          <thead className="bg-[#f7f8f9] border-b border-slate-200 font-semibold text-[#677484]">
            <tr>
              <th className="py-1.5 px-2 w-10 text-center">STT</th>
              <th className="py-1.5 px-2">Thành phẩm</th>
              <th className="py-1.5 px-2 w-28 text-right">Số lượng *</th>
              {limited && <th className="py-1.5 px-2 w-24 text-right">Đã lập lệnh</th>}
              <th className="py-1.5 px-2 w-36">Bắt đầu *</th>
              <th className="py-1.5 px-2 w-36">Kết thúc *</th>
              <th className="py-1.5 px-2 w-40">Kho nhận thành phẩm</th>
              <th className="py-1.5 px-2 w-40">Ghi chú</th>
              <th className="py-1.5 px-2 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {form.lines.length === 0 ? (
              <tr>
                <td colSpan={limited ? 9 : 8} className={`py-6 text-center ${touched && errors.lines ? 'text-[#fb2c36]' : 'text-slate-400'}`}>
                  {touched && errors.lines ? errors.lines : 'Chưa có thành phẩm nào. Tìm và chọn thành phẩm ở ô phía trên.'}
                </td>
              </tr>
            ) : (
              form.lines.map((l, idx) => {
                const err = showErr(`line:${l.productId}`);
                const lockRemove = limited && l.orderedQuantity > 0;
                const qtyHint = parsePlanQty(l.quantityText).hint;
                const lineDateInvalid = !!l.plannedStartDate && !!l.plannedEndDate && l.plannedStartDate > l.plannedEndDate;
                const lineOutsidePeriod =
                  (!!form.periodStart && !!l.plannedStartDate && l.plannedStartDate < form.periodStart) ||
                  (!!form.periodEnd && !!l.plannedEndDate && l.plannedEndDate > form.periodEnd);
                const lineDateHasError = Boolean(lineDateInvalid || lineOutsidePeriod);
                const lineErrMsg =
                  err ||
                  (lineDateInvalid
                    ? 'Ngày kết thúc của dòng không được trước ngày bắt đầu.'
                    : lineOutsidePeriod
                      ? 'Thời gian của dòng phải nằm trong kỳ kế hoạch.'
                      : null);
                return (
                  <React.Fragment key={l.productId}>
                    <tr className={err || lineDateHasError ? 'bg-[#fef2f2]/50' : ''}>
                      <td className="py-1.5 px-2 text-center text-slate-400">{idx + 1}</td>
                      <td className="py-1.5 px-2">
                        <div className="font-mono font-semibold">{l.productCode}</div>
                        <div className="text-[11px] text-[#677484]">
                          {l.productName} · {l.unitName}
                        </div>
                        {!l.hasActiveBom && (
                          <div className="mt-0.5 text-[11px] text-[#d97706] flex items-center gap-1">
                            <AlertTriangle size={11} /> Chưa có BOM đang áp dụng
                          </div>
                        )}
                      </td>
                      <td className="py-1.5 px-2 text-right">
                        <input
                          inputMode="decimal"
                          value={l.quantityText}
                          placeholder="VD 1.000,5"
                          onChange={(e) => patchLine(l.productId, { quantityText: e.target.value })}
                          className={`${lineInput} w-24 text-right ${err ? 'border-[#fb2c36]' : 'border-slate-300 focus:border-[#0070f4]'}`}
                        />
                        {qtyHint && <div className="mt-0.5 text-[10px] text-[#677484]">{qtyHint}</div>}
                      </td>
                      {limited && <td className="py-1.5 px-2 text-right text-[#677484]">{l.orderedQuantity.toLocaleString('vi-VN')}</td>}
                      <td className="py-1.5 px-2">
                        <input
                          type="date"
                          value={l.plannedStartDate}
                          min={form.periodStart || PLAN_MIN_DATE}
                          max={l.plannedEndDate || form.periodEnd || PLAN_MAX_DATE}
                          onChange={(e) => patchLine(l.productId, { plannedStartDate: e.target.value })}
                          onBlur={() => normalizeLineDates(l.productId)}
                          className={`${lineInput} w-full ${lineDateHasError ? 'border-[#fb2c36]' : 'border-slate-300 focus:border-[#0070f4]'}`}
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          type="date"
                          value={l.plannedEndDate}
                          min={l.plannedStartDate || form.periodStart || PLAN_MIN_DATE}
                          max={form.periodEnd || PLAN_MAX_DATE}
                          onChange={(e) => patchLine(l.productId, { plannedEndDate: e.target.value })}
                          onBlur={() => normalizeLineDates(l.productId)}
                          className={`${lineInput} w-full ${lineDateHasError ? 'border-[#fb2c36]' : 'border-slate-300 focus:border-[#0070f4]'}`}
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <select
                          value={l.warehouseId ?? ''}
                          onChange={(e) => patchLine(l.productId, { warehouseId: e.target.value ? Number(e.target.value) : null })}
                          className={`${lineInput} w-full border-slate-300 focus:border-[#0070f4] cursor-pointer`}
                        >
                          <option value="">Chưa chỉ định</option>
                          {warehouses.map((w) => (
                            <option key={w.warehouseId} value={w.warehouseId}>
                              {w.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          value={l.notes}
                          maxLength={PLAN_NOTES_MAX}
                          onChange={(e) => patchLine(l.productId, { notes: e.target.value })}
                          className={`${lineInput} w-full border-slate-300 focus:border-[#0070f4]`}
                        />
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        <button
                          type="button"
                          disabled={lockRemove}
                          title={lockRemove ? 'Dòng đã có lệnh sản xuất, không xóa được' : 'Xóa dòng'}
                          onClick={() => setForm((f) => ({ ...f, lines: f.lines.filter((x) => x.productId !== l.productId) }))}
                          className="text-slate-400 hover:text-[#fb2c36] disabled:opacity-30 disabled:hover:text-slate-400 cursor-pointer disabled:cursor-not-allowed"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                    {(err || lineErrMsg) && (
                      <tr className="bg-[#fef2f2]/50">
                        <td />
                        <td colSpan={limited ? 8 : 7} className="pb-1.5 px-2 text-[11px] text-[#fb2c36]">
                          {err || lineErrMsg}
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
      {missingBom.length > 0 && !limited && (
        <p className="mb-3 text-[11px] text-[#d97706]">
          {missingBom.length} thành phẩm chưa có BOM đang áp dụng: vẫn lưu nháp được, nhưng phải thiết lập BOM trước khi gửi duyệt.
        </p>
      )}

      <button
        type="button"
        onClick={() => setShowMaterials((v) => !v)}
        className="mt-1 mb-2 inline-flex items-center gap-1 text-xs font-semibold text-[#0070f4] hover:underline cursor-pointer"
      >
        {showMaterials ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        Xem nhu cầu nguyên vật liệu dự kiến
      </button>
      {showMaterials &&
        (previewItems.length === 0 ? (
          <div className="text-xs text-slate-400 mb-2">Nhập số lượng cho ít nhất một thành phẩm để tính nhu cầu.</div>
        ) : (
          <PlanMaterialRequirementsPanel
            reloadKey={debouncedKey}
            load={(warehouseId) =>
              productionPlanService.previewMaterialRequirements(JSON.parse(debouncedKey) as typeof previewItems, warehouseId)
            }
            warehouses={warehouses}
            defaultWarehouseId={activeWarehouse.warehouseId}
          />
        ))}
    </ProductionDialog>
  );
}
