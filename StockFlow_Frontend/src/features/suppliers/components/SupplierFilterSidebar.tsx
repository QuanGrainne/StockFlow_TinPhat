// Sidebar bộ lọc Nhà cung cấp — cùng giao diện với TransferFilterSidebar (màn hình Chuyển hàng):
// rộng 240px, nhãn chữ hoa 11px, nút thu gọn tròn ở mép phải.
// Gồm: Chi nhánh nhập, Thời gian (phát sinh nhập hàng), Trạng thái (chip).

import React from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { SupplierFilterState } from '@/features/suppliers/types';
import TimeRangeFilter from '@/components/filters/TimeRangeFilter';

interface SupplierFilterSidebarProps {
  state: SupplierFilterState;
  warehousesList?: { warehouseId: number; code: string; name: string }[];
  onChange: (patch: Partial<SupplierFilterState>) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const STATUS_OPTIONS: { label: string; value: SupplierFilterState['status'] }[] = [
  { label: 'Tất cả', value: 'ALL' },
  { label: 'Đang hoạt động', value: 'ACTIVE' },
  { label: 'Ngừng hoạt động', value: 'INACTIVE' },
];

const labelCls = 'block text-[11px] font-bold text-[#677484] mb-1.5 uppercase tracking-wide';

export default function SupplierFilterSidebar({
  state,
  warehousesList,
  onChange,
  isCollapsed = false,
  onToggleCollapse,
}: SupplierFilterSidebarProps) {
  const warehouses = warehousesList ?? [];

  return (
    <aside
      className={`relative ${
        isCollapsed ? 'w-0 border-r-0' : 'w-60 border-r border-slate-200'
      } h-full min-h-0 bg-white/75 backdrop-blur-[2px] flex flex-col shrink-0 transition-all duration-200 text-[13px] text-[#15171a] select-none font-sans`}
    >
      {/* Nút thu gọn / mở rộng bộ lọc */}
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
          {/* 1. Chi nhánh nhập hàng */}
          <div>
            <label className={labelCls}>Chi nhánh nhập</label>
            <div className="relative">
              <select
                value={state.warehouseId === 'ALL' ? 'ALL' : String(state.warehouseId)}
                onChange={(e) =>
                  onChange({ warehouseId: e.target.value === 'ALL' ? 'ALL' : Number(e.target.value) })
                }
                className="w-full h-8 pl-2.5 pr-7 bg-white rounded-[8px] border border-slate-300 text-[12px] text-[#15171a] focus:outline-none focus:border-[#0070f4] cursor-pointer appearance-none truncate"
              >
                <option value="ALL">Tất cả chi nhánh</option>
                {warehouses.map((wh) => (
                  <option key={wh.warehouseId} value={wh.warehouseId}>
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

          {/* 2. Thời gian phát sinh nhập hàng — giống bộ lọc Thời gian bên Chuyển hàng */}
          <TimeRangeFilter
            allowAllTime
            value={{ timeRange: state.timeRange, dateFrom: state.dateFrom, dateTo: state.dateTo }}
            onChange={(range) => onChange(range)}
          />

          {/* 3. Trạng thái (chip) */}
          <div>
            <label className={`${labelCls} flex items-center gap-1`}>
              <span>Trạng thái</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#0070f4]" />
            </label>
            <div className="flex flex-wrap items-center gap-1.5">
              {STATUS_OPTIONS.map((opt) => {
                const selected = state.status === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onChange({ status: opt.value })}
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
          </div>
        </div>
      )}
    </aside>
  );
}
