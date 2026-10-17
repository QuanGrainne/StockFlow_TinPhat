'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDateString(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatDateVN(dateStr?: string): string {
  if (!dateStr) return '—';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

type CalendarCell = {
  dateString: string;
  dayNumber: number;
  isCurrentMonth: boolean;
};

function generateMonthGrid(monthDate: Date): CalendarCell[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth(); // 0-indexed

  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Monday = 0, ..., Sunday = 6
  const leadingDaysCount = (firstDay.getDay() + 6) % 7;

  const cells: CalendarCell[] = [];

  // Previous month trailing days
  if (leadingDaysCount > 0) {
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = leadingDaysCount - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const cellDate = new Date(year, month - 1, d);
      cells.push({
        dateString: toDateString(cellDate),
        dayNumber: d,
        isCurrentMonth: false,
      });
    }
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const cellDate = new Date(year, month, d);
    cells.push({
      dateString: toDateString(cellDate),
      dayNumber: d,
      isCurrentMonth: true,
    });
  }

  // Next month leading days to always complete 6 rows (42 cells)
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    const cellDate = new Date(year, month + 1, d);
    cells.push({
      dateString: toDateString(cellDate),
      dayNumber: d,
      isCurrentMonth: false,
    });
  }

  return cells;
}

// ─── Component Props ──────────────────────────────────────────────────────────

export type DateRangeValue = {
  from?: string; // YYYY-MM-DD
  to?: string;   // YYYY-MM-DD
};

