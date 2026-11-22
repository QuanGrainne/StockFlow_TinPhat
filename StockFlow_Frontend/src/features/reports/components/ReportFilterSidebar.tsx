'use client';

// Bộ lọc trái của màn Báo cáo: kỳ báo cáo và kho (chỉ kho được phân quyền – BR-04)

import React from 'react';
import { CalendarDays, Warehouse } from 'lucide-react';
import type { WarehouseItem } from '@/lib/warehouse/useActiveWarehouse';
import type { PeriodPreset, ReportFilter } from '../types';
import { MAX_PERIOD_DAYS, PERIOD_PRESETS, periodDays, rangeOfPreset } from '../utils/reportFormat';

interface ReportFilterSidebarProps {
  filter: ReportFilter;
  warehouses: WarehouseItem[];
  onChange: (next: ReportFilter) => void;
  /** Nội dung lọc riêng của tab (VD nhóm hàng, kiểu nhóm) */
  children?: React.ReactNode;
}

const inputClass =
  'h-[34px] w-full rounded-[6px] border border-slate-300 bg-white px-2 text-[13px] text-slate-700 outline-none transition hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

export function ReportFilterSidebar({ filter, warehouses, onChange, children }: ReportFilterSidebarProps) {
  const selectPreset = (preset: PeriodPreset) => {
    if (preset === 'custom') {
      onChange({ ...filter, preset });
      return;
    }
    onChange({ ...filter, preset, ...rangeOfPreset(preset) });
  };

  const customInvalid =
    filter.preset === 'custom' &&
    (!filter.from || !filter.to || filter.from > filter.to || periodDays(filter.from, filter.to) > MAX_PERIOD_DAYS);

  return (
    <aside className="w-[260px] shrink-0 select-none overflow-y-auto border-r border-[#e5e7eb] bg-white px-4 py-5 text-[#262626]">
      <h2 className="mb-5 text-[20px] font-bold tracking-tight text-slate-900">Báo cáo</h2>

      <section className="mb-5">
        <div className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-slate-800">
          <CalendarDays size={14} className="text-[#0071BA]" />
          Thời gian
        </div>
        <div className="space-y-1.5" role="radiogroup" aria-label="Kỳ báo cáo">
          {PERIOD_PRESETS.map((p) => {
            const active = filter.preset === p.key;
            return (
              <button
                key={p.key}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => selectPreset(p.key)}
                className="flex w-full items-center gap-2 rounded px-1 py-1 text-left text-[13px] text-slate-700 hover:bg-slate-50"
              >
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                    active ? 'border-blue-600' : 'border-slate-300'
                  }`}
                >
                  {active && <span className="h-2 w-2 rounded-full bg-blue-600" />}
                </span>
                {p.label}
              </button>
            );
          })}
        </div>

        {filter.preset === 'custom' && (
          <div className="mt-3 space-y-2">
            <label className="block text-xs text-slate-500">
              Từ ngày
              <input
                type="date"
                className={`${inputClass} mt-1`}
                value={filter.from}
                max={filter.to || undefined}
                onChange={(e) => onChange({ ...filter, from: e.target.value })}
              />
            </label>
            <label className="block text-xs text-slate-500">
              Đến ngày
              <input
                type="date"
                className={`${inputClass} mt-1`}
                value={filter.to}
                min={filter.from || undefined}
                onChange={(e) => onChange({ ...filter, to: e.target.value })}
              />
            </label>
            {customInvalid && (
              <p className="text-xs text-rose-600">
                Chọn từ ngày trước đến ngày, kỳ tối đa {MAX_PERIOD_DAYS} ngày.
              </p>
            )}
          </div>
        )}
      </section>

      <section className="mb-5">
        <div className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-slate-800">
          <Warehouse size={14} className="text-[#0071BA]" />
          Kho
        </div>
        <select
          className={inputClass}
          value={filter.warehouseId ?? ''}
          onChange={(e) => onChange({ ...filter, warehouseId: e.target.value ? Number(e.target.value) : null })}
          aria-label="Kho"
        >
          <option value="">Tất cả kho được phân quyền</option>
          {warehouses.map((w) => (
            <option key={w.warehouseId} value={w.warehouseId}>
              {w.code} – {w.name}
            </option>
          ))}
        </select>
      </section>

      {children}
    </aside>
  );
}

/** Bộ lọc hợp lệ để gọi API (kỳ Tùy chỉnh đã chọn đủ và đúng) */
export function isFilterReady(filter: ReportFilter): boolean {
  return (
    !!filter.from &&
    !!filter.to &&
    filter.from <= filter.to &&
    periodDays(filter.from, filter.to) <= MAX_PERIOD_DAYS
  );
}
