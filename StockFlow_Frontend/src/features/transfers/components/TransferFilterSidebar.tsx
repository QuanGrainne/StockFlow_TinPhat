// src/features/transfers/components/TransferFilterSidebar.tsx
// Sidebar bộ lọc chuẩn giao diện KiotViet cho Màn hình 1 (Danh sách chuyển hàng)

import React from 'react';
import { WarehouseFacility } from '@/features/roles/types';
import { TransferFilterState, TransferStatus } from '../types';
import { ChevronDown, Calendar, X, ChevronRight } from 'lucide-react';

interface Props {
  filters: TransferFilterState;
  onChange: (updated: Partial<TransferFilterState>) => void;
  warehouses: WarehouseFacility[];
}

export const TransferFilterSidebar: React.FC<Props> = ({
  filters,
  onChange,
  warehouses,
}) => {
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

  return (
    <aside className="w-60 bg-white border-r border-slate-200/90 flex flex-col shrink-0 text-xs text-slate-700 select-none">
      <div className="p-3.5 space-y-4 overflow-y-auto">
        {/* 1. Chuyển đi (Từ chi nhánh) */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
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
              className="w-full h-8 pl-2.5 pr-7 bg-white rounded border border-slate-300 text-xs text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer appearance-none truncate"
            >
              <option value="ALL">Tất cả chi nhánh</option>
              {warehouses.map((wh) => (
                <option key={wh.id || wh.code} value={wh.warehouseId || wh.code}>
                  {wh.name} ({wh.code})
                </option>
              ))}
            </select>
            <ChevronDown
              size={13}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
          </div>
        </div>

        {/* 2. Nhận về (Tới chi nhánh) */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
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
              className="w-full h-8 pl-2.5 pr-7 bg-white rounded border border-slate-300 text-xs text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer appearance-none truncate"
            >
              <option value="ALL">Tất cả chi nhánh</option>
              {warehouses.map((wh) => (
                <option key={wh.id || wh.code} value={wh.warehouseId || wh.code}>
                  {wh.name} ({wh.code})
                </option>
              ))}
            </select>
            <ChevronDown
              size={13}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
          </div>
        </div>

        {/* 3. Trạng thái (Multi-select tags) */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
            Trạng thái
          </label>
          {/* Active Tags Box (theo đúng ảnh 1 KiotViet) */}
          <div className="p-1.5 min-h-[58px] rounded border border-slate-300 bg-white flex flex-wrap gap-1">
            {filters.statuses.map((st) => {
              const opt = statusOptions.find((o) => o.key === st);
              return (
                <span
                  key={st}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#1e88e5] text-white text-[11px] font-medium shadow-2xs"
                >
                  <span>{opt?.label || st}</span>
                  <button
                    type="button"
                    onClick={(e) => handleRemoveStatus(st, e)}
                    className="hover:bg-blue-700/60 rounded-full p-0.5 transition cursor-pointer"
                  >
                    <X size={10} />
                  </button>
                </span>
              );
            })}
          </div>

          {/* Quick select list of available statuses not yet selected */}
          <div className="mt-1.5 flex flex-wrap gap-1">
            {statusOptions
              .filter((opt) => !filters.statuses.includes(opt.key))
              .map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => handleToggleStatus(opt.key)}
                  className="text-[10px] px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition cursor-pointer"
                >
                  + {opt.label}
                </button>
              ))}
          </div>
        </div>

        {/* 4. Thời gian */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
            Thời gian
          </label>

          <div className="space-y-2">
            {/* Checkboxes: Ngày chuyển / Ngày nhận */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={filters.dateType === 'transfer'}
                  onChange={() => onChange({ dateType: 'transfer' })}
                  className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 border-slate-300"
                />
                <span className="text-xs text-slate-700">Ngày chuyển</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={filters.dateType === 'received'}
                  onChange={() => onChange({ dateType: 'received' })}
                  className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 border-slate-300"
                />
                <span className="text-xs text-slate-700">Ngày nhận</span>
              </label>
            </div>

            {/* Radio options: Tháng này / Tùy chỉnh */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <label className="flex items-center justify-between p-1.5 rounded hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="timeRange"
                    checked={filters.timeRange === 'this_month'}
                    onChange={() =>
                      onChange({
                        timeRange: 'this_month',
                        dateFrom: undefined,
                        dateTo: undefined,
                      })
                    }
                    className="text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 border-slate-300"
                  />
                  <span className="text-xs font-medium text-slate-700">Tháng này</span>
                </div>
                <ChevronRight size={14} className="text-slate-400" />
              </label>

              <label className="flex items-center justify-between p-1.5 rounded hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="timeRange"
                    checked={filters.timeRange === 'custom'}
                    onChange={() => onChange({ timeRange: 'custom' })}
                    className="text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 border-slate-300"
                  />
                  <span className="text-xs font-medium text-slate-700">Tùy chỉnh</span>
                </div>
                <Calendar size={14} className="text-slate-400" />
              </label>

              {filters.timeRange === 'custom' && (
                <div className="space-y-1.5 pl-5 pt-1">
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-0.5">Từ ngày:</span>
                    <input
                      type="date"
                      value={filters.dateFrom || ''}
                      onChange={(e) => onChange({ dateFrom: e.target.value })}
                      className="w-full h-7 px-2 border border-slate-300 rounded text-[11px] bg-slate-50 focus:bg-white"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-0.5">Đến ngày:</span>
                    <input
                      type="date"
                      value={filters.dateTo || ''}
                      onChange={(e) => onChange({ dateTo: e.target.value })}
                      className="w-full h-7 px-2 border border-slate-300 rounded text-[11px] bg-slate-50 focus:bg-white"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 5. Tình trạng nhận hàng (Tất cả / Khớp / Không khớp theo Quy tắc 1) */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
            Tình trạng nhận hàng
          </label>
          <div className="space-y-1.5">
            {[
              { key: 'ALL', label: 'Tất cả' },
              { key: 'MATCHED', label: 'Khớp' },
              { key: 'UNMATCHED', label: 'Không khớp' },
            ].map((opt) => (
              <label
                key={opt.key}
                className="flex items-center gap-2 cursor-pointer select-none py-0.5"
              >
                <input
                  type="radio"
                  name="matchStatus"
                  checked={(filters.matchStatus || 'ALL') === opt.key}
                  onChange={() =>
                    onChange({
                      matchStatus: opt.key as 'ALL' | 'MATCHED' | 'UNMATCHED',
                    })
                  }
                  className="text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 border-slate-300"
                />
                <span className="text-xs text-slate-700">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};
