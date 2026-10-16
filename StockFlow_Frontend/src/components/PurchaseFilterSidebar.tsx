'use client';

import { Calendar, ChevronDown, ChevronRight, ChevronUp, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import type { PurchaseFilterState, PurchaseStatus } from '@/app/(dashboard)/purchases/PurchasesClient';
import DateRangePickerPopover, { formatDateVN } from '@/components/DateRangePickerPopover';
import PeriodPickerPopover from '@/components/PeriodPickerPopover';

// ─── Types ────────────────────────────────────────────────────────────────────

type PurchaseFilterSidebarProps = {
  state: PurchaseFilterState;
  onChange: (patch: Partial<PurchaseFilterState>) => void;
  isCollapsed?: boolean;
};

// ─── Status options ───────────────────────────────────────────────────────────

const STATUS_OPTIONS: { label: string; value: PurchaseStatus }[] = [
  { label: 'Phiếu tạm',     value: 'draft' },
  { label: 'Đã nhập hàng', value: 'completed' },
  { label: 'Đã hủy',        value: 'canceled' },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PurchaseFilterSidebar({ state, onChange, isCollapsed = false }: PurchaseFilterSidebarProps) {
  const timeRangeRadioName = `purchase-time-range-${useId()}`;
  const [periodPopoverOpen, setPeriodPopoverOpen] = useState(false);
  const [dateRangeOpen, setDateRangeOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDateRangeOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Toggle status checkbox
  function toggleStatus(value: PurchaseStatus) {
    const current = state.statuses;
    const next = current.includes(value)
      ? current.filter((s) => s !== value)
      : [...current, value];
    onChange({ statuses: next });
  }

  function activateTimeRange(timeRange: PurchaseFilterState['timeRange']) {
    onChange({ timeRange });
    if (timeRange === 'this_month') {
      setPeriodPopoverOpen(true);
      setDateRangeOpen(false);
      return;
    }

    setDateRangeOpen(true);
    setPeriodPopoverOpen(false);
  }

  return (
    <aside
      ref={containerRef}
      className={`relative shrink-0 bg-white border-r border-[#e5e7eb] select-none text-[#262626] transition-all duration-300 ${
        isCollapsed ? 'w-0 overflow-hidden px-0 py-0' : 'w-[260px] overflow-visible px-4 py-5'
      }`}
    >
      {/* Title */}
      <h2 className="text-[20px] font-bold text-slate-900 tracking-tight mb-5">
        Nhập hàng
      </h2>

      <div className="space-y-5">

        {/* ── 1. Trạng thái ── */}
        <div>
          <div className="text-[13px] font-semibold text-slate-800 mb-2">
            Trạng thái
          </div>
          <div className="space-y-1.5">
            {STATUS_OPTIONS.map((opt) => {
              const checked = state.statuses.includes(opt.value);
              return (
                <label
                  key={opt.value}
                  className="flex items-center gap-2.5 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleStatus(opt.value)}
                    className="h-4 w-4 rounded border-slate-300 accent-[#0071BA] cursor-pointer"
                  />
                  <span className="text-[13px] text-slate-700 group-hover:text-slate-900 transition">
                    {opt.label}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-[#e5e7eb]" />

        {/* ── 2. Thời gian ── */}
        <div>
          <div className="text-[13px] font-semibold text-slate-800 mb-2">
            Thời gian
          </div>
          <div className="space-y-2" role="radiogroup" aria-label="Lọc theo thời gian">

            {/* Option A: Tháng này / Chọn kỳ nhanh */}
            <div className="relative">
              <div className="flex items-center gap-2.5 group">
                <input
                  type="radio"
                  name={timeRangeRadioName}
                  value="this_month"
                  checked={state.timeRange === 'this_month'}
                  onChange={() => activateTimeRange('this_month')}
                  onClick={() => {
                    if (state.timeRange === 'this_month') activateTimeRange('this_month');
                  }}
                  className="h-4 w-4 shrink-0 cursor-pointer accent-[#0071BA]"
                  aria-label="Chọn tháng hoặc kỳ nhanh"
                />

                {/* Input trigger box */}
                <button
                  type="button"
                  onClick={() => {
                    if (state.timeRange === 'this_month') {
                      setPeriodPopoverOpen((prev) => !prev);
                      setDateRangeOpen(false);
                    } else {
                      activateTimeRange('this_month');
                    }
                  }}
                  aria-pressed={state.timeRange === 'this_month'}
                  className={`flex-1 h-[34px] px-3 border rounded-[6px] bg-white flex items-center justify-between text-left text-[13px] cursor-pointer transition ${
                    periodPopoverOpen
                      ? 'border-blue-500 ring-2 ring-blue-100 shadow-xs text-slate-800'
                      : state.timeRange === 'this_month'
                        ? 'border-[#0071BA] text-slate-800 font-medium'
                        : 'border-slate-300 text-slate-700 hover:border-slate-400'
                  }`}
                >
                  <span>{state.periodLabel || 'Tháng này'}</span>
                  <ChevronRight size={14} className="text-slate-400" />
                </button>
              </div>

              {/* Period Picker Popover matching Image 1 */}
              <PeriodPickerPopover
                open={periodPopoverOpen}
                selectedPeriod={state.periodLabel || 'Tháng này'}
                onSelect={(period) => {
                  onChange({
                    timeRange: 'this_month',
                    periodLabel: period,
                    dateFrom: undefined,
                    dateTo: undefined,
                  });
                  setPeriodPopoverOpen(false);
                }}
                onClose={() => setPeriodPopoverOpen(false)}
              />
            </div>

            {/* Option B: Tùy chỉnh */}
            <div className="relative">
              <div className="flex items-center gap-2.5 group">
                <input
                  type="radio"
                  name={timeRangeRadioName}
                  value="custom"
                  checked={state.timeRange === 'custom'}
                  onChange={() => activateTimeRange('custom')}
                  onClick={() => {
                    if (state.timeRange === 'custom') activateTimeRange('custom');
                  }}
                  className="h-4 w-4 shrink-0 cursor-pointer accent-[#0071BA]"
                  aria-label="Chọn khoảng ngày tùy chỉnh"
                />

                {/* Input trigger box */}
                <button
                  type="button"
                  onClick={() => {
                    if (state.timeRange === 'custom') {
                      setDateRangeOpen((prev) => !prev);
                      setPeriodPopoverOpen(false);
                    } else {
                      activateTimeRange('custom');
                    }
                  }}
                  aria-pressed={state.timeRange === 'custom'}
                  className={`flex-1 h-[34px] px-3 border rounded-[6px] bg-white flex items-center justify-between text-left text-[13px] cursor-pointer transition ${
                    dateRangeOpen
                      ? 'border-blue-500 ring-2 ring-blue-100 shadow-xs text-slate-800'
                      : state.timeRange === 'custom'
                        ? 'border-[#0071BA] text-slate-800 font-medium'
                        : 'border-slate-300 text-slate-700 hover:border-slate-400'
                  }`}
                >
                  <span className="truncate">
                    {state.timeRange === 'custom' && state.dateFrom && state.dateTo
                      ? `${formatDateVN(state.dateFrom)} - ${formatDateVN(state.dateTo)}`
                      : 'Tùy chỉnh'}
                  </span>
                  <Calendar size={14} className="text-slate-500 shrink-0" />
                </button>
              </div>

              {/* Dual-calendar Date Range Popover matching screenshot */}
              <DateRangePickerPopover
                key={`${dateRangeOpen}-${state.dateFrom ?? ''}-${state.dateTo ?? ''}`}
                open={dateRangeOpen}
                value={{ from: state.dateFrom, to: state.dateTo }}
                onApply={(range) => {
                  onChange({
                    timeRange: 'custom',
                    dateFrom: range.from,
                    dateTo: range.to,
                  });
                  setDateRangeOpen(false);
                }}
                onCancel={() => setDateRangeOpen(false)}
              />
            </div>

          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-[#e5e7eb]" />

        {/* ── 3. Người tạo ── */}
        <div>
          <div className="text-[13px] font-semibold text-slate-800 mb-2">
            Người tạo
          </div>
          <CreatedByDropdown
            value={state.createdBy}
            onChange={(v) => onChange({ createdBy: v })}
          />
        </div>

        {/* Divider */}
        <div className="border-t border-[#e5e7eb]" />

        {/* ── 4. Số hóa đơn đầu vào ── */}
        <div>
          <div className="text-[13px] font-semibold text-slate-800 mb-2">
            Số hóa đơn đầu vào
          </div>
          <input
            type="text"
            placeholder="Theo số hóa đơn đầu vào"
            value={state.invoiceCode ?? ''}
            onChange={(e) => onChange({ invoiceCode: e.target.value || undefined })}
            className="h-[34px] w-full rounded-[6px] border border-slate-300 bg-white px-3 text-[13px] text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* Divider */}
        <div className="border-t border-[#e5e7eb]" />

        {/* ── 5. Người nhập ── */}
        <div>
          <div className="text-[13px] font-semibold text-slate-800 mb-2">
            Người nhập
          </div>
          <CreatedByDropdown
            placeholder="Chọn người nhập"
            value={state.importedBy}
            onChange={(v) => onChange({ importedBy: v })}
          />
        </div>

      </div>
    </aside>
  );
}

// ─── Reusable: Người tạo / Người nhập Dropdown ───────────────────────────────

const STAFF_OPTIONS = [
  'Quản trị viên Hệ thống',
  'Nguyễn Văn A',
  'Trần Thị B',
  'Lê Văn C',
];

function CreatedByDropdown({
  value,
  onChange,
  placeholder = 'Chọn người tạo',
}: {
  value?: string;
  onChange: (v: string | undefined) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <div
        onClick={() => setOpen((v) => !v)}
        className={`h-[34px] px-3 bg-white border rounded-[6px] flex items-center justify-between text-[13px] cursor-pointer transition ${
          open
            ? 'border-blue-500 ring-2 ring-blue-100 shadow-xs'
            : 'border-slate-300 hover:border-slate-400'
        }`}
      >
        <span className={value ? 'text-slate-800 font-medium truncate' : 'text-slate-400 truncate'}>
          {value ?? placeholder}
        </span>
        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          {value && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(undefined); }}
              className="hover:text-slate-600 p-0.5"
            >
              <X size={12} />
            </button>
          )}
          {open ? <ChevronUp size={14} className="text-slate-600" /> : <ChevronDown size={14} />}
        </div>
      </div>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-[6px] border border-slate-200 shadow-lg py-1 z-40">
          <div
            onClick={() => { onChange(undefined); setOpen(false); }}
            className={`px-3 py-1.5 text-xs cursor-pointer transition ${
              !value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            Tất cả
          </div>
          {STAFF_OPTIONS.map((name) => (
            <div
              key={name}
              onClick={() => { onChange(name); setOpen(false); }}
              className={`px-3 py-1.5 text-xs cursor-pointer transition ${
                value === name ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              {name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
