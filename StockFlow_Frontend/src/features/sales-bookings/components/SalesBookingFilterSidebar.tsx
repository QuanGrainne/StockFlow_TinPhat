'use client';

// Sidebar bộ lọc Đặt hàng — cùng giao diện với Đặt hàng nhập / Hóa đơn: Chi nhánh xử lý, Thời gian, Trạng thái.

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import TimeRangeFilter from '@/components/filters/TimeRangeFilter';
import WarehouseMultiSelect from '@/components/filters/WarehouseMultiSelect';
import type { SalesBookingStatus } from '../types';
import { BOOKING_STATUS, BOOKING_STATUS_OPTIONS } from '../utils/salesBookingUtils';

export interface SalesBookingSidebarState {
  /** [] = tất cả chi nhánh */
  warehouseIds: number[];
  timeRange: string;
  dateFrom: string;
  dateTo: string;
  statuses: SalesBookingStatus[];
}

interface Props {
  state: SalesBookingSidebarState;
  warehouses: { warehouseId: number; code: string; name: string }[];
  fallbackWarehouseId?: number;
  onChange: (patch: Partial<SalesBookingSidebarState>) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const labelCls = 'block text-[11px] font-bold text-[#677484] mb-1.5 uppercase tracking-wide';

export default function SalesBookingFilterSidebar({
  state,
  warehouses,
  fallbackWarehouseId,
  onChange,
  isCollapsed = false,
  onToggleCollapse,
}: Props) {
  const toggleStatus = (s: SalesBookingStatus, on: boolean) =>
    onChange({ statuses: on ? [...state.statuses, s] : state.statuses.filter((x) => x !== s) });

  return (
    <aside
      className={`relative ${
        isCollapsed ? 'w-0 border-r-0' : 'w-60 border-r border-slate-200'
      } h-full min-h-0 bg-white/75 backdrop-blur-[2px] flex flex-col shrink-0 transition-all duration-200 text-[13px] text-[#15171a] select-none font-sans`}
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
          <WarehouseMultiSelect
            value={state.warehouseIds}
            warehouses={warehouses}
            fallbackWarehouseId={fallbackWarehouseId}
            onChange={(warehouseIds) => onChange({ warehouseIds })}
          />

          <div className="border-t border-slate-100" />

          <TimeRangeFilter
            allowAllTime
            value={{ timeRange: state.timeRange, dateFrom: state.dateFrom, dateTo: state.dateTo }}
            onChange={(r) => onChange({ timeRange: r.timeRange, dateFrom: r.dateFrom, dateTo: r.dateTo })}
          />

          <div>
            <label className={labelCls}>Trạng thái</label>
            {BOOKING_STATUS_OPTIONS.map((s) => (
              <label key={s} className="flex items-center gap-2 py-1 text-[13px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={state.statuses.includes(s)}
                  onChange={(e) => toggleStatus(s, e.target.checked)}
                  className="rounded text-[#0070f4] focus:ring-[#0070f4] h-3.5 w-3.5 border-slate-300 cursor-pointer"
                />
                <span>{BOOKING_STATUS[s].label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
