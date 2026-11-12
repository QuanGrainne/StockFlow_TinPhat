'use client';

// Sidebar bộ lọc Đặt hàng nhập — cùng giao diện với màn Nhập hàng / Hóa đơn:
// Chi nhánh, Thời gian, Trạng thái, Nhà cung cấp.

import React from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import TimeRangeFilter from '@/components/filters/TimeRangeFilter';
import WarehouseMultiSelect from '@/components/filters/WarehouseMultiSelect';
import type { PurchaseOrderStatus } from '../types';
import { PO_STATUS, PO_STATUS_OPTIONS } from '../utils/purchaseOrderUtils';

export interface PurchaseOrderSidebarState {
  /** [] = tất cả chi nhánh */
  warehouseIds: number[];
  timeRange: string;
  dateFrom: string;
  dateTo: string;
  statuses: PurchaseOrderStatus[];
  /** 0 = tất cả nhà cung cấp */
  partnerId: number;
}

interface PurchaseOrderFilterSidebarProps {
  state: PurchaseOrderSidebarState;
  warehouses: { warehouseId: number; code: string; name: string }[];
  suppliers: { id: string; code: string; name: string }[];
  fallbackWarehouseId?: number;
  onChange: (patch: Partial<PurchaseOrderSidebarState>) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const labelCls = 'block text-[11px] font-bold text-[#677484] mb-1.5 uppercase tracking-wide';

export default function PurchaseOrderFilterSidebar({
  state,
  warehouses,
  suppliers,
  fallbackWarehouseId,
  onChange,
  isCollapsed = false,
  onToggleCollapse,
}: PurchaseOrderFilterSidebarProps) {
  const toggleStatus = (s: PurchaseOrderStatus, on: boolean) =>
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
            {PO_STATUS_OPTIONS.map((s) => (
              <label key={s} className="flex items-center gap-2 py-1 text-[13px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={state.statuses.includes(s)}
                  onChange={(e) => toggleStatus(s, e.target.checked)}
                  className="rounded text-[#0070f4] focus:ring-[#0070f4] h-3.5 w-3.5 border-slate-300 cursor-pointer"
                />
                <span>{PO_STATUS[s].label}</span>
              </label>
            ))}
          </div>

          <div>
            <label className={labelCls}>Nhà cung cấp</label>
            <div className="relative">
              <select
                value={state.partnerId}
                onChange={(e) => onChange({ partnerId: Number(e.target.value) })}
                className="w-full h-8 pl-2.5 pr-7 bg-white rounded-[8px] border border-slate-300 text-[12px] text-[#15171a] focus:outline-none focus:border-[#0070f4] cursor-pointer appearance-none truncate"
              >
                <option value={0}>Tất cả nhà cung cấp</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#677484] pointer-events-none" />
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
