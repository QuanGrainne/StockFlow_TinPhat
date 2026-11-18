'use client';

// Lập lệnh sản xuất từ kế hoạch đã duyệt (UC-PP-05).
// Chọn dòng còn số chưa lập lệnh, nhập số lượng (mặc định = số còn lại, không vượt — BR-PP-20).
// Lệnh tạo ra giống lệnh lập trực tiếp (Chưa bắt đầu, nhu cầu NVL theo BOM đang áp dụng); điều chỉnh định mức
// làm sau ở màn Lệnh sản xuất (BR-51). Hạn hoàn thành bỏ trống thì backend lấy ngày kết thúc muộn nhất của các dòng chọn.

import React, { useMemo, useRef, useState } from 'react';
import { message } from 'antd';
import type { ProductionOrderDetail, ProductionPlanDetail } from '../types';
import { productionPlanService } from '../services/productionPlanService';
import { fmtQty, todayIso } from '../utils/productionFormat';
import { fmtDateOnly, newClientRequestId, parsePlanQty, planErrorText } from '../utils/productionPlanFormat';
import { ProductionDialog, btnPrimary, btnSecondary, inputCls, labelCls } from './ProductionDialog';

interface CreateOrderFromPlanModalProps {
  detail: ProductionPlanDetail;
  onClose: () => void;
  onCreated: (order: ProductionOrderDetail) => void;
}

interface Row {
  productId: number;
  selected: boolean;
  quantityText: string;
}

