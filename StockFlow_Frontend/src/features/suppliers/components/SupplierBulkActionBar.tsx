'use client';

import React from 'react';
import { FileSpreadsheet, PowerOff, CheckCircle2, X } from 'lucide-react';

interface SupplierBulkActionBarProps {
  selectedCount: number;
  onExportExcel: () => void;
  onDeactivate: () => void;
  onActivate: () => void;
  onClearSelection: () => void;
}

export default function SupplierBulkActionBar({
  selectedCount,
  onExportExcel,
  onDeactivate,
  onActivate,
  onClearSelection,
}: SupplierBulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-2.5 bg-slate-900/95 backdrop-blur-md text-white rounded-xl shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-bottom-5 duration-200">
      <div className="flex items-center gap-2 pr-2 border-r border-slate-700 text-xs sm:text-sm font-medium">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0071BA] text-[11px] font-bold text-white">
          {selectedCount}
        </span>
        <span>
          Đã chọn <strong className="text-white">{selectedCount}</strong> NCC
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onExportExcel}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-xs cursor-pointer transition"
          title="Xuất file Excel (.xlsx) cho các nhà cung cấp đã chọn"
        >
          <FileSpreadsheet size={14} />
          <span>Xuất Excel ({selectedCount})</span>
        </button>

        <button
          type="button"
          onClick={onDeactivate}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600/90 hover:bg-amber-600 text-xs font-semibold text-white shadow-xs cursor-pointer transition"
          title="Chuyển các nhà cung cấp đã chọn sang Ngừng giao dịch"
        >
          <PowerOff size={13} />
          <span>Ngừng giao dịch</span>
        </button>

        <button
          type="button"
          onClick={onActivate}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-xs cursor-pointer transition"
          title="Kích hoạt lại các nhà cung cấp đã chọn"
        >
          <CheckCircle2 size={13} />
          <span>Kích hoạt lại</span>
        </button>
      </div>

      <div className="pl-2 border-l border-slate-700">
        <button
          type="button"
          onClick={onClearSelection}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-1.5 py-1 rounded hover:bg-slate-800 transition cursor-pointer"
          title="Bỏ chọn tất cả"
        >
          <X size={13} />
          <span className="hidden sm:inline">Bỏ chọn</span>
        </button>
      </div>
    </div>
  );
}

