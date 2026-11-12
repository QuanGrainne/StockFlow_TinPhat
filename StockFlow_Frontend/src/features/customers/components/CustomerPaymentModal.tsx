'use client';

// Modal "Thanh toán" nợ của khách hàng (theo mẫu KiotViet): tạo phiếu thu PT..., phân bổ vào các hóa đơn còn nợ.
// Đối xứng với SupplierPaymentModal (phiếu chi trả nợ nhà cung cấp).

import { tabSession } from '@/lib/auth/tabSession';
import React, { useMemo, useState } from 'react';
import { message } from 'antd';
import { Loader2, X } from 'lucide-react';
import { NumberInput } from '@/components/inputs/NumberInput';
import { formatDateTimeVN, toLocalDatetimeInputString } from '@/lib/utils/date';
import { customerService } from '../services/customerService';
import type { Customer, CustomerPaymentResult, CustomerRecentOrder } from '../types';

interface CustomerPaymentModalProps {
  customer: Customer;
  currentDebt: number;
  /** Hóa đơn hoàn thành còn nợ (cũ nhất trước) */
  openOrders: CustomerRecentOrder[];
  onClose: () => void;
  onSuccess: (result: CustomerPaymentResult) => void;
}

type PayMethod = 'CASH' | 'VIETQR';

const fmt = (v: number) => Math.round(v).toLocaleString('vi-VN');
const METHOD_LABEL: Record<PayMethod, string> = { CASH: 'Tiền mặt', VIETQR: 'Chuyển khoản' };

/** Phân bổ số tiền vào các hóa đơn còn nợ theo thứ tự cũ nhất trước */
function allocateFifo(amount: number, orders: CustomerRecentOrder[]): Record<number, number> {
  let left = amount;
  const result: Record<number, number> = {};
  for (const o of orders) {
    const pay = Math.max(0, Math.min(left, o.outstandingAmount));
    result[o.orderId] = pay;
    left -= pay;
  }
  return result;
}

function currentUserName(): string {
  if (typeof window === 'undefined') return '';
  try {
    const raw = tabSession.get('stockflow_user');
    const u = raw ? (JSON.parse(raw) as { fullName?: string; username?: string }) : null;
    return u?.fullName || u?.username || '';
  } catch {
    return '';
  }
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c);

