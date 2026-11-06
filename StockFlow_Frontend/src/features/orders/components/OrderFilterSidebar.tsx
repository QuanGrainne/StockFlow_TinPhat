'use client';

// Sidebar bộ lọc Hóa đơn — cùng giao diện với SupplierFilterSidebar / CustomerFilterSidebar:
// Chi nhánh, Thời gian, Trạng thái, Trạng thái trả hàng, Phương thức thanh toán, Bảng giá.

import React from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import TimeRangeFilter from '@/components/filters/TimeRangeFilter';
import WarehouseMultiSelect from '@/components/filters/WarehouseMultiSelect';
import { PAYMENT_METHOD_OPTIONS } from '../utils/invoiceUtils';

export interface OrderSidebarState {
  /** [] = tất cả chi nhánh */
  warehouseIds: number[];
  timeRange: string;
  dateFrom: string;
  dateTo: string;
  statusCompleted: boolean;
  statusCancelled: boolean;
  noReturn: boolean;
  hasReturn: boolean;
  /** '' = tất cả */
  paymentMethod: string;
  /** '' = tất cả */
  priceBookName: string;
}

interface OrderFilterSidebarProps {
  state: OrderSidebarState;
  warehouses: { warehouseId: number; code: string; name: string }[];
  priceBooks: string[];
  /** Kho làm việc: gỡ thẻ "Tất cả" thì quay về kho này */
  fallbackWarehouseId?: number;
  onChange: (patch: Partial<OrderSidebarState>) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const labelCls = 'block text-[11px] font-bold text-[#677484] mb-1.5 uppercase tracking-wide';
const selectCls =
  'w-full h-8 pl-2.5 pr-7 bg-white rounded-[8px] border border-slate-300 text-[12px] text-[#15171a] focus:outline-none focus:border-[#0070f4] cursor-pointer appearance-none truncate';

function Check({ checked, label, onChange }: { checked: boolean; label: string; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 py-1 text-[13px] cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded text-[#0070f4] focus:ring-[#0070f4] h-3.5 w-3.5 border-slate-300 cursor-pointer"
      />
      <span>{label}</span>
    </label>
  );
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)} className={selectCls}>
        {children}
      </select>
      <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#677484] pointer-events-none" />
    </div>
  );
}

export default function OrderFilterSidebar({
  state,
  warehouses,
  priceBooks,
  fallbackWarehouseId,
  onChange,
  isCollapsed = false,
  onToggleCollapse,
}: OrderFilterSidebarProps) {
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
            <label className={`${labelCls} flex items-center gap-1`}>
              <span>Trạng thái</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#0070f4]" />
            </label>
            <Check checked={state.statusCompleted} label="Hoàn thành" onChange={(statusCompleted) => onChange({ statusCompleted })} />
            <Check checked={state.statusCancelled} label="Đã hủy" onChange={(statusCancelled) => onChange({ statusCancelled })} />
          </div>

          <div>
            <label className={labelCls}>Trạng thái trả hàng</label>
            <Check checked={state.noReturn} label="Không trả hàng" onChange={(noReturn) => onChange({ noReturn })} />
            <Check checked={state.hasReturn} label="Có trả hàng" onChange={(hasReturn) => onChange({ hasReturn })} />
          </div>

          <div>
            <label className={labelCls}>Phương thức thanh toán</label>
            <Select value={state.paymentMethod} onChange={(paymentMethod) => onChange({ paymentMethod })}>
              <option value="">Tất cả phương thức</option>
              {PAYMENT_METHOD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className={labelCls}>Bảng giá</label>
            <Select value={state.priceBookName} onChange={(priceBookName) => onChange({ priceBookName })}>
              <option value="">Tất cả bảng giá</option>
              {priceBooks.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </div>
        </div>
      )}
    </aside>
  );
}
