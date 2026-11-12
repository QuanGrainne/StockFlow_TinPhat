'use client';

// Header toolbar màn hình Nhà cung cấp — cùng bố cục với màn hình Chuyển hàng
// (tiêu đề + ô tìm kiếm bo tròn bên trái, nút hành động bên phải, cao 48px)

import React, { useRef } from 'react';
import { Search, Plus, FileDown, FileUp, Loader2, X } from 'lucide-react';

interface SupplierToolbarProps {
  search: string;
  onSearchChange: (search: string) => void;
  onOpenCreate: () => void;
  onImportExcel: (file: File) => void;
  importing?: boolean;
  onExportExcel: () => void;
}

export default function SupplierToolbar({
  search,
  onSearchChange,
  onOpenCreate,
  onImportExcel,
  importing = false,
  onExportExcel,
}: SupplierToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <header className="h-12 bg-white/84 backdrop-blur-[2px] border-b border-slate-200 px-4 flex items-center justify-between gap-3 shrink-0">
      {/* Left: Title & Search bar */}
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <h1 className="text-[20px] font-bold text-[#15171a] leading-7 tracking-tight whitespace-nowrap">
          Nhà cung cấp
        </h1>

        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#677484] pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Theo mã, tên, điện thoại, email"
            className="w-full h-8 pl-8 pr-8 rounded-full bg-[#f7f8f9] border border-slate-200 text-[13px] text-[#15171a] placeholder-[#677484] focus:outline-none focus:border-[#0070f4] focus:bg-white transition"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#677484] hover:text-[#15171a] cursor-pointer"
              title="Xóa từ khóa"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenCreate}
          className="inline-flex items-center gap-1.5 px-3.5 h-8 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white font-semibold text-[13px] shadow-xs transition cursor-pointer"
        >
          <Plus size={15} className="stroke-[2.5]" />
          <span>Nhà cung cấp</span>
        </button>

        {/* Import file Excel (cùng định dạng với file Xuất file) */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onImportExcel(file);
            e.target.value = ''; // cho phép chọn lại cùng file
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
          title="Nhập danh sách nhà cung cấp từ file Excel (cột: Mã NCC, Tên nhà cung cấp, Số điện thoại, Email, Địa chỉ)"
          className="inline-flex items-center gap-1 px-3 h-8 rounded-[8px] border border-slate-300 hover:bg-[#f7f8f9] text-[#15171a] font-medium text-[13px] transition cursor-pointer bg-white disabled:opacity-60 disabled:cursor-wait"
        >
          {importing ? (
            <Loader2 size={14} className="text-[#0070f4] animate-spin" />
          ) : (
            <FileUp size={14} className="text-[#677484]" />
          )}
          <span>{importing ? 'Đang import...' : 'Import file'}</span>
        </button>

        <button
          type="button"
          onClick={onExportExcel}
          className="inline-flex items-center gap-1 px-3 h-8 rounded-[8px] border border-slate-300 hover:bg-[#f7f8f9] text-[#15171a] font-medium text-[13px] transition cursor-pointer bg-white"
        >
          <FileDown size={14} className="text-[#677484]" />
          <span>Xuất file</span>
        </button>
      </div>
    </header>
  );
}
