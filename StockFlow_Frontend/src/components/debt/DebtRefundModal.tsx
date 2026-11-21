'use client';

// Modal phiếu thu / chi khi công nợ đang ở chiều ngược lại (không qua phiếu trả hàng) — dùng chung cho
// Nhà cung cấp và Khách hàng, đối xứng với "Thanh toán" (phiếu chi NCC / phiếu thu khách):
//   Nhà cung cấp đang nợ cửa hàng (nợ cần trả < 0) → "Thu tiền NCC": phiếu thu PT..., nợ cần trả tăng về phía 0.
//   Cửa hàng đang nợ khách (nợ cần thu < 0)       → "Trả tiền khách": phiếu chi PC..., nợ cần thu tăng về phía 0.
// Số tiền tối đa = số đang nợ ngược chiều. Lời gọi API do màn gọi truyền vào (supplierService / customerService).

import React, { useState } from 'react';
import { message } from 'antd';
import { Info, Loader2, X } from 'lucide-react';
import { toLocalDatetimeInputString } from '@/lib/utils/date';
import type { DebtPartnerKind } from './DebtAdjustModal';
import type { DebtRefundPayload, DebtRefundResult } from './types';

const TEXT: Record<DebtPartnerKind, { title: string; owed: string; after: string; amount: string; date: string; voucher: string; hint: string }> = {
  supplier: {
    title: 'Thu tiền nhà cung cấp',
    owed: 'NCC đang nợ cửa hàng',
    after: 'NCC còn nợ cửa hàng',
    amount: 'Tiền NCC trả',
    date: 'Thời gian thu',
    voucher: 'phiếu thu',
    hint: 'Ghi nhận nhà cung cấp trả lại tiền cho cửa hàng (VD hoàn tiền trả thừa, tiền đặt cọc). Hệ thống lập phiếu thu PT... và cộng lại vào Nợ cần trả NCC.',
  },
  customer: {
    title: 'Trả tiền khách',
    owed: 'Cửa hàng đang nợ khách',
    after: 'cửa hàng còn nợ khách',
    amount: 'Tiền trả khách',
    date: 'Thời gian trả',
    voucher: 'phiếu chi',
    hint: 'Ghi nhận cửa hàng trả lại tiền cho khách (VD khách trả thừa, hoàn tiền đặt cọc). Hệ thống lập phiếu chi PC... và cộng lại vào Nợ cần thu của khách.',
  },
};

interface Props {
  kind: DebtPartnerKind;
  partnerName: string;
  /** Số đang nợ ngược chiều (số dương): NCC nợ cửa hàng / cửa hàng nợ khách */
  owedAmount: number;
  create: (payload: DebtRefundPayload) => Promise<DebtRefundResult>;
  onClose: () => void;
  /** Gọi sau khi tạo phiếu thành công để tải lại công nợ */
  onSuccess: (result: DebtRefundResult) => void;
}

const fmt = (v: number) => Math.round(v).toLocaleString('vi-VN');
const inputCls =
  'w-full h-9 px-3 rounded-[8px] border border-slate-300 bg-white text-[13px] focus:border-[#0070f4] focus:outline-none';

