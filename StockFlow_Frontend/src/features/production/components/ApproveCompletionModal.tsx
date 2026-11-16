'use client';

// Duyệt hoàn thành lệnh sản xuất (Manager): nhập SL thực tế đạt / lỗi của từng thành phẩm,
// hệ thống TỰ SINH phiếu nhập thành phẩm vào kho đã chọn rồi chuyển lệnh sang Hoàn thành.
// Giữ luật của nhập thành phẩm: BR-35 vượt kế hoạch hỏi [Có]/[Không], BR-36 chỉ SL đạt vào tồn,
// BR-37 cần nhiều NVL hơn số đã xuất → bắt buộc ghi chú (phiếu gắn cờ xem xét).

import React, { useEffect, useMemo, useState } from 'react';
import { message } from 'antd';
import { AlertTriangle } from 'lucide-react';
import { useActiveWarehouse } from '@/lib/warehouse/useActiveWarehouse';
import { productionService } from '../services/productionService';
import type { ProductionOrderDetail, WarehouseLocation } from '../types';
import { errorText, fmtQty, parseQty, todayIso } from '../utils/productionFormat';
import { ProductionDialog, btnPrimary, btnSecondary, inputCls, labelCls } from './ProductionDialog';

interface ApproveCompletionModalProps {
  detail: ProductionOrderDetail;
  onClose: () => void;
  onDone: (detail: ProductionOrderDetail) => void;
}

interface LineDraft {
  productionOrderItemId: number | null;
  productCode: string;
  productName: string;
  unitName: string;
  planned: number;
  received: number;
  accepted: string;
  defect: string;
  defectReason: string;
}

const CONFIRM_EXCEED = '[CONFIRM_EXCEED_PLAN]';
const MATERIAL_WARNING = 'Số thành phẩm cần nhiều NVL hơn số đã xuất';
const DEFECT_REASONS = ['Trầy xước bề mặt / phồng màng', 'Cong vênh do nhiệt', 'Nứt mối nối', 'Sai độ dày', 'Khác'];

const qtyOrZero = (v: string) => (v.trim() === '' ? 0 : parseQty(v));
const badQty = (n: number) => Number.isNaN(n) || n < 0 || Math.round(n * 100) !== n * 100;

