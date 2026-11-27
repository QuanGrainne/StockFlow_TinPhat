'use client';

// Modal "Thanh toán" nợ nhà cung cấp: tạo phiếu chi PC..., phân bổ vào các phiếu nhập còn nợ.

import { tabSession } from '@/lib/auth/tabSession';
import React, { useMemo, useState } from 'react';
import { Info, Loader2, X } from 'lucide-react';
import { NumberInput } from '@/components/inputs/NumberInput';
import { formatDateTimeVN, toLocalDatetimeInputString } from '@/lib/utils/date';
import { supplierService } from '../services/supplierService';
import { Supplier, SupplierOpenReceipt, SupplierPaymentResult } from '../types';

interface SupplierPaymentModalProps {
  supplier: Supplier;
  currentPayable: number;
  openReceipts: SupplierOpenReceipt[];
  onClose: () => void;
  onSuccess: (result: SupplierPaymentResult) => void;
}

const fmt = (v: number) => Math.round(v).toLocaleString('vi-VN');

/** Phân bổ số tiền vào các phiếu còn nợ theo thứ tự cũ nhất trước */
function allocateFifo(amount: number, receipts: SupplierOpenReceipt[]): Record<number, number> {
  let left = amount;
  const result: Record<number, number> = {};
  for (const r of receipts) {
    const pay = Math.max(0, Math.min(left, r.remainingAmount));
    result[r.receiptId] = pay;
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

const labelCls = 'block text-[12px] text-[#15171a] mb-1';
const fieldCls =
  'w-full h-9 px-3 rounded-[8px] border border-slate-300 text-[13px] text-[#15171a] bg-white focus:outline-none focus:border-[#0070f4]';

export default function SupplierPaymentModal({
  supplier,
  currentPayable,
  openReceipts,
  onClose,
  onSuccess,
}: SupplierPaymentModalProps) {
  const [paymentDateTime, setPaymentDateTime] = useState(() => toLocalDatetimeInputString(new Date()));
  const [method, setMethod] = useState<'CASH' | 'BANK_TRANSFER'>('CASH');
  const [amount, setAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [allocate, setAllocate] = useState(true);
  const [allocations, setAllocations] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [payerName] = useState(currentUserName);

  const allocatedTotal = useMemo(
    () => (allocate ? openReceipts.reduce((s, r) => s + (allocations[r.receiptId] || 0), 0) : 0),
    [allocate, allocations, openReceipts]
  );
  const totalRemaining = useMemo(() => openReceipts.reduce((s, r) => s + r.remainingAmount, 0), [openReceipts]);
  const debtAfter = currentPayable - amount;
  const unallocated = amount - allocatedTotal;

  const handleAmountChange = (v: number) => {
    setAmount(v);
    setError('');
    // Nhập số tiền → tự phân bổ lại theo phiếu cũ nhất trước
    setAllocations(allocateFifo(v, openReceipts));
  };

  const handleAllocationChange = (receipt: SupplierOpenReceipt, v: number) => {
    setError('');
    setAllocations((prev) => ({ ...prev, [receipt.receiptId]: Math.min(v, receipt.remainingAmount) }));
  };

  const handleSubmit = async () => {
    if (amount <= 0) {
      setError('Số tiền thanh toán phải lớn hơn 0.');
      return;
    }
    if (amount > currentPayable) {
      setError(`Số tiền thanh toán vượt quá nợ hiện tại (${fmt(currentPayable)}).`);
      return;
    }
    if (allocate && allocatedTotal > amount) {
      setError('Tổng tiền phân bổ vượt quá số tiền thanh toán.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const result = await supplierService.createSupplierPayment(supplier.partnerId, {
        amount,
        paymentDate: paymentDateTime ? new Date(paymentDateTime).toISOString() : undefined,
        paymentMethod: method,
        notes: notes.trim() || undefined,
        allocations: allocate
          ? openReceipts
              .filter((r) => (allocations[r.receiptId] || 0) > 0)
              .map((r) => ({ receiptId: r.receiptId, amount: allocations[r.receiptId] }))
          : [],
      });
      onSuccess(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tạo được phiếu chi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1050] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[900px] max-h-[92vh] flex flex-col text-[13px] text-[#15171a] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-3">
          <div>
            <h3 className="text-[18px] font-bold leading-tight">Thanh toán</h3>
            <div className="mt-1 flex items-center gap-2 text-[12px] text-[#677484]">
              <span>{supplier.name}</span>
              <span>·</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[#15171a]">
                Nợ hiện tại: <strong>{fmt(currentPayable)}</strong>
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-[8px] text-[#15171a] hover:bg-[#f7f8f9] cursor-pointer disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-4">
          {error && (
            <div className="px-3 py-2 rounded-[8px] bg-[#fef2f2] border border-[#fecaca] text-[#fb2c36] text-xs">{error}</div>
          )}

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
              <label className={labelCls}>Người chi</label>
              <select value="me" disabled className={`${fieldCls} disabled:bg-white disabled:text-[#15171a]`}>
                <option value="me">{payerName || 'Tài khoản đang đăng nhập'}</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Phương thức thanh toán</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as 'CASH' | 'BANK_TRANSFER')}
                className={`${fieldCls} cursor-pointer`}
              >
                <option value="CASH">Tiền mặt</option>
                <option value="BANK_TRANSFER">Chuyển khoản</option>
              </select>
            </div>
            <div className="hidden md:block" />
            <div>
              <label className={labelCls}>Số tiền</label>
              <NumberInput value={amount} onChange={handleAmountChange} className="w-full h-9" />
            </div>
            <div>
              <label className={labelCls}>Nợ còn</label>
              <div
                className={`h-9 px-3 rounded-[8px] bg-slate-100 flex items-center justify-end ${
                  debtAfter < 0 ? 'text-[#fb2c36]' : 'text-[#15171a]'
                }`}
              >
                {fmt(debtAfter)}
              </div>
            </div>
          </div>

          <div>
            <label className={labelCls}>Ghi chú</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Nhập ghi chú"
              rows={2}
              className="w-full p-2.5 rounded-[8px] border border-slate-300 text-[13px] placeholder-[#677484] focus:outline-none focus:border-[#0070f4] resize-none"
            />
          </div>

          {/* Phân bổ vào phiếu nhập */}
          <label className="flex items-center gap-2 cursor-pointer w-fit">
            <input
              type="checkbox"
              checked={allocate}
              onChange={(e) => {
                setAllocate(e.target.checked);
                if (e.target.checked) setAllocations(allocateFifo(amount, openReceipts));
              }}
              className="rounded text-[#0070f4] focus:ring-[#0070f4] h-4 w-4 border-slate-300 cursor-pointer"
            />
            <span>Phân bổ vào phiếu nhập</span>
          </label>

          {allocate && (
            <div className="rounded-[8px] border border-slate-200 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#f7f8f9] border-b border-slate-200 text-[12px] font-semibold text-[#15171a]">
                  <tr>
                    <th className="py-2 px-3">Mã phiếu</th>
                    <th className="py-2 px-3">Thời gian</th>
                    <th className="py-2 px-3 text-right">Giá trị phiếu nhập</th>
                    <th className="py-2 px-3 text-right">Đã trả trước</th>
                    <th className="py-2 px-3 text-right">
                      <span className="inline-flex items-center gap-1">
                        Còn cần trả
                        <span title="Số tiền còn phải trả của phiếu nhập trước lần thanh toán này">
                          <Info size={13} className="text-[#677484]" />
                        </span>
                      </span>
                    </th>
                    <th className="py-2 px-3 text-right w-36">Tiền trả</th>
                    <th className="py-2 px-3 text-right">Còn nợ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {openReceipts.length > 0 && (
                    <tr className="font-bold">
                      <td colSpan={4} />
                      <td className="py-2 px-3 text-right">{fmt(totalRemaining)}</td>
                      <td className="py-2 px-3 text-right">{fmt(allocatedTotal)}</td>
                      <td className="py-2 px-3 text-right">{fmt(totalRemaining - allocatedTotal)}</td>
                    </tr>
                  )}
                  {openReceipts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-xs text-[#677484]">
                        Không có phiếu nhập nào còn nợ
                      </td>
                    </tr>
                  ) : (
                    openReceipts.map((r) => {
                      const pay = allocations[r.receiptId] || 0;
                      return (
                        <tr key={r.receiptId}>
                          <td className="py-2 px-3 text-[#0070f4]">{r.receiptNumber}</td>
                          <td className="py-2 px-3 whitespace-nowrap">{formatDateTimeVN(r.receiptDate)}</td>
                          <td className="py-2 px-3 text-right">{fmt(r.totalAmount)}</td>
                          <td className="py-2 px-3 text-right">{fmt(r.paidAmount)}</td>
                          <td className="py-2 px-3 text-right">{fmt(r.remainingAmount)}</td>
                          <td className="py-1.5 px-3">
                            <NumberInput
                              value={pay}
                              onChange={(v) => handleAllocationChange(r, v)}
                              className="w-full"
                            />
                          </td>
                          <td className="py-2 px-3 text-right">{fmt(r.remainingAmount - pay)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
              <div className="flex items-center justify-end gap-10 px-3 py-2.5 border-t border-slate-100">
                {unallocated > 0 && allocatedTotal < totalRemaining && (
                  <span className="mr-auto text-[12px] text-[#677484]">
                    Tiền chưa phân bổ sẽ tự trừ vào phiếu nhập còn nợ cũ nhất khi tạo phiếu chi.
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
            disabled={submitting}
            className="h-9 px-4 rounded-[8px] border border-slate-300 bg-white hover:bg-[#f7f8f9] font-semibold transition cursor-pointer disabled:opacity-50"
          >
            Bỏ qua
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting}
            className="h-9 px-4 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white font-semibold transition cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            <span>Tạo phiếu chi</span>
          </button>
        </div>
      </div>
    </div>
  );
}
