'use client';

// BR-51 / BR-52: Manager điều chỉnh định mức NVL ngay trên lệnh sản xuất (sửa định mức / hao hụt, thêm hoặc bỏ NVL),
// bắt buộc có lý do. Chỉ áp cho lệnh này, BOM gốc không đổi. Nhu cầu mới không thấp hơn số đã xuất;
// không bỏ được NVL đã xuất.

import React, { useMemo, useState } from 'react';
import { message } from 'antd';
import { Trash2, Undo2 } from 'lucide-react';
import { productionService } from '../services/productionService';
import type { AdjustNormLine, ProductionOrderDetail, ProductionProductLookup } from '../types';
import { errorText, fmtQty, parseQty } from '../utils/productionFormat';
import { ProductionDialog, btnPrimary, btnSecondary, labelCls } from './ProductionDialog';
import { ProductSearchInput } from './ProductSearchInput';

interface AdjustNormModalProps {
  detail: ProductionOrderDetail;
  onClose: () => void;
  onDone: (detail: ProductionOrderDetail) => void;
}

interface Row {
  key: string;
  requirementId: number | null;
  productionOrderItemId: number | null;
  finishedProductCode: string;
  plannedQty: number;
  materialId: number;
  materialCode: string;
  materialName: string;
  unitName: string;
  issuedQty: number;
  origNorm: number | null;
  origRate: number | null;
  norm: string;
  rate: string;
  required: string;
  remove: boolean;
}

/** BR-31: nhu cầu = SL kế hoạch × định mức × (1 + hao hụt%), làm tròn half-up 2 chữ số */
const calcRequired = (planned: number, norm: number, rate: number) =>
  Math.round(planned * norm * (1 + rate / 100) * 100 + Number.EPSILON) / 100;

const calcNormFromRequired = (planned: number, required: number, rate: number) => {
  const denom = planned * (1 + rate / 100);
  return denom > 0 ? Math.round((required / denom) * 10000 + Number.EPSILON) / 10000 : 0;
};

/** Số chữ số thập phân người dùng nhập không vượt giới hạn lưu trữ */
const maxDecimals = (value: string, digits: number) => {
  const parts = value.trim().replace(',', '.').split('.');
  return parts.length < 2 || parts[1].length <= digits;
};

