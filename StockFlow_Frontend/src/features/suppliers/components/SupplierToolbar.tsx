'use client';

import React from 'react';
import {
  Search,
  Plus,
  FileSpreadsheet,
  RefreshCcw,
  ChevronRight,
  X,
  Filter,
} from 'lucide-react';

interface SupplierToolbarProps {
  search: string;
  onSearchChange: (search: string) => void;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onOpenMobileFilter: () => void;
  onOpenCreate: () => void;
  onExportExcel: () => void;
  onRefresh: () => void;
}

export default function SupplierToolbar({
  search,
  onSearchChange,
  sidebarCollapsed,
  onToggleSidebar,
  onOpenMobileFilter,
  onOpenCreate,
  onExportExcel,
  onRefresh,
}: SupplierToolbarProps) {
  return (
    <div className="border-b border-[#e5e7eb] bg-white px-6 py-3.5 shrink-0">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="flex items-center gap-2 flex-1 max-w-[480px]">
          {/* Desktop Toggle Button when collapsed */}
          {sidebarCollapsed && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="hidden lg:flex h-9 px-3 rounded-[6px] border border-blue-200 bg-blue-50/60 text-sm font-semibold text-[#0070f4] hover:bg-blue-100/70 items-center gap-1.5 shrink-0 shadow-xs transition cursor-pointer"
              title="Mở bảng bộ lọc"
            >
              <Filter size={15} />
              <span>Bộ lọc</span>
              <ChevronRight size={14} />
            </button>
          )}

          {/* Mobile Filter Button */}
          <button
            type="button"
            onClick={onOpenMobileFilter}
            className="lg:hidden h-9 px-3 rounded-[6px] border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Filter size={15} />
            <span>Bộ lọc</span>
          </button>

          <div className="relative flex-1">
            <div className="h-9 px-3 bg-white border border-slate-300 rounded-[6px] flex items-center justify-between gap-2 transition hover:border-slate-400 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 shadow-xs">
              <Search size={16} className="text-slate-400 shrink-0" />
              <input
                type="text"
                value={search}
                placeholder="Tìm theo mã, tên NCC, điện thoại, email..."
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="text-slate-400 hover:text-slate-600 shrink-0 cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenCreate}
            className="h-9 px-4 rounded-[6px] bg-[#0070f4] hover:bg-[#005ac3] text-sm font-semibold text-white flex items-center gap-1.5 shadow-xs transition cursor-pointer"
          >
            <Plus size={16} />
            <span>Nhà cung cấp</span>
          </button>

          <button
            type="button"
            onClick={onExportExcel}
            title="Xuất danh sách ra file Excel (.xlsx)"
            className="h-9 px-3.5 rounded-[6px] border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-400 flex items-center gap-1.5 transition cursor-pointer"
          >
            <FileSpreadsheet size={16} className="text-emerald-600" />
            <span className="hidden sm:inline">Xuất Excel</span>
          </button>

          <button
            type="button"
            onClick={onRefresh}
            title="Làm mới dữ liệu"
            className="h-9 w-9 flex items-center justify-center rounded-[6px] border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-400 transition cursor-pointer"
          >
            <RefreshCcw size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