export function CreateOrderFromPlanModal({ detail, onClose, onCreated }: CreateOrderFromPlanModalProps) {
  const open = useMemo(() => detail.items.filter((i) => i.remainingQuantity > 0), [detail.items]);
  const [rows, setRows] = useState<Row[]>(() =>
    open.map((i) => ({ productId: i.productId, selected: true, quantityText: String(i.remainingQuantity).replace('.', ',') }))
  );
  const [deadline, setDeadline] = useState('');
  const [workshop, setWorkshop] = useState('');
  const [notes, setNotes] = useState(`Lập từ kế hoạch ${detail.summary.planCode}`);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  // Q-V6: một mã yêu cầu cho lần mở modal này; gửi lại (bấm lặp, mạng chập chờn) thì backend trả đúng lệnh đã tạo
  const [clientRequestId] = useState(newClientRequestId);
  const savingRef = useRef(false);
  const today = todayIso();

  const byId = useMemo(() => new Map(open.map((i) => [i.productId, i])), [open]);
  const selected = rows.filter((r) => r.selected);

  const rowError = (r: Row): string | null => {
    if (!r.selected) return null;
    const item = byId.get(r.productId);
    const qty = parsePlanQty(r.quantityText);
    if (qty.error) return qty.error;
    if (item && qty.value > item.remainingQuantity) return `Không vượt số còn lại (${fmtQty(item.remainingQuantity)}).`;
    return null;
  };
  const errors = rows.map(rowError);

  const selectedEnds = selected.map((r) => byId.get(r.productId)?.plannedEndDate).filter((d): d is string => !!d);
  const defaultDeadline = selectedEnds.length ? [...selectedEnds].sort()[selectedEnds.length - 1] : '';
  // V-12: ngày kết thúc kế hoạch đã qua thì không dùng làm hạn mặc định được, bắt buộc chọn hạn mới
  const defaultDeadlinePast = !!defaultDeadline && defaultDeadline < today;
  const deadlineError = deadline
    ? deadline < today
      ? 'Hạn hoàn thành không được trước ngày hôm nay.'
      : null
    : defaultDeadlinePast
      ? 'Ngày kết thúc kế hoạch của các dòng đã chọn đã qua, vui lòng chọn hạn hoàn thành.'
      : null;
  const formError =
    selected.length === 0 ? 'Vui lòng chọn ít nhất một thành phẩm.' : errors.some(Boolean) ? 'Vui lòng sửa số lượng không hợp lệ.' : deadlineError;

  const patch = (productId: number, p: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.productId === productId ? { ...r, ...p } : r)));

  async function submit() {
    setTouched(true);
    if (formError || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const order = await productionPlanService.createOrderFromPlan(detail.summary.productionPlanId, {
        productId: 0,
        plannedQuantity: 0,
        deadline: deadline || null,
        workshop: workshop.trim() || null,
        notes: notes.trim() || null,
        items: selected.map((r) => ({ productId: r.productId, plannedQuantity: parsePlanQty(r.quantityText).value })),
        clientRequestId,
      });
      message.success(`Đã lập lệnh sản xuất ${order.summary.code} từ kế hoạch ${detail.summary.planCode}.`);
      onCreated(order);
    } catch (err) {
      message.error(planErrorText(err, 'Không lập được lệnh sản xuất'));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <ProductionDialog
      title={`Lập lệnh sản xuất từ kế hoạch ${detail.summary.planCode}`}
      onClose={onClose}
      widthClass="max-w-4xl"
      footer={
        <>
          <button type="button" onClick={onClose} className={btnSecondary}>
            Bỏ qua
          </button>
          <button type="button" disabled={saving || open.length === 0} onClick={() => void submit()} className={btnPrimary}>
            {saving ? 'Đang lập lệnh...' : 'Lập lệnh'}
          </button>
        </>
      }
    >
      {open.length === 0 ? (
        <div className="py-6 text-center text-slate-400">Kế hoạch đã lập lệnh đủ số lượng, không còn dòng nào để lập lệnh.</div>
      ) : (
        <>
          <p className="mb-3 text-xs text-[#677484]">
            Chọn thành phẩm và số lượng cho lệnh này. Có thể lập một phần, phần còn lại vẫn nằm trên kế hoạch để lập lệnh sau.
          </p>
          <div className="border border-slate-200 rounded-[8px] overflow-x-auto mb-4">
            <table className="w-full text-left border-collapse text-xs min-w-[720px]">
              <thead className="bg-[#f7f8f9] border-b border-slate-200 font-semibold text-[#677484]">
                <tr>
                  <th className="py-1.5 px-2 w-10 text-center" />
                  <th className="py-1.5 px-2">Thành phẩm</th>
                  <th className="py-1.5 px-2 w-28">Thời gian KH</th>
                  <th className="py-1.5 px-2 w-24 text-right">SL kế hoạch</th>
                  <th className="py-1.5 px-2 w-24 text-right">Đã lập lệnh</th>
                  <th className="py-1.5 px-2 w-24 text-right">Còn lại</th>
                  <th className="py-1.5 px-2 w-32 text-right">SL lập lệnh *</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r, idx) => {
                  const item = byId.get(r.productId);
                  if (!item) return null;
                  const err = touched ? errors[idx] : null;
                  const qtyHint = r.selected ? parsePlanQty(r.quantityText).hint : null;
                  return (
                    <React.Fragment key={r.productId}>
                      <tr className={r.selected ? '' : 'opacity-60'}>
                        <td className="py-1.5 px-2 text-center">
                          <input
                            type="checkbox"
                            checked={r.selected}
                            onChange={(e) => patch(r.productId, { selected: e.target.checked })}
                            className="w-4 h-4 accent-[#0070f4] cursor-pointer"
                          />
                        </td>
                        <td className="py-1.5 px-2">
                          <div className="font-mono font-semibold">{item.productCode}</div>
                          <div className="text-[11px] text-[#677484]">
                            {item.productName} · {item.unitName}
                          </div>
                          {!item.hasActiveBom && <div className="text-[11px] text-[#fb2c36]">Chưa có định mức đang áp dụng</div>}
                        </td>
                        <td className="py-1.5 px-2 text-[11px] text-[#677484]">
                          {fmtDateOnly(item.plannedStartDate)} – {fmtDateOnly(item.plannedEndDate)}
                        </td>
                        <td className="py-1.5 px-2 text-right">{fmtQty(item.plannedQuantity)}</td>
                        <td className="py-1.5 px-2 text-right text-[#677484]">{fmtQty(item.orderedQuantity)}</td>
                        <td className="py-1.5 px-2 text-right font-semibold text-[#0070f4]">{fmtQty(item.remainingQuantity)}</td>
                        <td className="py-1.5 px-2 text-right">
                          <input
                            inputMode="decimal"
                            disabled={!r.selected}
                            value={r.quantityText}
                            onChange={(e) => patch(r.productId, { quantityText: e.target.value })}
                            className={`h-7 w-24 px-2 text-xs text-right border rounded-[6px] focus:outline-none disabled:bg-slate-50 ${
                              err ? 'border-[#fb2c36]' : 'border-slate-300 focus:border-[#0070f4]'
                            }`}
                          />
                          {qtyHint && <div className="mt-0.5 text-[10px] text-[#677484]">{qtyHint}</div>}
                        </td>
                      </tr>
                      {err && (
                        <tr>
                          <td />
                          <td colSpan={6} className="pb-1.5 px-2 text-right text-[11px] text-[#fb2c36]">
                            {err}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>
                Hạn hoàn thành {defaultDeadlinePast && <span className="text-[#fb2c36]">*</span>}
              </label>
              <input
                type="date"
                value={deadline}
                min={today}
                onChange={(e) => setDeadline(e.target.value)}
                className={`${inputCls} ${touched && deadlineError ? 'border-[#fb2c36]' : ''}`}
              />
              <p className={`mt-1 text-[11px] ${defaultDeadlinePast ? 'text-[#d97706]' : 'text-slate-400'}`}>
                {defaultDeadlinePast
                  ? `Ngày kết thúc kế hoạch (${fmtDateOnly(defaultDeadline)}) đã qua, cần chọn hạn mới`
                  : `Bỏ trống = ${defaultDeadline ? fmtDateOnly(defaultDeadline) : 'ngày kết thúc muộn nhất của các dòng chọn'}`}
              </p>
            </div>
            <div>
              <label className={labelCls}>Xưởng phụ trách</label>
              <input value={workshop} maxLength={200} onChange={(e) => setWorkshop(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Ghi chú</label>
              <input value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} className={inputCls} />
            </div>
          </div>
          {touched && formError && <p className="mt-3 text-xs text-[#fb2c36]">{formError}</p>}
        </>
      )}
    </ProductionDialog>
  );
}
