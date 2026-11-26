// src/features/pos/components/ReturnTabView.tsx
// Nội dung tab "Trả hàng" của màn Bán hàng (không có phần "Tìm hàng đổi"):
// - Trái: hàng của hóa đơn gốc, nhập SL trả (≤ SL còn được trả — BR-19), giá nhập lại.
// - Phải: khách hàng (theo hóa đơn), "Trả hàng / HD... - người bán", tổng tiền hàng trả, giảm giá, phí trả hàng,
//   cần trả khách, tiền trả khách + phương thức, phần trừ vào công nợ, nút TRẢ HÀNG.

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { message } from 'antd';
import { CircleUserRound, Minus, Pencil, Plus, RefreshCw, Search, Trash2, Undo2, X } from 'lucide-react';
import { ProductThumb } from '@/components/ProductThumb';
import { invoiceLinkHref } from '@/features/orders';
import { salesReturnService } from '@/features/sales-returns/services/salesReturnService';
import { posService } from '../services/posService';
import type { PosCustomer } from '../types';
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
  /** Chi nhánh đang làm việc (Trả nhanh nhận hàng về đây) */
  warehouseId: number;
}

export function ReturnTabView({ tab, userName, onChange, onDone, canReturn, warehouseId }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const isQuick = !!tab.returnQuick;
  /** Khách lẻ không có công nợ: phải trả đủ tiền */
  const walkIn = isQuick ? !tab.customer : !!tab.returnWalkIn;

  // Trả nhanh: tìm khách hàng
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerResults, setCustomerResults] = useState<{ q: string; items: PosCustomer[] }>({ q: '', items: [] });
  useEffect(() => {
    const q = customerQuery.trim();
    if (!q) return;
    const timer = window.setTimeout(() => {
      posService.getCustomers(q).then((items) => setCustomerResults({ q, items }));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [customerQuery]);
  const customerItems = customerResults.q === customerQuery.trim() ? customerResults.items : [];

  const updateLine = (key: string, patch: Partial<PosLine>) =>
    onChange((t) => ({ lines: t.lines.map((l) => (l.key === key ? { ...l, ...patch } : l)), paid: null }));
  const setQty = (l: PosLine, q: number) => updateLine(l.key, { quantity: Math.max(0, Math.min(l.maxQty ?? Infinity, q)) });

  const active = tab.lines.filter((l) => l.quantity > 0);
  const totalQty = active.reduce((s, l) => s + l.quantity, 0);
  const totalGoods = active.reduce((s, l) => s + Math.round(l.quantity * l.unitPrice), 0);
  // Giá trị hàng trả theo giá bán trên hóa đơn ("Tổng giá gốc hàng mua")
  const originalGoods = active.reduce((s, l) => s + Math.round(l.quantity * (l.returnSalePrice ?? l.unitPrice)), 0);
  // Giảm giá tổng hóa đơn phân bổ cho hàng trả theo tỷ lệ giá trị (khớp SalesReturnOps.AllocateInvoiceDiscount)
  const invoiceDiscount = isQuick ? 0 : tab.returnInvoiceDiscount ?? 0;
  const invoiceSubTotal = tab.returnInvoiceSubTotal ?? 0;
  const allocated =
    invoiceDiscount > 0 && invoiceSubTotal > 0 && originalGoods > 0
      ? Math.min(invoiceDiscount, Math.round((invoiceDiscount * originalGoods) / invoiceSubTotal))
      : 0;
  const minDiscount = Math.min(allocated, totalGoods);
  const discount = Math.min(totalGoods, tab.returnDiscountEdited ? tab.discountValue : allocated);
  const discountTooLow = discount < minDiscount;
  const fee = Math.min(totalGoods - discount, tab.returnFee ?? 0);
  const mustRefund = totalGoods - discount - fee;
  const refund = Math.min(tab.paid ?? mustRefund, mustRefund);
  const toDebt = mustRefund - refund;

  const handleSubmit = async () => {
    if (submitting || (!tab.returnInvoiceId && !isQuick)) return;
    if (!canReturn) return message.error('Vai trò của bạn chưa được phân quyền chức năng Trả hàng.');
    if (active.length === 0) return message.warning('Nhập số lượng trả cho ít nhất 1 hàng hóa.');
    if (walkIn && refund < mustRefund) return message.error('Khách lẻ không có công nợ — phải trả đủ tiền cho khách.');
    if (discountTooLow)
      return message.error(
        `Hóa đơn được giảm giá ${fmt(invoiceDiscount)}: giảm giá hàng trả tối thiểu ${fmt(minDiscount)} (phân bổ theo giá trị hàng trả).`
      );
    setSubmitting(true);
    try {
      const res = await salesReturnService.createReturn({
        invoiceId: tab.returnInvoiceId ?? 0,
        partnerId: isQuick ? tab.customer?.id ?? 0 : undefined,
        warehouseId: isQuick ? warehouseId : undefined,
        discountAmount: discount,
        returnFee: fee,
        refundAmount: refund,
        paymentMethod: tab.payMethod,
        notes: tab.notes.trim() || null,
        items: active.map((l) => ({
          orderItemId: l.orderItemId ?? 0,
          productId: l.productId,
          quantity: l.quantity,
          returnPrice: l.unitPrice,
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
    <div className="flex-1 min-h-0 flex overflow-hidden">
      {/* ── Trái: hàng của hóa đơn gốc ── */}
      <div className="flex-1 min-w-0 flex flex-col gap-2 p-3">
        <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
          {tab.lines.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="bg-white border border-slate-200/80 rounded-xl px-8 py-6 text-center shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
                <div className="mx-auto w-14 h-14 rounded-full bg-[#fff1e6] text-[#f97316] flex items-center justify-center">
                  <Undo2 size={26} />
                </div>
                <p className="mt-3 text-[15px] font-semibold text-[#15171a]">
                  {isQuick ? 'Chưa có hàng trả' : 'Hóa đơn không còn hàng để trả'}
                </p>
                {isQuick && <p className="mt-1 text-[13px] text-[#677484]">Tìm hàng trả (F3) để thêm vào phiếu trả</p>}
              </div>
            </div>
          ) : (
            tab.lines.map((l, idx) => {
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
                      {l.maxQty !== undefined && (
                        <span className="text-[12px] text-[#677484] mt-0.5" title="SL còn được trả">
                          / {fmt(l.maxQty)}
                        </span>
                      )}
                    </div>

                    {/* Giá nhập lại */}
                    <div className="w-28 shrink-0" title="Giá nhập lại (tiền trả khách / 1 đơn vị)">
                      <MoneyInput value={l.unitPrice} onChange={(v) => updateLine(l.key, { unitPrice: v })} />
                    </div>

                    <span className="w-24 shrink-0 text-right font-bold">{fmt(l.quantity * l.unitPrice)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="shrink-0 bg-white border border-slate-200/80 rounded-xl px-4 h-12 flex items-center gap-2">
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
      <aside className="w-[400px] max-w-[34vw] shrink-0 bg-white border-l border-slate-200 flex flex-col p-4 text-[14px]">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-[#f1f3f6] text-[14px] min-w-0 max-w-[60%] whitespace-nowrap" title={userName}>
            <CircleUserRound size={16} className="text-[#677484] shrink-0" />
            <span className="truncate">{userName}</span>
          </span>
          <span className="text-[13px] text-[#677484]">{new Date().toLocaleDateString('vi-VN')}</span>
        </div>

        {/* Trả nhanh: tự chọn khách (bỏ trống = Khách lẻ) */}
        {isQuick && !tab.customer && (
          <div className="relative mt-3">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#677484]" />
            <input
              value={customerQuery}
              onChange={(e) => setCustomerQuery(e.target.value)}
              placeholder="Tìm khách hàng (bỏ trống = Khách lẻ)"
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#f1f3f6] outline-none focus:bg-white focus:ring-1 focus:ring-[#0070f4]"
            />
            {customerQuery.trim() && (
              <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-[0_10px_30px_rgba(15,23,42,0.2)] border border-slate-200 max-h-72 overflow-y-auto divide-y divide-slate-100">
                {customerItems.length === 0 ? (
                  <div className="p-3 text-center text-[13px] text-[#677484]">Không tìm thấy khách hàng</div>
                ) : (
                  customerItems.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        onChange({ customer: c });
                        setCustomerQuery('');
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-[#eff6ff] cursor-pointer"
                    >
                      <div className="font-semibold">{c.name}</div>
                      <div className="text-[12px] text-[#677484]">
                        {c.code} • {c.phone || '—'}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {tab.customer && (
          <div className="mt-3 h-9 px-3 rounded-lg bg-[#e6f1fe] flex items-center gap-2">
            <span className="text-[#0070f4] font-semibold truncate">{tab.customer.name}</span>
            <span className="text-[12px] text-[#677484] shrink-0">{tab.customer.phone}</span>
            {tab.customer.currentDebt !== 0 && (
              <span className={`ml-auto text-[12px] shrink-0 ${tab.customer.currentDebt > 0 ? 'text-[#fb2c36]' : 'text-[#16a34a]'}`}>
                Nợ: {fmt(tab.customer.currentDebt)}
              </span>
            )}
            {isQuick && (
              <button
                type="button"
                onClick={() => onChange({ customer: null, paid: null })}
                className={`p-0.5 rounded hover:bg-black/5 cursor-pointer ${tab.customer.currentDebt !== 0 ? '' : 'ml-auto'}`}
                aria-label="Bỏ chọn khách hàng"
              >
                <X size={15} />
              </button>
            )}
          </div>
        )}

        <div className="mt-4 text-[15px]">
          <span className="font-bold text-[#16a34a]">Trả hàng</span>
          {isQuick && <span className="text-[#677484]"> / Trả nhanh (không có hóa đơn)</span>}
          {!isQuick && <span className="text-[#677484]"> / </span>}
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
          {!isQuick && (
            <div className="flex items-center justify-between" title="Giá trị hàng trả theo giá bán trên hóa đơn gốc">
              <span>
                Tổng giá gốc hàng mua <span className="ml-6 text-[#677484]">{fmt(totalQty)}</span>
              </span>
              <span>{fmt(originalGoods)}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span>
              Tổng tiền hàng trả <span className="ml-6 text-[#677484]">{fmt(totalQty)}</span>
            </span>
            <span>{fmt(totalGoods)}</span>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <span>Giảm giá</span>
              <div className="w-36">
                <MoneyInput
                  value={discount}
                  onChange={(v) => onChange({ discountMode: 'VND', discountValue: v, returnDiscountEdited: true, paid: null })}
                  className={discountTooLow ? 'text-[#fb2c36] border-[#fb2c36]' : ''}
                />
              </div>
            </div>
            {invoiceDiscount > 0 && (
              <div className={`mt-1 text-[12px] text-right ${discountTooLow ? 'text-[#fb2c36]' : 'text-[#677484]'}`}>
                Giảm giá HĐ {fmt(invoiceDiscount)}, phân bổ cho hàng trả: {fmt(allocated)}
                {tab.returnDiscountEdited && discount !== Math.min(totalGoods, allocated) && (
                  <button
                    type="button"
                    onClick={() => onChange({ returnDiscountEdited: false, paid: null })}
                    className="ml-1.5 text-[#0070f4] hover:underline cursor-pointer"
                  >
                    Lấy lại
                  </button>
                )}
              </div>
            )}
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
              <span>{walkIn ? 'Còn thiếu' : 'Trừ vào công nợ khách'}</span>
              <span className={`font-semibold ${walkIn ? 'text-[#fb2c36]' : ''}`}>{fmt(toDebt)}</span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={submitting || !canReturn || discountTooLow}
          className="mt-auto h-14 rounded-xl bg-[#0070f4] hover:bg-[#005ac3] text-white text-[17px] font-bold tracking-wide flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting && <RefreshCw size={18} className="animate-spin" />}
          TRẢ HÀNG
        </button>
      </aside>
    </div>
  );
}
