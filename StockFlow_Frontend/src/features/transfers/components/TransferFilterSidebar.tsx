// src/features/transfers/components/TransferFilterSidebar.tsx
// Sidebar bộ lọc chuẩn giao diện KiotViet cho Màn hình 1 (Danh sách chuyển hàng)

import { clampPopoverLeft, DATE_POPOVER_WIDTH, PRESET_POPOVER_WIDTH } from '@/lib/ui/popover';
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { WarehouseFacility } from '@/features/admin/types';
import { TransferFilterState, TransferStatus } from '../types';
import { ChevronDown, Calendar, X, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { useActiveWarehouse } from '@/lib/warehouse/useActiveWarehouse';
import {
  getDateRangeForPreset,
  formatDateOnlyVN,
  parseISODate,
  toISODate,
} from '../utils/dateUtils';

interface Props {
  filters: TransferFilterState;
  onChange: (updated: Partial<TransferFilterState>) => void;
  warehouses: WarehouseFacility[];
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

export const TransferFilterSidebar: React.FC<Props> = ({
  filters,
  onChange,
  warehouses,
}) => {
  const { activeWarehouse } = useActiveWarehouse();
  const [mounted, setMounted] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Bỏ chi nhánh hiện tại đang làm việc ra khỏi danh sách lọc (cho cả Chuyển đi và Nhận về)
  const availableWarehouses = React.useMemo(() => {
    if (!activeWarehouse) return warehouses;
    return warehouses.filter((wh) => {
      const matchCode =
        Boolean(activeWarehouse.code &&
        wh.code &&
        activeWarehouse.code.toUpperCase() === wh.code.toUpperCase());
      const matchName =
        Boolean(activeWarehouse.name &&
        wh.name &&
        activeWarehouse.name.toLowerCase() === wh.name.toLowerCase());
      const matchId =
        Boolean(activeWarehouse.warehouseId &&
        wh.warehouseId &&
        Number(activeWarehouse.warehouseId) === Number(wh.warehouseId));
      return !matchCode && !matchName && !matchId;
    });
  }, [warehouses, activeWarehouse]);

  // Nếu bộ lọc đang chọn đúng chi nhánh hiện tại thì reset về 'ALL'
  React.useEffect(() => {
    if (!activeWarehouse) return;
    const isSourceActive =
      filters.sourceWarehouseId !== 'ALL' &&
      (Number(filters.sourceWarehouseId) === Number(activeWarehouse.warehouseId) ||
        String(filters.sourceWarehouseId).toUpperCase() === activeWarehouse.code?.toUpperCase());
    const isDestActive =
      filters.destWarehouseId !== 'ALL' &&
      (Number(filters.destWarehouseId) === Number(activeWarehouse.warehouseId) ||
        String(filters.destWarehouseId).toUpperCase() === activeWarehouse.code?.toUpperCase());

    if (isSourceActive || isDestActive) {
      onChange({
        sourceWarehouseId: isSourceActive ? 'ALL' : filters.sourceWarehouseId,
        destWarehouseId: isDestActive ? 'ALL' : filters.destWarehouseId,
      });
    }
  }, [activeWarehouse, filters.sourceWarehouseId, filters.destWarehouseId, onChange]);

  const statusOptions: { key: TransferStatus; label: string }[] = [
    { key: 'DRAFT', label: 'Phiếu tạm' },
    { key: 'IN_TRANSIT', label: 'Đang chuyển' },
    { key: 'RECEIVED', label: 'Đã nhận' },
    { key: 'CANCELLED', label: 'Đã hủy' },
  ];

  const handleToggleStatus = (st: TransferStatus) => {
    if (filters.statuses.includes(st)) {
      onChange({ statuses: filters.statuses.filter((s) => s !== st) });
    } else {
      onChange({ statuses: [...filters.statuses, st] });
    }
  };

  const handleRemoveStatus = (st: TransferStatus, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange({ statuses: filters.statuses.filter((s) => s !== st) });
  };

  // Popover State & Refs
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

  const [presetLabel, setPresetLabel] = useState<string>(() => {
    if (filters.timeRange && filters.timeRange !== 'custom') {
      return getDateRangeForPreset(filters.timeRange).label;
    }
    return 'Tháng này';
  });

  useEffect(() => {
    if (filters.timeRange && filters.timeRange !== 'custom') {
      const range = getDateRangeForPreset(filters.timeRange);
      setPresetLabel(range.label);
    }
  }, [filters.timeRange]);

  // Custom Date Picker State (2 bên chọn ngày tháng độc lập)
  const [tempFrom, setTempFrom] = useState<Date>(() => parseISODate(filters.dateFrom));
  const [tempTo, setTempTo] = useState<Date>(() => parseISODate(filters.dateTo));
  const [leftMonth, setLeftMonth] = useState<Date>(() => {
    const d = parseISODate(filters.dateFrom);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [rightMonth, setRightMonth] = useState<Date>(() => {
    const d = parseISODate(filters.dateTo);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const statusRef = useRef<HTMLDivElement>(null);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [statusSearchKeyword, setStatusSearchKeyword] = useState('');

  const filteredStatusOptions = React.useMemo(() => {
    if (!statusSearchKeyword.trim()) return statusOptions;
    const kw = statusSearchKeyword.toLowerCase();
    return statusOptions.filter((o) => o.label.toLowerCase().includes(kw));
  }, [statusOptions, statusSearchKeyword]);

  // Click outside listener
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

      if (statusRef.current && !statusRef.current.contains(target)) {
        setStatusDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPresetPopover, showCustomPopover]);

  // Open Preset Popover
  const handleOpenPreset = () => {
    if (filters.timeRange === 'custom') {
      const range = getDateRangeForPreset('this_month');
      onChange({
        timeRange: 'this_month',
        dateFrom: range.from,
        dateTo: range.to,
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

  // Open Custom Popover - Chuyển sang xanh ngay lập tức
  const handleOpenCustom = () => {
    const f = filters.dateFrom ? parseISODate(filters.dateFrom) : new Date();
    const t = filters.dateTo ? parseISODate(filters.dateTo) : new Date();

    // Kích hoạt ngay trạng thái custom để radio chuyển xanh luôn kèm khoảng ngày
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
      const popoverHeight = 360;
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
    });
    setShowPresetPopover(false);
  };

  const handleApplyCustom = () => {
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
      timeRange: 'custom',
      dateFrom: fromISO,
      dateTo: toISO,
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

  // Render lưới ngày độc lập cho từng bên lịch
  const renderCalendarDays = (monthDate: Date, isLeftCalendar: boolean) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    // Thứ 2 (T2) là ngày đầu tuần trong tuần làm việc (0..6)
    const startDayIndex = (firstDay.getDay() + 6) % 7;

    interface DayItem {
      date: Date;
      dayNum: number;
      isCurrentMonth: boolean;
      iso: string;
    }

    const days: DayItem[] = [];

    // Ngày tháng trước
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

    // Ngày trong tháng này
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      days.push({
        date,
        dayNum: d,
        isCurrentMonth: true,
        iso: toISODate(date),
      });
    }

    // Ngày tháng tiếp theo để lấp đầy lịch
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
          // Hoàn toàn độc lập: Bên trái chỉ hiển thị chọn của Từ ngày, bên phải chỉ hiển thị chọn của Đến ngày
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

  return (
    <aside
      className={`relative ${
        isCollapsed ? 'w-0 border-r-0' : 'w-60 border-r border-slate-200'
      } h-full min-h-0 bg-white/75 backdrop-blur-[2px] flex flex-col shrink-0 transition-all duration-200 text-[13px] text-[#15171a] select-none font-sans`}
    >
      {/* Nút thu gọn / mở rộng bộ lọc theo chuẩn giao diện Ảnh 3 */}
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white border border-[#0070f4] text-[#0070f4] hover:bg-[#e6f1fe] shadow-xs flex items-center justify-center cursor-pointer z-30 transition"
        title={isCollapsed ? 'Mở rộng bộ lọc' : 'Thu gọn bộ lọc'}
      >
        {isCollapsed ? (
          <ChevronRight size={13} className="stroke-[2.5]" />
        ) : (
          <ChevronLeft size={13} className="stroke-[2.5]" />
        )}
      </button>

      {!isCollapsed && (
        <div className="flex-1 min-h-0 p-3.5 space-y-4 overflow-y-auto">
          {/* 1. Chuyển đi (Từ chi nhánh) */}
        <div>
          <label className="block text-[11px] font-bold text-[#677484] mb-1.5 uppercase tracking-wide">
            Chuyển đi
          </label>
          <div className="relative">
            <select
              value={filters.sourceWarehouseId}
              onChange={(e) =>
                onChange({
                  sourceWarehouseId:
                    e.target.value === 'ALL' ? 'ALL' : Number(e.target.value),
                })
              }
              className="w-full h-8 pl-2.5 pr-7 bg-white rounded-[8px] border border-slate-300 text-[12px] text-[#15171a] focus:outline-none focus:border-[#0070f4] cursor-pointer appearance-none truncate"
            >
              <option value="ALL">Tất cả chi nhánh</option>
              {availableWarehouses.map((wh) => (
                <option key={wh.id || wh.code} value={wh.warehouseId || wh.code}>
                  {wh.name} ({wh.code})
                </option>
              ))}
            </select>
            <ChevronDown
              size={13}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#677484] pointer-events-none"
            />
          </div>
        </div>

        {/* 2. Nhận về (Tới chi nhánh) */}
        <div>
          <label className="block text-[11px] font-bold text-[#677484] mb-1.5 uppercase tracking-wide">
            Nhận về
          </label>
          <div className="relative">
            <select
              value={filters.destWarehouseId}
              onChange={(e) =>
                onChange({
                  destWarehouseId:
                    e.target.value === 'ALL' ? 'ALL' : Number(e.target.value),
                })
              }
              className="w-full h-8 pl-2.5 pr-7 bg-white rounded-[8px] border border-slate-300 text-[12px] text-[#15171a] focus:outline-none focus:border-[#0070f4] cursor-pointer appearance-none truncate"
            >
              <option value="ALL">Tất cả chi nhánh</option>
              {availableWarehouses.map((wh) => (
                <option key={wh.id || wh.code} value={wh.warehouseId || wh.code}>
                  {wh.name} ({wh.code})
                </option>
              ))}
            </select>
            <ChevronDown
              size={13}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#677484] pointer-events-none"
            />
          </div>
        </div>

        {/* 3. Trạng thái (Multi-select dropdown theo đúng ảnh thiết kế) */}
        <div ref={statusRef} className="relative">
          <label className="block text-[11px] font-bold text-[#677484] mb-1.5 uppercase tracking-wide">
            Trạng thái
          </label>

          {/* Clickable Tag Input Box */}
          <div
            onClick={() => setStatusDropdownOpen((v) => !v)}
            className={`min-h-[38px] p-1.5 rounded-[8px] border bg-white flex flex-wrap items-center gap-1.5 cursor-pointer transition ${
              statusDropdownOpen
                ? 'border-[#0070f4] ring-1 ring-[#0070f4]/20 shadow-xs'
                : 'border-slate-300 hover:border-slate-400'
            }`}
          >
            {/* Thẻ xanh "Tất cả" khi chọn tất cả trạng thái */}
            {filters.statuses.length === 0 && (
              <span
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[6px] bg-[#0070f4] text-white text-[12px] font-medium shadow-2xs"
                onClick={(e) => e.stopPropagation()}
              >
                <span>Tất cả</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange({ statuses: ['DRAFT', 'IN_TRANSIT', 'RECEIVED'] });
                  }}
                  className="hover:bg-[#005ac3] rounded-sm p-0.5 transition cursor-pointer flex items-center justify-center"
                  title="Bỏ chọn Tất cả"
                >
                  <X size={12} strokeWidth={2.5} />
                </button>
              </span>
            )}

            {filters.statuses.map((st) => {
              const opt = statusOptions.find((o) => o.key === st);
              return (
                <span
                  key={st}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[6px] bg-[#0070f4] text-white text-[12px] font-medium shadow-2xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span>{opt?.label || st}</span>
                  <button
                    type="button"
                    onClick={(e) => handleRemoveStatus(st, e)}
                    className="hover:bg-[#005ac3] rounded-sm p-0.5 transition cursor-pointer flex items-center justify-center"
                  >
                    <X size={12} strokeWidth={2.5} />
                  </button>
                </span>
              );
            })}

            <input
              type="text"
              value={statusSearchKeyword}
              onChange={(e) => {
                setStatusSearchKeyword(e.target.value);
                if (!statusDropdownOpen) setStatusDropdownOpen(true);
              }}
              onFocus={() => setStatusDropdownOpen(true)}
              placeholder=""
              className="flex-1 min-w-[30px] bg-transparent outline-none text-xs text-[#15171a] placeholder:text-slate-400 py-0.5"
            />
          </div>

          {/* Dropdown Menu (Theo đúng ảnh mẫu KiotViet) */}
          {statusDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-[8px] border border-slate-200 shadow-[0_6px_20px_rgba(0,0,0,0.12)] py-1.5 z-50 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
              {/* Option: Tất cả */}
              <div
                onClick={() => {
                  onChange({ statuses: [] });
                  setStatusSearchKeyword('');
                  setStatusDropdownOpen(false);
                }}
                className={`px-3 py-2 text-[13px] cursor-pointer flex items-center justify-between transition ${
                  filters.statuses.length === 0
                    ? 'bg-[#f0f7ff] text-[#15171a] font-medium'
                    : 'text-[#15171a] hover:bg-slate-50'
                }`}
              >
                <span>Tất cả</span>
                {filters.statuses.length === 0 && (
                  <Check size={16} strokeWidth={2.5} className="text-[#0070f4] shrink-0" />
                )}
              </div>

              {/* Danh sách các trạng thái */}
              {filteredStatusOptions.map((opt) => {
                const isSelected = filters.statuses.includes(opt.key);
                return (
                  <div
                    key={opt.key}
                    onClick={() => {
                      if (filters.statuses.length === 0) {
                        onChange({ statuses: [opt.key] });
                      } else {
                        handleToggleStatus(opt.key);
                      }
                    }}
                    className={`px-3 py-2 text-[13px] cursor-pointer flex items-center justify-between transition ${
                      isSelected
                        ? 'bg-[#f0f7ff] text-[#15171a] font-medium'
                        : 'text-[#15171a] hover:bg-slate-50'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && (
                      <Check size={16} strokeWidth={2.5} className="text-[#0070f4] shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 4. Thời gian - Bỏ ngày chuyển / ngày nhận theo yêu cầu */}
        <div>
          <label className="block text-[11px] font-bold text-[#677484] mb-1.5 uppercase tracking-wide">
            Thời gian
          </label>

          <div className="space-y-2">
            {/* Radio options: [ Tháng này > ] / [ Tùy chỉnh 📅 ] */}
            {/* Option 1: Preset */}
            <div
              ref={presetTriggerRef}
              className="flex items-center gap-2"
            >
              <div
                onClick={handleOpenPreset}
                className="cursor-pointer p-0.5"
              >
                {filters.timeRange !== 'custom' ? (
                  <div className="w-4 h-4 rounded-full border-2 border-[#0070f4] flex items-center justify-center shrink-0">
                    <div className="w-2 h-2 rounded-full bg-[#0070f4]" />
                  </div>
                ) : (
                  <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0 hover:border-slate-400" />
                )}
              </div>

              <div
                id="btn-preset-filter"
                ref={presetBoxRef}
                onClick={handleOpenPreset}
                className={`flex-1 h-8 px-3 rounded-[8px] border flex items-center justify-between cursor-pointer transition select-none ${
                  filters.timeRange !== 'custom'
                    ? 'border-slate-300 bg-white text-[#15171a] shadow-xs hover:border-[#0070f4]'
                    : 'border-slate-200 bg-white text-[#677484] hover:border-slate-300'
                }`}
              >
                <span className="text-xs font-medium truncate">{presetLabel}</span>
                <ChevronRight size={14} className="text-[#677484] shrink-0" />
              </div>
            </div>

            {/* Option 2: Tùy chỉnh */}
            <div
              ref={customTriggerRef}
              className="flex items-center gap-2"
            >
              <div
                onClick={handleOpenCustom}
                className="cursor-pointer p-0.5"
              >
                {filters.timeRange === 'custom' ? (
                  <div className="w-4 h-4 rounded-full border-2 border-[#0070f4] flex items-center justify-center shrink-0">
                    <div className="w-2 h-2 rounded-full bg-[#0070f4]" />
                  </div>
                ) : (
                  <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0 hover:border-slate-400" />
                )}
              </div>

              <div
                id="btn-custom-filter"
                ref={customBoxRef}
                onClick={handleOpenCustom}
                className={`flex-1 h-8 px-2.5 rounded-[8px] border flex items-center justify-between cursor-pointer transition select-none ${
                  filters.timeRange === 'custom'
                    ? 'border-slate-300 bg-white text-[#15171a] shadow-xs hover:border-[#0070f4]'
                    : 'border-slate-200 bg-white text-[#677484] hover:border-slate-300'
                }`}
              >
                <span className="text-[11px] font-medium truncate text-[#15171a] tracking-tight">
                  {filters.timeRange === 'custom'
                    ? `${formatDateOnlyVN(filters.dateFrom || new Date())} - ${formatDateOnlyVN(filters.dateTo || filters.dateFrom || new Date())}`
                    : 'Tùy chỉnh'}
                </span>
                <Calendar size={14} className="text-[#677484] shrink-0 ml-1" />
              </div>
            </div>
          </div>
        </div>

        {/* 5. Tình trạng nhận hàng (Tất cả / Khớp / Không khớp) */}
        <div>
          <label className="block text-[11px] font-bold text-[#677484] mb-1.5 uppercase tracking-wide">
            Tình trạng nhận hàng
          </label>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => onChange({ matchStatus: 'ALL' })}
              className={`px-3 py-1 rounded-full text-xs transition cursor-pointer ${
                filters.matchStatus === 'ALL' || !filters.matchStatus
                  ? 'bg-[#0070f4] text-white font-semibold shadow-xs'
                  : 'bg-white border border-slate-300 text-[#15171a] hover:border-[#0070f4] hover:text-[#0070f4] font-normal'
              }`}
            >
              Tất cả
            </button>

            <button
              type="button"
              onClick={() => onChange({ matchStatus: 'MATCHED' })}
              className={`px-3 py-1 rounded-full text-xs transition cursor-pointer ${
                filters.matchStatus === 'MATCHED'
                  ? 'bg-[#0070f4] text-white font-semibold shadow-xs'
                  : 'bg-white border border-slate-300 text-[#15171a] hover:border-[#0070f4] hover:text-[#0070f4] font-normal'
              }`}
            >
              Khớp
            </button>

            <button
              type="button"
              onClick={() => onChange({ matchStatus: 'UNMATCHED' })}
              className={`px-3 py-1 rounded-full text-xs transition cursor-pointer ${
                filters.matchStatus === 'UNMATCHED'
                  ? 'bg-[#0070f4] text-white font-semibold shadow-xs'
                  : 'bg-white border border-slate-300 text-[#15171a] hover:border-[#0070f4] hover:text-[#0070f4] font-normal'
              }`}
            >
              Không khớp
            </button>
          </div>
        </div>
      </div>
      )}

      {/* Preset Popover (Ảnh 1: Bỏ âm lịch, bỏ theo quý) */}
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
                        filters.timeRange === it.key ||
                        (!filters.timeRange && it.key === 'this_month');
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

      {/* Custom Calendar Popover (Ảnh 2: Dual Calendar Side-by-Side độc lập) */}
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
};
