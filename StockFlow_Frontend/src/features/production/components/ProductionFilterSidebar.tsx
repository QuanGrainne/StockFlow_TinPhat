'use client';

// Bộ lọc bên trái của các màn Sản xuất (cùng bố cục với bộ lọc Nhập hàng / Kiểm kho):
// trạng thái (tuỳ màn), chi nhánh (tuỳ màn), thời gian dùng chung TimeRangeFilter như các màn khác
// ([◉ Tháng này >] chọn nhanh / [○ Tùy chỉnh 📅] chọn khoảng ngày), ô "cần xem xét".

import React from 'react';
import type { WarehouseItem } from '@/lib/warehouse/useActiveWarehouse';
import { getDateRangeForPreset } from '@/lib/utils/date';
import TimeRangeFilter, { ALL_TIME_PRESET } from '@/components/filters/TimeRangeFilter';
import WarehouseMultiSelect from '@/components/filters/WarehouseMultiSelect';
import type { ProductionListFilter } from '../types';

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

  // Màn Sản xuất dùng 'all' + ngày undefined cho "Toàn thời gian"; TimeRangeFilter dùng 'all_time' + chuỗi rỗng
  const timeValue = {
    timeRange: state.timeRange === 'all' ? ALL_TIME_PRESET.key : state.timeRange,
    dateFrom: state.dateFrom ?? '',
    dateTo: state.dateTo ?? '',
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
              {/* Cùng ô chọn chi nhánh với màn Nhập hàng: thẻ chọn nhiều + danh sách thả xuống, [] = Tất cả */}
              {warehouses.length === 0 ? (
                <div>
                  <div className={sectionTitle}>Chi nhánh</div>
                  <div className="text-xs text-slate-400">Chưa được phân quyền kho nào</div>
                </div>
              ) : (
                <WarehouseMultiSelect
                  value={state.warehouseIds}
                  warehouses={warehouses}
                  onChange={(warehouseIds) => onChange({ warehouseIds })}
                />
              )}
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

          <TimeRangeFilter
            allowAllTime
            label={timeLabel}
            value={timeValue}
            onChange={(r) =>
              onChange(
                r.timeRange === ALL_TIME_PRESET.key
                  ? { timeRange: 'all', dateFrom: undefined, dateTo: undefined }
                  : { timeRange: r.timeRange, dateFrom: r.dateFrom || undefined, dateTo: r.dateTo || undefined }
              )
            }
          />

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

/**
 * Bộ lọc khi mở màn từ link mã chứng từ (?code=&id=&date=): hiện mọi trạng thái được truyền vào,
 * lọc đúng ngày của chứng từ nếu link có ngày, không có thì toàn thời gian.
 */
export function linkProductionFilter(statuses: string[], date: string | null): ProductionListFilter {
  return date
    ? { statuses, timeRange: 'custom', dateFrom: date, dateTo: date, warehouseIds: [], needsReviewOnly: false }
    : { statuses, timeRange: 'all', dateFrom: undefined, dateTo: undefined, warehouseIds: [], needsReviewOnly: false };
}

/** Giá trị mặc định bộ lọc: tháng này */
export function defaultProductionFilter(statuses: string[]): ProductionListFilter {
  const range = getDateRangeForPreset('this_month');
  return { statuses, timeRange: 'this_month', dateFrom: range.from, dateTo: range.to, warehouseIds: [], needsReviewOnly: false };
}
