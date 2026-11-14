'use client';

// Tùy chỉnh cột bảng danh sách Xuất hủy: bật/tắt từng cột, lưu theo trình duyệt (tiện ích cá nhân).

import React, { useEffect, useRef, useState } from 'react';
import { Columns3 } from 'lucide-react';

export type DisposalColumnKey =
  | 'totalValue'
  | 'time'
  | 'warehouse'
  | 'notes'
  | 'status'
  | 'totalQty'
  | 'itemCount'
  | 'createdBy'
  | 'processedBy';

export const DISPOSAL_COLUMNS: { key: DisposalColumnKey; label: string }[] = [
  { key: 'totalValue', label: 'Tổng giá trị hủy' },
  { key: 'time', label: 'Thời gian' },
  { key: 'warehouse', label: 'Chi nhánh' },
  { key: 'notes', label: 'Ghi chú' },
  { key: 'status', label: 'Trạng thái' },
  { key: 'totalQty', label: 'Tổng SL hủy' },
  { key: 'itemCount', label: 'Số mặt hàng' },
  { key: 'createdBy', label: 'Người tạo' },
  { key: 'processedBy', label: 'Người xuất hủy' },
];

/** Mặc định hiện đúng các cột của màn danh sách; các cột còn lại bật thêm khi cần */
export const DEFAULT_DISPOSAL_COLUMNS: DisposalColumnKey[] = ['totalValue', 'time', 'warehouse', 'notes', 'status'];

const STORAGE_KEY = 'stockflow_disposal_columns';

export function loadDisposalColumns(): DisposalColumnKey[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DISPOSAL_COLUMNS;
    const parsed = JSON.parse(raw) as string[];
    const valid = parsed.filter((k): k is DisposalColumnKey => DISPOSAL_COLUMNS.some((c) => c.key === k));
    return valid.length > 0 ? valid : DEFAULT_DISPOSAL_COLUMNS;
  } catch {
    return DEFAULT_DISPOSAL_COLUMNS;
  }
}

function saveDisposalColumns(cols: DisposalColumnKey[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cols));
  } catch {
    // tiện ích hiển thị, bỏ qua khi trình duyệt chặn lưu
  }
}

interface Props {
  value: DisposalColumnKey[];
  onChange: (cols: DisposalColumnKey[]) => void;
}

export function DisposalColumnSettings({ value, onChange }: Props) {
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

  const toggle = (key: DisposalColumnKey) => {
    const next = value.includes(key) ? value.filter((k) => k !== key) : [...value, key];
    // Giữ đúng thứ tự cột theo DISPOSAL_COLUMNS
    const ordered = DISPOSAL_COLUMNS.map((c) => c.key).filter((k) => next.includes(k));
    onChange(ordered);
    saveDisposalColumns(ordered);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Tùy chỉnh cột hiển thị"
        className={`w-8 h-8 rounded-[8px] border bg-white flex items-center justify-center cursor-pointer transition ${
          open ? 'border-[#0070f4] text-[#0070f4]' : 'border-slate-300 text-[#677484] hover:bg-[#f7f8f9]'
        }`}
      >
        <Columns3 size={15} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-56 max-w-[calc(100vw-1rem)] bg-white border border-slate-200 rounded-[8px] shadow-[rgba(169,180,203,0.32)_0px_8px_20px_0px] p-2">
          <div className="px-2 py-1 text-[11px] font-bold text-[#677484] uppercase tracking-wide">Hiển thị cột</div>
          <label className="flex items-center gap-2 px-2 py-1.5 text-[13px] text-slate-400">
            <input type="checkbox" checked disabled className="h-4 w-4" />
            Mã xuất hủy
          </label>
          {DISPOSAL_COLUMNS.map((c) => (
            <label key={c.key} className="flex items-center gap-2 px-2 py-1.5 text-[13px] rounded-[6px] hover:bg-[#f7f8f9] cursor-pointer">
              <input
                type="checkbox"
                checked={value.includes(c.key)}
                onChange={() => toggle(c.key)}
                className="h-4 w-4 accent-[#0070f4] cursor-pointer"
              />
              {c.label}
            </label>
          ))}
          <button
            type="button"
            onClick={() => {
              onChange(DEFAULT_DISPOSAL_COLUMNS);
              saveDisposalColumns(DEFAULT_DISPOSAL_COLUMNS);
            }}
            className="mt-1 w-full text-left px-2 py-1.5 text-[12px] text-[#0070f4] hover:underline cursor-pointer"
          >
            Khôi phục mặc định
          </button>
        </div>
      )}
    </div>
  );
}