export default function DebtRefundModal({ kind, partnerName, owedAmount, create, onClose, onSuccess }: Props) {
  const t = TEXT[kind];
  const [amount, setAmount] = useState<number>(Math.round(owedAmount));
  // Giờ mặc định lúc mở form (chỉ đến phút); không đổi thì gửi trống để server lấy giờ thật (đến giây)
  const [initialDate] = useState(() => toLocalDatetimeInputString(new Date()));
  const [date, setDate] = useState(initialDate);
  const [method, setMethod] = useState<'CASH' | 'BANK_TRANSFER'>('CASH');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const tooMuch = amount > Math.round(owedAmount);
  const canSubmit = !busy && amount > 0 && !tooMuch;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    try {
      const result = await create({
        amount,
        date: date === initialDate || !date ? null : new Date(date).toISOString(),
        paymentMethod: method,
        notes: notes.trim() || null,
      });
      message.success(`Đã lập ${t.voucher} ${result.voucherCode}: ${fmt(result.amount)} đ`);
      onSuccess(result);
    } catch (err) {
      message.error(err instanceof Error && err.message ? err.message : `Không lập được ${t.voucher}`);
    } finally {
      setBusy(false);
    }
  };

  const outlineBtn =
    'inline-flex items-center px-4 h-9 rounded-[8px] border border-slate-300 bg-white hover:bg-[#f7f8f9] font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div
      className="fixed inset-0 z-[1050] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[520px] text-[13px] text-[#15171a] animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h3 className="text-[18px] font-bold leading-tight flex items-center gap-2">
            {t.title}
            <span className="text-[#677484]" title={t.hint}>
              <Info size={16} />
            </span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="p-1.5 rounded-[8px] hover:bg-[#f7f8f9] cursor-pointer disabled:opacity-50"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 pb-5 space-y-3">
          <div className="grid grid-cols-[150px_1fr] items-center gap-3">
            <span className="text-[#677484]">{kind === 'supplier' ? 'Nhà cung cấp' : 'Khách hàng'}</span>
            <span className="font-medium truncate" title={partnerName}>{partnerName}</span>

            <span className="text-[#677484]">{t.owed}</span>
            <span className="font-semibold text-[#16a34a]">{fmt(owedAmount)}</span>

            <label htmlFor="refund-amount" className="text-[#677484]">{t.amount}</label>
            <input
              id="refund-amount"
              type="text"
              inputMode="numeric"
              autoFocus
              value={amount ? amount.toLocaleString('vi-VN') : ''}
              onChange={(e) => setAmount(Number(e.target.value.replace(/\D/g, '')) || 0)}
              onFocus={(e) => e.target.select()}
              onKeyDown={(e) => e.key === 'Enter' && void submit()}
              className={`${inputCls} text-right ${tooMuch ? '!border-[#fb2c36]' : ''}`}
            />

            <span className="text-[#677484]">Hình thức</span>
            <div className="inline-flex w-fit rounded-[6px] border border-slate-300 overflow-hidden text-[12px]">
              {([
                ['CASH', 'Tiền mặt'],
                ['BANK_TRANSFER', 'Chuyển khoản'],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMethod(key)}
                  className={`px-3 h-7 whitespace-nowrap cursor-pointer transition ${
                    method === key ? 'bg-[#0070f4] text-white' : 'bg-white hover:bg-[#eff6ff]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <label htmlFor="refund-date" className="text-[#677484]">{t.date}</label>
            <input
              id="refund-date"
              type="datetime-local"
              value={date}
              max={toLocalDatetimeInputString(new Date())}
              onChange={(e) => setDate(e.target.value)}
              className={inputCls}
            />

            <label htmlFor="refund-notes" className="text-[#677484]">Ghi chú</label>
            <input
              id="refund-notes"
              type="text"
              maxLength={500}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={inputCls}
            />
          </div>

          {tooMuch ? (
            <div className="rounded-[8px] border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-[12px] text-[#b91c1c]">
              Số tiền không được vượt quá {fmt(owedAmount)}.
            </div>
          ) : (
            amount > 0 && (
              <div className="rounded-[8px] bg-[#f7f8f9] px-3 py-2 text-[12px] text-[#677484]">
                Sau {t.voucher}, {t.after}:{' '}
                <strong className="text-[#15171a]">{fmt(owedAmount - amount)}</strong>
              </div>
            )
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-200">
          <button type="button" onClick={onClose} disabled={busy} className={outlineBtn}>
            Bỏ qua
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!canSubmit}
            className="inline-flex items-center gap-1.5 px-4 h-9 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white font-semibold shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            Tạo {t.voucher}
          </button>
        </div>
      </div>
    </div>
  );
}