export function ApproveCompletionModal({ detail, onClose, onDone }: ApproveCompletionModalProps) {
  const s = detail.summary;
  const { activeWarehouse, warehouses } = useActiveWarehouse();
  const [warehouseId, setWarehouseId] = useState<number>(activeWarehouse.warehouseId);
  const [locations, setLocations] = useState<{ warehouseId: number; items: WarehouseLocation[] }>({ warehouseId: 0, items: [] });
  const [locationId, setLocationId] = useState<number | null>(null);
  const [lotNumber, setLotNumber] = useState(s.code);
  const [productionDate, setProductionDate] = useState(todayIso());
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [exceedMsg, setExceedMsg] = useState<string | null>(null);
  const [needReviewNote, setNeedReviewNote] = useState(false);
  const [reviewNote, setReviewNote] = useState('');

  // Mỗi thành phẩm của lệnh 1 dòng, mặc định SL đạt = phần còn lại theo kế hoạch
  const [lines, setLines] = useState<LineDraft[]>(() => {
    const items =
      s.items && s.items.length > 0
        ? s.items.map((it) => ({ ...it, id: it.productionOrderItemId as number | null }))
        : [{ ...s, id: null, plannedQuantity: s.plannedQuantity, receivedQuantity: s.receivedQuantity }];
    return items.map((it) => {
      const remaining = Math.max(0, it.plannedQuantity - it.receivedQuantity);
      return {
        productionOrderItemId: it.id,
        productCode: it.productCode,
        productName: it.productName,
        unitName: it.unitName,
        planned: it.plannedQuantity,
        received: it.receivedQuantity,
        accepted: remaining > 0 ? String(remaining) : '0',
        defect: '',
        defectReason: '',
      };
    });
  });

  useEffect(() => {
    let stale = false;
    productionService
      .getLocations(warehouseId)
      .then((items) => {
        if (!stale) setLocations({ warehouseId, items });
      })
      .catch(() => {
        if (!stale) setLocations({ warehouseId, items: [] });
      });
    return () => {
      stale = true;
    };
  }, [warehouseId]);

  const parsed = useMemo(
    () =>
      lines.map((l) => {
        const accepted = qtyOrZero(l.accepted);
        const defect = qtyOrZero(l.defect);
        return {
          accepted,
          defect,
          acceptedBad: badQty(accepted),
          defectBad: badQty(defect),
          reasonMissing: !badQty(defect) && defect > 0 && !l.defectReason.trim(),
          exceeds: !badQty(accepted) && l.received + accepted > l.planned,
        };
      }),
    [lines]
  );

  const totalProduced = parsed.reduce((sum, p) => sum + (p.acceptedBad ? 0 : p.accepted) + (p.defectBad ? 0 : p.defect), 0);

  function updateLine(idx: number, patch: Partial<LineDraft>) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  function validate(): boolean {
    const badIdx = parsed.findIndex((p) => p.acceptedBad || p.defectBad);
    if (badIdx >= 0) {
      message.error(`Số lượng của thành phẩm ${lines[badIdx].productCode} phải ≥ 0 và tối đa 2 chữ số thập phân.`);
      return false;
    }
    const reasonIdx = parsed.findIndex((p) => p.reasonMissing);
    if (reasonIdx >= 0) {
      message.error(`Vui lòng nhập lý do lỗi của thành phẩm ${lines[reasonIdx].productCode}.`);
      return false;
    }
    if (totalProduced <= 0) {
      message.error('Tổng số lượng thành phẩm (đạt + lỗi) phải lớn hơn 0.');
      return false;
    }
    return true;
  }

  async function submit(confirmExceed: boolean, note: string | null) {
    if (!validate()) return;
    setBusy(true);
    try {
      const result = await productionService.approveOrder(s.productionOrderId, {
        warehouseId,
        locationId,
        lotNumber: lotNumber.trim() || null,
        productionDate: productionDate || null,
        notes: notes.trim() || null,
        reviewNote: note,
        confirmExceedPlan: confirmExceed,
        lines: lines.map((l, i) => ({
          productionOrderItemId: l.productionOrderItemId,
          acceptedQuantity: parsed[i].accepted,
          defectQuantity: parsed[i].defect,
          defectReason: parsed[i].defect > 0 ? l.defectReason.trim() : null,
        })),
      });
      message.success(`Đã duyệt hoàn thành lệnh ${s.code} và tự sinh phiếu nhập thành phẩm.`);
      onDone(result);
    } catch (err) {
      const msg = errorText(err, 'Không duyệt hoàn thành được lệnh sản xuất');
      if (msg.includes(CONFIRM_EXCEED)) setExceedMsg(msg.replace(CONFIRM_EXCEED, '').trim());
      else if (msg.startsWith(MATERIAL_WARNING)) setNeedReviewNote(true);
      else message.error(msg);
    } finally {
      setBusy(false);
    }
  }

  const currentNote = reviewNote.trim() || null;

  return (
    <>
      <ProductionDialog
        title={
          <span>
            Duyệt hoàn thành <span className="font-mono text-[#0070f4]">· {s.code}</span>
          </span>
        }
        onClose={onClose}
        widthClass="max-w-3xl"
        footer={
          <>
            <button type="button" onClick={onClose} className={btnSecondary}>
              Bỏ qua
            </button>
            <button type="button" disabled={busy} onClick={() => void submit(false, currentNote)} className={btnPrimary}>
              {busy ? 'Đang xử lý...' : 'Duyệt hoàn thành'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-[#677484] leading-relaxed">
            Nhập số lượng <b>thực tế</b> sản xuất được. Hệ thống tự sinh phiếu nhập thành phẩm (chỉ SL đạt vào tồn kho, giá vốn theo NVL đã
            xuất) và chuyển lệnh sang <b>Hoàn thành</b>. Sau khi duyệt không xuất NVL / nhập thêm cho lệnh này được nữa.
          </p>

          <div className="border border-slate-200 rounded-[8px] overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-[680px]">
              <thead className="bg-[#f7f8f9] text-[#677484] border-b border-slate-200">
                <tr>
                  <th className="py-1.5 px-3 w-28">Mã TP</th>
                  <th className="py-1.5 px-3">Tên thành phẩm</th>
                  <th className="py-1.5 px-3 w-20 text-right">Kế hoạch</th>
                  <th className="py-1.5 px-3 w-20 text-right">Đã nhập</th>
                  <th className="py-1.5 px-3 w-28 text-right">SL đạt *</th>
                  <th className="py-1.5 px-3 w-24 text-right">SL lỗi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lines.map((l, i) => {
                  const p = parsed[i];
                  return (
                    <React.Fragment key={l.productionOrderItemId ?? `single-${l.productCode}`}>
                      <tr>
                        <td className="py-1.5 px-3 font-mono font-semibold text-[#0070f4]">{l.productCode}</td>
                        <td className="py-1.5 px-3">
                          {l.productName} <span className="text-slate-400">({l.unitName})</span>
                        </td>
                        <td className="py-1.5 px-3 text-right">{fmtQty(l.planned)}</td>
                        <td className="py-1.5 px-3 text-right text-[#16a34a]">{fmtQty(l.received)}</td>
                        <td className="py-1 px-3">
                          <input
                            inputMode="decimal"
                            value={l.accepted}
                            onChange={(e) => updateLine(i, { accepted: e.target.value })}
                            className={`w-full h-7 px-2 text-right text-xs border rounded-[6px] focus:outline-none ${
                              p.acceptedBad
                                ? 'border-[#fb2c36] bg-[#fef2f2]'
                                : p.exceeds
                                  ? 'border-amber-400 bg-amber-50/50'
                                  : 'border-slate-300 focus:border-[#0070f4]'
                            }`}
                          />
                        </td>
                        <td className="py-1 px-3">
                          <input
                            inputMode="decimal"
                            value={l.defect}
                            onChange={(e) => updateLine(i, { defect: e.target.value })}
                            placeholder="0"
                            className={`w-full h-7 px-2 text-right text-xs border rounded-[6px] focus:outline-none ${
                              p.defectBad ? 'border-[#fb2c36] bg-[#fef2f2]' : 'border-slate-300 focus:border-[#0070f4]'
                            }`}
                          />
                        </td>
                      </tr>
                      {!p.defectBad && p.defect > 0 && (
                        <tr className="bg-slate-50/60">
                          <td />
                          <td colSpan={5} className="py-1 px-3">
                            <input
                              list="stockflow-approve-defect-reasons"
                              value={l.defectReason}
                              onChange={(e) => updateLine(i, { defectReason: e.target.value })}
                              maxLength={500}
                              placeholder={`Lý do lỗi của ${l.productCode} *`}
                              className={`w-full h-7 px-2 text-xs border rounded-[6px] focus:outline-none bg-white ${
                                p.reasonMissing ? 'border-[#fb2c36]' : 'border-slate-300 focus:border-[#0070f4]'
                              }`}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
            <datalist id="stockflow-approve-defect-reasons">
              {DEFECT_REASONS.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
          </div>
          {parsed.some((p) => p.exceeds) && (
            <p className="text-xs text-amber-700">Có thành phẩm nhập vượt số lượng kế hoạch — hệ thống sẽ hỏi xác nhận khi duyệt.</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Kho nhận thành phẩm *</label>
              <select
                value={warehouseId}
                onChange={(e) => {
                  setWarehouseId(Number(e.target.value));
                  setLocationId(null);
                }}
                className={inputCls}
              >
                {warehouses.map((w) => (
                  <option key={w.warehouseId} value={w.warehouseId}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Vị trí lưu kho</label>
              <select
                value={locationId ?? ''}
                onChange={(e) => setLocationId(e.target.value ? Number(e.target.value) : null)}
                className={inputCls}
                disabled={locations.warehouseId !== warehouseId || locations.items.length === 0}
              >
                <option value="">{locations.items.length === 0 ? 'Kho chưa khai báo vị trí' : 'Không chọn vị trí'}</option>
                {locations.items.map((loc) => (
                  <option key={loc.locationId} value={loc.locationId}>
                    {[loc.locationCode, loc.locationName].filter(Boolean).join(' · ')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Số lô thành phẩm</label>
              <input
                value={lotNumber}
                onChange={(e) => setLotNumber(e.target.value)}
                maxLength={50}
                placeholder="Để trống = theo mã lệnh"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Ngày sản xuất</label>
              <input type="date" value={productionDate} onChange={(e) => setProductionDate(e.target.value)} className={inputCls} />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Ghi chú phiếu nhập</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={500}
                rows={2}
                placeholder="Đóng gói, kiểm tra ngoại quan..."
                className="w-full px-2.5 py-1.5 text-[13px] border border-slate-300 rounded-[6px] focus:outline-none focus:border-[#0070f4]"
              />
            </div>
          </div>
        </div>
      </ProductionDialog>

      {/* BR-35: nhập vượt kế hoạch → [Có] / [Không] */}
      {exceedMsg && (
        <ProductionDialog
          title="Xác nhận nhập vượt số lượng lệnh sản xuất"
          onClose={() => setExceedMsg(null)}
          widthClass="max-w-md"
          footer={
            <>
              <button type="button" onClick={() => setExceedMsg(null)} className={btnSecondary}>
                Không
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setExceedMsg(null);
                  void submit(true, currentNote);
                }}
                className={btnPrimary}
              >
                Có
              </button>
            </>
          }
        >
          <div className="flex items-start gap-3 text-xs leading-relaxed">
            <AlertTriangle size={20} className="text-amber-500 shrink-0 mt-0.5" />
            <p>{exceedMsg}</p>
          </div>
        </ProductionDialog>
      )}

      {/* BR-37: cần nhiều NVL hơn số đã xuất → bắt buộc ghi chú cho Quản lý */}
      {needReviewNote && (
        <ProductionDialog
          title="Cảnh báo định mức nguyên vật liệu"
          onClose={() => setNeedReviewNote(false)}
          widthClass="max-w-lg"
          footer={
            <>
              <button type="button" onClick={() => setNeedReviewNote(false)} className={btnSecondary}>
                Quay lại
              </button>
              <button
                type="button"
                disabled={busy || !reviewNote.trim()}
                onClick={() => {
                  setNeedReviewNote(false);
                  // Cảnh báo NVL chỉ tới sau khi đã qua (hoặc không có) bước xác nhận vượt kế hoạch
                  void submit(parsed.some((p) => p.exceeds), reviewNote.trim());
                }}
                className={btnPrimary}
              >
                Vẫn duyệt
              </button>
            </>
          }
        >
          <div className="flex items-start gap-2.5 mb-3 text-xs">
            <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
            <span>
              Số thành phẩm thực tế cần nhiều nguyên vật liệu hơn số đã xuất theo BOM. Vui lòng nhập ghi chú để tiếp tục; phiếu nhập sinh ra
              sẽ được gắn cờ cần xem xét.
            </span>
          </div>
          <label className={labelCls}>Ghi chú *</label>
          <textarea
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            maxLength={500}
            rows={3}
            autoFocus
            className="w-full px-2.5 py-1.5 text-[13px] border border-slate-300 rounded-[6px] focus:outline-none focus:border-[#0070f4]"
          />
        </ProductionDialog>
      )}
    </>
  );
}
