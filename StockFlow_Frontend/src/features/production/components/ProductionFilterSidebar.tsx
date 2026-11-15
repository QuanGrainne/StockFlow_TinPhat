'use client';

// Bộ lọc bên trái của các màn Sản xuất (cùng bố cục với bộ lọc Nhập hàng / Kiểm kho):
// trạng thái (tuỳ màn), chi nhánh (tuỳ màn), thời gian theo mốc có sẵn hoặc tự chọn, ô "cần xem xét".

import React from 'react';
import type { WarehouseItem } from '@/lib/warehouse/useActiveWarehouse';
import { getDateRangeForPreset } from '@/lib/utils/date';
import type { ProductionListFilter } from '../types';

const TIME_PRESETS: { key: string; label: string }[] = [
  { key: 'today', label: 'Hôm nay' },
  { key: 'yesterday', label: 'Hôm qua' },
  { key: 'this_week', label: 'Tuần này' },
  { key: 'last_7_days', label: '7 ngày qua' },
  { key: 'this_month', label: 'Tháng này' },
  { key: 'last_month', label: 'Tháng trước' },
  { key: 'last_30_days', label: '30 ngày qua' },
  { key: 'this_year', label: 'Năm nay' },
  { key: 'all', label: 'Toàn thời gian' },
];

interface ProductionFilterSidebarProps {
  state: ProductionListFilter;
  onChange: (patch: Partial<ProductionListFilter>) => void;
  isCollapsed?: boolean;
  /** Danh sách trạng thái; không truyền thì ẩn mục Trạng thái */
  statusOptions?: { value: string; label: string }[];
  /** Danh sách kho được phân quyền; không truyền thì ẩn mục Chi nhánh */
  warehouses?: WarehouseItem[];
  timeLabel?: string;
  /** Nhãn ô lọc "cần xem xét"; không truyền thì ẩn */
  reviewLabel?: string;
}

const sectionTitle = 'text-[11px] font-bold text-[#677484] mb-2 uppercase tracking-wide';
const checkCls = 'w-4 h-4 rounded border-slate-300 text-[#0070f4] focus:ring-[#0070f4] cursor-pointer';

