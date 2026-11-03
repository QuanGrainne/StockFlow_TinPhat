// Bộ lọc "Thời gian" dùng chung — cùng giao diện và hành vi với khối Thời gian của TransferFilterSidebar:
// [◉ Preset >]  mở popover chọn nhanh (Hôm nay, Tuần này, Tháng này...)
// [○ Tùy chỉnh 📅] mở popover 2 lịch chọn Từ ngày / Đến ngày.

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  formatDateOnlyVN,
  getDateRangeForPreset,
  parseISODate,
  toISODate,
} from '@/features/transfers/utils/dateUtils';

export interface TimeRangeValue {
  /** Mã preset (this_month, last_7_days, all_time...) hoặc 'custom' */
  timeRange: string;
  /** YYYY-MM-DD, rỗng khi 'all_time' */
  dateFrom: string;
  /** YYYY-MM-DD, rỗng khi 'all_time' */
  dateTo: string;
}

interface PresetItem {
  key: string;
  label: string;
}

interface PresetColumn {
  title: string;
  items: PresetItem[];
}

export const ALL_TIME_PRESET: PresetItem = { key: 'all_time', label: 'Toàn thời gian' };

const BASE_PRESET_COLUMNS: PresetColumn[] = [
  { title: 'Theo ngày', items: [{ key: 'today', label: 'Hôm nay' }, { key: 'yesterday', label: 'Hôm qua' }] },
  {
    title: 'Theo tuần',
    items: [
      { key: 'this_week', label: 'Tuần này' },
      { key: 'last_week', label: 'Tuần trước' },
      { key: 'last_7_days', label: '7 ngày qua' },
    ],
  },
  {
    title: 'Theo tháng',
    items: [
      { key: 'this_month', label: 'Tháng này' },
      { key: 'last_month', label: 'Tháng trước' },
      { key: 'last_30_days', label: '30 ngày qua' },
    ],
  },
  { title: 'Theo năm', items: [{ key: 'this_year', label: 'Năm nay' }, { key: 'last_year', label: 'Năm trước' }] },
];

/** Khoảng ngày của preset; 'all_time' trả về rỗng (không giới hạn). */
export function getTimeRangeForPreset(key: string): TimeRangeValue & { label: string } {
  if (key === ALL_TIME_PRESET.key) {
    return { timeRange: key, dateFrom: '', dateTo: '', label: ALL_TIME_PRESET.label };
  }
  const r = getDateRangeForPreset(key);
  return { timeRange: key, dateFrom: r.from, dateTo: r.to, label: r.label };
}

interface TimeRangeFilterProps {
  value: TimeRangeValue;
  onChange: (value: TimeRangeValue) => void;
  /** Thêm lựa chọn "Toàn thời gian" (cột Khác) */
  allowAllTime?: boolean;
  label?: string;
}

interface PopoverCoords {
  top: number;
  left: number;
  arrowTop: number;
}

const radioOn = (
  <div className="w-4 h-4 rounded-full border-2 border-[#0070f4] flex items-center justify-center shrink-0">
    <div className="w-2 h-2 rounded-full bg-[#0070f4]" />
  </div>
);
const radioOff = <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0 hover:border-slate-400" />;