export function AdjustNormModal({ detail, onClose, onDone }: AdjustNormModalProps) {
  const orderItems = useMemo(
    () =>
      detail.summary.items && detail.summary.items.length > 0
        ? detail.summary.items
        : [
            {
              productionOrderItemId: 0,
              productId: detail.summary.productId,
              productCode: detail.summary.productCode,
              productName: detail.summary.productName,
              unitName: detail.summary.unitName,
              bomId: detail.summary.bomId,
              bomCode: detail.summary.bomCode,
              bomVersion: detail.summary.bomVersion,
              plannedQuantity: detail.summary.plannedQuantity,
              receivedQuantity: detail.summary.receivedQuantity,
              remainingQuantity: Math.max(0, detail.summary.plannedQuantity - detail.summary.receivedQuantity),
              progressPercent: detail.summary.progressPercent,
              notes: null,
            },
          ],
    [detail.summary]
  );

  const [selectedItemId, setSelectedItemId] = useState<number>(orderItems[0]?.productionOrderItemId ?? 0);
  const [allowAllTypes, setAllowAllTypes] = useState(false);

  const [rows, setRows] = useState<Row[]>(() =>
    detail.materials.map((m) => {
      const matchedItem =
        orderItems.find((oi) => oi.productionOrderItemId > 0 && oi.productionOrderItemId === m.productionOrderItemId) ??
        orderItems[0];
      const itemPlanned = matchedItem?.plannedQuantity ?? detail.summary.plannedQuantity;
      return {
        key: `r${m.requirementId}`,
        requirementId: m.requirementId,
        productionOrderItemId: m.productionOrderItemId ?? (matchedItem?.productionOrderItemId || null),
        finishedProductCode: m.finishedProductCode ?? matchedItem?.productCode ?? detail.summary.productCode,
        plannedQty: itemPlanned,
        materialId: m.materialId,
        materialCode: m.materialCode,
        materialName: m.materialName,
        unitName: m.unitName,
        issuedQty: m.issuedQty,
        origNorm: m.normPerUnit,
        origRate: m.wastageRate,
        norm: String(m.normPerUnit),
        rate: String(m.wastageRate),
        required: String(m.requiredQty),
        remove: false,
      };
    })
  );
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const activeOrderItem =
    orderItems.find((oi) => oi.productionOrderItemId === selectedItemId) ?? orderItems[0];

  const computed = useMemo(
    () =>
      rows.map((r) => {
        const norm = parseQty(r.norm);
        const rate = r.rate.trim() === '' ? 0 : parseQty(r.rate);
        const reqInput = parseQty(r.required);
        const normOk = !Number.isNaN(norm) && norm > 0 && maxDecimals(r.norm, 4);
        const rateOk = !Number.isNaN(rate) && rate >= 0 && rate <= 100 && maxDecimals(r.rate, 2);
        const required = normOk && rateOk ? calcRequired(r.plannedQty, norm, rate) : !Number.isNaN(reqInput) && reqInput > 0 ? reqInput : null;
        const belowIssued = required !== null && required < r.issuedQty;
        const changed =
          r.remove || r.requirementId === null || (normOk && rateOk && (norm !== r.origNorm || rate !== r.origRate));
        return { r, norm, rate, normOk, rateOk, required, belowIssued, changed };
      }),
    [rows]
  );

  const visibleComputed = useMemo(
    () =>
      orderItems.length <= 1
        ? computed
        : computed.filter(
            (c) =>
              c.r.productionOrderItemId === selectedItemId ||
              (!c.r.productionOrderItemId && selectedItemId === orderItems[0]?.productionOrderItemId)
          ),
    [computed, orderItems, selectedItemId]
  );

  const update = (key: string, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  function updateNorm(key: string, normStr: string) {
    const n = parseQty(normStr);
    setRows((prev) =>
      prev.map((r) => {
        if (r.key !== key) return r;
        const rate = r.rate.trim() === '' ? 0 : parseQty(r.rate);
        const nextReq =
          !Number.isNaN(n) && n > 0 && !Number.isNaN(rate) && rate >= 0
            ? String(calcRequired(r.plannedQty, n, rate))
            : r.required;
        return { ...r, norm: normStr, required: nextReq };
      })
    );
  }

  function updateRate(key: string, rateStr: string) {
    const rate = rateStr.trim() === '' ? 0 : parseQty(rateStr);
    setRows((prev) =>
      prev.map((r) => {
        if (r.key !== key) return r;
        const n = parseQty(r.norm);
        const nextReq =
          !Number.isNaN(n) && n > 0 && !Number.isNaN(rate) && rate >= 0
            ? String(calcRequired(r.plannedQty, n, rate))
            : r.required;
        return { ...r, rate: rateStr, required: nextReq };
      })
    );
  }

  function updateRequired(key: string, reqStr: string) {
    const reqNum = parseQty(reqStr);
    setRows((prev) =>
      prev.map((r) => {
        if (r.key !== key) return r;
        const rate = r.rate.trim() === '' ? 0 : parseQty(r.rate);
        const nextNorm =
          !Number.isNaN(reqNum) && reqNum > 0 && !Number.isNaN(rate) && rate >= 0
            ? String(calcNormFromRequired(r.plannedQty, reqNum, rate))
            : r.norm;
        return { ...r, required: reqStr, norm: nextNorm };
      })
    );
  }

  function addMaterial(p: ProductionProductLookup) {
    if (p.productId === activeOrderItem.productId) {
      message.warning('Thành phẩm không được là nguyên vật liệu của chính nó.');
      return;
    }
    const itemPlanned = activeOrderItem.plannedQuantity || detail.summary.plannedQuantity;
    setRows((prev) => [
      ...prev,
      {
        key: `n${activeOrderItem.productionOrderItemId}_${p.productId}`,
        requirementId: null,
        productionOrderItemId: activeOrderItem.productionOrderItemId > 0 ? activeOrderItem.productionOrderItemId : null,
        finishedProductCode: activeOrderItem.productCode,
        plannedQty: itemPlanned,
        materialId: p.productId,
        materialCode: p.productCode,
        materialName: p.productName,
        unitName: p.unitName,
        issuedQty: 0,
        origNorm: null,
        origRate: null,
        norm: '1',
        rate: '0',
        required: String(calcRequired(itemPlanned, 1, 0)),
        remove: false,
      },
    ]);
  }

  async function submit() {
    const changedRows = computed.filter((c) => c.changed);
    if (changedRows.length === 0) {
      message.warning('Không có thay đổi định mức nào.');
      return;
    }
    const invalid = changedRows.find((c) => !c.r.remove && (!c.normOk || !c.rateOk));
    if (invalid) {
      message.error(`Định mức / hao hụt của ${invalid.r.materialCode} không hợp lệ (định mức > 0, tối đa 4 chữ số thập phân; hao hụt 0–100%).`);
      return;
    }
    const below = changedRows.find((c) => !c.r.remove && c.belowIssued);
    if (below) {
      message.error(`Nhu cầu NVL không được thấp hơn số lượng đã xuất (${below.r.materialCode}).`);
      return;
    }
    if (!reason.trim()) {
      message.error('Vui lòng nhập lý do điều chỉnh định mức.');
      return;
    }
    const lines: AdjustNormLine[] = changedRows
      .filter((c) => !(c.r.requirementId === null && c.r.remove))
      .map((c) => ({
        requirementId: c.r.requirementId,
        materialId: c.r.materialId,
        normPerUnit: c.r.remove ? 0 : c.norm,
        wastageRate: c.r.remove ? 0 : c.rate,
        remove: c.r.remove,
        productionOrderItemId: c.r.productionOrderItemId,
      }));
    setBusy(true);
    try {
      const updated = await productionService.adjustNorms(detail.summary.productionOrderId, reason.trim(), lines);
      message.success('Đã điều chỉnh định mức NVL của lệnh sản xuất.');
      onDone(updated);
    } catch (err) {
      message.error(errorText(err, 'Không điều chỉnh được định mức'));
    } finally {
      setBusy(false);
    }
  }

  const cellInput = (bad: boolean) =>
    `w-full h-7 px-2 text-right text-xs border rounded-[6px] focus:outline-none ${
      bad ? 'border-[#fb2c36] bg-[#fef2f2]' : 'border-slate-300 focus:border-[#0070f4]'
    } disabled:bg-slate-50 disabled:text-slate-400`;

  return (
    <ProductionDialog
      title={
        <span>
          Điều chỉnh định mức <span className="font-mono text-[#0070f4]">· {detail.summary.code}</span>
        </span>
      }
      onClose={onClose}
      widthClass="max-w-5xl"
      footer={
        <>
          <button type="button" onClick={onClose} className={btnSecondary}>
            Bỏ qua
          </button>
          <button type="button" disabled={busy} onClick={submit} className={btnPrimary}>
            {busy ? 'Đang xử lý...' : 'Lưu điều chỉnh'}
          </button>
        </>
      }
    >
      <p className="text-xs text-[#677484] mb-3">
        Điều chỉnh chỉ áp dụng cho lệnh này (SL kế hoạch {fmtQty(activeOrderItem.plannedQuantity)} {activeOrderItem.unitName} của{' '}
        <b className="text-[#15171a]">{activeOrderItem.productCode}</b>), định mức gốc{' '}
        <b className="text-[#15171a]">{activeOrderItem.bomCode}</b> không thay đổi. Hỗ trợ tính 2 chiều: sửa <b>Định mức / 1 đv</b> ⇄ tự tính <b>Nhu cầu mới</b>.
      </p>

      {orderItems.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-1.5 border-b border-slate-200 pb-2">
          {orderItems.map((oi) => {
            const active = oi.productionOrderItemId === selectedItemId;
            return (
              <button
                key={oi.productionOrderItemId}
                type="button"
                onClick={() => setSelectedItemId(oi.productionOrderItemId)}
                className={`px-3 py-1.5 rounded-[6px] text-xs font-semibold cursor-pointer transition ${
                  active
                    ? 'bg-[#0070f4] text-white'
                    : 'bg-slate-100 text-[#677484] hover:bg-slate-200 hover:text-[#15171a]'
                }`}
              >
                {oi.productCode} · {oi.productName} ({fmtQty(oi.plannedQuantity)} {oi.unitName})
              </button>
            );
          })}
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 max-w-md">
          <ProductSearchInput
            placeholder={`Thêm nguyên vật liệu ngoài định mức cho ${activeOrderItem.productCode} (mã hoặc tên)`}
            productType={allowAllTypes ? undefined : 'RAW_MATERIAL'}
            onSelect={addMaterial}
            excludeIds={[
              activeOrderItem.productId,
              ...visibleComputed.map((c) => c.r.materialId),
            ]}
          />
        </div>
        <label className="inline-flex items-center gap-1.5 text-xs text-[#677484] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={allowAllTypes}
            onChange={(e) => setAllowAllTypes(e.target.checked)}
            className="rounded border-slate-300"
          />
          Hiện cả Bán thành phẩm / Thành phẩm
        </label>
      </div>

      <div className="border border-slate-200 rounded-[8px] overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs min-w-[860px]">
          <thead className="bg-[#f7f8f9] border-b border-slate-200 font-semibold text-[#677484]">
            <tr>
              <th className="py-2 px-3 w-32">Mã NVL</th>
              <th className="py-2 px-3">Tên NVL</th>
              <th className="py-2 px-3 w-14 text-center">ĐVT</th>
              <th className="py-2 px-3 w-28 text-right">Định mức / 1 đv</th>
              <th className="py-2 px-3 w-24 text-right">Hao hụt %</th>
              <th className="py-2 px-3 w-28 text-right">Nhu cầu mới</th>
              <th className="py-2 px-3 w-24 text-right">Đã xuất</th>
              <th className="py-2 px-3 w-12" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleComputed.map(({ r, normOk, rateOk, belowIssued, changed }) => (
              <tr key={r.key} className={r.remove ? 'opacity-50 line-through' : changed ? 'bg-[#fffbeb]/60' : ''}>
                <td className="py-2 px-3 font-mono font-semibold">
                  {r.materialCode}
                  {r.requirementId === null && <span className="ml-1 text-[10px] text-[#0070f4] no-underline">mới</span>}
                </td>
                <td className="py-2 px-3">{r.materialName}</td>
                <td className="py-2 px-3 text-center text-slate-500">{r.unitName}</td>
                <td className="py-1.5 px-3">
                  <input
                    inputMode="decimal"
                    value={r.norm}
                    disabled={r.remove}
                    onChange={(e) => updateNorm(r.key, e.target.value)}
                    className={cellInput(!r.remove && !normOk)}
                    title="Sửa Định mức / 1 đv sẽ tự tính Nhu cầu mới"
                  />
                </td>
                <td className="py-1.5 px-3">
                  <input
                    inputMode="decimal"
                    value={r.rate}
                    disabled={r.remove}
                    onChange={(e) => updateRate(r.key, e.target.value)}
                    className={cellInput(!r.remove && !rateOk)}
                  />
                </td>
                <td className="py-1.5 px-3">
                  <input
                    inputMode="decimal"
                    value={r.required}
                    disabled={r.remove}
                    onChange={(e) => updateRequired(r.key, e.target.value)}
                    className={`${cellInput(!r.remove && belowIssued)} font-semibold`}
                    title="Sửa Nhu cầu mới sẽ tự chia ngược lại Định mức / 1 đv"
                  />
                </td>
                <td className="py-2 px-3 text-right">{fmtQty(r.issuedQty)}</td>
                <td className="py-2 px-3 text-center">
                  {r.requirementId === null ? (
                    <button
                      type="button"
                      onClick={() => setRows((prev) => prev.filter((x) => x.key !== r.key))}
                      className="text-slate-400 hover:text-rose-600 cursor-pointer"
                      title="Bỏ dòng vừa thêm"
                    >
                      <Trash2 size={14} />
                    </button>
                  ) : r.remove ? (
                    <button type="button" onClick={() => update(r.key, { remove: false })} className="text-slate-500 hover:text-[#0070f4] cursor-pointer" title="Giữ lại">
                      <Undo2 size={14} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={r.issuedQty > 0}
                      onClick={() => update(r.key, { remove: true })}
                      className="text-slate-400 hover:text-rose-600 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                      title={r.issuedQty > 0 ? 'NVL đã xuất, không bỏ được' : 'Bỏ NVL khỏi lệnh'}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {computed.some((c) => !c.r.remove && c.belowIssued) && (
        <p className="mt-2 text-xs text-[#fb2c36]">Nhu cầu NVL không được thấp hơn số lượng đã xuất.</p>
      )}

      <div className="mt-3">
        <label className={labelCls}>
          Lý do điều chỉnh <span className="text-[#fb2c36]">*</span>
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={300}
          rows={2}
          placeholder="VD: đổi lô NVL có độ dày khác, khách yêu cầu thay đổi quy cách..."
          className="w-full px-2.5 py-1.5 text-[13px] border border-slate-300 rounded-[6px] focus:outline-none focus:border-[#0070f4]"
        />
      </div>
    </ProductionDialog>
  );
}
