'use client';

import { clampPopoverLeft, DATE_POPOVER_WIDTH, PRESET_POPOVER_WIDTH } from '@/lib/ui/popover';
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  Search,
  X,
  Check,
} from 'lucide-react';
import type { PurchaseFilterState, PurchaseStatus } from '@/features/purchases/types';
import { WarehouseItem } from '@/lib/warehouse/useActiveWarehouse';
import { Supplier } from '@/features/suppliers/types';
import {
  toISODate,
  formatDateOnlyVN,
  parseISODate,
  getDateRangeForPreset,
} from '@/lib/utils/date';

// ─── Types ────────────────────────────────────────────────────────────────────

type PurchaseFilterSidebarProps = {
  state: PurchaseFilterState;
  onChange: (patch: Partial<PurchaseFilterState>) => void;
  isCollapsed?: boolean;
  warehouses?: WarehouseItem[];
  suppliers?: Supplier[];
  activeWarehouse?: WarehouseItem;
  /** Đổi nhãn trạng thái (VD Trả hàng nhập: completed = "Đã trả hàng") */
  statusLabels?: Partial<Record<PurchaseStatus, string>>;
  /** Ẩn bộ lọc Nhà cung cấp (màn Trả hàng nhập không có) */
  hideSupplierFilter?: boolean;
  /** Ẩn bộ lọc Chi nhánh (VD Phiếu kiểm kho: luôn theo Kho làm việc) */
  hideWarehouseFilter?: boolean;
};

// ─── Status options ───────────────────────────────────────────────────────────

const STATUS_OPTIONS: { label: string; value: PurchaseStatus }[] = [
  { label: 'Phiếu tạm',     value: 'draft' },
  { label: 'Đã nhập hàng', value: 'completed' },
  { label: 'Đã hủy',        value: 'canceled' },
];

