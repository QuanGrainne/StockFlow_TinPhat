'use client';

// UC-46 Xuất NVL sản xuất (kèm UC-47 xuất bổ sung, UC-48 xuất thiếu khi không đủ tồn).
// Production Accountant chọn kho NVL, nhập SL thực xuất theo báo cáo kiểm đếm của thủ kho.
// - SL thực xuất ≤ tồn hiện có (BR-33, MSG28). Luỹ kế vượt nhu cầu phải có lý do (BR-34, MSG40).
// - Xuất thiếu: phần còn thiếu giữ lại cho lần sau (MSG39).

import React, { useEffect, useMemo, useState } from 'react';
import { message } from 'antd';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { useActiveWarehouse } from '@/lib/warehouse/useActiveWarehouse';
import { ProductCodeLink } from '@/components/links/EntityLinks';
import { productionService } from '../services/productionService';
import type { MaterialIssue, ProductionOrderDetail } from '../types';
import { errorText, fmtQty, parseQty, producibleFromIssued } from '../utils/productionFormat';
import { ProductionDialog, btnPrimary, btnSecondary, inputCls, labelCls } from './ProductionDialog';

interface MaterialIssueModalProps {
  productionOrderId: number;
  /** Mở sẵn chế độ xuất bổ sung (A46.1) */
  supplementary?: boolean;
  onClose: () => void;
  onDone: (issue: MaterialIssue) => void;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function MaterialIssueModal({ productionOrderId, supplementary = false, onClose, onDone }: MaterialIssueModalProps) {
  const { activeWarehouse, warehouses } = useActiveWarehouse();
  const [warehouseId, setWarehouseId] = useState<number>(activeWarehouse.warehouseId);
  const [isSupplementary, setIsSupplementary] = useState(supplementary);
  const [reason, setReason] = useState('');
  const [inputs, setInputs] = useState<Record<number, string>>({});
  const [selectedProducts, setSelectedProducts] = useState<Record<number, boolean>>({});
  const [batchQtys, setBatchQtys] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState<{ key: string; detail: ProductionOrderDetail | null; error?: string }>({ key: '', detail: null });

  const requestKey = `${productionOrderId}:${warehouseId}`;
  const loading = loaded.key !== requestKey;
  const detail = loaded.detail;

  const orderItems = useMemo(() => {
    if (!detail) return [];
    return detail.summary.items && detail.summary.items.length > 0
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
        ];
  }, [detail]);

  useEffect(() => {
    let stale = false;
    productionService
      .getOrder(productionOrderId, warehouseId)
      .then((d) => {
        if (stale) return;
        setLoaded({ key: requestKey, detail: d });
        const itemsList =
          d.summary.items && d.summary.items.length > 0
            ? d.summary.items
            : [
                {
                  productionOrderItemId: 0,
                  productId: d.summary.productId,
                  plannedQuantity: d.summary.plannedQuantity,
                },
              ];
        setSelectedProducts(Object.fromEntries(itemsList.map((it) => [it.productId, true])));
        setBatchQtys(Object.fromEntries(itemsList.map((it) => [it.productId, String(it.plannedQuantity)])));
        // Gợi ý SL thực xuất = phần còn thiếu, không vượt tồn (xuất chính); xuất bổ sung để trống
        setInputs(
          Object.fromEntries(
            d.materials.map((m) => {
              const suggest = supplementary ? 0 : Math.max(0, Math.min(m.shortageQty, m.availableQty ?? 0));
              return [m.requirementId, suggest > 0 ? String(round2(suggest)) : ''];
            })
          )
        );
      })
      .catch((err: unknown) => {
        if (!stale) setLoaded({ key: requestKey, detail: null, error: errorText(err, 'Không tải được lệnh sản xuất') });
      });
    return () => {
      stale = true;
    };
  }, [productionOrderId, warehouseId, requestKey, supplementary]);

