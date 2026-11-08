// src/features/pos/components/ReturnTabView.tsx
// Nội dung tab "Trả hàng" của màn Bán hàng (như KiotViet, bỏ phần "Tìm hàng đổi"):
// - Trái: hàng của hóa đơn gốc, nhập SL trả (≤ SL còn được trả — BR-19), giá nhập lại, tình trạng hàng (BR-20).
// - Phải: khách hàng (theo hóa đơn), "Trả hàng / HD... - người bán", tổng tiền hàng trả, giảm giá, phí trả hàng,
//   cần trả khách, tiền trả khách + phương thức, phần trừ vào công nợ, nút TRẢ HÀNG.

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { message } from 'antd';
import { CircleUserRound, Minus, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { ProductThumb } from '@/components/ProductThumb';
import { invoiceLinkHref } from '@/features/orders/components/InvoicePreviewModal';
import { salesReturnService } from '@/features/sales-returns/services/salesReturnService';
import type { ReturnCondition } from '@/features/sales-returns/types';
import { RETURN_CONDITION } from '@/features/sales-returns/utils/salesReturnUtils';
import type { PayMethod, PosLine, PosTab } from '../utils/posTabs';

const fmt = (n: number) => Math.round(n || 0).toLocaleString('vi-VN');
const parseNum = (s: string) => Number(s.replace(/[^\d]/g, '')) || 0;
const PAY_METHODS: { value: PayMethod; label: string }[] = [
  { value: 'CASH', label: 'Tiền mặt' },
  { value: 'VIETQR', label: 'Chuyển khoản' },
];

function MoneyInput({ value, onChange, className = '' }: { value: number; onChange: (v: number) => void; className?: string }) {
  return (
    <input
      inputMode="numeric"
      value={value ? value.toLocaleString('vi-VN') : '0'}
      onChange={(e) => onChange(parseNum(e.target.value))}
      onFocus={(e) => e.target.select()}
      className={`w-full bg-transparent text-right border-b border-slate-300 focus:border-[#0070f4] outline-none py-0.5 ${className}`}
    />
  );
}

interface Props {
  tab: PosTab;
  userName: string;
  onChange: (patch: Partial<PosTab> | ((t: PosTab) => Partial<PosTab>)) => void;
  /** Trả hàng xong: đóng tab, tải lại tồn kho */
  onDone: () => void;
  canReturn: boolean;
}

export function ReturnTabView({ tab, userName, onChange, onDone, canReturn }: Props) {
  const [submitting, setSubmitting] = useState(false);

  const updateLine = (key: string, patch: Partial<PosLine>) =>
    onChange((t) => ({ lines: t.lines.map((l) => (l.key === key ? { ...l, ...patch } : l)), paid: null }));
  const setQty = (l: PosLine, q: number) => updateLine(l.key, { quantity: Math.max(0, Math.min(l.maxQty ?? 0, q)) });

  const active = tab.lines.filter((l) => l.quantity > 0);
  const totalQty = active.reduce((s, l) => s + l.quantity, 0);
  const totalGoods = active.reduce((s, l) => s + Math.round(l.quantity * l.unitPrice), 0);
  const discount = Math.min(totalGoods, tab.discountValue);
  const fee = Math.min(totalGoods - discount, tab.returnFee ?? 0);
  const mustRefund = totalGoods - discount - fee;
  const refund = Math.min(tab.paid ?? mustRefund, mustRefund);
  const toDebt = mustRefund - refund;

  const handleSubmit = async () => {
    if (submitting || !tab.returnInvoiceId) return;
    if (!canReturn) return message.error('Vai trò của bạn chưa được phân quyền chức năng Trả hàng.');
    if (active.length === 0) return message.warning('Nhập số lượng trả cho ít nhất 1 hàng hóa.');
    if (tab.returnWalkIn && refund < mustRefund) return message.error('Khách lẻ không có công nợ — phải trả đủ tiền cho khách.');
    setSubmitting(true);
    try {
      const res = await salesReturnService.createReturn({
        invoiceId: tab.returnInvoiceId,
        discountAmount: discount,
        returnFee: fee,
        refundAmount: refund,
        paymentMethod: tab.payMethod,
        notes: tab.notes.trim() || null,
        items: active.map((l) => ({
          orderItemId: l.orderItemId ?? 0,
          quantity: l.quantity,
          returnPrice: l.unitPrice,
          condition: l.condition ?? 'GOOD',
        })),
      });
      message.success(
        `Đã tạo phiếu trả hàng ${res.returnCode}` +
          (res.refundAmount > 0 ? `. Trả khách ${fmt(res.refundAmount)}` : '') +
          (res.totalAmount - res.refundAmount > 0 ? `. Trừ vào công nợ ${fmt(res.totalAmount - res.refundAmount)}` : '')
      );
      onDone();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không tạo được phiếu trả hàng.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 min-h-0 flex gap-2 p-2">
      {/* ── Trái: hàng của hóa đơn gốc ── */}
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
          {tab.lines.length === 0 ? (
            <div className="h-full flex items-center justify-center text-[#94a3b8]">Hóa đơn không còn hàng để trả</div>
          ) : (
            tab.lines.map((l, idx) => {
              const max = l.maxQty ?? 0;
              return (
                <div key={l.key} className={`bg-white rounded-xl border px-4 py-3 ${l.quantity > 0 ? 'border-[#0070f4]/50' : 'border-transparent'}`}>
                  <div className="flex items-center gap-3">
                    <span className="w-5 text-center">{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => onChange((t) => ({ lines: t.lines.filter((x) => x.key !== l.key), paid: null }))}
                      className="text-[#15171a] hover:text-[#fb2c36] cursor-pointer"
                      title="Bỏ hàng khỏi phiếu trả"
                    >
                      <Trash2 size={18} />
                    </button>
                    <ProductThumb src={l.imageUrl} alt={l.name} size={48} />
                    <span className="w-24 shrink-0 truncate">{l.code}</span>
                    <span className="flex-1 min-w-[110px] line-clamp-2" title={l.name}>
                      {l.name}
                    </span>
                    <span className="shrink-0 max-w-[110px] truncate px-2 py-0.5 rounded bg-[#e6f1fe] text-[#0070f4] text-[13px]">{l.uom}</span>

                    {/* SL trả / còn được trả */}
                    <div className="shrink-0 flex flex-col items-center">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setQty(l, l.quantity - 1)}
                          className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center cursor-pointer"
                        >
                          <Minus size={15} />
                        </button>
                        <input
                          inputMode="numeric"
                          value={l.quantity}
                          onChange={(e) => setQty(l, Number(e.target.value.replace(/[^\d]/g, '')) || 0)}
                          onFocus={(e) => e.target.select()}
                          className={`w-12 text-center bg-transparent border-b outline-none py-0.5 ${
                            l.quantity === 0 ? 'border-[#fb2c36] text-[#fb2c36]' : 'border-slate-300 focus:border-[#0070f4]'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setQty(l, l.quantity + 1)}
                          className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center cursor-pointer"
                        >
                          <Plus size={15} />
                        </button>
                      </div>
                      <span className="text-[12px] text-[#677484] mt-0.5" title="SL còn được trả">
                        / {fmt(max)}
                      </span>
                    </div>

                    {/* Giá nhập lại */}
                    <div className="w-28 shrink-0" title="Giá nhập lại (tiền trả khách / 1 đơn vị)">
                      <MoneyInput value={l.unitPrice} onChange={(v) => updateLine(l.key, { unitPrice: v })} />
                    </div>

                    <select
                      value={l.condition ?? 'GOOD'}
                      onChange={(e) => updateLine(l.key, { condition: e.target.value as ReturnCondition })}
                      title={RETURN_CONDITION[l.condition ?? 'GOOD'].hint}
                      className={`shrink-0 h-8 px-2 rounded-lg border bg-white text-[13px] outline-none cursor-pointer ${
                        l.condition === 'DEFECTIVE' ? 'border-[#fde68a] text-[#d97706]' : 'border-slate-300'
                      }`}
                    >
                      {(Object.keys(RETURN_CONDITION) as ReturnCondition[]).map((c) => (
                        <option key={c} value={c}>
                          {RETURN_CONDITION[c].label}
                        </option>
                      ))}
                    </select>

                    <span className="w-24 shrink-0 text-right font-bold">{fmt(l.quantity * l.unitPrice)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="shrink-0 bg-white rounded-xl px-4 h-12 flex items-center gap-2">
          <Pencil size={16} className="text-[#677484]" />
          <input
            value={tab.notes}
            onChange={(e) => onChange({ notes: e.target.value })}
            placeholder="Lý do trả hàng / ghi chú"
            className="flex-1 bg-transparent outline-none placeholder-[#677484]"
          />
        </div>
      </div>

      {/* ── Phải: tiền trả khách ── */}
      <aside className="w-[420px] max-w-[34vw] shrink-0 bg-white rounded-xl flex flex-col p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-[#f1f3f6] text-[14px] min-w-0 max-w-[60%] whitespace-nowrap" title={userName}>
            <CircleUserRound size={16} className="text-[#677484] shrink-0" />
            <span className="truncate">{userName}</span>
          </span>
          <span className="text-[13px] text-[#677484]">{new Date().toLocaleDateString('vi-VN')}</span>
        </div>

        {tab.customer && (
          <div className="mt-3 h-9 px-3 rounded-lg bg-[#e6f1fe] flex items-center gap-2">
            <span className="text-[#0070f4] font-semibold truncate">{tab.customer.name}</span>
            <span className="text-[12px] text-[#677484] shrink-0">{tab.customer.phone}</span>
            {tab.customer.currentDebt !== 0 && (
              <span className={`ml-auto text-[12px] shrink-0 ${tab.customer.currentDebt > 0 ? 'text-[#fb2c36]' : 'text-[#16a34a]'}`}>
                Nợ: {fmt(tab.customer.currentDebt)}
              </span>
            )}
          </div>
        )}

        <div className="mt-4 text-[15px]">
          <span className="font-bold text-[#16a34a]">Trả hàng</span>
          <span className="text-[#677484]"> / </span>
          {tab.returnInvoiceId && tab.returnInvoiceCode ? (
            <Link
              href={invoiceLinkHref({ orderId: tab.returnInvoiceId, orderCode: tab.returnInvoiceCode })}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#0070f4] hover:underline"
            >
              {tab.returnInvoiceCode}
            </Link>
          ) : null}
          {tab.returnSellerName && <span className="text-[#0070f4]"> - {tab.returnSellerName}</span>}
        </div>

        <div className="mt-4 space-y-4 text-[15px]">
          <div className="flex items-center justify-between">
            <span>
              Tổng tiền hàng trả <span className="ml-6 text-[#677484]">{fmt(totalQty)}</span>
            </span>
            <span>{fmt(totalGoods)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Giảm giá</span>
            <div className="w-36">
              <MoneyInput value={discount} onChange={(v) => onChange({ discountMode: 'VND', discountValue: v, paid: null })} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span title="Phí khách chịu khi trả hàng">Phí trả hàng</span>
            <div className="w-36">
              <MoneyInput value={fee} onChange={(v) => onChange({ returnFee: v, paid: null })} />
            </div>
          </div>
          <div className="flex items-center justify-between font-bold">
            <span>Cần trả khách</span>
            <span className="text-[20px] text-[#0070f4]">{fmt(mustRefund)}</span>
          </div>
          <div className="flex items-center justify-between font-bold">
            <span>Tiền trả khách</span>
            <div className="w-36">
              <MoneyInput value={refund} onChange={(v) => onChange({ paid: v })} className="text-[18px] font-semibold" />
            </div>
          </div>
          <div className="flex items-center gap-5 pt-1 text-[14px]">
            {PAY_METHODS.map((m) => (
              <label key={m.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name={`refund-${tab.id}`}
                  checked={tab.payMethod === m.value}
                  onChange={() => onChange({ payMethod: m.value })}
                  className="h-[18px] w-[18px] accent-[#0070f4] cursor-pointer"
                />
                {m.label}
              </label>
            ))}
          </div>
          {toDebt > 0 && (
            <div className="flex items-center justify-between">
              <span>{tab.returnWalkIn ? 'Còn thiếu' : 'Trừ vào công nợ khách'}</span>
              <span className={`font-semibold ${tab.returnWalkIn ? 'text-[#fb2c36]' : ''}`}>{fmt(toDebt)}</span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={submitting || !canReturn}
          className="mt-auto h-14 rounded-xl bg-[#0070f4] hover:bg-[#005ac3] text-white text-[17px] font-bold tracking-wide flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting && <RefreshCw size={18} className="animate-spin" />}
          TRẢ HÀNG
        </button>
      </aside>
    </div>
  );
}