export default function TimeRangeFilter({
  value,
  onChange,
  allowAllTime = false,
  label = 'Thời gian',
}: TimeRangeFilterProps) {
  const isCustom = value.timeRange === 'custom';
  const presetColumns: PresetColumn[] = allowAllTime
    ? [...BASE_PRESET_COLUMNS, { title: 'Khác', items: [ALL_TIME_PRESET] }]
    : BASE_PRESET_COLUMNS;
  const defaultPresetKey = allowAllTime ? ALL_TIME_PRESET.key : 'this_month';


  const [showPreset, setShowPreset] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [presetCoords, setPresetCoords] = useState<PopoverCoords>({ top: 0, left: 0, arrowTop: 24 });
  const [customCoords, setCustomCoords] = useState<PopoverCoords>({ top: 0, left: 0, arrowTop: 24 });

  const presetBoxRef = useRef<HTMLDivElement>(null);
  const customBoxRef = useRef<HTMLDivElement>(null);
  const presetTriggerRef = useRef<HTMLDivElement>(null);
  const customTriggerRef = useRef<HTMLDivElement>(null);
  const presetPopoverRef = useRef<HTMLDivElement>(null);
  const customPopoverRef = useRef<HTMLDivElement>(null);

  // Lịch tùy chỉnh (2 bên độc lập)
  const [tempFrom, setTempFrom] = useState<Date>(() => parseISODate(value.dateFrom));
  const [tempTo, setTempTo] = useState<Date>(() => parseISODate(value.dateTo));
  const [leftMonth, setLeftMonth] = useState<Date>(() => {
    const d = parseISODate(value.dateFrom);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [rightMonth, setRightMonth] = useState<Date>(() => {
    const d = parseISODate(value.dateTo);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const presetLabel = isCustom
    ? getTimeRangeForPreset(defaultPresetKey).label
    : getTimeRangeForPreset(value.timeRange || defaultPresetKey).label;

  // Đóng popover khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        showPreset &&
        !presetPopoverRef.current?.contains(target) &&
        !presetTriggerRef.current?.contains(target)
      ) {
        setShowPreset(false);
      }
      if (
        showCustom &&
        !customPopoverRef.current?.contains(target) &&
        !customTriggerRef.current?.contains(target)
      ) {
        setShowCustom(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPreset, showCustom]);

  const computeCoords = (anchor: HTMLElement | null, popoverHeight: number, offset: number): PopoverCoords => {
    if (!anchor) return { top: 0, left: 0, arrowTop: 24 };
    const rect = anchor.getBoundingClientRect();
    let top = rect.top - offset;
    if (top + popoverHeight > window.innerHeight) top = Math.max(10, window.innerHeight - popoverHeight - 10);
    if (top < 10) top = 10;
    return { top, left: rect.right + 10, arrowTop: Math.max(16, rect.top - top + rect.height / 2 - 8) };
  };

  const handleOpenPreset = () => {
    if (isCustom) onChange(getTimeRangeForPreset(defaultPresetKey));
    setPresetCoords(computeCoords(presetBoxRef.current, 220, 20));
    setShowPreset((v) => !v);
    setShowCustom(false);
  };

  const handleOpenCustom = () => {
    const f = value.dateFrom ? parseISODate(value.dateFrom) : new Date();
    const t = value.dateTo ? parseISODate(value.dateTo) : new Date();
    onChange({ timeRange: 'custom', dateFrom: toISODate(f), dateTo: toISODate(t) });
    setTempFrom(f);
    setTempTo(t);
    setLeftMonth(new Date(f.getFullYear(), f.getMonth(), 1));
    setRightMonth(new Date(t.getFullYear(), t.getMonth(), 1));
    setCustomCoords(computeCoords(customBoxRef.current, 360, 60));
    setShowCustom((v) => !v);
    setShowPreset(false);
  };

  const handleSelectPreset = (key: string) => {
    onChange(getTimeRangeForPreset(key));
    setShowPreset(false);
  };

  const handleApplyCustom = () => {
    const [f, t] = tempFrom > tempTo ? [tempTo, tempFrom] : [tempFrom, tempTo];
    onChange({ timeRange: 'custom', dateFrom: toISODate(f), dateTo: toISODate(t) });
    setShowCustom(false);
  };

  const handleSetToday = () => {
    const today = new Date();
    setTempFrom(today);
    setTempTo(today);
    setLeftMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setRightMonth(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  const renderCalendarDays = (monthDate: Date, isLeft: boolean) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const startDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Thứ 2 là đầu tuần

    const days: { date: Date; dayNum: number; isCurrentMonth: boolean; iso: string }[] = [];
    for (let i = startDayIndex - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, daysInPrevMonth - i);
      days.push({ date, dayNum: daysInPrevMonth - i, isCurrentMonth: false, iso: toISODate(date) });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      days.push({ date, dayNum: d, isCurrentMonth: true, iso: toISODate(date) });
    }
    let nextDay = 1;
    while (days.length % 7 !== 0 || days.length < 35) {
      const date = new Date(year, month + 1, nextDay);
      days.push({ date, dayNum: nextDay, isCurrentMonth: false, iso: toISODate(date) });
      nextDay++;
    }

    const selectedIso = toISODate(isLeft ? tempFrom : tempTo);
    return (
      <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
        {days.map((item, idx) => (
          <div
            key={idx}
            onClick={() => (isLeft ? setTempFrom(item.date) : setTempTo(item.date))}
            className="h-8 flex items-center justify-center cursor-pointer transition relative"
          >
            <span
              className={`w-7 h-7 flex items-center justify-center rounded-full text-xs transition ${
                item.iso === selectedIso
                  ? 'bg-[#0070f4] text-white font-bold shadow-xs'
                  : item.isCurrentMonth
                  ? 'text-[#15171a] hover:bg-[#f7f8f9] font-medium'
                  : 'text-slate-300 hover:bg-[#f7f8f9]'
              }`}
            >
              {item.dayNum}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const renderCalendar = (monthDate: Date, setMonth: React.Dispatch<React.SetStateAction<Date>>, isLeft: boolean) => (
    <div className={`flex-1 ${isLeft ? '' : 'border-l border-slate-100 pl-6'}`}>
      <div className="flex items-center justify-between mb-3 px-1">
        <button
          type="button"
          onClick={() => setMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
          className="w-6 h-6 rounded-[4px] flex items-center justify-center text-[#677484] hover:bg-[#f7f8f9] cursor-pointer"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="text-xs font-semibold text-[#15171a]">
          Tháng {monthDate.getMonth() + 1} {monthDate.getFullYear()}
        </span>
        <button
          type="button"
          onClick={() => setMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
          className="w-6 h-6 rounded-[4px] flex items-center justify-center text-[#677484] hover:bg-[#f7f8f9] cursor-pointer"
        >
          <ChevronRight size={14} />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center mb-1 text-[11px] font-medium text-[#677484]">
        {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      {renderCalendarDays(monthDate, isLeft)}
    </div>
  );

  const popoverCls =
    'bg-white rounded-[8px] shadow-[rgba(169,180,203,0.32)_0px_8px_20px_0px] border border-slate-200 p-4 select-none animate-in fade-in zoom-in-95 duration-100';
  const arrowCls =
    'absolute -left-[8px] w-0 h-0 border-y-[8px] border-y-transparent border-r-[8px] border-r-white drop-shadow-sm pointer-events-none';

  return (
    <div>
      <label className="block text-[11px] font-bold text-[#677484] mb-1.5 uppercase tracking-wide">{label}</label>

      <div className="space-y-2">
        {/* Option 1: Preset */}
        <div ref={presetTriggerRef} className="flex items-center gap-2">
          <div onClick={handleOpenPreset} className="cursor-pointer p-0.5">
            {!isCustom ? radioOn : radioOff}
          </div>
          <div
            ref={presetBoxRef}
            onClick={handleOpenPreset}
            className={`flex-1 h-8 px-3 rounded-[8px] border flex items-center justify-between cursor-pointer transition select-none ${
              !isCustom
                ? 'border-slate-300 bg-white text-[#15171a] shadow-xs hover:border-[#0070f4]'
                : 'border-slate-200 bg-white text-[#677484] hover:border-slate-300'
            }`}
          >
            <span className="text-xs font-medium truncate">{presetLabel}</span>
            <ChevronRight size={14} className="text-[#677484] shrink-0" />
          </div>
        </div>

        {/* Option 2: Tùy chỉnh */}
        <div ref={customTriggerRef} className="flex items-center gap-2">
          <div onClick={handleOpenCustom} className="cursor-pointer p-0.5">
            {isCustom ? radioOn : radioOff}
          </div>
          <div
            ref={customBoxRef}
            onClick={handleOpenCustom}
            className={`flex-1 h-8 px-2.5 rounded-[8px] border flex items-center justify-between cursor-pointer transition select-none ${
              isCustom
                ? 'border-slate-300 bg-white text-[#15171a] shadow-xs hover:border-[#0070f4]'
                : 'border-slate-200 bg-white text-[#677484] hover:border-slate-300'
            }`}
          >
            <span className="text-[11px] font-medium truncate text-[#15171a] tracking-tight">
              {isCustom
                ? `${formatDateOnlyVN(value.dateFrom || new Date())} - ${formatDateOnlyVN(value.dateTo || value.dateFrom || new Date())}`
                : 'Tùy chỉnh'}
            </span>
            <Calendar size={14} className="text-[#677484] shrink-0 ml-1" />
          </div>
        </div>
      </div>

      {/* Popover chọn nhanh */}
      {
        showPreset &&
        createPortal(
          <div
            ref={presetPopoverRef}
            style={{ position: 'fixed', top: presetCoords.top, left: presetCoords.left, zIndex: 9999 }}
            className={popoverCls}
          >
            <div className={arrowCls} style={{ top: presetCoords.arrowTop }} />
            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: `repeat(${presetColumns.length}, minmax(0, 1fr))`, minWidth: presetColumns.length * 110 }}
            >
              {presetColumns.map((col) => (
                <div key={col.title} className="flex flex-col">
                  <h4 className="text-xs font-bold text-[#15171a] mb-2.5 whitespace-nowrap">{col.title}</h4>
                  <div className="flex flex-col gap-2">
                    {col.items.map((it) => {
                      const isSelected = (value.timeRange || defaultPresetKey) === it.key;
                      return (
                        <button
                          key={it.key}
                          type="button"
                          onClick={() => handleSelectPreset(it.key)}
                          className={`w-full py-1.5 px-3 rounded-full text-xs text-center transition cursor-pointer whitespace-nowrap ${
                            isSelected
                              ? 'bg-[#0070f4] text-white font-semibold shadow-xs'
                              : 'bg-white border border-slate-200 text-[#15171a] hover:border-[#0070f4] hover:text-[#0070f4] font-normal'
                          }`}
                        >
                          {it.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>,
          document.body
        )}

      {/* Popover lịch tùy chỉnh */}
      {
        showCustom &&
        createPortal(
          <div
            ref={customPopoverRef}
            style={{ position: 'fixed', top: customCoords.top, left: customCoords.left, zIndex: 9999 }}
            className={`${popoverCls} w-[580px]`}
          >
            <div className={arrowCls} style={{ top: customCoords.arrowTop }} />

            <div className="text-xs text-[#677484] pb-3 border-b border-slate-100 flex items-center gap-1.5">
              <span>Từ ngày:</span>
              <span className="font-bold text-[#15171a]">{formatDateOnlyVN(tempFrom)}</span>
              <span className="mx-1">-</span>
              <span>Đến ngày:</span>
              <span className="font-bold text-[#15171a]">{formatDateOnlyVN(tempTo)}</span>
            </div>

            <div className="flex gap-6 py-3">
              {renderCalendar(leftMonth, setLeftMonth, true)}
              {renderCalendar(rightMonth, setRightMonth, false)}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={handleSetToday}
                className="text-xs text-[#0070f4] hover:text-[#005ac3] hover:underline font-semibold cursor-pointer"
              >
                Hôm nay
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCustom(false)}
                  className="px-3.5 py-1.5 rounded-[8px] border border-slate-300 text-xs text-[#15171a] hover:bg-[#f7f8f9] transition cursor-pointer font-medium"
                >
                  Bỏ qua
                </button>
                <button
                  type="button"
                  onClick={handleApplyCustom}
                  className="px-4 py-1.5 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                >
                  Áp dụng
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
