'use client';

// Nút "con mắt" + popover "Tùy chọn hiển thị" cho bảng hàng hóa của phiếu nhập (theo mẫu KiotViet).
// Chỉ gồm 4 cột tùy chọn: Ảnh hàng hóa, Tồn kho, Giá vốn, Giá bán. Lựa chọn được nhớ theo trình duyệt.

import React, { useEffect, useRef, useState } from 'react';
import { Eye } from 'lucide-react';

export interface PurchaseColumnVisibility {
  image: boolean;
  stock: boolean;
  costPrice: boolean;
  salePrice: boolean;
}

/** Mặc định giống ảnh mẫu: chỉ hiện Giá bán */
export const DEFAULT_PURCHASE_COLUMNS: PurchaseColumnVisibility = {
  image: false,
  stock: false,
  costPrice: false,
  salePrice: true,
};

const STORAGE_KEY = 'stockflow_purchase_columns';

const OPTIONS: { key: keyof PurchaseColumnVisibility; label: string }[] = [
  { key: 'image', label: 'Ảnh hàng hóa' },
  { key: 'stock', label: 'Tồn kho' },
  { key: 'costPrice', label: 'Giá vốn' },
  { key: 'salePrice', label: 'Giá bán' },
];

/** Đọc / ghi lựa chọn cột hiển thị (localStorage, fallback mặc định) */
export function usePurchaseColumnVisibility() {
  const [columns, setColumns] = useState<PurchaseColumnVisibility>(() => {
    if (typeof window === 'undefined') return DEFAULT_PURCHASE_COLUMNS;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...DEFAULT_PURCHASE_COLUMNS, ...(JSON.parse(raw) as Partial<PurchaseColumnVisibility>) } : DEFAULT_PURCHASE_COLUMNS;
    } catch {
      return DEFAULT_PURCHASE_COLUMNS;
    }
  });

  const toggle = (key: keyof PurchaseColumnVisibility) => {
    setColumns((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // bỏ qua khi trình duyệt chặn localStorage
      }
      return next;
    });
  };

  return { columns, toggle };
}

function Switch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative w-9 h-5 rounded-full transition cursor-pointer shrink-0 ${
        checked ? 'bg-[#0070f4]' : 'bg-slate-400'
      }`}
    >
      <span
        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
          checked ? 'left-[18px]' : 'left-0.5'
        }`}
      />
    </button>
  );
}

interface PurchaseDisplayOptionsProps {
  columns: PurchaseColumnVisibility;
  onToggle: (key: keyof PurchaseColumnVisibility) => void;
}

export function PurchaseDisplayOptions({ columns, onToggle }: PurchaseDisplayOptionsProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Tùy chọn hiển thị"
        className={`w-8 h-8 rounded-[8px] border flex items-center justify-center transition cursor-pointer bg-white ${
          open ? 'border-[#0070f4] text-[#0070f4]' : 'border-slate-300 text-[#15171a] hover:bg-[#f7f8f9]'
        }`}
      >
        <Eye size={16} />
      </button>

      {open && (
        <div className="absolute left-0 top-10 z-50 w-72 bg-white rounded-[12px] border border-slate-200 shadow-[0_8px_24px_rgba(0,0,0,0.12)] p-4 animate-in fade-in zoom-in-95 duration-100">
          <h4 className="text-[15px] font-bold text-[#15171a] mb-3">Tùy chọn hiển thị</h4>
          <div className="space-y-3.5">
            {OPTIONS.map((opt) => (
              <div key={opt.key} className="flex items-center justify-between text-[13px] text-[#15171a]">
                <span>{opt.label}</span>
                <Switch checked={columns[opt.key]} onChange={() => onToggle(opt.key)} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
