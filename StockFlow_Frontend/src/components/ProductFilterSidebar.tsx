'use client';

import {
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Search,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

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
  location?: string;
  productType?: string;
  directSale: DirectSaleType;
  businessStatus: BusinessStatusType;
};

type ProductFilterSidebarProps = {
  state: FilterSidebarState;
  onChange: (patch: Partial<FilterSidebarState>) => void;
  onCreateCategory: () => void;
  categoriesList?: string[];
  suppliersList?: string[];
  locationsList?: string[];
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
}: {
  month: Date;
  range: DateRange;
  onSelect: (value: string) => void;
}) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const leadingDays = (firstDay.getDay() + 6) % 7;
  const cells = Array.from({ length: leadingDays + daysInMonth }, (_, index) =>
    index < leadingDays ? undefined : index - leadingDays + 1
  );
  const monthLabel = month.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });

  return (
    <div className="min-w-0 flex-1">
      <div className="mb-3 text-center text-sm font-semibold capitalize text-slate-800">{monthLabel}</div>
      <div className="mb-1 grid grid-cols-7 text-center text-[10px] font-medium text-slate-400">
        {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day) => <span key={day}>{day}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {cells.map((day, index) => {
          if (!day) return <span key={`empty-${index}`} className="h-7" />;
          const value = toDateKey(new Date(month.getFullYear(), month.getMonth(), day));
          const selected = value === range.from || value === range.to;
          const inRange = Boolean(range.from && range.to && value > range.from && value < range.to);
          return (
            <button
              key={value}
              type="button"
              onClick={() => onSelect(value)}
              className={`h-7 text-xs transition ${
                selected
                  ? 'rounded-full bg-[#0071BA] font-semibold text-white'
                  : inRange
                    ? 'bg-blue-50 text-blue-700'
                    : 'rounded-full text-slate-700 hover:bg-blue-50'
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DateRangePopover({
  open,
  value,
  onApply,
  onCancel,
  onToday,
}: {
  open: boolean;
  value: DateRange;
  onApply: (range: DateRange) => void;
  onCancel: () => void;
  onToday: () => void;
}) {
  const [draft, setDraft] = useState<DateRange>(value);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const base = value.from ? new Date(`${value.from}T00:00:00`) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  if (!open) return null;

  function selectDate(date: string) {
    if (!draft.from || draft.to || date < draft.from) {
      setDraft({ from: date });
    } else {
      setDraft({ from: draft.from, to: date });
    }
  }

  return (
    <div
      onClick={(event) => event.stopPropagation()}
      className="absolute left-0 top-full z-[70] mt-2 w-[min(620px,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white p-4 shadow-2xl"
    >
      <div className="mb-4 border-b border-slate-100 pb-3 text-sm text-slate-700">
        <span className="font-medium">Từ ngày:</span> {formatDateKey(draft.from)}
        <span className="mx-2 text-slate-300">-</span>
        <span className="font-medium">Đến ngày:</span> {formatDateKey(draft.to)}
      </div>
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={() => setVisibleMonth(addMonths(visibleMonth, -1))} className="rounded p-1 text-slate-500 hover:bg-slate-100">‹</button>
        <span className="text-xs text-slate-500">Chọn dải ngày</span>
        <button type="button" onClick={() => setVisibleMonth(addMonths(visibleMonth, 1))} className="rounded p-1 text-slate-500 hover:bg-slate-100">›</button>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <CalendarMonth month={visibleMonth} range={draft} onSelect={selectDate} />
        <CalendarMonth month={addMonths(visibleMonth, 1)} range={draft} onSelect={selectDate} />
      </div>
      <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-3">
        <button type="button" onClick={onToday} className="mr-auto rounded px-3 py-1.5 text-xs text-blue-700 hover:bg-blue-50">Hôm nay</button>
        <button type="button" onClick={onCancel} className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50">Bỏ qua</button>
        <button type="button" disabled={!draft.from || !draft.to} onClick={() => onApply(draft)} className="rounded bg-[#0071BA] px-3 py-1.5 text-xs text-white hover:bg-[#005f9d] disabled:cursor-not-allowed disabled:opacity-50">Áp dụng</button>
      </div>
    </div>
  );
}

export default function ProductFilterSidebar({
  state,
  onChange,
  onCreateCategory,
  categoriesList = DEFAULT_CATEGORIES,
  suppliersList = DEFAULT_SUPPLIERS,
  locationsList = DEFAULT_LOCATIONS,
}: ProductFilterSidebarProps) {
  // Dropdown & Popover open states
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [stockOpen, setStockOpen] = useState(false);
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  // Popover for Date Periods
  const [createdPeriodPopoverOpen, setCreatedPeriodPopoverOpen] = useState(false);
  const [expectedPeriodPopoverOpen, setExpectedPeriodPopoverOpen] = useState(false);
  const [createdDateRangeOpen, setCreatedDateRangeOpen] = useState(false);
  const [expectedDateRangeOpen, setExpectedDateRangeOpen] = useState(false);

  // Expanded attributes (LOẠI, MÀU, SIZE, KG, KHỔ, THÙNG (THÙNG = 600 VỈ))
  const [expandAttributes, setExpandAttributes] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Close all open dropdowns/popovers when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setCategoryOpen(false);
        setStockOpen(false);
        setSupplierOpen(false);
        setLocationOpen(false);
        setTypeOpen(false);
        setStatusOpen(false);
        setCreatedPeriodPopoverOpen(false);
        setExpectedPeriodPopoverOpen(false);
        setCreatedDateRangeOpen(false);
        setExpectedDateRangeOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCategories = categoriesList.filter((cat) =>
    cat.toLowerCase().includes(categorySearch.trim().toLowerCase())
  );

  const currentStockLabel =
    STOCK_CRITERIA_OPTIONS.find((opt) => opt.value === state.stockCriteria)?.label ??
    'Tất cả';

  const currentStatusLabel =
    BUSINESS_STATUS_OPTIONS.find((opt) => opt.value === state.businessStatus)?.label ??
    'Hàng đang kinh doanh';

  const currentCreatedPeriodLabel = state.createdPeriod || 'Toàn thời gian';
  const currentExpectedPeriodLabel = state.expectedOutOfStockPeriod || 'Toàn thời gian';

  return (
    <aside
      ref={containerRef}
      className="w-[260px] shrink-0 bg-white border-r border-[#e5e7eb] px-4 py-5 select-none text-[#262626] relative"
    >
      {/* 0. Main Title */}
      <h2 className="text-[20px] font-bold text-slate-900 tracking-tight mb-5">
        Hàng hóa
      </h2>

      <div className="space-y-4">
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
                setCreatedPeriodPopoverOpen(false);
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
                setCreatedPeriodPopoverOpen(false);
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
          <div className="text-[13px] font-semibold text-slate-800 mb-1.5">Dự kiến hết hàng</div>
          <div className="space-y-1.5">
            {/* Option A: Toàn thời gian / Chu kỳ dự kiến (Click opens Popover - Screenshot 3) */}
            <div className="flex items-center gap-2.5 group">
              <div
                onClick={() => {
                  onChange({ expectedOutOfStockType: 'all' });
                  setExpectedPeriodPopoverOpen(!expectedPeriodPopoverOpen);
                  setCreatedPeriodPopoverOpen(false);
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
                  setCreatedPeriodPopoverOpen(false);
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
              onClick={() => {
                onChange({ expectedOutOfStockType: 'custom' });
                setExpectedPeriodPopoverOpen(false);
                setCreatedDateRangeOpen(false);
                setExpectedDateRangeOpen(true);
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
              <DateRangePopover
                key={`expected-${expectedDateRangeOpen}-${state.expectedOutOfStockDateFrom ?? ''}-${state.expectedOutOfStockDateTo ?? ''}`}
                open={expectedDateRangeOpen}
                value={{ from: state.expectedOutOfStockDateFrom, to: state.expectedOutOfStockDateTo }}
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
            </div>
          </div>

          {/* Popover for "Dự kiến hết hàng" (Matches Screenshot 3) */}
          {expectedPeriodPopoverOpen && (
            <div className="absolute left-[calc(100%+14px)] top-0 z-50 bg-white rounded-2xl shadow-2xl border border-slate-100 p-5 w-[420px] max-w-[90vw] animate-in fade-in zoom-in-95 duration-100">
              {/* Pointer beak pointing left to the button */}
              <div className="absolute -left-2 top-5 w-4 h-4 bg-white rotate-45 border-l border-b border-slate-200 z-10" />

              <div className="grid grid-cols-3 gap-5">
                {/* 1. Theo ngày */}
                <div>
                  <div className="text-[13px] font-semibold text-slate-900 mb-3">Theo ngày</div>
                  <div className="flex flex-col gap-2">
                    {['Ngày mai', 'Ngày kia', '3 ngày tới', '5 ngày tới', '7 ngày tới'].map((item) => {
                      const isSelected = state.expectedOutOfStockPeriod === item;
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => {
                            onChange({
                              expectedOutOfStockType: 'all',
                              expectedOutOfStockPeriod: item,
                            });
                            setExpectedPeriodPopoverOpen(false);
                          }}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer transition text-center whitespace-nowrap block w-fit ${
                            isSelected
                              ? 'bg-[#0071BA] text-white shadow-xs'
                              : 'border border-slate-300 text-slate-700 bg-white hover:border-slate-400 hover:bg-slate-50'
                          }`}
                        >
                          {item}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Theo tuần */}
                <div>
                  <div className="text-[13px] font-semibold text-slate-900 mb-3">Theo tuần</div>
                  <div className="flex flex-col gap-2">
                    {['Tuần này', 'Tuần tới', '2 tuần tới'].map((item) => {
                      const isSelected = state.expectedOutOfStockPeriod === item;
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => {
                            onChange({
                              expectedOutOfStockType: 'all',
                              expectedOutOfStockPeriod: item,
                            });
                            setExpectedPeriodPopoverOpen(false);
                          }}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer transition text-center whitespace-nowrap block w-fit ${
                            isSelected
                              ? 'bg-[#0071BA] text-white shadow-xs'
                              : 'border border-slate-300 text-slate-700 bg-white hover:border-slate-400 hover:bg-slate-50'
                          }`}
                        >
                          {item}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Theo tháng */}
                <div>
                  <div className="text-[13px] font-semibold text-slate-900 mb-3">Theo tháng</div>
                  <div className="flex flex-col gap-2">
                    {['Tháng này', 'Tháng tới', '30 ngày tới', '2 tháng tới', '3 tháng tới'].map((item) => {
                      const isSelected = state.expectedOutOfStockPeriod === item;
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => {
                            onChange({
                              expectedOutOfStockType: 'all',
                              expectedOutOfStockPeriod: item,
                            });
                            setExpectedPeriodPopoverOpen(false);
                          }}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer transition text-center whitespace-nowrap block w-fit ${
                            isSelected
                              ? 'bg-[#0071BA] text-white shadow-xs'
                              : 'border border-slate-300 text-slate-700 bg-white hover:border-slate-400 hover:bg-slate-50'
                          }`}
                        >
                          {item}
                        </button>
                      );
                    })}

                    {/* Button Toàn thời gian */}
                    <button
                      type="button"
                      onClick={() => {
                        onChange({
                          expectedOutOfStockType: 'all',
                          expectedOutOfStockPeriod: 'Toàn thời gian',
                        });
                        setExpectedPeriodPopoverOpen(false);
                      }}
                      className={`px-4 py-1.5 rounded-full text-xs font-medium cursor-pointer transition text-center whitespace-nowrap block w-fit mt-1 ${
                        !state.expectedOutOfStockPeriod || state.expectedOutOfStockPeriod === 'Toàn thời gian'
                          ? 'bg-[#0071BA] text-white shadow-xs'
                          : 'border border-slate-300 text-slate-700 bg-white hover:border-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      Toàn thời gian
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 4. Thời gian tạo */}
        <div className="relative">
          <div className="text-[13px] font-semibold text-slate-800 mb-1.5">Thời gian tạo</div>
          <div className="space-y-1.5">
            {/* Option A: Toàn thời gian / Chu kỳ tạo (Click opens Popover - Screenshot 2) */}
            <div className="flex items-center gap-2.5 group">
              <div
                onClick={() => {
                  onChange({ createdDateType: 'all' });
                  setCreatedPeriodPopoverOpen(!createdPeriodPopoverOpen);
                  setExpectedPeriodPopoverOpen(false);
                }}
                className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 cursor-pointer transition ${
                  state.createdDateType === 'all'
                    ? 'border-blue-600 bg-white'
                    : 'border-slate-300 group-hover:border-slate-400 bg-white'
                }`}
              >
                {state.createdDateType === 'all' && (
                  <div className="w-2 h-2 rounded-full bg-blue-600" />
                )}
              </div>
              <div
                onClick={() => {
                  onChange({ createdDateType: 'all' });
                  setCreatedPeriodPopoverOpen(!createdPeriodPopoverOpen);
                  setExpectedPeriodPopoverOpen(false);
                }}
                className={`flex-1 h-[34px] px-3 rounded-[6px] bg-white flex items-center justify-between text-[13px] text-slate-700 cursor-pointer transition ${
                  createdPeriodPopoverOpen
                    ? 'border-2 border-blue-500 shadow-xs'
                    : 'border border-slate-300 hover:border-slate-400'
                }`}
              >
                <span className="truncate">{currentCreatedPeriodLabel}</span>
                <ChevronRight size={15} className="text-slate-400 shrink-0" />
              </div>
            </div>

            {/* Option B: Tùy chỉnh */}
            <div
              onClick={() => {
                onChange({ createdDateType: 'custom' });
                setCreatedPeriodPopoverOpen(false);
                setExpectedDateRangeOpen(false);
                setCreatedDateRangeOpen(true);
              }}
              className="relative flex items-center gap-2.5 cursor-pointer group"
            >
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition ${
                  state.createdDateType === 'custom'
                    ? 'border-blue-600 bg-white'
                    : 'border-slate-300 group-hover:border-slate-400 bg-white'
                }`}
              >
                {state.createdDateType === 'custom' && (
                  <div className="w-2 h-2 rounded-full bg-blue-600" />
                )}
              </div>
              <div className={`flex-1 h-[34px] px-3 border rounded-[6px] bg-white flex items-center justify-between text-[13px] text-slate-700 transition ${createdDateRangeOpen ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-300 hover:border-slate-400'}`}>
                <span>{state.createdDateFrom ? `${formatDateKey(state.createdDateFrom)} - ${formatDateKey(state.createdDateTo)}` : 'Tùy chỉnh'}</span>
                <Calendar size={15} className="text-slate-500 shrink-0" />
              </div>
              <DateRangePopover
                key={`created-${createdDateRangeOpen}-${state.createdDateFrom ?? ''}-${state.createdDateTo ?? ''}`}
                open={createdDateRangeOpen}
                value={{ from: state.createdDateFrom, to: state.createdDateTo }}
                onCancel={() => setCreatedDateRangeOpen(false)}
                onToday={() => {
                  const today = toDateKey(new Date());
                  onChange({ createdDateFrom: today, createdDateTo: today });
                }}
                onApply={(range) => {
                  onChange({
                    createdDateFrom: range.from,
                    createdDateTo: range.to,
                    createdDate: range.from,
                  });
                  setCreatedDateRangeOpen(false);
                }}
              />
            </div>
          </div>

          {/* Popover for "Thời gian tạo" (Matches Screenshot 2) */}
          {createdPeriodPopoverOpen && (
            <div className="absolute left-[calc(100%+14px)] top-0 z-50 bg-white rounded-2xl shadow-2xl border border-slate-100 p-5 w-[640px] max-w-[90vw] animate-in fade-in zoom-in-95 duration-100">
              {/* Pointer beak pointing left to the button */}
              <div className="absolute -left-2 top-5 w-4 h-4 bg-white rotate-45 border-l border-b border-slate-200 z-10" />

              <div className="grid grid-cols-5 gap-3.5">
                {/* 1. Theo ngày */}
                <div>
                  <div className="text-[13px] font-semibold text-slate-900 mb-3">Theo ngày</div>
                  <div className="flex flex-col gap-2">
                    {['Hôm nay', 'Hôm qua'].map((item) => {
                      const isSelected = state.createdPeriod === item;
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => {
                            onChange({
                              createdDateType: 'all',
                              createdPeriod: item,
                            });
                            setCreatedPeriodPopoverOpen(false);
                          }}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer transition text-center whitespace-nowrap block w-fit ${
                            isSelected
                              ? 'bg-[#0071BA] text-white shadow-xs'
                              : 'border border-slate-300 text-slate-700 bg-white hover:border-slate-400 hover:bg-slate-50'
                          }`}
                        >
                          {item}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Theo tuần */}
                <div>
                  <div className="text-[13px] font-semibold text-slate-900 mb-3">Theo tuần</div>
                  <div className="flex flex-col gap-2">
                    {['Tuần này', 'Tuần trước', '7 ngày qua'].map((item) => {
                      const isSelected = state.createdPeriod === item;
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => {
                            onChange({
                              createdDateType: 'all',
                              createdPeriod: item,
                            });
                            setCreatedPeriodPopoverOpen(false);
                          }}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer transition text-center whitespace-nowrap block w-fit ${
                            isSelected
                              ? 'bg-[#0071BA] text-white shadow-xs'
                              : 'border border-slate-300 text-slate-700 bg-white hover:border-slate-400 hover:bg-slate-50'
                          }`}
                        >
                          {item}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Theo tháng */}
                <div>
                  <div className="text-[13px] font-semibold text-slate-900 mb-3">Theo tháng</div>
                  <div className="flex flex-col gap-2">
                    {[
                      'Tháng này',
                      'Tháng trước',
                      'Tháng này (âm lịch)',
                      'Tháng trước (âm lịch)',
                      '30 ngày qua',
                    ].map((item) => {
                      const isSelected = state.createdPeriod === item;
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => {
                            onChange({
                              createdDateType: 'all',
                              createdPeriod: item,
                            });
                            setCreatedPeriodPopoverOpen(false);
                          }}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer transition text-center whitespace-nowrap block w-fit ${
                            isSelected
                              ? 'bg-[#0071BA] text-white shadow-xs'
                              : 'border border-slate-300 text-slate-700 bg-white hover:border-slate-400 hover:bg-slate-50'
                          }`}
                        >
                          {item}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Theo quý */}
                <div>
                  <div className="text-[13px] font-semibold text-slate-900 mb-3">Theo quý</div>
                  <div className="flex flex-col gap-2">
                    {['Quý này', 'Quý trước'].map((item) => {
                      const isSelected = state.createdPeriod === item;
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => {
                            onChange({
                              createdDateType: 'all',
                              createdPeriod: item,
                            });
                            setCreatedPeriodPopoverOpen(false);
                          }}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer transition text-center whitespace-nowrap block w-fit ${
                            isSelected
                              ? 'bg-[#0071BA] text-white shadow-xs'
                              : 'border border-slate-300 text-slate-700 bg-white hover:border-slate-400 hover:bg-slate-50'
                          }`}
                        >
                          {item}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 5. Theo năm */}
                <div>
                  <div className="text-[13px] font-semibold text-slate-900 mb-3">Theo năm</div>
                  <div className="flex flex-col gap-2">
                    {[
                      'Năm nay',
                      'Năm trước',
                      'Năm nay (âm lịch)',
                      'Năm trước (âm lịch)',
                    ].map((item) => {
                      const isSelected = state.createdPeriod === item;
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => {
                            onChange({
                              createdDateType: 'all',
                              createdPeriod: item,
                            });
                            setCreatedPeriodPopoverOpen(false);
                          }}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer transition text-center whitespace-nowrap block w-fit ${
                            isSelected
                              ? 'bg-[#0071BA] text-white shadow-xs'
                              : 'border border-slate-300 text-slate-700 bg-white hover:border-slate-400 hover:bg-slate-50'
                          }`}
                        >
                          {item}
                        </button>
                      );
                    })}

                    {/* Button Toàn thời gian */}
                    <button
                      type="button"
                      onClick={() => {
                        onChange({
                          createdDateType: 'all',
                          createdPeriod: 'Toàn thời gian',
                        });
                        setCreatedPeriodPopoverOpen(false);
                      }}
                      className={`px-4 py-1.5 rounded-full text-xs font-medium cursor-pointer transition text-center whitespace-nowrap block w-fit mt-1 ${
                        !state.createdPeriod || state.createdPeriod === 'Toàn thời gian'
                          ? 'bg-[#0071BA] text-white shadow-xs'
                          : 'border border-slate-300 text-slate-700 bg-white hover:border-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      Toàn thời gian
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
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

        {/* 6. Nhà cung cấp */}
        <div>
          <div className="text-[13px] font-semibold text-slate-800 mb-1.5">Nhà cung cấp</div>
          <div className="relative">
            <div
              onClick={() => {
                setSupplierOpen(!supplierOpen);
                setCategoryOpen(false);
                setStockOpen(false);
                setLocationOpen(false);
                setTypeOpen(false);
                setStatusOpen(false);
                setCreatedPeriodPopoverOpen(false);
                setExpectedPeriodPopoverOpen(false);
              }}
              className="h-[34px] px-3 bg-white border border-slate-300 hover:border-slate-400 rounded-[6px] flex items-center justify-between text-[13px] cursor-pointer transition"
            >
              <span className={state.supplier ? 'text-slate-800 font-medium truncate' : 'text-slate-400 truncate'}>
                {state.supplier || 'Chọn nhà cung cấp'}
              </span>
              <div className="flex items-center gap-1 text-slate-400">
                {state.supplier && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange({ supplier: undefined });
                    }}
                    className="hover:text-slate-600 p-0.5"
                  >
                    <X size={13} />
                  </button>
                )}
                <ChevronDown size={14} />
              </div>
            </div>

            {supplierOpen && (
              <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-[6px] border border-slate-200 shadow-lg py-1 z-40 animate-in fade-in zoom-in-95 duration-100">
                <div
                  onClick={() => {
                    onChange({ supplier: undefined });
                    setSupplierOpen(false);
                  }}
                  className="px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer flex items-center justify-between"
                >
                  <span>Tất cả nhà cung cấp</span>
                  {!state.supplier && <Check size={14} className="text-blue-600 stroke-[2.5]" />}
                </div>
                {suppliersList.map((sup) => (
                  <div
                    key={sup}
                    onClick={() => {
                      onChange({ supplier: sup });
                      setSupplierOpen(false);
                    }}
                    className={`px-3 py-1.5 text-xs cursor-pointer flex items-center justify-between transition ${
                      state.supplier === sup
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="truncate">{sup}</span>
                    {state.supplier === sup && <Check size={14} className="text-blue-600 stroke-[2.5]" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 7. Vị trí */}
        <div>
          <div className="text-[13px] font-semibold text-slate-800 mb-1.5">Vị trí</div>
          <div className="relative">
            <div
              onClick={() => {
                setLocationOpen(!locationOpen);
                setCategoryOpen(false);
                setStockOpen(false);
                setSupplierOpen(false);
                setTypeOpen(false);
                setStatusOpen(false);
                setCreatedPeriodPopoverOpen(false);
                setExpectedPeriodPopoverOpen(false);
              }}
              className="h-[34px] px-3 bg-white border border-slate-300 hover:border-slate-400 rounded-[6px] flex items-center justify-between text-[13px] cursor-pointer transition"
            >
              <span className={state.location ? 'text-slate-800 font-medium truncate' : 'text-slate-400 truncate'}>
                {state.location || 'Chọn vị trí'}
              </span>
              <div className="flex items-center gap-1 text-slate-400">
                {state.location && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange({ location: undefined });
                    }}
                    className="hover:text-slate-600 p-0.5"
                  >
                    <X size={13} />
                  </button>
                )}
                <ChevronDown size={14} />
              </div>
            </div>

            {locationOpen && (
              <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-[6px] border border-slate-200 shadow-lg py-1 z-40 animate-in fade-in zoom-in-95 duration-100">
                <div
                  onClick={() => {
                    onChange({ location: undefined });
                    setLocationOpen(false);
                  }}
                  className="px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer flex items-center justify-between"
                >
                  <span>Tất cả vị trí</span>
                  {!state.location && <Check size={14} className="text-blue-600 stroke-[2.5]" />}
                </div>
                {locationsList.map((loc) => (
                  <div
                    key={loc}
                    onClick={() => {
                      onChange({ location: loc });
                      setLocationOpen(false);
                    }}
                    className={`px-3 py-1.5 text-xs cursor-pointer flex items-center justify-between transition ${
                      state.location === loc
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="truncate">{loc}</span>
                    {state.location === loc && <Check size={14} className="text-blue-600 stroke-[2.5]" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 8. Loại hàng */}
        <div>
          <div className="text-[13px] font-semibold text-slate-800 mb-1.5">Loại hàng</div>
          <div className="relative">
            <div
              onClick={() => {
                setTypeOpen(!typeOpen);
                setCategoryOpen(false);
                setStockOpen(false);
                setSupplierOpen(false);
                setLocationOpen(false);
                setStatusOpen(false);
                setCreatedPeriodPopoverOpen(false);
                setExpectedPeriodPopoverOpen(false);
              }}
              className="h-[34px] px-3 bg-white border border-slate-300 hover:border-slate-400 rounded-[6px] flex items-center justify-between text-[13px] cursor-pointer transition"
            >
              <span className={state.productType ? 'text-slate-800 font-medium truncate' : 'text-slate-400 truncate'}>
                {state.productType || 'Chọn loại hàng'}
              </span>
              <div className="flex items-center gap-1 text-slate-400">
                {state.productType && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange({ productType: undefined });
                    }}
                    className="hover:text-slate-600 p-0.5"
                  >
                    <X size={13} />
                  </button>
                )}
                <ChevronDown size={14} />
              </div>
            </div>

            {typeOpen && (
              <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-[6px] border border-slate-200 shadow-lg py-1 z-40 animate-in fade-in zoom-in-95 duration-100">
                <div
                  onClick={() => {
                    onChange({ productType: undefined });
                    setTypeOpen(false);
                  }}
                  className="px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer flex items-center justify-between"
                >
                  <span>Tất cả loại hàng</span>
                  {!state.productType && <Check size={14} className="text-blue-600 stroke-[2.5]" />}
                </div>
                {PRODUCT_TYPES.map((t) => (
                  <div
                    key={t}
                    onClick={() => {
                      onChange({ productType: t });
                      setTypeOpen(false);
                    }}
                    className={`px-3 py-1.5 text-xs cursor-pointer flex items-center justify-between transition ${
                      state.productType === t
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="truncate">{t}</span>
                    {state.productType === t && <Check size={14} className="text-blue-600 stroke-[2.5]" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 9. Bán trực tiếp */}
        <div>
          <div className="text-[13px] font-semibold text-slate-800 mb-1.5">Bán trực tiếp</div>
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
                setCreatedPeriodPopoverOpen(false);
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
    </aside>
  );
}
