import React from 'react';
import { RotateCcw, Building2, Wallet, Activity, MapPin, Warehouse } from 'lucide-react';
import { SupplierFilterState } from '@/features/suppliers/types';

interface SupplierFilterSidebarProps {
  state: SupplierFilterState;
  selectedLocation: string;
  warehousesList?: { warehouseId: number; code: string; name: string }[];
  onChange: (patch: Partial<SupplierFilterState>) => void;
  onLocationChange: (loc: string) => void;
  onResetFilters: () => void;
  isCollapsed?: boolean;
}

const DEBT_OPTIONS: { label: string; value: SupplierFilterState['debtStatus'] }[] = [
  { label: 'Tất cả tình trạng nợ', value: 'ALL' },
  { label: 'Còn nợ cần trả (> 0 đ)', value: 'HAS_DEBT' },
  { label: 'Đã thanh toán hết (= 0 đ)', value: 'NO_DEBT' },
];

const STATUS_OPTIONS: { label: string; value: SupplierFilterState['status'] }[] = [
  { label: 'Tất cả trạng thái', value: 'ALL' },
  { label: 'Đang giao dịch', value: 'ACTIVE' },
  { label: 'Ngừng giao dịch', value: 'INACTIVE' },
];

const DEFAULT_WAREHOUSES = [
  { warehouseId: 3, code: 'K001', name: 'Kho Tổng Gia Lâm' },
  { warehouseId: 4, code: 'K002', name: 'Kho Đông Anh' },
  { warehouseId: 5, code: 'K003', name: 'Kho Hà Đông' },
  { warehouseId: 6, code: 'K004', name: 'Kho Hoàn Kiếm' },
];

const LOCATION_OPTIONS: { label: string; value: string }[] = [
  { label: 'Tất cả khu vực', value: 'ALL' },
  { label: 'Hà Nội', value: 'Hà Nội' },
  { label: 'Bắc Ninh', value: 'Bắc Ninh' },
  { label: 'Yên Bái', value: 'Yên Bái' },
  { label: 'Nhập khẩu / Quốc tế', value: 'Đài Loan' },
];