// ─── Preset Columns (Bỏ âm lịch, bỏ quý - chuẩn KiotViet như chuyển hàng) ─────

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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PurchaseFilterSidebar({
  state,
  onChange,
  isCollapsed = false,
  warehouses = [],
  suppliers = [],
  activeWarehouse,
  statusLabels,
  hideSupplierFilter = false,
  hideWarehouseFilter = false,
}: PurchaseFilterSidebarProps) {
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const warehouseRef = useRef<HTMLDivElement>(null);
  const supplierRef = useRef<HTMLDivElement>(null);

  const [warehouseDropdownOpen, setWarehouseDropdownOpen] = useState(false);
  const [warehouseSearchKeyword, setWarehouseSearchKeyword] = useState('');
  const [supplierSearchOpen, setSupplierSearchOpen] = useState(false);
  const [supplierSearchKeyword, setSupplierSearchKeyword] = useState('');

  // ─── 1. Chi nhánh (Multi-select tag box with Dropdown - Mặc định là kho đang chọn) ───
  const isAllSelected = state.warehouseIds !== undefined && state.warehouseIds.length === 0;

  const selectedWarehouseIds = useMemo(() => {
    if (state.warehouseIds !== undefined) {
      return state.warehouseIds;
    }
    return activeWarehouse?.warehouseId ? [activeWarehouse.warehouseId] : [];
  }, [state.warehouseIds, activeWarehouse?.warehouseId]);

  const filteredWarehouses = useMemo(() => {
    if (!warehouseSearchKeyword.trim()) return warehouses;
    const kw = warehouseSearchKeyword.toLowerCase();
    return warehouses.filter(
      (w) => w.name.toLowerCase().includes(kw) || (w.code && w.code.toLowerCase().includes(kw))
    );
  }, [warehouses, warehouseSearchKeyword]);

  function handleAddWarehouse(whId: number) {
    if (isAllSelected) {
      onChange({ warehouseIds: [whId] });
    } else {
      const next = [...selectedWarehouseIds, whId];
      onChange({ warehouseIds: next });
    }
  }

  function handleRemoveWarehouse(whId: number) {
    const next = selectedWarehouseIds.filter((id) => id !== whId);
    // Nếu gỡ bỏ hết các kho -> tự động chuyển về "Tất cả" (warehouseIds: [])
    onChange({ warehouseIds: next.length === 0 ? [] : next });
  }

  // ─── 2. Trạng thái (Checkbox theo yêu cầu) ──────────────────────────────────
  function handleToggleStatus(val: PurchaseStatus) {
    const next = state.statuses.includes(val)
      ? state.statuses.filter((s) => s !== val)
      : [...state.statuses, val];
    onChange({ statuses: next });
  }

  function handleRemoveStatus(val: PurchaseStatus) {
    onChange({ statuses: state.statuses.filter((s) => s !== val) });
  }

  // ─── 3. Time Filter States & Popovers (Đồng bộ chuẩn Chuyển hàng) ────────────
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
    arrowTop: 20,
  });
  const [customCoords, setCustomCoords] = useState<{ top: number; left: number; arrowTop: number }>({
    top: 0,
    left: 0,
    arrowTop: 20,
  });

  const [presetLabel, setPresetLabel] = useState<string>(() => {
    if (state.timeRange && state.timeRange !== 'custom') {
      return getDateRangeForPreset(state.timeRange).label;
    }
    return state.periodLabel || 'Tháng này';
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (state.timeRange && state.timeRange !== 'custom') {
      const range = getDateRangeForPreset(state.timeRange);
      setPresetLabel(range.label);
    }
  }, [state.timeRange]);

  // Dual Calendar State
  const [tempFrom, setTempFrom] = useState<Date>(() => parseISODate(state.dateFrom));
  const [tempTo, setTempTo] = useState<Date>(() => parseISODate(state.dateTo));
  const [leftMonth, setLeftMonth] = useState<Date>(() => {
    const d = parseISODate(state.dateFrom);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [rightMonth, setRightMonth] = useState<Date>(() => {
    const d = parseISODate(state.dateTo);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  // Click outside listener for popovers
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
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

      if (warehouseRef.current && !warehouseRef.current.contains(target)) {
        setWarehouseDropdownOpen(false);
      }

      if (supplierRef.current && !supplierRef.current.contains(target)) {
        setSupplierSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPresetPopover, showCustomPopover]);

  // Preset Popover Handler
  const handleOpenPreset = () => {
    if (state.timeRange === 'custom') {
      const range = getDateRangeForPreset('this_month');
      onChange({
        timeRange: 'this_month',
        dateFrom: range.from,
        dateTo: range.to,
        periodLabel: 'Tháng này',
      });
      setPresetLabel('Tháng này');
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
        left: clampPopoverLeft(rect.right + 10, PRESET_POPOVER_WIDTH),
        arrowTop,
      });
    }

    setShowPresetPopover((prev) => !prev);
    setShowCustomPopover(false);
  };

  // Custom Popover Handler
  const handleOpenCustom = () => {
    const f = state.dateFrom ? parseISODate(state.dateFrom) : new Date();
    const t = state.dateTo ? parseISODate(state.dateTo) : new Date();

    onChange({
      timeRange: 'custom',
      dateFrom: toISODate(f),
      dateTo: toISODate(t),
    });

    setTempFrom(f);
    setTempTo(t);
    setLeftMonth(new Date(f.getFullYear(), f.getMonth(), 1));
    setRightMonth(new Date(t.getFullYear(), t.getMonth(), 1));

    const anchor = customBoxRef.current || customTriggerRef.current;
    if (anchor) {
      const rect = anchor.getBoundingClientRect();
      const popoverHeight = 380;
      let top = rect.top - 60;
      if (top + popoverHeight > window.innerHeight) {
        top = Math.max(10, window.innerHeight - popoverHeight - 10);
      }
      if (top < 10) top = 10;
      const arrowTop = Math.max(16, rect.top - top + rect.height / 2 - 8);
      setCustomCoords({
        top,
        left: clampPopoverLeft(rect.right + 10, DATE_POPOVER_WIDTH),
        arrowTop,
      });
    }

    setShowCustomPopover((prev) => !prev);
    setShowPresetPopover(false);
  };

  const handleSelectPreset = (key: string, label: string) => {
    const range = getDateRangeForPreset(key);
    setPresetLabel(label);
    onChange({
      timeRange: key,
      dateFrom: range.from,
      dateTo: range.to,
      periodLabel: label,
    });
    setShowPresetPopover(false);
  };

  const handleApplyCustom = () => {
    let f = tempFrom;
    let t = tempTo;
    if (f > t) {
      const swap = f;
      f = t;
      t = swap;
    }
    onChange({
      timeRange: 'custom',
      dateFrom: toISODate(f),
      dateTo: toISODate(t),
    });
    setShowCustomPopover(false);
  };

  const handleSetToday = () => {
    const today = new Date();
    setTempFrom(today);
    setTempTo(today);
    setLeftMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setRightMonth(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  // Render Days for Dual Calendar
  const renderCalendarDays = (monthDate: Date, isLeftCalendar: boolean) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const startPadding = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days: { date: Date; dayNum: number; isCurrentMonth: boolean; iso: string }[] = [];

    for (let i = startPadding - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
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

  // Filtered suppliers by search
  const filteredSuppliers = useMemo(() => {
    const kw = supplierSearchKeyword.trim().toLowerCase();
    if (!kw) return suppliers.slice(0, 8);
    return suppliers.filter(
      (s) => s.name.toLowerCase().includes(kw) || s.code.toLowerCase().includes(kw)
    ).slice(0, 10);
  }, [suppliers, supplierSearchKeyword]);

  const selectedSupplierObj = useMemo(() => {
    if (!state.partnerId) return null;
    return suppliers.find((s) => Number(s.id) === state.partnerId) || null;
  }, [suppliers, state.partnerId]);

  return (
    <aside
      ref={containerRef}
      className={`relative ${
        isCollapsed ? 'w-0 border-r-0' : 'w-60 border-r border-slate-200'
      } h-full min-h-0 bg-white/75 backdrop-blur-[2px] flex flex-col shrink-0 transition-all duration-200 text-[13px] text-[#15171a] select-none font-sans`}
    >
      {!isCollapsed && (
        <div className="flex-1 min-h-0 p-3.5 space-y-4 overflow-y-auto">
          {/* ── 1. Chi nhánh (Multi-select dropdown theo đúng ảnh thiết kế) ── */}
          <div ref={warehouseRef} className={hideWarehouseFilter ? 'hidden' : 'relative'}>
            <div className="text-[11px] font-bold text-[#677484] mb-1.5 uppercase tracking-wide">
              Chi nhánh
            </div>

            {/* Clickable Tag Input Box */}
            <div
              onClick={() => setWarehouseDropdownOpen((v) => !v)}
              className={`min-h-[38px] p-1.5 rounded-[8px] border bg-white flex flex-wrap items-center gap-1.5 cursor-pointer transition ${
                warehouseDropdownOpen
                  ? 'border-[#0070f4] ring-1 ring-[#0070f4]/20 shadow-xs'
                  : 'border-slate-300 hover:border-slate-400'
              }`}
            >
              {/* Thẻ xanh "Tất cả" khi chọn tất cả kho */}
              {isAllSelected && (
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[6px] bg-[#0070f4] text-white text-[12px] font-medium shadow-2xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span>Tất cả</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (activeWarehouse?.warehouseId) {
                        onChange({ warehouseIds: [activeWarehouse.warehouseId] });
                      } else {
                        onChange({ warehouseIds: undefined });
                      }
                    }}
                    className="hover:bg-[#005ac3] rounded-sm p-0.5 transition cursor-pointer flex items-center justify-center"
                    title="Bỏ chọn Tất cả"
                  >
                    <X size={12} strokeWidth={2.5} />
                  </button>
                </span>
              )}

              {/* Các thẻ kho riêng lẻ khi không chọn Tất cả */}
              {!isAllSelected &&
                selectedWarehouseIds.map((whId) => {
                  const wh =
                    warehouses.find((w) => w.warehouseId === whId) ||
                    (activeWarehouse?.warehouseId === whId ? activeWarehouse : null);
                  return (
                    <span
                      key={whId}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[6px] bg-[#0070f4] text-white text-[12px] font-medium shadow-2xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="truncate max-w-[170px]" title={wh?.name}>
                        {wh?.name || `Kho #${whId}`}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveWarehouse(whId);
                        }}
                        className="hover:bg-[#005ac3] rounded-sm p-0.5 transition cursor-pointer flex items-center justify-center"
                      >
                        <X size={12} strokeWidth={2.5} />
                      </button>
                    </span>
                  );
                })}

              <input
                type="text"
                value={warehouseSearchKeyword}
                onChange={(e) => {
                  setWarehouseSearchKeyword(e.target.value);
                  if (!warehouseDropdownOpen) setWarehouseDropdownOpen(true);
                }}
                onFocus={() => setWarehouseDropdownOpen(true)}
                placeholder=""
                className="flex-1 min-w-[30px] bg-transparent outline-none text-xs text-[#15171a] placeholder:text-slate-400 py-0.5"
              />
            </div>

            {/* Dropdown Menu (Theo đúng ảnh mẫu KiotViet) */}
            {warehouseDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-[8px] border border-slate-200 shadow-[0_6px_20px_rgba(0,0,0,0.12)] py-1.5 z-50 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                {/* Option: Tất cả */}
                <div
                  onClick={() => {
                    onChange({ warehouseIds: [] });
                    setWarehouseSearchKeyword('');
                    setWarehouseDropdownOpen(false);
                  }}
                  className={`px-3 py-2 text-[13px] cursor-pointer flex items-center justify-between transition ${
                    isAllSelected
                      ? 'bg-[#f0f7ff] text-[#15171a] font-medium'
                      : 'text-[#15171a] hover:bg-slate-50'
                  }`}
                >
                  <span>Tất cả</span>
                  {isAllSelected && (
                    <Check size={16} strokeWidth={2.5} className="text-[#0070f4] shrink-0" />
                  )}
                </div>

                {/* Danh sách các chi nhánh */}
                {filteredWarehouses.map((wh) => {
                  const isSelected = !isAllSelected && selectedWarehouseIds.includes(wh.warehouseId);
                  return (
                    <div
                      key={wh.warehouseId}
                      onClick={() => {
                        if (isAllSelected) {
                          onChange({ warehouseIds: [wh.warehouseId] });
                        } else if (isSelected) {
                          const next = selectedWarehouseIds.filter((id) => id !== wh.warehouseId);
                          onChange({ warehouseIds: next.length === 0 ? [] : next });
                        } else {
                          handleAddWarehouse(wh.warehouseId);
                        }
                      }}
                      className={`px-3 py-2 text-[13px] cursor-pointer flex items-center justify-between transition ${
                        isSelected
                          ? 'bg-[#f0f7ff] text-[#15171a] font-medium'
                          : 'text-[#15171a] hover:bg-slate-50'
                      }`}
                    >
                      <span className="truncate pr-2">{wh.name}</span>
                      {isSelected && (
                        <Check size={16} strokeWidth={2.5} className="text-[#0070f4] shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className={hideWarehouseFilter ? 'hidden' : 'border-t border-slate-100'} />

          {/* ── 2. Trạng thái (Checkbox theo đúng yêu cầu) ── */}
          <div>
            <div className="text-[11px] font-bold text-[#677484] mb-2 uppercase tracking-wide">
              Trạng thái
            </div>
            <div className="space-y-2">
              {STATUS_OPTIONS.map((opt) => {
                const isChecked = state.statuses.includes(opt.value);
                return (
                  <label
                    key={opt.value}
                    className="flex items-center gap-2 text-xs text-[#15171a] hover:text-[#0070f4] cursor-pointer select-none transition"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleStatus(opt.value)}
                      className="w-4 h-4 rounded border-slate-300 text-[#0070f4] focus:ring-[#0070f4] cursor-pointer"
                    />
                    <span>{statusLabels?.[opt.value] ?? opt.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-100" />

          {/* ── 3. Thời gian (Đồng bộ 100% chuẩn Chuyển hàng) ── */}
          <div>
            <label className="block text-[11px] font-bold text-[#677484] mb-1.5 uppercase tracking-wide">
              Thời gian
            </label>

            <div className="space-y-2">
              {/* Option 1: Preset Popover Trigger */}
              <div ref={presetTriggerRef} className="flex items-center gap-2">
                <div onClick={handleOpenPreset} className="cursor-pointer p-0.5">
                  {state.timeRange !== 'custom' ? (
                    <div className="w-4 h-4 rounded-full border-2 border-[#0070f4] flex items-center justify-center shrink-0">
                      <div className="w-2 h-2 rounded-full bg-[#0070f4]" />
                    </div>
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0 hover:border-slate-400" />
                  )}
                </div>

                <div
                  ref={presetBoxRef}
                  onClick={handleOpenPreset}
                  className={`flex-1 h-8 px-3 rounded-[8px] border flex items-center justify-between cursor-pointer transition select-none ${
                    state.timeRange !== 'custom'
                      ? 'border-slate-300 bg-white text-[#15171a] shadow-xs hover:border-[#0070f4]'
                      : 'border-slate-200 bg-white text-[#677484] hover:border-slate-300'
                  }`}
                >
                  <span className="text-xs font-medium truncate">{presetLabel}</span>
                  <ChevronRight size={14} className="text-[#677484] shrink-0" />
                </div>
              </div>

              {/* Option 2: Custom Dual Calendar Trigger */}
              <div ref={customTriggerRef} className="flex items-center gap-2">
                <div onClick={handleOpenCustom} className="cursor-pointer p-0.5">
                  {state.timeRange === 'custom' ? (
                    <div className="w-4 h-4 rounded-full border-2 border-[#0070f4] flex items-center justify-center shrink-0">
                      <div className="w-2 h-2 rounded-full bg-[#0070f4]" />
                    </div>
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0 hover:border-slate-400" />
                  )}
                </div>

                <div
                  ref={customBoxRef}
                  onClick={handleOpenCustom}
                  className={`flex-1 h-8 px-2.5 rounded-[8px] border flex items-center justify-between cursor-pointer transition select-none ${
                    state.timeRange === 'custom'
                      ? 'border-slate-300 bg-white text-[#15171a] shadow-xs hover:border-[#0070f4]'
                      : 'border-slate-200 bg-white text-[#677484] hover:border-slate-300'
                  }`}
                >
                  <span className="text-[11px] font-medium truncate text-[#15171a] tracking-tight">
                    {state.timeRange === 'custom' && state.dateFrom
                      ? `${formatDateOnlyVN(state.dateFrom)} - ${formatDateOnlyVN(state.dateTo || state.dateFrom)}`
                      : 'Tùy chỉnh'}
                  </span>
                  <Calendar size={14} className="text-[#677484] shrink-0 ml-1" />
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className={hideSupplierFilter ? 'hidden' : 'border-t border-slate-100'} />

          {/* ── 4. Nhà cung cấp ── */}
          <div ref={supplierRef} className={hideSupplierFilter ? 'hidden' : undefined}>
            <div className="text-[11px] font-bold text-[#677484] mb-1.5 uppercase tracking-wide flex items-center justify-between">
              <span>Nhà cung cấp</span>
              {state.partnerId && (
                <button
                  type="button"
                  onClick={() => onChange({ partnerId: undefined })}
                  className="text-[11px] text-[#0070f4] hover:underline font-normal cursor-pointer"
                >
                  Xóa lọc
                </button>
              )}
            </div>

            <div className="relative">
              <div
                onClick={() => setSupplierSearchOpen((v) => !v)}
                className={`h-8 px-2.5 bg-white border rounded-[8px] flex items-center justify-between text-[12px] cursor-pointer transition ${
                  supplierSearchOpen
                    ? 'border-[#0070f4] ring-1 ring-[#0070f4]/20'
                    : 'border-slate-300 hover:border-slate-400'
                }`}
              >
                <span className={selectedSupplierObj ? 'text-[#15171a] font-medium truncate' : 'text-slate-400 truncate'}>
                  {selectedSupplierObj ? selectedSupplierObj.name : 'Chọn nhà cung cấp'}
                </span>
                <div className="flex items-center gap-1 shrink-0 text-slate-400">
                  {selectedSupplierObj && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onChange({ partnerId: undefined });
                      }}
                      className="hover:text-slate-600 p-0.5"
                    >
                      <X size={12} />
                    </button>
                  )}
                  {supplierSearchOpen ? <ChevronUp size={13} className="text-[#15171a]" /> : <ChevronDown size={13} />}
                </div>
              </div>

              {supplierSearchOpen && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-[8px] border border-slate-200 shadow-lg py-1.5 z-40">
                  <div className="px-2.5 pb-1.5 border-b border-slate-100">
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs">
                      <Search size={13} className="text-slate-400" />
                      <input
                        type="text"
                        placeholder="Tìm NCC..."
                        value={supplierSearchKeyword}
                        onChange={(e) => setSupplierSearchKeyword(e.target.value)}
                        className="w-full bg-transparent outline-none text-slate-700 placeholder:text-slate-400 text-xs"
                      />
                    </div>
                  </div>

                  <div className="max-h-48 overflow-y-auto pt-1">
                    <div
                      onClick={() => {
                        onChange({ partnerId: undefined });
                        setSupplierSearchOpen(false);
                      }}
                      className={`px-3 py-1.5 text-xs cursor-pointer transition ${
                        !state.partnerId ? 'bg-blue-50 text-[#0070f4] font-medium' : 'text-[#15171a] hover:bg-slate-50'
                      }`}
                    >
                      Tất cả nhà cung cấp
                    </div>

                    {filteredSuppliers.map((supp) => {
                      const isSelected = state.partnerId === Number(supp.id);
                      return (
                        <div
                          key={supp.id}
                          onClick={() => {
                            onChange({ partnerId: Number(supp.id) });
                            setSupplierSearchOpen(false);
                          }}
                          className={`px-3 py-1.5 text-xs cursor-pointer flex items-center justify-between transition ${
                            isSelected ? 'bg-blue-50 text-[#0070f4] font-medium' : 'text-[#15171a] hover:bg-slate-50'
                          }`}
                        >
                          <div className="truncate pr-2">
                            <div>{supp.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{supp.code}</div>
                          </div>
                          {isSelected && <Check size={13} className="text-[#0070f4] shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Preset Popover (Portal - Chuẩn 4 cột KiotViet như Chuyển hàng) ── */}
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
                        state.timeRange === it.key ||
                        (!state.timeRange && it.key === 'this_month');
                      return (
                        <button
                          key={it.key}
                          type="button"
                          onClick={() => handleSelectPreset(it.key, it.label)}
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

      {/* ── Custom Dual Calendar Popover (Portal - Chuẩn 2 lịch độc lập như Chuyển hàng) ── */}
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
            className="bg-white rounded-[8px] shadow-[rgba(169,180,203,0.32)_0px_8px_20px_0px] border border-slate-200 p-4 select-none animate-in fade-in zoom-in-95 duration-100 w-[580px] max-w-[calc(100vw-16px)] max-h-[calc(100vh-16px)] overflow-auto"
          >
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

                {renderCalendarDays(leftMonth, true)}
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

                {renderCalendarDays(rightMonth, false)}
              </div>
            </div>

            {/* Footer: Hôm nay (trái) - Bỏ qua & Áp dụng (phải) */}
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
                  onClick={() => setShowCustomPopover(false)}
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
    </aside>
  );
}
