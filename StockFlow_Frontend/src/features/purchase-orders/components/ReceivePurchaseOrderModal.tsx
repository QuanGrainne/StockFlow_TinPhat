'use client';

// Nhập hàng ngay trong phiếu đặt hàng nhập (không chuyển sang form Nhập hàng):
// nhập SL đạt / SL lỗi từng mặt hàng → hệ thống tự sinh phiếu nhập Hoàn thành theo đơn giá, % giảm giá của phiếu đặt,
// cộng tồn kho SL đạt (giá vốn BQ gia quyền), ghi công nợ NCC và cập nhật trạng thái phiếu đặt.

import React, { useMemo, useState } from 'react';
import { message } from 'antd';
import { ArrowDownToLine, Loader2, X } from 'lucide-react';
import { NumberInput } from '@/components/inputs/NumberInput';
import { purchaseOrderService } from '../services/purchaseOrderService';
import type { PurchaseOrderDetail } from '../types';

const fmt = (v: number) => Math.round(v || 0).toLocaleString('vi-VN');
const qty = (v: number) => (v || 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
const round2 = (v: number) => Math.round(v * 100) / 100;

const inputCls =
  'h-8 px-2.5 rounded-[8px] border border-slate-300 focus:border-[#0070f4] focus:outline-none text-[13px] bg-white';
const qtyInputCls = `${inputCls} w-24 text-right`;
const outlineBtnCls =
  'inline-flex items-center gap-1.5 px-3 h-8 rounded-[8px] border border-slate-300 bg-white hover:bg-[#f7f8f9] text-[#15171a] text-[13px] font-semibold transition cursor-pointer disabled:opacity-50';
const primaryBtnCls =
  'inline-flex items-center gap-1.5 px-3.5 h-8 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white text-[13px] font-semibold shadow-xs transition cursor-pointer disabled:opacity-60';

/** Giờ hiện tại theo định dạng của ô datetime-local (giờ máy) */
function nowLocalInput(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface Line {
  productId: number;
  accepted: number;
  defect: number;
}

interface ReceivePurchaseOrderModalProps {
  po: PurchaseOrderDetail;
  onClose: () => void;
  /** Nhập xong: trả về phiếu đặt đã cập nhật (trạng thái, lịch sử nhập hàng) */
  onReceived: (po: PurchaseOrderDetail) => void;
}

export default function ReceivePurchaseOrderModal({ po, onClose, onReceived }: ReceivePurchaseOrderModalProps) {
  // Chỉ các mặt hàng có trong phiếu đặt; mặc định SL đạt = phần còn lại chưa nhập
  const orderItems = useMemo(() => po.items.filter((i) => i.orderedQty > 0), [po.items]);
  const [lines, setLines] = useState<Line[]>(() =>
    orderItems.map((i) => ({ productId: i.productId, accepted: Math.max(0, round2(i.orderedQty - i.receivedQty)), defect: 0 }))
  );
  const [receivedAt, setReceivedAt] = useState(nowLocalInput);
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER'>('CASH');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Giảm giá phiếu đặt chỉ áp vào lần nhập đầu tiên (giống backend)
  const receivedBefore = po.receipts.some((r) => r.status === 'COMPLETED');
  const orderDiscount = receivedBefore ? 0 : po.discountAmount || 0;

  const setLine = (productId: number, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l) => (l.productId === productId ? { ...l, ...patch } : l)));

  const lineTotal = (productId: number, accepted: number) => {
    const item = orderItems.find((i) => i.productId === productId);
    if (!item) return 0;
    return accepted * item.unitPrice * (1 - (item.discountPercent || 0) / 100);
  };

  const goodsTotal = lines.reduce((s, l) => s + lineTotal(l.productId, l.accepted), 0);
  const discount = Math.min(orderDiscount, goodsTotal);
  const payable = Math.round(goodsTotal - discount);
  const totalAccepted = lines.reduce((s, l) => s + l.accepted, 0);
  const totalDefect = lines.reduce((s, l) => s + l.defect, 0);

  const submit = async () => {
    const active = lines.filter((l) => l.accepted > 0 || l.defect > 0);
    if (active.length === 0) {
      message.warning('Vui lòng nhập số lượng nhận của ít nhất 1 mặt hàng.');
      return;
    }
    if (active.some((l) => l.accepted <= 0)) {
      message.warning('Số lượng đạt phải lớn hơn 0. Mặt hàng lỗi toàn bộ thì để trống dòng và ghi chú lý do.');
      return;
    }
    if (totalDefect > 0 && !notes.trim()) {
      message.warning('Có hàng lỗi — vui lòng ghi chú lý do / hướng xử lý (trả NCC, đổi hàng...).');
      return;
    }
    setSaving(true);
    try {
      const updated = await purchaseOrderService.receivePurchaseOrder(po.poId, {
        receivedDate: receivedAt ? new Date(receivedAt).toISOString() : undefined,
        paidAmount: Math.min(paidAmount, payable),
        paymentMethod,
        notes: notes.trim() || null,
        lines: active.map((l) => ({ productId: l.productId, quantity: l.accepted, defectQuantity: l.defect })),
      });
      message.success(`Đã nhập hàng theo phiếu ${po.poCode}`);
      onReceived(updated);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không nhập được hàng.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl max-h-[90vh] flex flex-col bg-white rounded-xl shadow-2xl text-[13px] text-[#15171a]">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
          <div>
            <div className="text-[16px] font-bold">Nhập hàng theo phiếu {po.poCode}</div>
            <div className="text-[12px] text-[#677484]">
              {po.partnerName} · {po.warehouseName} — chỉ SL đạt vào tồn kho và tính tiền trả NCC; SL lỗi chỉ ghi nhận trên phiếu nhập.
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md hover:bg-[#f7f8f9] cursor-pointer" aria-label="Đóng">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div className="rounded-[8px] border border-slate-200 overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[860px]">
              <thead className="bg-[#f7f8f9] border-b border-slate-200 text-[12px] font-semibold text-[#677484]">
                <tr>
                  <th className="py-2 px-3 w-28">Mã hàng</th>
                  <th className="py-2 px-3">Tên hàng</th>
                  <th className="py-2 px-3 w-16">ĐVT</th>
                  <th className="py-2 px-3 w-20 text-right">SL đặt</th>
                  <th className="py-2 px-3 w-20 text-right">Đã nhập</th>
                  <th className="py-2 px-3 w-28 text-right">SL đạt</th>
                  <th className="py-2 px-3 w-28 text-right">SL lỗi</th>
                  <th className="py-2 px-3 w-28 text-right">Đơn giá</th>
                  <th className="py-2 px-3 w-32 text-right">Thành tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orderItems.map((item) => {
                  const line = lines.find((l) => l.productId === item.productId) ?? { productId: item.productId, accepted: 0, defect: 0 };
                  return (
                    <tr key={item.productId}>
                      <td className="py-2 px-3 font-mono text-[#0070f4]">{item.productCode}</td>
                      <td className="py-2 px-3">{item.productName}</td>
                      <td className="py-2 px-3 text-[#677484]">{item.unit}</td>
                      <td className="py-2 px-3 text-right font-mono">{qty(item.orderedQty)}</td>
                      <td className="py-2 px-3 text-right font-mono">{qty(item.receivedQty)}</td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={line.accepted}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => setLine(item.productId, { accepted: Math.max(0, round2(Number(e.target.value) || 0)) })}
                          className={qtyInputCls}
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={line.defect}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => setLine(item.productId, { defect: Math.max(0, round2(Number(e.target.value) || 0)) })}
                          className={`${qtyInputCls} ${line.defect > 0 ? '!border-[#fb2c36] text-[#fb2c36]' : ''}`}
                        />
                      </td>
                      <td className="py-2 px-3 text-right font-mono">
                        {fmt(item.unitPrice)}
                        {item.discountPercent > 0 && <div className="text-[11px] text-[#677484]">−{qty(item.discountPercent)}%</div>}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-semibold">{fmt(lineTotal(item.productId, line.accepted))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-3">
              <label className="block">
                <span className="block text-[12px] font-semibold text-[#677484] mb-1">Thời gian nhập</span>
                <input type="datetime-local" value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} className={`${inputCls} w-full`} />
              </label>
              <label className="block">
                <span className="block text-[12px] font-semibold text-[#677484] mb-1">
                  Ghi chú {totalDefect > 0 && <span className="text-[#fb2c36]">* (bắt buộc khi có hàng lỗi)</span>}
                </span>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={totalDefect > 0 ? 'Lý do lỗi, hướng xử lý (trả NCC, đổi hàng...)' : 'Ghi chú phiếu nhập'}
                  className="w-full px-2.5 py-2 rounded-[8px] border border-slate-300 focus:border-[#0070f4] focus:outline-none text-[13px] resize-none"
                />
              </label>
            </div>

            <dl className="space-y-2 rounded-[8px] bg-[#f7f8f9] p-4">
              <div className="flex justify-between">
                <dt className="text-[#677484]">Tổng SL đạt / SL lỗi</dt>
                <dd className="font-mono">
                  {qty(totalAccepted)} / <span className={totalDefect > 0 ? 'text-[#fb2c36] font-semibold' : ''}>{qty(totalDefect)}</span>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#677484]">Tổng tiền hàng (SL đạt)</dt>
                <dd className="font-mono">{fmt(goodsTotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#677484]">Giảm giá phiếu {receivedBefore && <span className="text-[11px]">(đã áp ở lần nhập trước)</span>}</dt>
                <dd className="font-mono">{fmt(discount)}</dd>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2">
                <dt className="font-semibold">Cần trả NCC</dt>
                <dd className="font-mono font-semibold">{fmt(payable)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[#677484]">Tiền trả NCC</dt>
                <dd className="flex items-center gap-2">
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value === 'BANK_TRANSFER' ? 'BANK_TRANSFER' : 'CASH')}
                    className={inputCls}
                  >
                    <option value="CASH">Tiền mặt</option>
                    <option value="BANK_TRANSFER">Chuyển khoản</option>
                  </select>
                  <NumberInput value={paidAmount} onChange={(v) => setPaidAmount(Math.min(v, payable))} className="w-32" />
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#677484]">Tính vào công nợ</dt>
                <dd className="font-mono">{fmt(Math.max(0, payable - paidAmount))}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-200">
          <button type="button" disabled={saving} onClick={onClose} className={outlineBtnCls}>
            Bỏ qua
          </button>
          <button type="button" disabled={saving} onClick={() => void submit()} className={primaryBtnCls}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <ArrowDownToLine size={14} />} Nhập hàng
          </button>
        </div>
      </div>
    </div>
  );
}