  function applyProductBatchSelection(nextSelected: Record<number, boolean>, nextBatchQtys: Record<number, string>) {
    if (!detail) return;
    const nextInputs: Record<number, string> = {};
    for (const m of detail.materials) {
      const fpId = m.finishedProductId ?? detail.summary.productId;
      const isChecked = nextSelected[fpId] ?? true;
      if (!isChecked) {
        nextInputs[m.requirementId] = '';
        continue;
      }
      if (isSupplementary) {
        nextInputs[m.requirementId] = inputs[m.requirementId] ?? '';
        continue;
      }
      const batchStr = nextBatchQtys[fpId] ?? '';
      const batchNum = parseQty(batchStr);
      const itemInfo = orderItems.find((oi) => oi.productId === fpId);
      const plannedNum = itemInfo?.plannedQuantity ?? detail.summary.plannedQuantity;
      const available = Math.max(0, m.availableQty ?? 0);
      let neededForBatch = m.shortageQty;
      if (!Number.isNaN(batchNum) && batchNum > 0 && plannedNum > 0) {
        if (Math.abs(batchNum - plannedNum) < 0.0001) {
          neededForBatch = m.shortageQty;
        } else {
          neededForBatch = round2(batchNum * m.normPerUnit * (1 + m.wastageRate / 100));
        }
      }
      const suggest = Math.max(0, Math.min(neededForBatch, available));
      nextInputs[m.requirementId] = suggest > 0 ? String(round2(suggest)) : '';
    }
    setInputs(nextInputs);
  }

  function toggleProductSelection(productId: number, checked: boolean) {
    const nextSelected = { ...selectedProducts, [productId]: checked };
    setSelectedProducts(nextSelected);
    applyProductBatchSelection(nextSelected, batchQtys);
  }

  function changeBatchQty(productId: number, value: string) {
    const nextBatch = { ...batchQtys, [productId]: value };
    setBatchQtys(nextBatch);
    applyProductBatchSelection(selectedProducts, nextBatch);
  }

  const rows = useMemo(
    () =>
      (detail?.materials ?? []).map((m) => {
        const raw = inputs[m.requirementId] ?? '';
        const qty = raw.trim() === '' ? 0 : parseQty(raw);
        const available = Math.max(0, m.availableQty ?? 0);
        const invalid = Number.isNaN(qty) || qty < 0 || qty > available;
        const exceeds = !invalid && m.issuedQty + qty > m.requiredQty;
        return { m, qty: Number.isNaN(qty) ? 0 : qty, available, invalid, exceeds };
      }),
    [detail, inputs]
  );

  // Xem trước số thành phẩm làm được: theo NVL đã xuất, và sau khi xuất thêm SL thực xuất đang nhập
  const extraIssued = useMemo(
    () => Object.fromEntries(rows.filter((r) => !r.invalid && r.qty > 0).map((r) => [r.m.requirementId, r.qty])),
    [rows]
  );
  const producibleOf = (oi: { productionOrderItemId: number; plannedQuantity: number }, withExtra: boolean): number | null =>
    detail ? producibleFromIssued(detail.materials, oi.plannedQuantity, oi.productionOrderItemId || null, withExtra ? extraIssued : undefined) : null;

  const anyInvalid = rows.some((r) => r.invalid);
  const anyExceeds = rows.some((r) => r.exceeds && r.qty > 0);
  const totalQty = rows.reduce((s, r) => s + (r.invalid ? 0 : r.qty), 0);
  const reasonMissing = anyExceeds && !reason.trim();