/** In phiếu thu (khổ A5) ở cửa sổ mới */
function printReceipt(args: {
  voucherCode: string;
  customer: Customer;
  amount: number;
  method: PayMethod;
  date: string;
  collector: string;
  notes: string;
  debtAfter: number;
  lines: { code: string; amount: number }[];
}): boolean {
  const w = window.open('', '_blank', 'width=720,height=800');
  if (!w) return false;
  const rows = args.lines
    .map((l) => `<tr><td>${esc(l.code)}</td><td class="r">${fmt(l.amount)}</td></tr>`)
    .join('');
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Phiếu thu ${esc(args.voucherCode)}</title>
<style>body{font-family:Arial,sans-serif;font-size:13px;margin:24px;color:#15171a}h1{text-align:center;font-size:20px;margin:0 0 4px}
.c{text-align:center;color:#677484;margin-bottom:16px}.row{display:flex;gap:8px;margin:6px 0}.row b{min-width:150px;font-weight:normal;color:#677484}
table{width:100%;border-collapse:collapse;margin-top:12px}td,th{border:1px solid #ccc;padding:6px}th{background:#f7f8f9;text-align:left}.r{text-align:right}
.sign{display:flex;justify-content:space-around;margin-top:40px;text-align:center}</style></head><body>
<h1>PHIẾU THU</h1><div class="c">Mã phiếu: ${esc(args.voucherCode)} · ${esc(args.date)}</div>
<div class="row"><b>Người nộp tiền:</b><span>${esc(args.customer.name)} (${esc(args.customer.code)})</span></div>
<div class="row"><b>Số tiền:</b><span><strong>${fmt(args.amount)} đ</strong></span></div>
<div class="row"><b>Phương thức:</b><span>${METHOD_LABEL[args.method]}</span></div>
<div class="row"><b>Người thu:</b><span>${esc(args.collector)}</span></div>
<div class="row"><b>Nợ còn lại:</b><span>${fmt(args.debtAfter)} đ</span></div>
${args.notes ? `<div class="row"><b>Ghi chú:</b><span>${esc(args.notes)}</span></div>` : ''}
${rows ? `<table><thead><tr><th>Hóa đơn</th><th class="r">Tiền thu</th></tr></thead><tbody>${rows}</tbody></table>` : ''}
<div class="sign"><div>Người nộp tiền<br><br><br>&nbsp;</div><div>Người thu tiền<br><br><br>${esc(args.collector)}</div></div>
<script>window.onload=function(){window.print()}</script></body></html>`);
  w.document.close();
  return true;
}

const labelCls = 'block text-[12px] text-[#15171a] mb-1';
const fieldCls =
  'w-full h-9 px-3 rounded-[8px] border border-slate-300 text-[13px] text-[#15171a] bg-white focus:outline-none focus:border-[#0070f4]';

export default function CustomerPaymentModal({ customer, currentDebt, openOrders, onClose, onSuccess }: CustomerPaymentModalProps) {
  // Giờ mặc định lúc mở form (chỉ đến phút); không đổi thì gửi trống để server lấy giờ thật lúc lưu (đến giây),
  // tránh phiếu thu tạo sau bị xếp trước các chứng từ cùng phút trong sổ công nợ
  const [initialDateTime] = useState(() => toLocalDatetimeInputString(new Date()));
  const [paymentDateTime, setPaymentDateTime] = useState(initialDateTime);
  const [method, setMethod] = useState<PayMethod>('CASH');
  const [amount, setAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [allocate, setAllocate] = useState(true);
  const [allocations, setAllocations] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState<'save' | 'print' | null>(null);
  const [error, setError] = useState('');
  const [collectorName] = useState(currentUserName);

  const allocatedTotal = useMemo(
    () => (allocate ? openOrders.reduce((s, o) => s + (allocations[o.orderId] || 0), 0) : 0),
    [allocate, allocations, openOrders]
  );
  const totalRemaining = useMemo(() => openOrders.reduce((s, o) => s + o.outstandingAmount, 0), [openOrders]);
  const debtAfter = currentDebt - amount;
  const unallocated = amount - allocatedTotal;

  const handleAmountChange = (v: number) => {
    setAmount(v);
    setError('');
    // Nhập số tiền → tự phân bổ lại theo hóa đơn cũ nhất trước
    setAllocations(allocateFifo(v, openOrders));
  };

  const handleAllocationChange = (order: CustomerRecentOrder, v: number) => {
    setError('');
    setAllocations((prev) => ({ ...prev, [order.orderId]: Math.min(v, order.outstandingAmount) }));
  };

  const handleSubmit = async (withPrint: boolean) => {
    if (amount <= 0) {
      setError('Vui lòng nhập số tiền thu.');
      return;
    }
    if (amount > currentDebt) {
      setError(`Số tiền thu vượt quá nợ hiện tại của khách (${fmt(currentDebt)}).`);
      return;
    }
    if (allocate && allocatedTotal > amount) {
      setError('Tổng tiền phân bổ vượt quá số tiền thu.');
      return;
    }

    const allocList = allocate
      ? openOrders.filter((o) => (allocations[o.orderId] || 0) > 0).map((o) => ({ orderId: o.orderId, amount: allocations[o.orderId] }))
      : [];

    setSubmitting(withPrint ? 'print' : 'save');
    setError('');
    try {
      const result = await customerService.createCustomerPayment(customer.id, {
        amount,
        paymentDate:
          paymentDateTime && paymentDateTime !== initialDateTime ? new Date(paymentDateTime).toISOString() : undefined,
        paymentMethod: method,
        notes: notes.trim() || undefined,
        allocations: allocList,
      });
      if (withPrint) {
        const printed = printReceipt({
          voucherCode: result.voucherCode,
          customer,
          amount: result.amount,
          method,
          date: formatDateTimeVN(paymentDateTime),
          collector: collectorName || 'Nhân viên',
          notes: notes.trim(),
          debtAfter: result.remainingDebt,
          lines: allocList.map((a) => ({
            code: openOrders.find((o) => o.orderId === a.orderId)?.orderCode ?? `#${a.orderId}`,
            amount: a.amount,
          })),
        });
        if (!printed) message.warning('Trình duyệt đã chặn cửa sổ in. Vui lòng cho phép cửa sổ bật lên.');
      }
      onSuccess(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tạo được phiếu thu.');
    } finally {
      setSubmitting(null);
    }
  };

  const busy = submitting !== null;

  return (
    <div
      className="fixed inset-0 z-[1050] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[900px] max-h-[92vh] flex flex-col text-[13px] text-[#15171a] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-3">
          <div>
            <h3 className="text-[18px] font-bold leading-tight">Thanh toán</h3>
            <div className="mt-1 flex items-center gap-2 text-[12px] text-[#677484]">
              <span>{customer.name}</span>
              <span>·</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[#15171a]">
                Nợ hiện tại: <strong>{fmt(currentDebt)}</strong>
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="p-1.5 rounded-[8px] text-[#15171a] hover:bg-[#f7f8f9] cursor-pointer disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-4">
          {error && <div className="px-3 py-2 rounded-[8px] bg-[#fef2f2] border border-[#fecaca] text-[#fb2c36] text-xs">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
            <div>
              <label className={labelCls}>Thời gian</label>
              <input
                type="datetime-local"
                value={paymentDateTime}
                onChange={(e) => setPaymentDateTime(e.target.value)}
                className={fieldCls}
              />
            </div>
            <div>
              <label className={labelCls}>Người thu</label>
              <select value="me" disabled className={`${fieldCls} disabled:bg-white disabled:text-[#15171a]`}>
                <option value="me">{collectorName || 'Tài khoản đang đăng nhập'}</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Phương thức thanh toán</label>
              <select value={method} onChange={(e) => setMethod(e.target.value as PayMethod)} className={`${fieldCls} cursor-pointer`}>
                <option value="CASH">Tiền mặt</option>
                <option value="VIETQR">Chuyển khoản</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Số tiền</label>
            <NumberInput value={amount} onChange={handleAmountChange} className="w-full h-9" />
            <div className={`mt-1 text-right text-[12px] ${debtAfter < 0 ? 'text-[#fb2c36]' : 'text-[#677484]'}`}>
              Nợ còn: {fmt(debtAfter)}
            </div>
          </div>

          <div>
            <label className={labelCls}>Ghi chú</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Nhập ghi chú"
              className={`${fieldCls} placeholder-[#677484]`}
            />
          </div>

          {/* Phân bổ vào hóa đơn */}
          <label className="flex items-center gap-2 cursor-pointer w-fit">
            <input
              type="checkbox"
              checked={allocate}
              onChange={(e) => {
                setAllocate(e.target.checked);
                if (e.target.checked) setAllocations(allocateFifo(amount, openOrders));
              }}
              className="rounded text-[#0070f4] focus:ring-[#0070f4] h-4 w-4 border-slate-300 cursor-pointer"
            />
            <span>Phân bổ vào hóa đơn</span>
          </label>

          {allocate && (
            <div className="rounded-[8px] border border-slate-200 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#f7f8f9] border-b border-slate-200 text-[12px] font-semibold text-[#15171a]">
                  <tr>
                    <th className="py-2 px-3">Mã hóa đơn</th>
                    <th className="py-2 px-3">Thời gian</th>
                    <th className="py-2 px-3 text-right">Giá trị hóa đơn</th>
                    <th className="py-2 px-3 text-right">Đã thu trước</th>
                    <th className="py-2 px-3 text-right">Còn cần thu</th>
                    <th className="py-2 px-3 text-right w-36">Tiền thu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {openOrders.length > 0 && (
                    <tr className="font-bold">
                      <td colSpan={4} />
                      <td className="py-2 px-3 text-right">{fmt(totalRemaining)}</td>
                      <td className="py-2 px-3 text-right">{fmt(allocatedTotal)}</td>
                    </tr>
                  )}
                  {openOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-xs text-[#677484]">
                        Không có hóa đơn nào còn nợ
                      </td>
                    </tr>
                  ) : (
                    openOrders.map((o) => (
                      <tr key={o.orderId}>
                        <td className="py-2 px-3 text-[#0070f4]">{o.orderCode}</td>
                        <td className="py-2 px-3 whitespace-nowrap">{formatDateTimeVN(o.orderDate)}</td>
                        <td className="py-2 px-3 text-right">{fmt(o.totalAmount)}</td>
                        <td className="py-2 px-3 text-right">{fmt(o.paidAmount)}</td>
                        <td className="py-2 px-3 text-right">{fmt(o.outstandingAmount)}</td>
                        <td className="py-1.5 px-3">
                          <NumberInput
                            value={allocations[o.orderId] || 0}
                            onChange={(v) => handleAllocationChange(o, v)}
                            className="w-full"
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              <div className="flex items-center justify-end gap-10 px-3 py-2.5 border-t border-slate-100">
                {unallocated > 0 && allocatedTotal < totalRemaining && (
                  <span className="mr-auto text-[12px] text-[#677484]">
                    Tiền chưa phân bổ sẽ tự trừ vào hóa đơn còn nợ cũ nhất khi tạo phiếu thu.
                  </span>
                )}
                <span>Tiền chưa phân bổ:</span>
                <span className={`font-bold ${unallocated < 0 ? 'text-[#fb2c36]' : ''}`}>{fmt(unallocated)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="h-9 px-4 rounded-[8px] border border-slate-300 bg-white hover:bg-[#f7f8f9] font-semibold transition cursor-pointer disabled:opacity-50"
          >
            Bỏ qua
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit(true)}
            disabled={busy}
            className="h-9 px-4 rounded-[8px] border border-slate-300 bg-white hover:bg-[#f7f8f9] font-semibold transition cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {submitting === 'print' && <Loader2 size={14} className="animate-spin" />}
            <span>Tạo phiếu thu &amp; In</span>
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit(false)}
            disabled={busy}
            className="h-9 px-4 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white font-semibold transition cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {submitting === 'save' && <Loader2 size={14} className="animate-spin" />}
            <span>Tạo phiếu thu</span>
          </button>
        </div>
      </div>
    </div>
  );
}
