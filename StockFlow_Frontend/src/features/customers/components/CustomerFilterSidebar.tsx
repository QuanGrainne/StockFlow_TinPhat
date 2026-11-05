'use client';

// Sidebar bộ lọc Khách hàng — cùng giao diện với SupplierFilterSidebar / TransferFilterSidebar:
// Chi nhánh tạo, Ngày tạo, Giới tính, Tổng bán (giá trị + thời gian), Nợ hiện tại, Trạng thái.

import React, { useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import TimeRangeFilter from '@/components/filters/TimeRangeFilter';
import { CustomerFilterState } from '../types';

interface CustomerFilterSidebarProps {
  state: CustomerFilterState;
  warehousesList: { warehouseId: number; code: string; name: string }[];
  onChange: (patch: Partial<CustomerFilterState>) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const labelCls = 'block text-[11px] font-bold text-[#677484] mb-1.5 uppercase tracking-wide';
const subLabelCls = 'block text-[11px] text-[#677484] mb-1';

const STATUS_OPTIONS: { label: string; value: CustomerFilterState['status'] }[] = [
  { label: 'Tất cả', value: 'ALL' },
  { label: 'Đang hoạt động', value: 'ACTIVE' },
  { label: 'Ngừng hoạt động', value: 'INACTIVE' },
];

const GENDER_OPTIONS: { label: string; value: CustomerFilterState['gender'] }[] = [
  { label: 'Tất cả', value: 'ALL' },
  { label: 'Nam', value: 'MALE' },
  { label: 'Nữ', value: 'FEMALE' },
];

function Chips<T extends string>({
  options,
  value,
  onSelect,
}: {
  options: { label: string; value: T }[];
  value: T;
  onSelect: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onSelect(opt.value)}
            className={`px-3 py-1 rounded-full text-xs transition cursor-pointer ${
              selected
                ? 'bg-[#0070f4] text-white font-semibold shadow-xs'
                : 'bg-white border border-slate-300 text-[#15171a] hover:border-[#0070f4] hover:text-[#0070f4] font-normal'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/** Ô nhập số "Từ / Tới": chỉ áp dụng khi rời ô hoặc Enter (tránh tải lại liên tục khi gõ) */
function AmountInput({
  prefix,
  value,
  onCommit,
}: {
  prefix: string;
  value: string;
  onCommit: (v: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [synced, setSynced] = useState(value);
  // Bộ lọc bị đặt lại từ ngoài (VD Xóa bộ lọc) → đồng bộ lại ô nhập
  if (value !== synced) {
    setSynced(value);
    setDraft(value);
  }
  const commit = () => {
    const clean = draft.replace(/[^\d]/g, '');
    setDraft(clean ? Number(clean).toLocaleString('vi-VN') : '');
    if (clean !== value) onCommit(clean);
  };
  return (
    <div className="flex items-center h-8 rounded-[8px] border border-slate-300 bg-white overflow-hidden focus-within:border-[#0070f4]">
      <span className="h-full px-2.5 flex items-center bg-[#f7f8f9] border-r border-slate-200 text-[12px] text-[#677484] shrink-0 w-11 justify-center">
        {prefix}
      </span>
      <input
        type="text"
        inputMode="numeric"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
        placeholder="Nhập giá trị"
        className="flex-1 min-w-0 h-full px-2.5 text-[12px] text-[#15171a] placeholder-[#677484]/70 focus:outline-none"
      />
    </div>
  );
}

export default function CustomerFilterSidebar({
  state,
  warehousesList,
  onChange,
  isCollapsed = false,
  onToggleCollapse,
}: CustomerFilterSidebarProps) {
  return (
    <aside
      className={`relative ${
        isCollapsed ? 'w-0 border-r-0' : 'w-60 border-r border-slate-200'
      } h-full min-h-0 bg-white flex flex-col shrink-0 transition-all duration-200 text-[13px] text-[#15171a] select-none font-sans`}
    >
      {onToggleCollapse && (
        <button
          type="button"
          onClick={onToggleCollapse}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white border border-[#0070f4] text-[#0070f4] hover:bg-[#e6f1fe] shadow-xs flex items-center justify-center cursor-pointer z-30 transition"
          title={isCollapsed ? 'Mở rộng bộ lọc' : 'Thu gọn bộ lọc'}
        >
          {isCollapsed ? <ChevronRight size={13} className="stroke-[2.5]" /> : <ChevronLeft size={13} className="stroke-[2.5]" />}
        </button>
      )}

      {!isCollapsed && (
        <div className="flex-1 min-h-0 p-3.5 space-y-4 overflow-y-auto">
          {/* 1. Chi nhánh tạo */}
          <div>
            <label className={labelCls}>Chi nhánh tạo</label>
            <div className="relative">
              <select
                value={state.createdWarehouseId === 'ALL' ? 'ALL' : String(state.createdWarehouseId)}
                onChange={(e) =>
                  onChange({ createdWarehouseId: e.target.value === 'ALL' ? 'ALL' : Number(e.target.value) })
                }
                className="w-full h-8 pl-2.5 pr-7 bg-white rounded-[8px] border border-slate-300 text-[12px] text-[#15171a] focus:outline-none focus:border-[#0070f4] cursor-pointer appearance-none truncate"
              >
                <option value="ALL">Tất cả chi nhánh</option>
                {warehousesList.map((wh) => (
                  <option key={wh.warehouseId} value={wh.warehouseId}>
                    {wh.name} ({wh.code})
                  </option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#677484] pointer-events-none" />
            </div>
          </div>

          {/* 2. Ngày tạo */}
          <TimeRangeFilter
            allowAllTime
            label="Ngày tạo"
            value={{ timeRange: state.createdTimeRange, dateFrom: state.createdFrom, dateTo: state.createdTo }}
            onChange={(r) => onChange({ createdTimeRange: r.timeRange, createdFrom: r.dateFrom, createdTo: r.dateTo })}
          />

          {/* 3. Giới tính */}
          <div>
            <label className={labelCls}>Giới tính</label>
            <Chips options={GENDER_OPTIONS} value={state.gender} onSelect={(gender) => onChange({ gender })} />
          </div>

          {/* 4. Tổng bán: giá trị + thời gian tính */}
          <div>
            <label className={labelCls}>Tổng bán</label>
            <span className={subLabelCls}>Giá trị</span>
            <div className="space-y-1.5">
              <AmountInput prefix="Từ" value={state.minSales} onCommit={(minSales) => onChange({ minSales })} />
              <AmountInput prefix="Tới" value={state.maxSales} onCommit={(maxSales) => onChange({ maxSales })} />
            </div>
            <div className="mt-2.5">
              <TimeRangeFilter
                allowAllTime
                label="Thời gian"
                value={{ timeRange: state.salesTimeRange, dateFrom: state.salesFrom, dateTo: state.salesTo }}
                onChange={(r) => onChange({ salesTimeRange: r.timeRange, salesFrom: r.dateFrom, salesTo: r.dateTo })}
              />
            </div>
          </div>

          {/* 5. Nợ hiện tại */}
          <div>
            <label className={labelCls}>Nợ hiện tại</label>
            <div className="space-y-1.5">
              <AmountInput prefix="Từ" value={state.minDebt} onCommit={(minDebt) => onChange({ minDebt })} />
              <AmountInput prefix="Tới" value={state.maxDebt} onCommit={(maxDebt) => onChange({ maxDebt })} />
            </div>
          </div>

          {/* 6. Trạng thái */}
          <div>
            <label className={`${labelCls} flex items-center gap-1`}>
              <span>Trạng thái</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#0070f4]" />
            </label>
            <Chips options={STATUS_OPTIONS} value={state.status} onSelect={(status) => onChange({ status })} />
          </div>
        </div>
      )}
    </aside>
  );
}