export function ProductionFilterSidebar({
  state,
  onChange,
  isCollapsed,
  statusOptions,
  warehouses,
  timeLabel = 'Thời gian',
  reviewLabel,
}: ProductionFilterSidebarProps) {
  const toggleStatus = (value: string) =>
    onChange({
      statuses: state.statuses.includes(value) ? state.statuses.filter((s) => s !== value) : [...state.statuses, value],
    });

  const toggleWarehouse = (id: number) =>
    onChange({
      warehouseIds: state.warehouseIds.includes(id) ? state.warehouseIds.filter((w) => w !== id) : [...state.warehouseIds, id],
    });

  const selectPreset = (key: string) => {
    if (key === 'all') {
      onChange({ timeRange: 'all', dateFrom: undefined, dateTo: undefined });
      return;
    }
    const range = getDateRangeForPreset(key);
    onChange({ timeRange: key, dateFrom: range.from, dateTo: range.to });
  };

  return (
    <aside
      className={`relative ${
        isCollapsed ? 'w-0 border-r-0' : 'w-60 border-r border-slate-200'
      } h-full min-h-0 bg-white/75 backdrop-blur-[2px] flex flex-col shrink-0 transition-all duration-200 text-[13px] text-[#15171a] select-none font-sans`}
    >
      {!isCollapsed && (
        <div className="flex-1 min-h-0 p-3.5 space-y-4 overflow-y-auto">
          {warehouses && (
            <>
              <div>
                <div className={sectionTitle}>Chi nhánh</div>
                <div className="space-y-2">
                  {warehouses.map((w) => (
                    <label key={w.warehouseId} className="flex items-center gap-2 text-xs hover:text-[#0070f4] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={state.warehouseIds.includes(w.warehouseId)}
                        onChange={() => toggleWarehouse(w.warehouseId)}
                        className={checkCls}
                      />
                      <span className="truncate" title={w.name}>
                        {w.name}
                      </span>
                    </label>
                  ))}
                  {warehouses.length === 0 && <div className="text-xs text-slate-400">Chưa được phân quyền kho nào</div>}
                </div>
                <p className="mt-1.5 text-[11px] text-slate-400">Không chọn = mọi kho được phân quyền</p>
              </div>
              <div className="border-t border-slate-100" />
            </>
          )}

          {statusOptions && (
            <>
              <div>
                <div className={sectionTitle}>Trạng thái</div>
                <div className="space-y-2">
                  {statusOptions.map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 text-xs hover:text-[#0070f4] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={state.statuses.includes(opt.value)}
                        onChange={() => toggleStatus(opt.value)}
                        className={checkCls}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="border-t border-slate-100" />
            </>
          )}

          <div>
            <div className={sectionTitle}>{timeLabel}</div>
            <select
              value={state.timeRange === 'custom' ? 'custom' : state.timeRange}
              onChange={(e) => (e.target.value === 'custom' ? onChange({ timeRange: 'custom' }) : selectPreset(e.target.value))}
              className="w-full h-8 px-2 text-xs border border-slate-300 rounded-[8px] bg-white focus:outline-none focus:border-[#0070f4] cursor-pointer"
            >
              {TIME_PRESETS.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
              <option value="custom">Tùy chỉnh</option>
            </select>
            {state.timeRange === 'custom' && (
              <div className="mt-2 grid grid-cols-1 gap-1.5">
                <input
                  type="date"
                  value={state.dateFrom ?? ''}
                  max={state.dateTo}
                  onChange={(e) => {
                    const newFrom = e.target.value || undefined;
                    onChange({
                      dateFrom: newFrom,
                      ...(newFrom && state.dateTo && newFrom > state.dateTo ? { dateTo: newFrom } : {}),
                    });
                  }}
                  className="h-8 px-2 text-xs border border-slate-300 rounded-[8px] focus:outline-none focus:border-[#0070f4]"
                  title="Từ ngày"
                />
                <input
                  type="date"
                  value={state.dateTo ?? ''}
                  min={state.dateFrom}
                  onChange={(e) => onChange({ dateTo: e.target.value || undefined })}
                  className="h-8 px-2 text-xs border border-slate-300 rounded-[8px] focus:outline-none focus:border-[#0070f4]"
                  title="Đến ngày"
                />
              </div>
            )}
          </div>

          {reviewLabel && (
            <>
              <div className="border-t border-slate-100" />
              <label className="flex items-center gap-2 text-xs hover:text-[#0070f4] cursor-pointer">
                <input
                  type="checkbox"
                  checked={state.needsReviewOnly}
                  onChange={(e) => onChange({ needsReviewOnly: e.target.checked })}
                  className={checkCls}
                />
                <span>{reviewLabel}</span>
              </label>
            </>
          )}
        </div>
      )}
    </aside>
  );
}

/** Nút thu gọn / mở rộng bộ lọc (giống màn Kiểm kho) */
export function SidebarToggle({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white border border-[#0070f4] text-[#0070f4] hover:bg-[#e6f1fe] shadow-xs flex items-center justify-center cursor-pointer z-30 text-[11px]"
      title={collapsed ? 'Mở rộng bộ lọc' : 'Thu gọn bộ lọc'}
    >
      {collapsed ? '›' : '‹'}
    </button>
  );
}

/** Giá trị mặc định bộ lọc: tháng này */
export function defaultProductionFilter(statuses: string[]): ProductionListFilter {
  const range = getDateRangeForPreset('this_month');
  return { statuses, timeRange: 'this_month', dateFrom: range.from, dateTo: range.to, warehouseIds: [], needsReviewOnly: false };
}
