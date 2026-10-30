'use client';

import {
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  getDateRangeForPreset,
  formatDateOnlyVN,
  parseISODate,
  toISODate,
} from '@/features/transfers/utils/dateUtils';

export type StockCriteriaType =
  | 'all'
  | 'below_min'
  | 'above_max'
  | 'in_stock'
  | 'out_of_stock'
  | 'custom';

export type DirectSaleType = 'all' | 'yes' | 'no';
export type BusinessStatusType = 'all' | 'active' | 'inactive';

export type FilterSidebarState = {
  category?: string;
  categories?: string[];
  stockCriteria: StockCriteriaType;
  customStockMin?: number;
  customStockMax?: number;
  expectedOutOfStockType: 'all' | 'custom';
  expectedOutOfStockPeriod?: string;
  expectedOutOfStockDate?: string;
  expectedOutOfStockDateFrom?: string;
  expectedOutOfStockDateTo?: string;
  createdDateType: 'all' | 'custom';
  createdPeriod?: string;
  createdDate?: string;
  createdDateFrom?: string;
  createdDateTo?: string;
  // Attributes matching screenshots
  attrType: string;
  attrColor: string;
  attrSize: string;
  attrKg?: string;
  attrKho?: string;
  attrThung?: string;
  supplier?: string;
  suppliers?: string[];
  location?: string;
  locations?: string[];
  productType?: string;
  productTypes?: string[];
  directSale: DirectSaleType;
  businessStatus: BusinessStatusType;
  channelLinked?: 'all' | 'yes' | 'no';
};

type ProductFilterSidebarProps = {
  state: FilterSidebarState;
  onChange: (patch: Partial<FilterSidebarState>) => void;
  onCreateCategory: () => void;
  categoriesList?: string[];
  suppliersList?: string[];
  locationsList?: string[];
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onResetFilters?: () => void;
};


export const INITIAL_FILTER_STATE: FilterSidebarState = {
  categories: [],
  stockCriteria: 'all',
  expectedOutOfStockType: 'all',
  createdDateType: 'all',
  attrType: '',
  attrColor: '',
  attrSize: '',
  suppliers: [],
  locations: [],
  productTypes: [],
  directSale: 'all',
  businessStatus: 'all',
  channelLinked: 'all',
};

const DEFAULT_CATEGORIES = [
  'Thành phẩm',
  'Nguyên vật liệu',
  'Thang cáp',
  'Máng cáp',
  'Khay cáp',
  'Tôn cuộn',
  'Bột sơn tĩnh điện',
  'Phụ kiện liên kết',
];

const DEFAULT_SUPPLIERS = [
  'kiểm kho',
  'tuân xả vải',
  'xưởng sỉ',
  'Ba Vì Milk',
  'Công ty TNHH Tín Phát',
  'Tập đoàn Hoa Sen',
  'Thép Hòa Phát',
  'Sơn AkzoNobel Việt Nam',
  'Nhà máy Cơ khí Miền Bắc',
];

const DEFAULT_LOCATIONS = [
  'Kho thành phẩm',
  'Kho nguyên vật liệu',
  'Khu A - Kệ 01',
  'Khu B - Kệ 02',
  'Khu C - Kệ 03',
];

const PRODUCT_TYPES = ['Hàng hóa', 'Dịch vụ', 'Combo - đóng gói'];

const STOCK_CRITERIA_OPTIONS: { label: string; value: StockCriteriaType }[] = [
  { label: 'Tất cả', value: 'all' },
  { label: 'Dưới định mức tồn', value: 'below_min' },
  { label: 'Vượt định mức tồn', value: 'above_max' },
  { label: 'Còn hàng trong kho', value: 'in_stock' },
  { label: 'Hết hàng trong kho', value: 'out_of_stock' },
  { label: 'Tùy chỉnh giá trị tồn', value: 'custom' },
];

const BUSINESS_STATUS_OPTIONS: { label: string; value: BusinessStatusType }[] = [
  { label: 'Tất cả', value: 'all' },
  { label: 'Hàng đang kinh doanh', value: 'active' },
  { label: 'Hàng ngừng kinh doanh', value: 'inactive' },
];

