'use client';

import { Calendar, ChevronDown, ChevronRight, ChevronUp, Search, X, Check } from 'lucide-react';
import { useEffect, useId, useRef, useState, useMemo } from 'react';
import type { PurchaseFilterState, PurchaseStatus } from '@/app/(dashboard)/purchases/PurchasesClient';
import DateRangePickerPopover, { formatDateVN } from '@/components/DateRangePickerPopover';
import PeriodPickerPopover from '@/components/PeriodPickerPopover';
import { WarehouseItem } from '@/lib/warehouse/useActiveWarehouse';
import { Supplier } from '@/features/suppliers/types';

// ─── Types ────────────────────────────────────────────────────────────────────

type PurchaseFilterSidebarProps = {
  state: PurchaseFilterState;
  onChange: (patch: Partial<PurchaseFilterState>) => void;
  isCollapsed?: boolean;
  warehouses?: WarehouseItem[];
  suppliers?: Supplier[];
  activeWarehouse?: WarehouseItem;
};

// ─── Status options ───────────────────────────────────────────────────────────

const STATUS_OPTIONS: { label: string; value: PurchaseStatus }[] = [
  { label: 'Phiếu tạm',     value: 'draft' },
  { label: 'Đã nhập hàng', value: 'completed' },
  { label: 'Đã hủy',        value: 'canceled' },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PurchaseFilterSidebar({
  state,
  onChange,
  isCollapsed = false,
  warehouses = [],
  suppliers = [],
  activeWarehouse,
}: PurchaseFilterSidebarProps) {
  const timeRangeRadioName = `purchase-time-range-${useId()}`;
  const [periodPopoverOpen, setPeriodPopoverOpen] = useState(false);
  const [dateRangeOpen, setDateRangeOpen] = useState(false);
  const [supplierSearchOpen, setSupplierSearchOpen] = useState(false);
  const [supplierSearchKeyword, setSupplierSearchKeyword] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const supplierRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDateRangeOpen(false);
      }
      if (supplierRef.current && !supplierRef.current.contains(e.target as Node)) {
        setSupplierSearchOpen(false);
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

  // Toggle warehouse checkbox (KiotViet multi-branch selection)
  function toggleWarehouse(whId: number) {
    const current = state.warehouseIds || (activeWarehouse?.warehouseId ? [activeWarehouse.warehouseId] : []);
    const next = current.includes(whId)
      ? current.filter((id) => id !== whId)
      : [...current, whId];
    onChange({ warehouseIds: next.length > 0 ? next : undefined });
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
      className={`relative shrink-0 bg-white border-r border-[#e5e7eb] select-none text-[#262626] transition-all duration-300 ${
        isCollapsed ? 'w-0 overflow-hidden px-0 py-0' : 'w-[260px] overflow-y-auto max-h-[calc(100vh-56px)] px-4 py-5'
      }`}
    >
      {/* Title */}
      <h2 className="text-[20px] font-bold text-slate-900 tracking-tight mb-5">
        Nhập hàng
      </h2>

      <div className="space-y-5 text-xs">

        {/* ── 1. Chi nhánh (Kho hàng) - Chuẩn KiotViet Đa Kho ── */}
        <div>
          <div className="text-[13px] font-semibold text-slate-800 mb-2 flex items-center justify-between">
            <span>Chi nhánh / Kho</span>
            {state.warehouseIds && state.warehouseIds.length > 0 && (
              <button
                type="button"
                onClick={() => onChange({ warehouseIds: undefined })}
                className="text-[11px] text-blue-600 hover:underline font-normal"
              >
                Mặc định
              </button>
            )}
          </div>
          <div className="space-y-1.5">
            {warehouses.map((wh) => {
              const isChecked = state.warehouseIds
                ? state.warehouseIds.includes(wh.warehouseId)
                : activeWarehouse?.warehouseId === wh.warehouseId;

              return (
                <label
                  key={wh.warehouseId}
                  className="flex items-center gap-2.5 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleWarehouse(wh.warehouseId)}
                    className="h-4 w-4 rounded border-slate-300 accent-[#0071BA] cursor-pointer"
                  />
                  <span className="text-[13px] text-slate-700 group-hover:text-slate-900 transition truncate" title={wh.name}>
                    {wh.name}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-[#e5e7eb]" />

        {/* ── 2. Trạng thái ── */}
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

        {/* ── 3. Thời gian ── */}
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

              {/* Period Picker Popover */}
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

              {/* Dual-calendar Date Range Popover */}
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

        {/* ── 4. Nhà cung cấp ── */}
        <div ref={supplierRef}>
          <div className="text-[13px] font-semibold text-slate-800 mb-2 flex items-center justify-between">
            <span>Nhà cung cấp</span>
            {state.partnerId && (
              <button
                type="button"
                onClick={() => onChange({ partnerId: undefined })}
                className="text-[11px] text-blue-600 hover:underline font-normal"
              >
                Xóa lọc
              </button>
            )}
          </div>

          <div className="relative">
            <div
              onClick={() => setSupplierSearchOpen((v) => !v)}
              className={`h-[34px] px-3 bg-white border rounded-[6px] flex items-center justify-between text-[13px] cursor-pointer transition ${
                supplierSearchOpen
                  ? 'border-blue-500 ring-2 ring-blue-100 shadow-xs'
                  : 'border-slate-300 hover:border-slate-400'
              }`}
            >
              <span className={selectedSupplierObj ? 'text-slate-800 font-medium truncate' : 'text-slate-400 truncate'}>
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
                {supplierSearchOpen ? <ChevronUp size={14} className="text-slate-600" /> : <ChevronDown size={14} />}
              </div>
            </div>

            {supplierSearchOpen && (
              <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-[6px] border border-slate-200 shadow-lg py-1.5 z-40">
                <div className="px-2.5 pb-1.5 border-b border-slate-100">
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs">
                    <Search size={13} className="text-slate-400" />
                    <input
                      type="text"
                      placeholder="Tìm NCC..."
                      value={supplierSearchKeyword}
                      onChange={(e) => setSupplierSearchKeyword(e.target.value)}
                      className="w-full bg-transparent outline-none text-slate-700 placeholder:text-slate-400"
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
                      !state.partnerId ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700 hover:bg-slate-50'
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
                          isSelected ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <div>{supp.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{supp.code}</div>
                        </div>
                        {isSelected && <Check size={13} className="text-blue-600 shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-[#e5e7eb]" />

        {/* ── 5. Người tạo ── */}
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

        {/* ── 6. Số hóa đơn đầu vào ── */}
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

        {/* ── 7. Người nhập ── */}
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
