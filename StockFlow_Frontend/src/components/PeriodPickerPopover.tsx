'use client';

import { useEffect, useRef } from 'react';

export const PERIOD_GROUPS = [
  {
    title: 'Theo ngày',
    items: ['Hôm nay', 'Hôm qua'],
  },
  {
    title: 'Theo tuần',
    items: ['Tuần này', 'Tuần trước', '7 ngày qua'],
  },
  {
    title: 'Theo tháng',
    items: [
      'Tháng này',
      'Tháng trước',
      'Tháng này (âm lịch)',
      'Tháng trước (âm lịch)',
      '30 ngày qua',
    ],
  },
  {
    title: 'Theo quý',
    items: ['Quý này', 'Quý trước'],
  },
  {
    title: 'Theo năm',
    items: [
      'Năm nay',
      'Năm trước',
      'Năm nay (âm lịch)',
      'Năm trước (âm lịch)',
    ],
  },
];

type PeriodPickerPopoverProps = {
  open: boolean;
  selectedPeriod: string;
  onSelect: (period: string) => void;
  onClose: () => void;
};

export default function PeriodPickerPopover({
  open,
  selectedPeriod,
  onSelect,
  onClose,
}: PeriodPickerPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      onClick={(e) => e.stopPropagation()}
      className="absolute left-[calc(100%+14px)] -top-[70px] z-50 w-[640px] max-w-[90vw] rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xl select-none animate-in fade-in zoom-in-95 duration-100"
      role="dialog"
      aria-label="Chọn khoảng thời gian nhanh"
    >
      {/* Triangular Pointer Beak (points left directly to the input) */}
      <div className="absolute -left-2 top-[80px] h-4 w-4 rotate-45 border-b border-l border-slate-200 bg-white z-10" />

      {/* 5 Columns Layout */}
      <div className="grid grid-cols-5 gap-3.5">
        {PERIOD_GROUPS.map((group) => (
          <div key={group.title}>
            <div className="text-[13px] font-semibold text-slate-800 mb-3">
              {group.title}
            </div>
            <div className="flex flex-col gap-2">
              {group.items.map((item) => {
                const isSelected = selectedPeriod === item;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      onSelect(item);
                      onClose();
                    }}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer transition text-center whitespace-nowrap block w-fit ${
                      isSelected
                        ? 'bg-[#0071BA] text-white shadow-xs border border-[#0071BA]'
                        : 'border border-slate-300 text-slate-700 bg-white hover:border-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
