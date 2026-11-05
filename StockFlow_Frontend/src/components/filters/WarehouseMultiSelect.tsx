'use client';

// Bộ lọc Chi nhánh dạng thẻ chọn nhiều + danh sách thả xuống — cùng giao diện với màn Nhập hàng.
// Quy ước giá trị: [] = "Tất cả"; [id, ...] = các chi nhánh đã chọn.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';

export interface WarehouseOption {
  warehouseId: number;
  code?: string;
  name: string;
}

interface WarehouseMultiSelectProps {
  label?: string;
  value: number[];
  warehouses: WarehouseOption[];
  onChange: (ids: number[]) => void;
  /** Gỡ thẻ "Tất cả" thì quay về kho này (mặc định: kho đầu danh sách) */
  fallbackWarehouseId?: number;
}

const tagCls =
  'inline-flex items-center gap-1 px-2.5 py-1 rounded-[6px] bg-[#0070f4] text-white text-[12px] font-medium shadow-2xs';
const tagBtnCls = 'hover:bg-[#005ac3] rounded-sm p-0.5 transition cursor-pointer flex items-center justify-center';

export default function WarehouseMultiSelect({
  label = 'Chi nhánh',
  value,
  warehouses,
  onChange,
  fallbackWarehouseId,
}: WarehouseMultiSelectProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const isAll = value.length === 0;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return warehouses;
    return warehouses.filter((w) => w.name.toLowerCase().includes(kw) || (w.code || '').toLowerCase().includes(kw));
  }, [warehouses, keyword]);

  const toggle = (id: number) => {
    if (isAll) onChange([id]);
    else if (value.includes(id)) onChange(value.filter((v) => v !== id));
    else onChange([...value, id]);
  };

  const optionCls = (on: boolean) =>
    `px-3 py-2 text-[13px] cursor-pointer flex items-center justify-between transition text-[#15171a] ${
      on ? 'bg-[#f0f7ff] font-medium' : 'hover:bg-slate-50'
    }`;

  return (
    <div ref={ref} className="relative">
      <div className="text-[11px] font-bold text-[#677484] mb-1.5 uppercase tracking-wide">{label}</div>

      <div
        onClick={() => setOpen((v) => !v)}
        className={`min-h-[38px] p-1.5 rounded-[8px] border bg-white flex flex-wrap items-center gap-1.5 cursor-pointer transition ${
          open ? 'border-[#0070f4] ring-1 ring-[#0070f4]/20 shadow-xs' : 'border-slate-300 hover:border-slate-400'
        }`}
      >
        {isAll ? (
          <span className={tagCls} onClick={(e) => e.stopPropagation()}>
            <span>Tất cả</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const id = fallbackWarehouseId ?? warehouses[0]?.warehouseId;
                if (id) onChange([id]);
              }}
              className={tagBtnCls}
              title="Bỏ chọn Tất cả"
            >
              <X size={12} strokeWidth={2.5} />
            </button>
          </span>
        ) : (
          value.map((id) => {
            const wh = warehouses.find((w) => w.warehouseId === id);
            return (
              <span key={id} className={tagCls} onClick={(e) => e.stopPropagation()}>
                <span className="truncate max-w-[170px]" title={wh?.name}>
                  {wh?.name || `Kho #${id}`}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(value.filter((v) => v !== id));
                  }}
                  className={tagBtnCls}
                >
                  <X size={12} strokeWidth={2.5} />
                </button>
              </span>
            );
          })
        )}

        <input
          type="text"
          value={keyword}
          onChange={(e) => {
            setKeyword(e.target.value);
            if (!open) setOpen(true);
          }}
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
          className="flex-1 min-w-[30px] bg-transparent outline-none text-xs text-[#15171a] py-0.5"
        />
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-[8px] border border-slate-200 shadow-[0_6px_20px_rgba(0,0,0,0.12)] py-1.5 z-50 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
          <div
            onClick={() => {
              onChange([]);
              setKeyword('');
              setOpen(false);
            }}
            className={optionCls(isAll)}
          >
            <span>Tất cả</span>
            {isAll && <Check size={16} strokeWidth={2.5} className="text-[#0070f4] shrink-0" />}
          </div>
          {filtered.map((wh) => {
            const on = !isAll && value.includes(wh.warehouseId);
            return (
              <div key={wh.warehouseId} onClick={() => toggle(wh.warehouseId)} className={optionCls(on)}>
                <span className="truncate pr-2">{wh.name}</span>
                {on && <Check size={16} strokeWidth={2.5} className="text-[#0070f4] shrink-0" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