type DateRange = { from?: string; to?: string };

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateKey(value?: string) {
  if (!value) return '—';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function CalendarMonth({
  month,
  range,
  onSelect,
  minDate,
  maxDate,
  hoverDate,
  onHover,
  selecting,
}: {
  month: Date;
  range: DateRange;
  onSelect: (value: string) => void;
  minDate?: string;
  maxDate?: string;
  hoverDate?: string | null;
  onHover?: (value: string | null) => void;
  selecting?: boolean;
}) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const prevMonthLastDay = new Date(month.getFullYear(), month.getMonth(), 0).getDate();
  const leadingDays = (firstDay.getDay() + 6) % 7;
  const totalCells = Math.ceil((leadingDays + daysInMonth) / 7) * 7;

  // Calculate effective range for continuous selection highlighting
  const effectiveFrom = range.from;
  const effectiveTo = range.to || (selecting && hoverDate ? hoverDate : undefined);
  const start = effectiveFrom && effectiveTo ? (effectiveFrom <= effectiveTo ? effectiveFrom : effectiveTo) : effectiveFrom;
  const end = effectiveFrom && effectiveTo ? (effectiveFrom <= effectiveTo ? effectiveTo : effectiveFrom) : undefined;

  return (
    <div className="min-w-0 flex-1">
      <div className="mb-2 grid grid-cols-7 text-center text-xs font-semibold text-slate-500">
        {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day) => (
          <span key={day} className="py-1">{day}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1.5 text-center">
        {Array.from({ length: totalCells }, (_, index) => {
          if (index < leadingDays) {
            const prevDayNum = prevMonthLastDay - leadingDays + index + 1;
            return (
              <span key={`prev-${index}`} className="h-8 flex items-center justify-center text-xs text-slate-300 opacity-40 select-none">
                {prevDayNum}
              </span>
            );
          }
          const dayNum = index - leadingDays + 1;
          if (dayNum > daysInMonth) {
            const nextDayNum = dayNum - daysInMonth;
            return (
              <span key={`next-${index}`} className="h-8 flex items-center justify-center text-xs text-slate-300 opacity-40 select-none">
                {nextDayNum}
              </span>
            );
          }
          const value = toDateKey(new Date(month.getFullYear(), month.getMonth(), dayNum));
          const isPast = minDate ? value < minDate : false;
          const isFuture = maxDate ? value > maxDate : false;
          const isDisabled = isPast || isFuture;

          const isEndpoint = value === range.from || (range.to && value === range.to);
          const inRange = Boolean(start && end && value >= start && value <= end && !isEndpoint);

          if (isDisabled) {
            return (
              <span
                key={value}
                className="h-8 w-8 mx-auto flex items-center justify-center text-xs text-slate-300 opacity-30 cursor-not-allowed select-none"
                title="Ngày đã qua không thể chọn"
              >
                {dayNum}
              </span>
            );
          }

          return (
            <button
              key={value}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(value);
              }}
              onMouseEnter={() => {
                if (selecting && onHover) onHover(value);
              }}
              className={`h-8 w-8 mx-auto flex items-center justify-center text-xs transition cursor-pointer select-none ${
                isEndpoint
                  ? 'rounded-full bg-[#0071BA] font-bold text-white shadow-xs scale-105'
                  : inRange
                    ? 'rounded-md bg-blue-50 text-blue-700 font-semibold'
                    : 'rounded-full text-slate-700 hover:bg-blue-50 hover:text-blue-700'
              }`}
            >
              {dayNum}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DateRangePopover({
  open,
  anchorRef,
  value,
  onApply,
  onCancel,
  onToday,
  minDate,
  maxDate,
}: {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  value: DateRange;
  onApply: (range: DateRange) => void;
  onCancel: () => void;
  onToday: () => void;
  minDate?: string;
  maxDate?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [draft, setDraft] = useState<DateRange>(value);
  const [selecting, setSelecting] = useState(false);
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  const [leftMonth, setLeftMonth] = useState(() => {
    const base = value.from ? new Date(`${value.from}T00:00:00`) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const [rightMonth, setRightMonth] = useState(() => {
    const base = value.to ? new Date(`${value.to}T00:00:00`) : new Date();
    const lBase = value.from ? new Date(`${value.from}T00:00:00`) : new Date();
    if (!value.to || (base.getFullYear() === lBase.getFullYear() && base.getMonth() === lBase.getMonth())) {
      return addMonths(new Date(lBase.getFullYear(), lBase.getMonth(), 1), 1);
    }
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const [coords, setCoords] = useState<{ top: number; left: number; arrowTop: number } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setDraft({ from: value.from, to: value.to });
      setSelecting(false);
      setHoverDate(null);
      const base = value.from ? new Date(`${value.from}T00:00:00`) : new Date();
      const l = new Date(base.getFullYear(), base.getMonth(), 1);
      setLeftMonth(l);
      const toBase = value.to ? new Date(`${value.to}T00:00:00`) : addMonths(l, 1);
      setRightMonth(new Date(toBase.getFullYear(), toBase.getMonth(), 1));
    }
  }, [open, value.from, value.to]);

  useEffect(() => {
    if (!open || !anchorRef.current) return;

    const updatePos = () => {
      if (!anchorRef.current) return;
      const rect = anchorRef.current.getBoundingClientRect();
      const popoverWidth = 600;
      const popoverHeight = 390;

      let left = rect.right + 14;
      if (left + popoverWidth > window.innerWidth - 16) {
        left = Math.max(16, window.innerWidth - popoverWidth - 16);
      }

      let top = rect.top - 24;
      if (top + popoverHeight > window.innerHeight - 16) {
        top = Math.max(16, window.innerHeight - popoverHeight - 16);
      }
      if (top < 16) top = 16;

      const arrowTop = Math.max(16, Math.min(popoverHeight - 24, rect.top + rect.height / 2 - top));
      setCoords({ top, left, arrowTop });
    };

    updatePos();
    window.addEventListener('resize', updatePos);
    window.addEventListener('scroll', updatePos, true);
    return () => {
      window.removeEventListener('resize', updatePos);
      window.removeEventListener('scroll', updatePos, true);
    };
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (popoverRef.current && popoverRef.current.contains(target)) return;
      if (anchorRef.current && anchorRef.current.contains(target)) return;
      onCancel();
    };
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 10);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, onCancel, anchorRef]);

  if (!mounted || !open || !coords || typeof document === 'undefined') return null;

  // ─── Logic Chọn dải ngày chuẩn 2 click: Click 1 chọn 'Từ ngày', Click 2 chọn 'Đến ngày' ───
  function selectDate(date: string) {
    if (!selecting) {
      // Click 1: Bắt đầu chọn Từ ngày
      setDraft({ from: date, to: undefined });
      setSelecting(true);
      setHoverDate(null);
    } else {
      // Click 2: Chọn Đến ngày và khóa dải
      if (draft.from && date < draft.from) {
        setDraft({ from: date, to: draft.from });
      } else {
        setDraft({ from: draft.from, to: date });
      }
      setSelecting(false);
      setHoverDate(null);
    }
  }

  const handleTodayClick = () => {
    const today = toDateKey(new Date());
    setDraft({ from: today, to: today });
    setSelecting(false);
    setHoverDate(null);
    const now = new Date();
    setLeftMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setRightMonth(addMonths(new Date(now.getFullYear(), now.getMonth(), 1), 1));
  };

  const handleApplyClick = () => {
    if (!draft.from) return;
    onApply({
      from: draft.from,
      to: draft.to || draft.from,
    });
  };

  // Preview header date range
  const displayFrom = draft.from;
  const displayTo = draft.to || (selecting ? (hoverDate || draft.from) : draft.from);

  return createPortal(
    <div
      ref={popoverRef}
      data-portal-popover="true"
      style={{ top: coords.top, left: coords.left }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      className="fixed z-[9999] w-[600px] max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 select-none"
    >
      {/* Triangular notch pointing left to anchor */}
      <div
        style={{ top: coords.arrowTop }}
        className="absolute -left-2 w-4 h-4 bg-white rotate-45 border-l border-b border-slate-200 z-10"
      />

      {/* Header matching Image 2 */}
      <div className="mb-4 border-b border-slate-100 pb-3 text-sm text-slate-800">
        <span className="font-semibold text-slate-600">Từ ngày: </span>
        <span className="font-bold text-slate-900">{formatDateKey(displayFrom)}</span>
        <span className="mx-2 text-slate-400">-</span>
        <span className="font-semibold text-slate-600">Đến ngày: </span>
        <span className="font-bold text-slate-900">{formatDateKey(displayTo)}</span>
        {selecting && (
          <span className="ml-2 text-xs text-blue-600 font-medium italic animate-pulse">
            (Chọn ngày kết thúc...)
          </span>
        )}
      </div>

      {/* Two Months Side-by-Side (Image 2) */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setLeftMonth(addMonths(leftMonth, -1))}
              className="w-7 h-7 rounded flex items-center justify-center text-slate-500 hover:bg-slate-100 cursor-pointer font-bold text-sm"
            >
              ‹
            </button>
            <span className="text-sm font-bold text-slate-800">
              {`Tháng ${leftMonth.getMonth() + 1} ${leftMonth.getFullYear()}`}
            </span>
            <button
              type="button"
              onClick={() => setLeftMonth(addMonths(leftMonth, 1))}
              className="w-7 h-7 rounded flex items-center justify-center text-slate-500 hover:bg-slate-100 cursor-pointer font-bold text-sm"
            >
              ›
            </button>
          </div>
          <CalendarMonth
            month={leftMonth}
            range={draft}
            onSelect={selectDate}
            minDate={minDate}
            maxDate={maxDate}
            hoverDate={hoverDate}
            onHover={setHoverDate}
            selecting={selecting}
          />
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setRightMonth(addMonths(rightMonth, -1))}
              className="w-7 h-7 rounded flex items-center justify-center text-slate-500 hover:bg-slate-100 cursor-pointer font-bold text-sm"
            >
              ‹
            </button>
            <span className="text-sm font-bold text-slate-800">
              {`Tháng ${rightMonth.getMonth() + 1} ${rightMonth.getFullYear()}`}
            </span>
            <button
              type="button"
              onClick={() => setRightMonth(addMonths(rightMonth, 1))}
              className="w-7 h-7 rounded flex items-center justify-center text-slate-500 hover:bg-slate-100 cursor-pointer font-bold text-sm"
            >
              ›
            </button>
          </div>
          <CalendarMonth
            month={rightMonth}
            range={draft}
            onSelect={selectDate}
            minDate={minDate}
            maxDate={maxDate}
            hoverDate={hoverDate}
            onHover={setHoverDate}
            selecting={selecting}
          />
        </div>
      </div>

      {/* Footer matching Image 2 */}
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={handleTodayClick}
          className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer hover:underline transition"
        >
          Hôm nay
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition cursor-pointer"
          >
            Bỏ qua
          </button>
          <button
            type="button"
            disabled={!draft.from}
            onClick={handleApplyClick}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-[#0071BA] hover:bg-[#005f9d] text-white transition cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Áp dụng
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function PeriodPresetPopover({
  open,
  anchorRef,
  onClose,
  selectedValue,
  onSelect,
  isExpected = false,
}: {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  selectedValue?: string;
  onSelect: (val: string) => void;
  isExpected?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; arrowTop: number } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const updatePos = () => {
      if (!anchorRef.current) return;
      const rect = anchorRef.current.getBoundingClientRect();
      const popoverWidth = isExpected ? 440 : 640;
      const popoverHeight = 320;

      let left = rect.right + 14;
      if (left + popoverWidth > window.innerWidth - 16) {
        left = Math.max(16, window.innerWidth - popoverWidth - 16);
      }

      let top = rect.top - 20;
      if (top + popoverHeight > window.innerHeight - 16) {
        top = Math.max(16, window.innerHeight - popoverHeight - 16);
      }
      if (top < 16) top = 16;

      const arrowTop = Math.max(16, Math.min(popoverHeight - 24, rect.top + rect.height / 2 - top));
      setCoords({ top, left, arrowTop });
    };

    updatePos();
    window.addEventListener('resize', updatePos);
    window.addEventListener('scroll', updatePos, true);
    return () => {
      window.removeEventListener('resize', updatePos);
      window.removeEventListener('scroll', updatePos, true);
    };
  }, [open, anchorRef, isExpected]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (popoverRef.current && popoverRef.current.contains(target)) return;
      if (anchorRef.current && anchorRef.current.contains(target)) return;
      onClose();
    };
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 10);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, onClose, anchorRef]);

  if (!mounted || !open || !coords || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={popoverRef}
      data-portal-popover="true"
      style={{ top: coords.top, left: coords.left }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      className={`fixed z-[9999] bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 animate-in fade-in zoom-in-95 duration-100 ${
        isExpected ? 'w-[440px]' : 'w-[640px]'
      }`}
    >
      {/* Pointer beak pointing left to the button */}
      <div
        style={{ top: coords.arrowTop }}
        className="absolute -left-2 w-4 h-4 bg-white rotate-45 border-l border-b border-slate-200 z-10"
      />

      {isExpected ? (
        <div className="grid grid-cols-3 gap-5">
          {/* Theo ngày */}
          <div>
            <div className="text-[13px] font-semibold text-slate-900 mb-3">Theo ngày</div>
            <div className="flex flex-col gap-2">
              {['Ngày mai', 'Ngày kia', '3 ngày tới', '5 ngày tới', '7 ngày tới'].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    onSelect(item);
                    onClose();
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer transition text-center whitespace-nowrap block w-fit ${
                    selectedValue === item
                      ? 'bg-[#0071BA] text-white shadow-xs'
                      : 'border border-slate-300 text-slate-700 bg-white hover:border-slate-400 hover:bg-slate-50'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* Theo tuần */}
          <div>
            <div className="text-[13px] font-semibold text-slate-900 mb-3">Theo tuần</div>
            <div className="flex flex-col gap-2">
              {['Tuần này', 'Tuần tới', '2 tuần tới'].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    onSelect(item);
                    onClose();
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer transition text-center whitespace-nowrap block w-fit ${
                    selectedValue === item
                      ? 'bg-[#0071BA] text-white shadow-xs'
                      : 'border border-slate-300 text-slate-700 bg-white hover:border-slate-400 hover:bg-slate-50'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* Theo tháng */}
          <div>
            <div className="text-[13px] font-semibold text-slate-900 mb-3">Theo tháng</div>
            <div className="flex flex-col gap-2">
              {['Tháng này', 'Tháng tới', '30 ngày tới', '2 tháng tới', '3 tháng tới'].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    onSelect(item);
                    onClose();
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer transition text-center whitespace-nowrap block w-fit ${
                    selectedValue === item
                      ? 'bg-[#0071BA] text-white shadow-xs'
                      : 'border border-slate-300 text-slate-700 bg-white hover:border-slate-400 hover:bg-slate-50'
                  }`}
                >
                  {item}
                </button>
              ))}

              <button
                type="button"
                onClick={() => {
                  onSelect('Toàn thời gian');
                  onClose();
                }}
                className={`px-4 py-1.5 rounded-full text-xs font-medium cursor-pointer transition text-center whitespace-nowrap block w-fit mt-1 ${
                  !selectedValue || selectedValue === 'Toàn thời gian'
                    ? 'bg-[#0071BA] text-white shadow-xs'
                    : 'border border-slate-300 text-slate-700 bg-white hover:border-slate-400 hover:bg-slate-50'
                }`}
              >
                Toàn thời gian
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-3.5">
          {/* Theo ngày */}
          <div>
            <div className="text-[13px] font-semibold text-slate-900 mb-3">Theo ngày</div>
            <div className="flex flex-col gap-2">
              {['Hôm nay', 'Hôm qua'].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    onSelect(item);
                    onClose();
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer transition text-center whitespace-nowrap block w-fit ${
                    selectedValue === item
                      ? 'bg-[#0071BA] text-white shadow-xs'
                      : 'border border-slate-300 text-slate-700 bg-white hover:border-slate-400 hover:bg-slate-50'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* Theo tuần */}
          <div>
            <div className="text-[13px] font-semibold text-slate-900 mb-3">Theo tuần</div>
            <div className="flex flex-col gap-2">
              {['Tuần này', 'Tuần trước', '7 ngày qua'].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    onSelect(item);
                    onClose();
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer transition text-center whitespace-nowrap block w-fit ${
                    selectedValue === item
                      ? 'bg-[#0071BA] text-white shadow-xs'
                      : 'border border-slate-300 text-slate-700 bg-white hover:border-slate-400 hover:bg-slate-50'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* Theo tháng */}
          <div>
            <div className="text-[13px] font-semibold text-slate-900 mb-3">Theo tháng</div>
            <div className="flex flex-col gap-2">
              {[
                'Tháng này',
                'Tháng trước',
                'Tháng này (âm lịch)',
                'Tháng trước (âm lịch)',
                '30 ngày qua',
              ].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    onSelect(item);
                    onClose();
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer transition text-center whitespace-nowrap block w-fit ${
                    selectedValue === item
                      ? 'bg-[#0071BA] text-white shadow-xs'
                      : 'border border-slate-300 text-slate-700 bg-white hover:border-slate-400 hover:bg-slate-50'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* Theo quý */}
          <div>
            <div className="text-[13px] font-semibold text-slate-900 mb-3">Theo quý</div>
            <div className="flex flex-col gap-2">
              {['Quý này', 'Quý trước'].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    onSelect(item);
                    onClose();
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer transition text-center whitespace-nowrap block w-fit ${
                    selectedValue === item
                      ? 'bg-[#0071BA] text-white shadow-xs'
                      : 'border border-slate-300 text-slate-700 bg-white hover:border-slate-400 hover:bg-slate-50'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* Theo năm */}
          <div>
            <div className="text-[13px] font-semibold text-slate-900 mb-3">Theo năm</div>
            <div className="flex flex-col gap-2">
              {['Năm nay', 'Năm trước'].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    onSelect(item);
                    onClose();
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer transition text-center whitespace-nowrap block w-fit ${
                    selectedValue === item
                      ? 'bg-[#0071BA] text-white shadow-xs'
                      : 'border border-slate-300 text-slate-700 bg-white hover:border-slate-400 hover:bg-slate-50'
                  }`}
                >
                  {item}
                </button>
              ))}

              <button
                type="button"
                onClick={() => {
                  onSelect('Toàn thời gian');
                  onClose();
                }}
                className={`px-4 py-1.5 rounded-full text-xs font-medium cursor-pointer transition text-center whitespace-nowrap block w-fit mt-1 ${
                  !selectedValue || selectedValue === 'Toàn thời gian'
                    ? 'bg-[#0071BA] text-white shadow-xs'
                    : 'border border-slate-300 text-slate-700 bg-white hover:border-slate-400 hover:bg-slate-50'
                }`}
              >
                Toàn thời gian
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}

function MultiSelectPillBox({
  label,
  placeholder,
  selected,
  options,
  onChange,
  isOpen,
  onToggle,
  onClose,
}: {
  label: string;
  placeholder?: string;
  selected: string[];
  options: string[];
  onChange: (items: string[]) => void;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(search.trim().toLowerCase())
  );

  const hasSelection = selected.length > 0;

  return (
    <div ref={boxRef} className="relative">
      <div className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-800 mb-1.5">
        <span>{label}</span>
        {hasSelection && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block" />}
      </div>

      {hasSelection ? (
        <div
          onClick={onToggle}
          className="min-h-[38px] p-1.5 bg-white border border-slate-300 hover:border-slate-400 rounded-[6px] flex flex-wrap items-center gap-1.5 cursor-pointer transition"
        >
          {selected.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-[#0071BA] text-white text-xs font-semibold shadow-2xs"
            >
              <span className="truncate max-w-[170px]">{item}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(selected.filter((x) => x !== item));
                }}
                className="hover:text-blue-200 transition p-0.5 cursor-pointer"
                title={`Bỏ chọn ${item}`}
              >
                <X size={12} strokeWidth={2.5} />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <div
          onClick={onToggle}
          className="h-[34px] px-3 bg-white border border-slate-300 hover:border-slate-400 rounded-[6px] flex items-center justify-between text-[13px] text-slate-400 cursor-pointer transition"
        >
          <span className="truncate">{placeholder || `Chọn ${label.toLowerCase()}`}</span>
          <ChevronDown size={14} className="text-slate-400 shrink-0" />
        </div>
      )}

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-[6px] border border-slate-200 shadow-xl py-1 z-40 max-h-56 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
          {options.length > 5 && (
            <div className="px-2 pb-1 border-b border-slate-100">
              <input
                type="text"
                autoFocus
                placeholder="Tìm kiếm..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-7 px-2 text-xs rounded border border-slate-200 bg-slate-50 outline-none focus:border-blue-500"
              />
            </div>
          )}

          <div className="py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-400 text-center">Không có lựa chọn</div>
            ) : (
              filteredOptions.map((opt) => {
                const isChecked = selected.includes(opt);
                return (
                  <div
                    key={opt}
                    onClick={() => {
                      if (isChecked) {
                        onChange(selected.filter((x) => x !== opt));
                      } else {
                        onChange([...selected, opt]);
                      }
                    }}
                    className={`px-3 py-1.5 text-xs cursor-pointer flex items-center justify-between transition ${
                      isChecked ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div
                        className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                          isChecked ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isChecked && <Check size={10} strokeWidth={3} />}
                      </div>
                      <span className="truncate">{opt}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {hasSelection && (
            <div className="border-t border-slate-100 px-3 py-1 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Đã chọn {selected.length}</span>
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
              >
                Bỏ chọn tất cả
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const PRESET_COLUMNS = [
  {
    title: 'Theo ngày',
    items: [
      { key: 'today', label: 'Hôm nay' },
      { key: 'yesterday', label: 'Hôm qua' },
    ],
  },
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
  {
    title: 'Theo năm',
    items: [
      { key: 'this_year', label: 'Năm nay' },
      { key: 'last_year', label: 'Năm trước' },
    ],
  },
];

export default function ProductFilterSidebar({
  state,
  onChange,
  onCreateCategory,
  categoriesList = DEFAULT_CATEGORIES,
  suppliersList = DEFAULT_SUPPLIERS,
  locationsList = DEFAULT_LOCATIONS,
  isCollapsed = false,
  onToggleCollapse,
  onResetFilters,
}: ProductFilterSidebarProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Dropdown & Popover open states
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [stockOpen, setStockOpen] = useState(false);
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  // Popover for Expected Date
  const [expectedPeriodPopoverOpen, setExpectedPeriodPopoverOpen] = useState(false);
  const [expectedDateRangeOpen, setExpectedDateRangeOpen] = useState(false);

  // Creation Date Popover states & refs (Chuẩn Chuyển hàng)
  const [showPresetPopover, setShowPresetPopover] = useState(false);
  const [showCustomPopover, setShowCustomPopover] = useState(false);

  const presetTriggerRef = useRef<HTMLDivElement>(null);
  const customTriggerRef = useRef<HTMLDivElement>(null);
  const presetBoxRef = useRef<HTMLDivElement>(null);
  const customBoxRef = useRef<HTMLDivElement>(null);
  const presetPopoverRef = useRef<HTMLDivElement>(null);
  const customPopoverRef = useRef<HTMLDivElement>(null);

  const [presetCoords, setPresetCoords] = useState<{ top: number; left: number; arrowTop: number }>({
    top: 0,
    left: 0,
    arrowTop: 24,
  });
  const [customCoords, setCustomCoords] = useState<{ top: number; left: number; arrowTop: number }>({
    top: 0,
    left: 0,
    arrowTop: 24,
  });

  const [createdPresetLabel, setCreatedPresetLabel] = useState<string>(() => {
    return state.createdPeriod || 'Tháng này';
  });

  useEffect(() => {
    if (state.createdPeriod) {
      setCreatedPresetLabel(state.createdPeriod);
    }
  }, [state.createdPeriod]);

  const [tempFrom, setTempFrom] = useState<Date>(() => parseISODate(state.createdDateFrom));
  const [tempTo, setTempTo] = useState<Date>(() => parseISODate(state.createdDateTo));
  const [leftMonth, setLeftMonth] = useState<Date>(() => {
    const d = parseISODate(state.createdDateFrom);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [rightMonth, setRightMonth] = useState<Date>(() => {
    const d = parseISODate(state.createdDateTo);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  // Expanded attributes (LOẠI, MÀU, SIZE, KG, KHỔ, THÙNG (THÙNG = 600 VỈ))
  const [expandAttributes, setExpandAttributes] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const expectedPeriodAnchorRef = useRef<HTMLDivElement>(null);
  const expectedDateRangeAnchorRef = useRef<HTMLDivElement>(null);

  // Close all open dropdowns/popovers when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;

      if (
        showPresetPopover &&
        presetPopoverRef.current &&
        !presetPopoverRef.current.contains(target) &&
        presetTriggerRef.current &&
        !presetTriggerRef.current.contains(target)
      ) {
        setShowPresetPopover(false);
      }

      if (
        showCustomPopover &&
        customPopoverRef.current &&
        !customPopoverRef.current.contains(target) &&
        customTriggerRef.current &&
        !customTriggerRef.current.contains(target)
      ) {
        setShowCustomPopover(false);
      }

      if (containerRef.current && containerRef.current.contains(target)) return;
      if ((target as Element)?.closest?.('[data-portal-popover]')) return;

      setCategoryOpen(false);
      setStockOpen(false);
      setSupplierOpen(false);
      setLocationOpen(false);
      setTypeOpen(false);
      setStatusOpen(false);
      setExpectedPeriodPopoverOpen(false);
      setExpectedDateRangeOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPresetPopover, showCustomPopover]);

  const handleOpenCreatedPreset = () => {
    if (state.createdDateType === 'custom') {
      const range = getDateRangeForPreset('this_month');
      onChange({
        createdDateType: 'all',
        createdPeriod: range.label,
        createdDateFrom: range.from,
        createdDateTo: range.to,
      });
      setCreatedPresetLabel(range.label);
    }

    const anchor = presetBoxRef.current || presetTriggerRef.current;
    if (anchor) {
      const rect = anchor.getBoundingClientRect();
      const popoverHeight = 220;
      let top = rect.top - 20;
      if (top + popoverHeight > window.innerHeight) {
        top = Math.max(10, window.innerHeight - popoverHeight - 10);
      }
      if (top < 10) top = 10;
      const arrowTop = Math.max(16, rect.top - top + rect.height / 2 - 8);
      setPresetCoords({
        top,
        left: rect.right + 10,
        arrowTop,
      });
    }

    setShowPresetPopover((prev) => !prev);
    setShowCustomPopover(false);
  };

  const handleOpenCreatedCustom = () => {
    const f = state.createdDateFrom ? parseISODate(state.createdDateFrom) : new Date();
    const t = state.createdDateTo ? parseISODate(state.createdDateTo) : new Date();

    onChange({
      createdDateType: 'custom',
      createdDateFrom: toISODate(f),
      createdDateTo: toISODate(t),
    });

    setTempFrom(f);
    setTempTo(t);
    setLeftMonth(new Date(f.getFullYear(), f.getMonth(), 1));
    setRightMonth(new Date(t.getFullYear(), t.getMonth(), 1));

    const anchor = customBoxRef.current || customTriggerRef.current;
    if (anchor) {
      const rect = anchor.getBoundingClientRect();
      const popoverHeight = 360;
      let top = rect.top - 60;
      if (top + popoverHeight > window.innerHeight) {
        top = Math.max(10, window.innerHeight - popoverHeight - 10);
      }
      if (top < 10) top = 10;
      const arrowTop = Math.max(16, rect.top - top + rect.height / 2 - 8);
      setCustomCoords({
        top,
        left: rect.right + 10,
        arrowTop,
      });
    }

    setShowCustomPopover((prev) => !prev);
    setShowPresetPopover(false);
  };

  const handleSelectCreatedPreset = (key: string, label: string) => {
    const range = getDateRangeForPreset(key);
    setCreatedPresetLabel(label);
    onChange({
      createdDateType: 'all',
      createdPeriod: label,
      createdDateFrom: range.from,
      createdDateTo: range.to,
    });
    setShowPresetPopover(false);
  };

  const handleApplyCreatedCustom = () => {
    let f = tempFrom;
    let t = tempTo;
    if (f > t) {
      const tmp = f;
      f = t;
      t = tmp;
    }
    const fromISO = toISODate(f);
    const toISO = toISODate(t);
    onChange({
      createdDateType: 'custom',
      createdDateFrom: fromISO,
      createdDateTo: toISO,
    });
    setShowCustomPopover(false);
  };

  const handleSetCreatedToday = () => {
    const today = new Date();
    setTempFrom(today);
    setTempTo(today);
    setLeftMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setRightMonth(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  const renderCreatedCalendarDays = (monthDate: Date, isLeftCalendar: boolean) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const startDayIndex = (firstDay.getDay() + 6) % 7;

    interface DayItem {
      date: Date;
      dayNum: number;
      isCurrentMonth: boolean;
      iso: string;
    }

    const days: DayItem[] = [];

    for (let i = startDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const date = new Date(year, month - 1, d);
      days.push({
        date,
        dayNum: d,
        isCurrentMonth: false,
        iso: toISODate(date),
      });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      days.push({
        date,
        dayNum: d,
        isCurrentMonth: true,
        iso: toISODate(date),
      });
    }

    let nextDay = 1;
    while (days.length % 7 !== 0 || days.length < 35) {
      const date = new Date(year, month + 1, nextDay);
      days.push({
        date,
        dayNum: nextDay,
        isCurrentMonth: false,
        iso: toISODate(date),
      });
      nextDay++;
    }

    const fromISO = toISODate(tempFrom);
    const toISO = toISODate(tempTo);

    return (
      <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
        {days.map((item, idx) => {
          const isSelected = isLeftCalendar
            ? item.iso === fromISO
            : item.iso === toISO;

          return (
            <div
              key={idx}
              onClick={() => {
                if (isLeftCalendar) {
                  setTempFrom(item.date);
                } else {
                  setTempTo(item.date);
                }
              }}
              className="h-8 flex items-center justify-center cursor-pointer transition relative"
            >
              <span
                className={`w-7 h-7 flex items-center justify-center rounded-full text-xs transition ${
                  isSelected
                    ? 'bg-[#0070f4] text-white font-bold shadow-xs'
                    : item.isCurrentMonth
                    ? 'text-[#15171a] hover:bg-[#f7f8f9] font-medium'
                    : 'text-slate-300 hover:bg-[#f7f8f9]'
                }`}
              >
                {item.dayNum}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const filteredCategories = categoriesList.filter((cat) =>
    cat.toLowerCase().includes(categorySearch.trim().toLowerCase())
  );

  const currentStockLabel =
    STOCK_CRITERIA_OPTIONS.find((opt) => opt.value === state.stockCriteria)?.label ??
    'Tất cả';

  const currentStatusLabel =
    BUSINESS_STATUS_OPTIONS.find((opt) => opt.value === state.businessStatus)?.label ??
    'Hàng đang kinh doanh';

  const currentExpectedPeriodLabel = state.expectedOutOfStockPeriod || 'Toàn thời gian';

  return (
    <aside
      ref={containerRef}
      className={`relative ${
        isCollapsed ? 'w-0 border-r-0' : 'w-60 border-r border-slate-200'
      } h-full min-h-0 bg-white flex flex-col shrink-0 transition-all duration-200 text-[13px] text-[#15171a] select-none font-sans`}
    >
      {/* Nút thu gọn / mở rộng bộ lọc theo chuẩn giao diện */}
      {onToggleCollapse && (
        <button
          type="button"
          onClick={onToggleCollapse}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white border border-[#0070f4] text-[#0070f4] hover:bg-[#e6f1fe] shadow-xs flex items-center justify-center cursor-pointer z-30 transition"
          title={isCollapsed ? 'Mở rộng bộ lọc' : 'Thu gọn bộ lọc'}
        >
          {isCollapsed ? (
            <ChevronRight size={13} className="stroke-[2.5]" />
          ) : (
            <ChevronLeft size={13} className="stroke-[2.5]" />
          )}
        </button>
      )}

      {!isCollapsed && (
        <div className="flex-1 min-h-0 p-3.5 space-y-4 overflow-y-auto">
        {/* 1. Nhóm hàng */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[13px] font-semibold text-slate-800">Nhóm hàng</span>
            <button
              type="button"
              onClick={onCreateCategory}
              className="text-[13px] font-medium text-blue-600 hover:text-blue-700 hover:underline cursor-pointer transition"
            >
              Tạo mới
            </button>
          </div>

          <div className="relative">
            <div
              onClick={() => {
                setCategoryOpen(!categoryOpen);
                setStockOpen(false);
                setSupplierOpen(false);
                setLocationOpen(false);
                setTypeOpen(false);
                setStatusOpen(false);
                setShowPresetPopover(false);
                setShowCustomPopover(false);
                setExpectedPeriodPopoverOpen(false);
              }}
              className={`h-[34px] px-3 bg-white border rounded-[6px] flex items-center justify-between text-[13px] cursor-pointer transition ${
                categoryOpen
                  ? 'border-blue-500 ring-2 ring-blue-100 shadow-xs'
                  : 'border-slate-300 hover:border-slate-400'
              }`}
            >
              <span className={state.category ? 'text-slate-800 font-medium truncate' : 'text-slate-400 truncate'}>
                {state.category || 'Chọn nhóm hàng'}
              </span>
              <div className="flex items-center gap-1 text-slate-400">
                {state.category && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange({ category: undefined });
                    }}
                    className="hover:text-slate-600 p-0.5"
                  >
                    <X size={13} />
                  </button>
                )}
                {categoryOpen ? <ChevronUp size={14} className="text-slate-600" /> : <ChevronDown size={14} />}
              </div>
            </div>

            {/* Category popover */}
            {categoryOpen && (
              <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-[6px] border border-slate-200 shadow-lg py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2.5 pb-1.5 border-b border-slate-100">
                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      autoFocus
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      placeholder="Tìm nhóm hàng..."
                      className="w-full h-7 pl-7 pr-2 text-xs rounded border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto py-1">
                  <div
                    onClick={() => {
                      onChange({ category: undefined });
                      setCategoryOpen(false);
                    }}
                    className={`px-3 py-1.5 text-xs cursor-pointer flex items-center justify-between transition ${
                      !state.category
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>Tất cả nhóm hàng</span>
                    {!state.category && <Check size={14} className="text-blue-600 stroke-[2.5]" />}
                  </div>

                  {filteredCategories.map((cat) => {
                    const isSelected = state.category === cat;
                    return (
                      <div
                        key={cat}
                        onClick={() => {
                          onChange({ category: cat });
                          setCategoryOpen(false);
                        }}
                        className={`px-3 py-1.5 text-xs cursor-pointer flex items-center justify-between transition ${
                          isSelected
                            ? 'bg-blue-50 text-blue-700 font-medium'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="truncate">{cat}</span>
                        {isSelected && <Check size={14} className="text-blue-600 stroke-[2.5]" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2. Tồn kho */}
        <div>
          <div className="text-[13px] font-semibold text-slate-800">Tồn kho</div>
          <div className="text-[11px] text-slate-500 font-normal mt-0.5 mb-1.5">Tiêu chí tồn</div>

          <div className="relative">
            <div
              onClick={() => {
                setStockOpen(!stockOpen);
                setCategoryOpen(false);
                setSupplierOpen(false);
                setLocationOpen(false);
                setTypeOpen(false);
                setStatusOpen(false);
                setShowPresetPopover(false);
                setShowCustomPopover(false);
                setExpectedPeriodPopoverOpen(false);
              }}
              className={`h-[34px] px-3 bg-white border rounded-[6px] flex items-center justify-between text-[13px] cursor-pointer transition ${
                stockOpen
                  ? 'border-2 border-blue-500 shadow-xs'
                  : 'border-slate-300 hover:border-slate-400'
              }`}
            >
              <span className="text-slate-800 font-medium truncate">{currentStockLabel}</span>
              {stockOpen ? (
                <ChevronUp size={15} className="text-slate-800" />
              ) : (
                <ChevronDown size={15} className="text-slate-500" />
              )}
            </div>

            {/* Dropdown Menu */}
            {stockOpen && (
              <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-[6px] border border-slate-200 shadow-xl py-1 z-40 animate-in fade-in zoom-in-95 duration-100">
                {STOCK_CRITERIA_OPTIONS.map((opt) => {
                  const isSelected = state.stockCriteria === opt.value;
                  return (
                    <div
                      key={opt.value}
                      onClick={() => {
                        onChange({ stockCriteria: opt.value });
                        setStockOpen(false);
                      }}
                      className={`px-3.5 py-2 text-[13px] cursor-pointer flex items-center justify-between transition ${
                        isSelected
                          ? 'bg-[#f0f7ff] text-slate-900 font-medium'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {isSelected && <Check size={16} className="text-blue-600 stroke-[2.5]" />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {state.stockCriteria === 'custom' && (
            <div className="mt-2 p-2 bg-slate-50 rounded-md border border-slate-200 flex items-center gap-2">
              <input
                type="number"
                placeholder="Từ"
                value={state.customStockMin ?? ''}
                onChange={(e) =>
                  onChange({
                    customStockMin: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="w-1/2 h-7 px-2 text-xs rounded border border-slate-300 bg-white"
              />
              <span className="text-xs text-slate-400">-</span>
              <input
                type="number"
                placeholder="Đến"
                value={state.customStockMax ?? ''}
                onChange={(e) =>
                  onChange({
                    customStockMax: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="w-1/2 h-7 px-2 text-xs rounded border border-slate-300 bg-white"
              />
            </div>
          )}
        </div>

        {/* 3. Dự kiến hết hàng */}
        <div className="relative">
          <div className="text-[13px] font-semibold text-slate-800 mb-1.5 flex items-center gap-1.5">
            <span>Dự kiến hết hàng</span>
            {((state.expectedOutOfStockType === 'all' && state.expectedOutOfStockPeriod && state.expectedOutOfStockPeriod !== 'Toàn thời gian') || state.expectedOutOfStockType === 'custom') && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
            )}
          </div>
          <div className="space-y-1.5">
            {/* Option A: Toàn thời gian / Chu kỳ dự kiến (Click opens Popover - Screenshot 3) */}
            <div ref={expectedPeriodAnchorRef} className="flex items-center gap-2.5 group">
              <div
                onClick={() => {
                  onChange({ expectedOutOfStockType: 'all' });
                  setExpectedPeriodPopoverOpen(!expectedPeriodPopoverOpen);
                  setShowPresetPopover(false);
                  setShowCustomPopover(false);
                }}
                className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 cursor-pointer transition ${
                  state.expectedOutOfStockType === 'all'
                    ? 'border-blue-600 bg-white'
                    : 'border-slate-300 group-hover:border-slate-400 bg-white'
                }`}
              >
                {state.expectedOutOfStockType === 'all' && (
                  <div className="w-2 h-2 rounded-full bg-blue-600" />
                )}
              </div>
              <div
                onClick={() => {
                  onChange({ expectedOutOfStockType: 'all' });
                  setExpectedPeriodPopoverOpen(!expectedPeriodPopoverOpen);
                  setShowPresetPopover(false);
                  setShowCustomPopover(false);
                }}
                className={`flex-1 h-[34px] px-3 rounded-[6px] bg-white flex items-center justify-between text-[13px] text-slate-700 cursor-pointer transition ${
                  expectedPeriodPopoverOpen
                    ? 'border-2 border-blue-500 shadow-xs'
                    : 'border border-slate-300 hover:border-slate-400'
                }`}
              >
                <span className="truncate">{currentExpectedPeriodLabel}</span>
                <ChevronRight size={15} className="text-slate-400 shrink-0" />
              </div>
            </div>

            {/* Option B: Tùy chỉnh */}
            <div
              ref={expectedDateRangeAnchorRef}
              onClick={(e) => {
                e.stopPropagation();
                onChange({ expectedOutOfStockType: 'custom' });
                setExpectedPeriodPopoverOpen(false);
                setShowPresetPopover(false);
                setShowCustomPopover(false);
                setExpectedDateRangeOpen((prev) => !prev);
              }}
              className="relative flex items-center gap-2.5 cursor-pointer group"
            >
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition ${
                  state.expectedOutOfStockType === 'custom'
                    ? 'border-blue-600 bg-white'
                    : 'border-slate-300 group-hover:border-slate-400 bg-white'
                }`}
              >
                {state.expectedOutOfStockType === 'custom' && (
                  <div className="w-2 h-2 rounded-full bg-blue-600" />
                )}
              </div>
              <div className={`flex-1 h-[34px] px-3 border rounded-[6px] bg-white flex items-center justify-between text-[13px] text-slate-700 transition ${expectedDateRangeOpen ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-300 hover:border-slate-400'}`}>
                <span>{state.expectedOutOfStockDateFrom ? `${formatDateKey(state.expectedOutOfStockDateFrom)} - ${formatDateKey(state.expectedOutOfStockDateTo)}` : 'Tùy chỉnh'}</span>
                <Calendar size={15} className="text-slate-500 shrink-0" />
              </div>
            </div>
          </div>

          {/* Floating Portal Popover for Date Range (Ảnh 2 - KHÔNG BỊ ĐÈ BỞI SIDEBAR) */}
          <DateRangePopover
            key={`expected-${expectedDateRangeOpen}-${state.expectedOutOfStockDateFrom ?? ''}-${state.expectedOutOfStockDateTo ?? ''}`}
            open={expectedDateRangeOpen}
            anchorRef={expectedDateRangeAnchorRef}
            value={{ from: state.expectedOutOfStockDateFrom, to: state.expectedOutOfStockDateTo }}
            minDate={toDateKey(new Date())}
            onCancel={() => setExpectedDateRangeOpen(false)}
            onToday={() => {
              const today = toDateKey(new Date());
              onChange({ expectedOutOfStockDateFrom: today, expectedOutOfStockDateTo: today });
            }}
            onApply={(range) => {
              onChange({
                expectedOutOfStockDateFrom: range.from,
                expectedOutOfStockDateTo: range.to,
                expectedOutOfStockDate: range.from,
              });
              setExpectedDateRangeOpen(false);
            }}
          />

          {/* Floating Portal Popover for Preset Periods (Ảnh 2) */}
          <PeriodPresetPopover
            open={expectedPeriodPopoverOpen}
            anchorRef={expectedPeriodAnchorRef}
            onClose={() => setExpectedPeriodPopoverOpen(false)}
            selectedValue={state.expectedOutOfStockPeriod}
            onSelect={(val) => onChange({ expectedOutOfStockType: 'all', expectedOutOfStockPeriod: val })}
            isExpected={true}
          />
        </div>

        {/* 4. Thời gian tạo (Chuẩn giao diện Chuyển hàng) */}
        <div>
          <label className="block text-[11px] font-bold text-[#677484] mb-1.5 uppercase tracking-wide">
            Thời gian tạo
          </label>
          <div className="space-y-1.5">
            {/* Option 1: Preset */}
            <div
              ref={presetTriggerRef}
              className="flex items-center gap-2"
            >
              <div
                onClick={handleOpenCreatedPreset}
                className="cursor-pointer p-0.5"
              >
                {state.createdDateType !== 'custom' ? (
                  <div className="w-4 h-4 rounded-full border-2 border-[#0070f4] flex items-center justify-center shrink-0">
                    <div className="w-2 h-2 rounded-full bg-[#0070f4]" />
                  </div>
                ) : (
                  <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0 hover:border-slate-400" />
                )}
              </div>

              <div
                ref={presetBoxRef}
                onClick={handleOpenCreatedPreset}
                className={`flex-1 h-8 px-3 rounded-[8px] border flex items-center justify-between cursor-pointer transition select-none ${
                  state.createdDateType !== 'custom'
                    ? 'border-slate-300 bg-white text-[#15171a] shadow-xs hover:border-[#0070f4]'
                    : 'border-slate-200 bg-white text-[#677484] hover:border-slate-300'
                }`}
              >
                <span className="text-xs font-medium truncate">{createdPresetLabel}</span>
                <ChevronRight size={14} className="text-[#677484] shrink-0" />
              </div>
            </div>

            {/* Option 2: Tùy chỉnh */}
            <div
              ref={customTriggerRef}
              className="flex items-center gap-2"
            >
              <div
                onClick={handleOpenCreatedCustom}
                className="cursor-pointer p-0.5"
              >
                {state.createdDateType === 'custom' ? (
                  <div className="w-4 h-4 rounded-full border-2 border-[#0070f4] flex items-center justify-center shrink-0">
                    <div className="w-2 h-2 rounded-full bg-[#0070f4]" />
                  </div>
                ) : (
                  <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0 hover:border-slate-400" />
                )}
              </div>

              <div
                ref={customBoxRef}
                onClick={handleOpenCreatedCustom}
                className={`flex-1 h-8 px-2.5 rounded-[8px] border flex items-center justify-between cursor-pointer transition select-none ${
                  state.createdDateType === 'custom'
                    ? 'border-slate-300 bg-white text-[#15171a] shadow-xs hover:border-[#0070f4]'
                    : 'border-slate-200 bg-white text-[#677484] hover:border-slate-300'
                }`}
              >
                <span className="text-[11px] font-medium truncate text-[#15171a] tracking-tight">
                  {state.createdDateType === 'custom'
                    ? `${formatDateOnlyVN(state.createdDateFrom || new Date())} - ${formatDateOnlyVN(state.createdDateTo || state.createdDateFrom || new Date())}`
                    : 'Tùy chỉnh'}
                </span>
                <Calendar size={14} className="text-[#677484] shrink-0 ml-1" />
              </div>
            </div>
          </div>
        </div>

        {/* 5. Thuộc tính (Matches Screenshot 1) */}
        <div>
          <div className="text-[13px] font-semibold text-slate-800 mb-1.5">Thuộc tính</div>
          <div className="space-y-1.5">
            {/* Input 1: LOẠI */}
            <input
              type="text"
              placeholder="LOẠI"
              value={state.attrType}
              onChange={(e) => onChange({ attrType: e.target.value })}
              className="w-full h-[34px] px-3 text-[13px] border border-slate-300 rounded-[6px] bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition uppercase"
            />

            {/* Input 2: MÀU */}
            <input
              type="text"
              placeholder="MÀU"
              value={state.attrColor}
              onChange={(e) => onChange({ attrColor: e.target.value })}
              className="w-full h-[34px] px-3 text-[13px] border border-slate-300 rounded-[6px] bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition uppercase"
            />

            {/* Input 3: SIZE */}
            <input
              type="text"
              placeholder="SIZE"
              value={state.attrSize}
              onChange={(e) => onChange({ attrSize: e.target.value })}
              className="w-full h-[34px] px-3 text-[13px] border border-slate-300 rounded-[6px] bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition uppercase"
            />

            {/* Expanded Inputs: KG, KHỔ, THÙNG (THÙNG = 600 VỈ) */}
            {expandAttributes && (
              <div className="space-y-1.5 pt-0.5 animate-in fade-in duration-100">
                {/* Input 4: KG */}
                <input
                  type="text"
                  placeholder="KG"
                  value={state.attrKg ?? ''}
                  onChange={(e) => onChange({ attrKg: e.target.value })}
                  className="w-full h-[34px] px-3 text-[13px] border border-slate-300 rounded-[6px] bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition uppercase"
                />

                {/* Input 5: KHỔ */}
                <input
                  type="text"
                  placeholder="KHỔ"
                  value={state.attrKho ?? ''}
                  onChange={(e) => onChange({ attrKho: e.target.value })}
                  className="w-full h-[34px] px-3 text-[13px] border border-slate-300 rounded-[6px] bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition uppercase"
                />

                {/* Input 6: THÙNG (THÙNG = 600 VỈ) */}
                <input
                  type="text"
                  placeholder="THÙNG (THÙNG = 600 VỈ)"
                  value={state.attrThung ?? ''}
                  onChange={(e) => onChange({ attrThung: e.target.value })}
                  className="w-full h-[34px] px-3 text-[13px] border border-slate-300 rounded-[6px] bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition uppercase"
                />
              </div>
            )}

            {/* Toggle button: Thu gọn^ or Mở rộngv */}
            <button
              type="button"
              onClick={() => setExpandAttributes(!expandAttributes)}
              className="text-[13px] font-semibold text-slate-800 hover:text-blue-600 inline-block cursor-pointer pt-1 transition"
            >
              {expandAttributes ? 'Thu gọn^' : 'Mở rộngv'}
            </button>
          </div>
        </div>

        {/* 6. Nhà cung cấp (Multi-select có tag theo Ảnh 2) */}
        <MultiSelectPillBox
          label="Nhà cung cấp"
          placeholder="Chọn nhà cung cấp"
          selected={state.suppliers || (state.supplier ? [state.supplier] : [])}
          options={suppliersList}
          onChange={(items) => onChange({ suppliers: items, supplier: items[0] })}
          isOpen={supplierOpen}
          onToggle={() => {
            setSupplierOpen(!supplierOpen);
            setLocationOpen(false);
            setTypeOpen(false);
            setCategoryOpen(false);
            setStatusOpen(false);
          }}
          onClose={() => setSupplierOpen(false)}
        />

        {/* 7. Vị trí (Multi-select có tag theo Ảnh 2) */}
        <MultiSelectPillBox
          label="Vị trí"
          placeholder="Chọn vị trí"
          selected={state.locations || (state.location ? [state.location] : [])}
          options={locationsList}
          onChange={(items) => onChange({ locations: items, location: items[0] })}
          isOpen={locationOpen}
          onToggle={() => {
            setLocationOpen(!locationOpen);
            setSupplierOpen(false);
            setTypeOpen(false);
            setCategoryOpen(false);
            setStatusOpen(false);
          }}
          onClose={() => setLocationOpen(false)}
        />

        {/* 8. Loại hàng (Multi-select có tag theo Ảnh 2) */}
        <MultiSelectPillBox
          label="Loại hàng"
          placeholder="Chọn loại hàng"
          selected={state.productTypes || (state.productType ? [state.productType] : [])}
          options={PRODUCT_TYPES}
          onChange={(items) => onChange({ productTypes: items, productType: items[0] })}
          isOpen={typeOpen}
          onToggle={() => {
            setTypeOpen(!typeOpen);
            setSupplierOpen(false);
            setLocationOpen(false);
            setCategoryOpen(false);
            setStatusOpen(false);
          }}
          onClose={() => setTypeOpen(false)}
        />

        {/* 9. Bán trực tiếp */}
        <div>
          <div className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-800 mb-1.5">
            <span>Bán trực tiếp</span>
            {state.directSale !== 'all' && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block" />}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onChange({ directSale: 'all' })}
              className={`px-4 py-1.5 rounded-full text-xs font-medium cursor-pointer transition ${
                state.directSale === 'all'
                  ? 'bg-[#0071BA] text-white font-semibold shadow-xs'
                  : 'bg-white border border-slate-300 text-slate-700 hover:border-slate-400'
              }`}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => onChange({ directSale: 'yes' })}
              className={`px-4 py-1.5 rounded-full text-xs font-medium cursor-pointer transition ${
                state.directSale === 'yes'
                  ? 'bg-[#0071BA] text-white font-semibold shadow-xs'
                  : 'bg-white border border-slate-300 text-slate-700 hover:border-slate-400'
              }`}
            >
              Có
            </button>
            <button
              type="button"
              onClick={() => onChange({ directSale: 'no' })}
              className={`px-4 py-1.5 rounded-full text-xs font-medium cursor-pointer transition ${
                state.directSale === 'no'
                  ? 'bg-[#0071BA] text-white font-semibold shadow-xs'
                  : 'bg-white border border-slate-300 text-slate-700 hover:border-slate-400'
              }`}
            >
              Không
            </button>
          </div>
        </div>


        {/* 10. Trạng thái kinh doanh Dropdown (Bottom) */}
        <div className="pt-1">
          <div className="relative">
            <div
              onClick={() => {
                setStatusOpen(!statusOpen);
                setCategoryOpen(false);
                setStockOpen(false);
                setSupplierOpen(false);
                setLocationOpen(false);
                setTypeOpen(false);
                setShowPresetPopover(false);
                setShowCustomPopover(false);
                setExpectedPeriodPopoverOpen(false);
              }}
              className={`h-[34px] px-3 bg-white border rounded-[6px] flex items-center justify-between text-[13px] cursor-pointer transition ${
                statusOpen
                  ? 'border-2 border-blue-500 shadow-xs'
                  : 'border-slate-300 hover:border-slate-400'
              }`}
            >
              <span className="text-slate-800 font-medium truncate">{currentStatusLabel}</span>
              {statusOpen ? (
                <ChevronUp size={15} className="text-slate-800" />
              ) : (
                <ChevronDown size={15} className="text-slate-500" />
              )}
            </div>

            {/* Menu (Pop-up above) */}
            {statusOpen && (
              <div className="absolute bottom-full left-0 mb-1 w-full bg-white rounded-[6px] border border-slate-200 shadow-xl py-1 z-40 animate-in fade-in zoom-in-95 duration-100">
                {BUSINESS_STATUS_OPTIONS.map((opt) => {
                  const isSelected = state.businessStatus === opt.value;
                  return (
                    <div
                      key={opt.value}
                      onClick={() => {
                        onChange({ businessStatus: opt.value });
                        setStatusOpen(false);
                      }}
                      className={`px-3.5 py-2 text-[13px] cursor-pointer flex items-center justify-between transition ${
                        isSelected
                          ? 'bg-[#f0f7ff] text-slate-900 font-medium'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {isSelected && <Check size={16} className="text-blue-600 stroke-[2.5]" />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        </div>
      )}

      {/* Preset Popover (Chuẩn KiotViet Chuyển hàng) */}
      {mounted &&
        showPresetPopover &&
        createPortal(
          <div
            ref={presetPopoverRef}
            style={{
              position: 'fixed',
              top: presetCoords.top,
              left: presetCoords.left,
              zIndex: 9999,
            }}
            className="bg-white rounded-[8px] shadow-[rgba(169,180,203,0.32)_0px_8px_20px_0px] border border-slate-200 p-4 select-none animate-in fade-in zoom-in-95 duration-100"
          >
            {/* Mũi tên chỉ sang nút trigger ở sidebar */}
            <div
              className="absolute -left-[8px] w-0 h-0 border-y-[8px] border-y-transparent border-r-[8px] border-r-white drop-shadow-sm pointer-events-none"
              style={{ top: presetCoords.arrowTop }}
            />

            <div className="grid grid-cols-4 gap-4 min-w-[440px]">
              {PRESET_COLUMNS.map((col) => (
                <div key={col.title} className="flex flex-col">
                  <h4 className="text-xs font-bold text-[#15171a] mb-2.5 whitespace-nowrap">
                    {col.title}
                  </h4>
                  <div className="flex flex-col gap-2">
                    {col.items.map((it) => {
                      const isSelected =
                        state.createdPeriod === it.label ||
                        (!state.createdPeriod && it.key === 'this_month');
                      return (
                        <button
                          key={it.key}
                          type="button"
                          onClick={() => handleSelectCreatedPreset(it.key, it.label)}
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

      {/* Custom Calendar Popover (Chuẩn KiotViet Chuyển hàng: Dual Calendar Side-by-Side độc lập) */}
      {mounted &&
        showCustomPopover &&
        createPortal(
          <div
            ref={customPopoverRef}
            style={{
              position: 'fixed',
              top: customCoords.top,
              left: customCoords.left,
              zIndex: 9999,
            }}
            className="bg-white rounded-[8px] shadow-[rgba(169,180,203,0.32)_0px_8px_20px_0px] border border-slate-200 p-4 select-none animate-in fade-in zoom-in-95 duration-100 w-[580px]"
          >
            {/* Mũi tên chỉ sang nút trigger ở sidebar */}
            <div
              className="absolute -left-[8px] w-0 h-0 border-y-[8px] border-y-transparent border-r-[8px] border-r-white drop-shadow-sm pointer-events-none"
              style={{ top: customCoords.arrowTop }}
            />

            {/* Header: Từ ngày: DD/MM/YYYY - Đến ngày: DD/MM/YYYY */}
            <div className="text-xs text-[#677484] pb-3 border-b border-slate-100 flex items-center gap-1.5">
              <span>Từ ngày:</span>
              <span className="font-bold text-[#15171a]">{formatDateOnlyVN(tempFrom)}</span>
              <span className="mx-1 text-[#677484]">-</span>
              <span>Đến ngày:</span>
              <span className="font-bold text-[#15171a]">{formatDateOnlyVN(tempTo)}</span>
            </div>

            {/* Body: Hai cuốn lịch song song độc lập hoàn toàn */}
            <div className="flex gap-6 py-3">
              {/* Lịch bên trái: Chọn từ ngày */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-3 px-1">
                  <button
                    type="button"
                    onClick={() =>
                      setLeftMonth(
                        (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                      )
                    }
                    className="w-6 h-6 rounded-[4px] flex items-center justify-center text-[#677484] hover:bg-[#f7f8f9] cursor-pointer"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-xs font-semibold text-[#15171a]">
                    Tháng {leftMonth.getMonth() + 1} {leftMonth.getFullYear()}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setLeftMonth(
                        (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                      )
                    }
                    className="w-6 h-6 rounded-[4px] flex items-center justify-center text-[#677484] hover:bg-[#f7f8f9] cursor-pointer"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>

                <div className="grid grid-cols-7 text-center mb-1 text-[11px] font-medium text-[#677484]">
                  <span>T2</span>
                  <span>T3</span>
                  <span>T4</span>
                  <span>T5</span>
                  <span>T6</span>
                  <span>T7</span>
                  <span>CN</span>
                </div>

                {renderCreatedCalendarDays(leftMonth, true)}
              </div>

              {/* Lịch bên phải: Chọn đến ngày */}
              <div className="flex-1 border-l border-slate-100 pl-6">
                <div className="flex items-center justify-between mb-3 px-1">
                  <button
                    type="button"
                    onClick={() =>
                      setRightMonth(
                        (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                      )
                    }
                    className="w-6 h-6 rounded-[4px] flex items-center justify-center text-[#677484] hover:bg-[#f7f8f9] cursor-pointer"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-xs font-semibold text-[#15171a]">
                    Tháng {rightMonth.getMonth() + 1} {rightMonth.getFullYear()}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setRightMonth(
                        (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                      )
                    }
                    className="w-6 h-6 rounded-[4px] flex items-center justify-center text-[#677484] hover:bg-[#f7f8f9] cursor-pointer"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>

                <div className="grid grid-cols-7 text-center mb-1 text-[11px] font-medium text-[#677484]">
                  <span>T2</span>
                  <span>T3</span>
                  <span>T4</span>
                  <span>T5</span>
                  <span>T6</span>
                  <span>T7</span>
                  <span>CN</span>
                </div>

                {renderCreatedCalendarDays(rightMonth, false)}
              </div>
            </div>

            {/* Footer: Hôm nay (trái) - Bỏ qua & Áp dụng (phải) */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={handleSetCreatedToday}
                className="text-xs text-[#0070f4] hover:text-[#005ac3] hover:underline font-semibold cursor-pointer"
              >
                Hôm nay
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCustomPopover(false)}
                  className="px-3.5 py-1.5 rounded-[8px] border border-slate-300 text-xs text-[#15171a] hover:bg-[#f7f8f9] transition cursor-pointer font-medium"
                >
                  Bỏ qua
                </button>
                <button
                  type="button"
                  onClick={handleApplyCreatedCustom}
                  className="px-4 py-1.5 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                >
                  Áp dụng
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </aside>
  );
}