  async function submit() {
    if (!detail) return;
    if (anyInvalid) {
      message.error('Số lượng thực xuất không được âm và không được vượt tồn kho hiện có.');
      return;
    }
    if (totalQty <= 0) {
      message.error('Vui lòng nhập số lượng thực xuất cho ít nhất một nguyên vật liệu.');
      return;
    }
    if (reasonMissing) {
      message.error('Số lượng xuất luỹ kế vượt nhu cầu theo BOM. Vui lòng nhập lý do.');
      return;
    }
    setBusy(true);
    try {
      const issue = await productionService.createMaterialIssue({
        productionOrderId,
        warehouseId,
        isSupplementary,
        reason: reason.trim() || null,
        items: rows.filter((r) => r.qty > 0).map((r) => ({ requirementId: r.m.requirementId, quantity: round2(r.qty) })),
      });
      message.success(`Đã ghi nhận phiếu xuất NVL ${issue.issueCode} cho lệnh ${detail.summary.code}.`);
      // MSG39: còn NVL chưa xuất đủ
      if (rows.some((r) => r.m.shortageQty - r.qty > 0.004)) {
        message.warning('Tồn kho chưa đủ / chưa xuất đủ. Phần NVL còn thiếu đã được ghi nhận cho lệnh sản xuất.');
      }
      onDone(issue);
    } catch (err) {
      message.error(errorText(err, 'Không ghi nhận được phiếu xuất NVL'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ProductionDialog
      title={
        <span>
          Xuất NVL sản xuất{detail ? <span className="font-mono text-[#0070f4]"> · {detail.summary.code}</span> : null}
        </span>
      }
      onClose={onClose}
      widthClass="max-w-5xl"
      footer={
        <>
          <button type="button" onClick={onClose} className={btnSecondary}>
            Bỏ qua
          </button>
          <button type="button" disabled={busy || loading || !detail} onClick={submit} className={btnPrimary}>
            {busy ? 'Đang xử lý...' : 'Xác nhận xuất kho'}
          </button>
        </>
      }
    >
      {detail && (
        <div className="mb-4 border border-slate-200 rounded-[8px] overflow-hidden bg-slate-50/50">
          <div className="px-3 py-1.5 bg-[#f7f8f9] border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="font-semibold text-[#15171a]">Lựa chọn thành phẩm muốn xuất kho</span>
            <span className="text-[11px] text-[#677484]">
              Nhập &quot;SL sản xuất đợt này&quot; để hệ thống tự tính lượng NVL cần xuất theo đợt
            </span>
          </div>
          <table className="w-full text-left border-collapse text-xs">
            <thead className="text-[#677484] border-b border-slate-200 bg-white">
              <tr>
                <th className="py-1.5 px-3 w-10 text-center">Chọn</th>
                <th className="py-1.5 px-3 w-32">Mã thành phẩm</th>
                <th className="py-1.5 px-3">Tên thành phẩm</th>
                <th className="py-1.5 px-3 w-16 text-center">ĐVT</th>
                <th className="py-1.5 px-3 w-28 text-right">SL theo lệnh</th>
                <th className="py-1.5 px-3 w-28 text-right" title="Số thành phẩm làm được từ NVL đã xuất trước đợt này">
                  Đủ SX hiện tại
                </th>
                <th className="py-1.5 px-3 w-32 text-right" title="Số thành phẩm làm được sau khi xuất thêm SL thực xuất bên dưới">
                  Đủ SX sau đợt này
                </th>
                <th className="py-1.5 px-3 w-36 text-right">SL sản xuất đợt này</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {orderItems.map((oi) => {
                const checked = selectedProducts[oi.productId] ?? true;
                return (
                  <tr key={oi.productId} className={checked ? '' : 'opacity-50'}>
                    <td className="py-1.5 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => toggleProductSelection(oi.productId, e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-slate-300 cursor-pointer"
                      />
                    </td>
                    <td className="py-1.5 px-3 font-mono font-semibold text-[#0070f4]">{oi.productCode}</td>
                    <td className="py-1.5 px-3 font-medium">{oi.productName}</td>
                    <td className="py-1.5 px-3 text-center text-slate-500">{oi.unitName}</td>
                    <td className="py-1.5 px-3 text-right">{fmtQty(oi.plannedQuantity)}</td>
                    <td className="py-1.5 px-3 text-right text-[#677484]">{fmtQty(producibleOf(oi, false) ?? oi.plannedQuantity)}</td>
                    <td className="py-1.5 px-3 text-right font-semibold text-[#16a34a]">
                      {fmtQty(producibleOf(oi, true) ?? oi.plannedQuantity)}
                    </td>
                    <td className="py-1 px-3">
                      <input
                        inputMode="decimal"
                        disabled={!checked || isSupplementary}
                        value={batchQtys[oi.productId] ?? ''}
                        onChange={(e) => changeBatchQty(oi.productId, e.target.value)}
                        className="w-full h-6 px-2 text-right text-xs border border-slate-300 rounded-[6px] focus:outline-none focus:border-[#0070f4] disabled:bg-slate-50"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-4 mb-3">
        <div className="w-64">
          <label className={labelCls}>Kho xuất NVL</label>
          <select value={warehouseId} onChange={(e) => setWarehouseId(Number(e.target.value))} className={inputCls}>
            {warehouses.map((w) => (
              <option key={w.warehouseId} value={w.warehouseId}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-xs h-8 cursor-pointer">
          <input
            type="checkbox"
            checked={isSupplementary}
            onChange={(e) => setIsSupplementary(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 cursor-pointer"
          />
          <span>Xuất bổ sung (hao hụt, hỏng NVL trong sản xuất)</span>
        </label>
      </div>

      <div className="border border-slate-200 rounded-[8px] overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs min-w-[880px]">
          <thead className="bg-[#f7f8f9] border-b border-slate-200 font-semibold text-[#677484]">
            <tr>
              <th className="py-2 px-3 w-10 text-center">STT</th>
              <th className="py-2 px-3 w-32">Mã NVL</th>
              <th className="py-2 px-3">Tên NVL</th>
              {orderItems.length > 1 && <th className="py-2 px-3 w-28">Thành phẩm</th>}
              <th className="py-2 px-3 w-14 text-center">ĐVT</th>
              <th className="py-2 px-3 w-24 text-right">Nhu cầu</th>
              <th className="py-2 px-3 w-24 text-right">Đã xuất</th>
              <th className="py-2 px-3 w-24 text-right">Còn thiếu</th>
              <th className="py-2 px-3 w-24 text-right">Tồn kho</th>
              <th className="py-2 px-3 w-32 text-right">SL thực xuất</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={orderItems.length > 1 ? 10 : 9} className="py-10 text-center text-slate-400">
                  <RefreshCcw size={16} className="animate-spin mx-auto mb-2 text-[#0070f4]" />
                  Đang tải nhu cầu NVL...
                </td>
              </tr>
            ) : !detail ? (
              <tr>
                <td colSpan={orderItems.length > 1 ? 10 : 9} className="py-8 text-center text-[#fb2c36]">
                  {loaded.error}
                </td>
              </tr>
            ) : (
              rows.map(({ m, available, invalid, exceeds }, i) => {
                const fpId = m.finishedProductId ?? detail.summary.productId;
                const fpChecked = selectedProducts[fpId] ?? true;
                return (
                  <tr key={m.requirementId} className={fpChecked ? '' : 'opacity-45 bg-slate-50'}>
                    <td className="py-2 px-3 text-center text-slate-400">{i + 1}</td>
                    <td className="py-2 px-3 font-mono font-semibold">
                      <ProductCodeLink code={m.materialCode} productId={m.materialId} />
                    </td>
                    <td className="py-2 px-3 font-medium">{m.materialName}</td>
                    {orderItems.length > 1 && (
                      <td className="py-2 px-3 font-mono text-[11px] text-[#0070f4]">
                        {m.finishedProductCode ?? detail.summary.productCode}
                      </td>
                    )}
                    <td className="py-2 px-3 text-center text-slate-500">{m.unitName}</td>
                    <td className="py-2 px-3 text-right">{fmtQty(m.requiredQty)}</td>
                    <td className="py-2 px-3 text-right">{fmtQty(m.issuedQty)}</td>
                    <td className={`py-2 px-3 text-right font-semibold ${m.shortageQty > 0 ? 'text-[#d97706]' : 'text-[#16a34a]'}`}>
                      {fmtQty(m.shortageQty)}
                    </td>
                    <td className={`py-2 px-3 text-right ${available <= 0 ? 'text-[#fb2c36]' : ''}`}>{fmtQty(m.availableQty)}</td>
                    <td className="py-1.5 px-3">
                      <input
                        inputMode="decimal"
                        value={inputs[m.requirementId] ?? ''}
                        onChange={(e) => setInputs((prev) => ({ ...prev, [m.requirementId]: e.target.value }))}
                        placeholder="0"
                        className={`w-full h-7 px-2 text-right text-xs border rounded-[6px] focus:outline-none ${
                          invalid ? 'border-[#fb2c36] bg-[#fef2f2]' : exceeds ? 'border-amber-400' : 'border-slate-300 focus:border-[#0070f4]'
                        }`}
                        title={invalid ? 'Không được âm và không vượt tồn kho' : exceeds ? 'Luỹ kế vượt nhu cầu' : undefined}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {anyInvalid && (
        <p className="mt-2 text-xs text-[#fb2c36]">Số lượng thực xuất không được âm và không được vượt tồn kho hiện có.</p>
      )}

      <div className="mt-3">
        <label className={labelCls}>
          Lý do {anyExceeds ? <span className="text-[#fb2c36]">* (bắt buộc vì xuất vượt nhu cầu)</span> : '(nếu có)'}
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
          rows={2}
          placeholder={isSupplementary ? 'VD: hao hụt khi chạy máy, rách màng, NVL ẩm...' : 'Ghi chú cho phiếu xuất'}
          className={`w-full px-2.5 py-1.5 text-[13px] border rounded-[6px] focus:outline-none ${
            reasonMissing ? 'border-[#fb2c36]' : 'border-slate-300 focus:border-[#0070f4]'
          }`}
        />
        {reasonMissing && (
          <p className="mt-1 text-xs text-[#fb2c36] flex items-center gap-1">
            <AlertTriangle size={12} /> Vui lòng nhập lý do.
          </p>
        )}
      </div>

      <div className="mt-3 text-xs text-[#677484] flex justify-between">
        <span>SL thực xuất lấy theo báo cáo kiểm đếm của thủ kho. Dòng để trống hoặc 0 sẽ không xuất.</span>
        <span>
          Tổng SL xuất: <b className="text-[#15171a]">{fmtQty(totalQty)}</b>
        </span>
      </div>
    </ProductionDialog>
  );
}