type DateRangePickerPopoverProps = {
  open: boolean;
  value: DateRangeValue;
  onApply: (range: { from: string; to: string }) => void;
  onCancel: () => void;
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function DateRangePickerPopover({
  open,
  value,
  onApply,
  onCancel,
}: DateRangePickerPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  const todayStr = useMemo(() => toDateString(new Date()), []);

  const [draftFrom, setDraftFrom] = useState<string>(() => value.from || todayStr);
  const [draftTo, setDraftTo] = useState<string>(() => value.to || value.from || todayStr);

  const [leftMonth, setLeftMonth] = useState<Date>(() => {
    const base = value.from ? parseDateString(value.from) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const [rightMonth, setRightMonth] = useState<Date>(() => {
    const base = value.to ? parseDateString(value.to) : value.from ? parseDateString(value.from) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });


  // Click outside listener
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onCancel();
      }
    }
    // Defer slightly so the trigger click doesn't instantly close
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, onCancel]);

  if (!open) return null;

  const leftCells = generateMonthGrid(leftMonth);
  const rightCells = generateMonthGrid(rightMonth);

  const weekDayLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  function handleToday() {
    setDraftFrom(todayStr);
    setDraftTo(todayStr);
    const now = new Date();
    setLeftMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setRightMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  }

  function handleApply() {
    if (draftFrom && draftTo) {
      onApply({ from: draftFrom, to: draftTo });
    }
  }

  return (
    <div
      ref={popoverRef}
      onClick={(e) => e.stopPropagation()}
      className="absolute left-[calc(100%+14px)] -top-[122px] z-50 w-[610px] rounded-xl border border-slate-200 bg-white p-5 shadow-2xl select-none"
      role="dialog"
      aria-label="Chọn khoảng thời gian"
    >
      {/* Triangular Pointer Beak (points left directly to the input) */}
      <div className="absolute -left-2 top-[131px] h-4 w-4 rotate-45 border-b border-l border-slate-200 bg-white z-10" />

      {/* Header: Từ ngày - Đến ngày */}
      <div className="text-[13px] text-slate-600 mb-4 px-1">
        <span>Từ ngày: </span>
        <span className="font-bold text-slate-800">{formatDateVN(draftFrom)}</span>
        <span> - Đến ngày: </span>
        <span className="font-bold text-slate-800">{formatDateVN(draftTo)}</span>
      </div>

      {/* Calendars grid */}
      <div className="grid grid-cols-2 gap-7">

        {/* ─── Left Calendar: Từ ngày ─── */}
        <div>
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-3 px-0.5">
            <button
              type="button"
              aria-label="Tháng trước"
              onClick={() => setLeftMonth(new Date(leftMonth.getFullYear(), leftMonth.getMonth() - 1, 1))}
              className="h-7 w-7 rounded border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:border-slate-300 transition"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-[13px] font-semibold text-slate-800">
              Tháng {leftMonth.getMonth() + 1} {leftMonth.getFullYear()}
            </span>
            <button
              type="button"
              aria-label="Tháng sau"
              onClick={() => setLeftMonth(new Date(leftMonth.getFullYear(), leftMonth.getMonth() + 1, 1))}
              className="h-7 w-7 rounded border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:border-slate-300 transition"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 text-center text-xs text-slate-400 font-medium mb-2">
            {weekDayLabels.map((w) => (
              <span key={w}>{w}</span>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-y-1 text-center">
            {leftCells.map((cell) => {
              // Hide days > draftTo so "Từ ngày" cannot be greater than "Đến ngày"
              if (cell.dateString > draftTo) {
                return <span key={cell.dateString} className="h-8 w-8 inline-block" />;
              }

              const isSelected = cell.dateString === draftFrom;
              const isInRange = cell.dateString > draftFrom && cell.dateString <= draftTo;

              return (
                <div key={cell.dateString} className="flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => setDraftFrom(cell.dateString)}
                    className={`h-8 w-8 rounded-full text-xs transition cursor-pointer flex items-center justify-center ${
                      isSelected
                        ? 'bg-[#0071BA] font-bold text-white shadow-xs'
                        : isInRange
                          ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium'
                          : cell.isCurrentMonth
                            ? 'text-slate-700 hover:bg-slate-100'
                            : 'text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    {cell.dayNumber}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── Right Calendar: Đến ngày ─── */}
        <div>
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-3 px-0.5">
            <button
              type="button"
              aria-label="Tháng trước"
              onClick={() => setRightMonth(new Date(rightMonth.getFullYear(), rightMonth.getMonth() - 1, 1))}
              className="h-7 w-7 rounded border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:border-slate-300 transition"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-[13px] font-semibold text-slate-800">
              Tháng {rightMonth.getMonth() + 1} {rightMonth.getFullYear()}
            </span>
            <button
              type="button"
              aria-label="Tháng sau"
              onClick={() => setRightMonth(new Date(rightMonth.getFullYear(), rightMonth.getMonth() + 1, 1))}
              className="h-7 w-7 rounded border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:border-slate-300 transition"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 text-center text-xs text-slate-400 font-medium mb-2">
            {weekDayLabels.map((w) => (
              <span key={w}>{w}</span>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-y-1 text-center">
            {rightCells.map((cell) => {
              // Hide days < draftFrom so "Đến ngày" cannot be less than "Từ ngày"
              if (cell.dateString < draftFrom) {
                return <span key={cell.dateString} className="h-8 w-8 inline-block" />;
              }

              const isSelected = cell.dateString === draftTo;
              const isInRange = cell.dateString >= draftFrom && cell.dateString < draftTo;

              return (
                <div key={cell.dateString} className="flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => setDraftTo(cell.dateString)}
                    className={`h-8 w-8 rounded-full text-xs transition cursor-pointer flex items-center justify-center ${
                      isSelected
                        ? 'bg-[#0071BA] font-bold text-white shadow-xs'
                        : isInRange
                          ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium'
                          : cell.isCurrentMonth
                            ? 'text-slate-700 hover:bg-slate-100'
                            : 'text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    {cell.dayNumber}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
        <button
          type="button"
          onClick={handleToday}
          className="text-sm font-semibold text-[#0071BA] hover:underline cursor-pointer"
        >
          Hôm nay
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-8 px-4 rounded-[6px] border border-slate-300 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 cursor-pointer transition"
          >
            Bỏ qua
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="h-8 px-5 rounded-[6px] bg-[#0071BA] hover:bg-[#005f9d] text-sm font-medium text-white shadow-xs cursor-pointer transition"
          >
            Áp dụng
          </button>
        </div>
      </div>
    </div>
  );
}
