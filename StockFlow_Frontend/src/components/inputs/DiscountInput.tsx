'use client';

import React, { useEffect, useRef, useState } from 'react';

export type DiscountType = 'VND' | 'PERCENT';

/** Số tiền giảm từ giá trị nhập (VND hoặc %) trên số tiền gốc; không vượt quá số tiền gốc */
export function discountAmount(base: number, type: DiscountType, value: number): number {
  const v = Math.max(0, value || 0);
  const amount = type === 'PERCENT' ? (base * Math.min(v, 100)) / 100 : v;
  return Math.min(amount, Math.max(0, base));
}

const formatDiscountValue = (v: number, t: DiscountType) =>
  t === 'PERCENT' ? v.toLocaleString('vi-VN', { maximumFractionDigits: 2 }) : v.toLocaleString('vi-VN');

/**
 * Ô Giảm giá dùng chung: hiển thị số tiền giảm; bấm vào mở popover
 * "Giảm giá [giá trị] [VND | %]". `base` là số tiền gốc để quy đổi % (đơn giá cho từng dòng,
 * tổng tiền hàng cho cả phiếu).
 */
export function DiscountInput({
  value,
  type,
  base,
  onChange,
  className = 'w-full',
  percentHint,
  popoverClassName = 'w-[340px]',
}: {
  value: number;
  type: DiscountType;
  base: number;
  onChange: (value: number, type: DiscountType) => void;
  className?: string;
  /** Hậu tố trong tooltip khi giảm theo %, VD "/ đơn vị" */
  percentHint?: string;
  /** Độ rộng popover (sidebar hẹp hơn bảng) */
  popoverClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Chuỗi đang gõ (cho phép "12,5" với %), tách khỏi giá trị số để không mất dấu phẩy khi đang nhập
  const [text, setText] = useState(() => formatDiscountValue(value, type));

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    inputRef.current?.select();
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const amount = discountAmount(base, type, value);

  // Đổi đơn vị thì quy đổi để giữ nguyên số tiền giảm
  const switchType = (next: DiscountType) => {
    if (next === type) return;
    const converted =
      next === 'PERCENT'
        ? base > 0
          ? Math.round((amount / base) * 10000) / 100 // giữ 2 chữ số thập phân (5.000/40.000 = 12,5%)
          : 0
        : Math.round(amount);
    setText(formatDiscountValue(converted, next));
    onChange(converted, next);
  };

  const handleInput = (raw: string) => {
    if (type === 'PERCENT') {
      // Cho phép 1 dấu phẩy thập phân, tối đa 2 chữ số sau dấu phẩy
      let cleaned = raw.replace(/[^\d,]/g, '');
      const [intPart, ...rest] = cleaned.split(',');
      cleaned = rest.length > 0 ? `${intPart},${rest.join('').slice(0, 2)}` : intPart;
      const num = Math.min(parseFloat(cleaned.replace(',', '.')) || 0, 100);
      setText(num >= 100 ? '100' : cleaned);
      onChange(num, 'PERCENT');
    } else {
      const num = Number(raw.replace(/\D/g, '')) || 0;
      setText(num.toLocaleString('vi-VN'));
      onChange(num, 'VND');
    }
  };

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => {
          if (!open) setText(formatDiscountValue(value, type));
          setOpen((v) => !v);
        }}
        title={
          type === 'PERCENT' && value > 0
            ? `Giảm ${formatDiscountValue(value, 'PERCENT')}%${percentHint ? ` ${percentHint}` : ''}`
            : undefined
        }
        className={`w-full h-8 px-2.5 text-right rounded-[8px] border text-[13px] bg-white cursor-pointer transition text-[#15171a] ${
          open ? 'border-[#0070f4]' : 'border-slate-300 hover:border-slate-400'
        }`}
      >
        {Math.round(amount).toLocaleString('vi-VN')}
      </button>

      {open && (
        <div className={`absolute right-0 top-full mt-1.5 z-30 ${popoverClassName} bg-white rounded-[12px] border border-slate-200 shadow-[0_8px_24px_rgba(0,0,0,0.12)] px-4 py-3 flex items-center gap-3 animate-in fade-in zoom-in-95 duration-100`}>
          <span className="text-[13px] text-[#15171a] shrink-0">Giảm giá</span>
          <div className="flex-1 min-w-0 h-9 pl-3 pr-1 rounded-[8px] border border-[#0070f4] flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              value={text}
              onChange={(e) => handleInput(e.target.value)}
              className="flex-1 min-w-0 text-right bg-transparent outline-none text-[13px] text-[#15171a]"
            />
            <div className="flex items-center gap-0.5 shrink-0">
              {(['VND', 'PERCENT'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => switchType(t)}
                  className={`h-7 px-2 rounded-[6px] text-[12px] font-semibold transition cursor-pointer ${
                    type === t ? 'bg-[#0070f4] text-white' : 'text-[#15171a] hover:bg-[#f7f8f9]'
                  }`}
                >
                  {t === 'VND' ? 'VND' : '%'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
