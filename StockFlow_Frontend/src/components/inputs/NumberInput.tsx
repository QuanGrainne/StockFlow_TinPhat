'use client';

import React from 'react';

/**
 * Ô nhập số nguyên hiển thị dấu phân cách hàng nghìn (50.000), chỉ nhận chữ số.
 * Dùng chung cho màn Nhập hàng và Chuyển hàng.
 */
export function NumberInput({
  value,
  onChange,
  className = '',
  title,
  inputRef,
}: {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  title?: string;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      title={title}
      value={value ? value.toLocaleString('vi-VN') : '0'}
      onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, '')) || 0)}
      onFocus={(e) => e.target.select()}
      className={`h-8 px-2.5 text-right rounded-[8px] border border-slate-300 focus:border-[#0070f4] focus:outline-none text-[13px] bg-white ${className}`}
    />
  );
}
