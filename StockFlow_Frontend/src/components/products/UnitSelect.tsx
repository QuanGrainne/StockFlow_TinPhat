// src/components/products/UnitSelect.tsx
// Ô chọn đơn vị trên dòng phiếu (nhập hàng / chuyển hàng / kiểm kho): hàng có đơn vị quy đổi thì chọn được
// (bịch / túi / thùng), hàng chỉ có đơn vị cơ bản thì hiện chữ như cũ.
'use client';

import React from 'react';
import type { SaleUnitOption } from '@/lib/products/saleUnits';

interface UnitSelectProps {
  units: SaleUnitOption[] | undefined;
  /** Tên đơn vị đang chọn */
  value: string;
  onChange: (unit: SaleUnitOption) => void;
  className?: string;
  disabled?: boolean;
}

export function UnitSelect({ units, value, onChange, className = '', disabled }: UnitSelectProps) {
  if (!units || units.length <= 1) {
    return (
      <span className={`truncate ${className}`} title={value}>
        {value}
      </span>
    );
  }
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => {
        const unit = units.find((u) => u.name === e.target.value);
        if (unit) onChange(unit);
      }}
      title="Chọn đơn vị"
      className={`max-w-full truncate bg-transparent border-0 outline-none cursor-pointer disabled:cursor-default ${className}`}
    >
      {units.map((u) => (
        <option key={u.name} value={u.name}>
          {u.isBase ? u.name : `${u.name} (= ${u.rate.toLocaleString('vi-VN')})`}
        </option>
      ))}
    </select>
  );
}