export default function SupplierFilterSidebar({
  state,
  selectedLocation,
  warehousesList,
  onChange,
  onLocationChange,
  onResetFilters,
  isCollapsed = false,
}: SupplierFilterSidebarProps) {
  const hasActiveFilter =
    state.debtStatus !== 'ALL' ||
    state.status !== 'ALL' ||
    state.warehouseId !== 'ALL' ||
    selectedLocation !== 'ALL' ||
    state.search !== '';

  return (
    <aside
      className={`relative shrink-0 bg-white border-r border-[#e5e7eb] select-none text-[#262626] transition-all duration-300 ${
        isCollapsed ? 'w-0 overflow-hidden px-0 py-0' : 'w-[260px] h-full overflow-y-auto px-4 py-5'
      }`}
    >
      {/* Title & Reset Button */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[18px] font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Building2 size={20} className="text-[#0071BA]" />
          <span>Nhà cung cấp</span>
        </h2>
        {hasActiveFilter && (
          <button
            type="button"
            onClick={onResetFilters}
            className="text-xs text-[#0071BA] hover:text-[#005f9d] font-medium flex items-center gap-1 hover:underline cursor-pointer"
            title="Xóa toàn bộ bộ lọc"
          >
            <RotateCcw size={12} />
            <span>Xóa lọc</span>
          </button>
        )}
      </div>

      <div className="space-y-6">
        {/* ── 1. Tình trạng công nợ ── */}
        <div>
          <div className="text-[13px] font-semibold text-slate-800 mb-2.5 flex items-center gap-1.5">
            <Wallet size={15} className="text-slate-500" />
            <span>Tình trạng công nợ</span>
          </div>
          <div className="space-y-2">
            {DEBT_OPTIONS.map((opt) => {
              const checked = state.debtStatus === opt.value;
              return (
                <label
                  key={opt.value}
                  className="flex items-center gap-2.5 cursor-pointer group text-sm text-slate-700 hover:text-slate-900"
                >
                  <input
                    type="radio"
                    name="debtStatusFilter"
                    checked={checked}
                    onChange={() => onChange({ debtStatus: opt.value })}
                    className="accent-[#0071BA] h-4 w-4 cursor-pointer"
                  />
                  <span className={checked ? 'font-medium text-[#0071BA]' : ''}>{opt.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* ── 2. Trạng thái hoạt động ── */}
        <div>
          <div className="text-[13px] font-semibold text-slate-800 mb-2.5 flex items-center gap-1.5">
            <Activity size={15} className="text-slate-500" />
            <span>Trạng thái hoạt động</span>
          </div>
          <div className="space-y-2">
            {STATUS_OPTIONS.map((opt) => {
              const checked = state.status === opt.value;
              return (
                <label
                  key={opt.value}
                  className="flex items-center gap-2.5 cursor-pointer group text-sm text-slate-700 hover:text-slate-900"
                >
                  <input
                    type="radio"
                    name="statusFilter"
                    checked={checked}
                    onChange={() => onChange({ status: opt.value })}
                    className="accent-[#0071BA] h-4 w-4 cursor-pointer"
                  />
                  <span className={checked ? 'font-medium text-[#0071BA]' : ''}>{opt.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* ── 3. Chi nhánh / Kho nhập hàng ── */}
        <div>
          <div className="text-[13px] font-semibold text-slate-800 mb-2.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Warehouse size={15} className="text-slate-500" />
              <span>Kho / Chi nhánh nhận</span>
            </span>
            {state.warehouseId !== 'ALL' && (
              <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                Đang lọc
              </span>
            )}
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2.5 cursor-pointer group text-sm text-slate-700 hover:text-slate-900">
              <input
                type="radio"
                name="warehouseFilter"
                checked={state.warehouseId === 'ALL'}
                onChange={() => onChange({ warehouseId: 'ALL' })}
                className="accent-[#0071BA] h-4 w-4 cursor-pointer"
              />
              <span className={state.warehouseId === 'ALL' ? 'font-medium text-[#0071BA]' : ''}>
                Tất cả chi nhánh (Toàn công ty)
              </span>
            </label>
            {(warehousesList && warehousesList.length > 0 ? warehousesList : DEFAULT_WAREHOUSES).map((wh) => {
              const checked = state.warehouseId === wh.warehouseId;
              return (
                <label
                  key={wh.warehouseId}
                  className="flex items-center gap-2.5 cursor-pointer group text-sm text-slate-700 hover:text-slate-900"
                >
                  <input
                    type="radio"
                    name="warehouseFilter"
                    checked={checked}
                    onChange={() => onChange({ warehouseId: wh.warehouseId })}
                    className="accent-[#0071BA] h-4 w-4 cursor-pointer"
                  />
                  <div className="flex items-center justify-between flex-1">
                    <span className={checked ? 'font-medium text-[#0071BA]' : ''}>{wh.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1 rounded">{wh.code}</span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* ── 4. Khu vực / Địa bàn ── */}
        <div>
          <div className="text-[13px] font-semibold text-slate-800 mb-2.5 flex items-center gap-1.5">
            <MapPin size={15} className="text-slate-500" />
            <span>Khu vực / Tỉnh thành</span>
          </div>
          <div className="space-y-2">
            {LOCATION_OPTIONS.map((opt) => {
              const checked = selectedLocation === opt.value;
              return (
                <label
                  key={opt.value}
                  className="flex items-center gap-2.5 cursor-pointer group text-sm text-slate-700 hover:text-slate-900"
                >
                  <input
                    type="radio"
                    name="locationFilter"
                    checked={checked}
                    onChange={() => onLocationChange(opt.value)}
                    className="accent-[#0071BA] h-4 w-4 cursor-pointer"
                  />
                  <span className={checked ? 'font-medium text-[#0071BA]' : ''}>{opt.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}
