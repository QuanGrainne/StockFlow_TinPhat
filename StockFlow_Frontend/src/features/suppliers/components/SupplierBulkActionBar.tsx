'use client';

// Thanh thao tác hàng loạt khi chọn nhiều Nhà cung cấp — kiểu nút giống màn hình Chuyển hàng

import React from 'react';
import { FileDown, PowerOff, CheckCircle2, X } from 'lucide-react';

interface SupplierBulkActionBarProps {
  selectedCount: number;
  onExportExcel: () => void;
  onDeactivate: () => void;
  onActivate: () => void;
  onClearSelection: () => void;
}

const btnCls =
  'inline-flex items-center gap-1.5 px-3 h-8 rounded-[8px] border border-slate-300 hover:bg-[#f7f8f9] text-[#15171a] text-[12px] font-medium transition cursor-pointer bg-white';

export default function SupplierBulkActionBar({
  selectedCount,
  onExportExcel,
  onDeactivate,
  onActivate,
  onClearSelection,
}: SupplierBulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-3 py-2 bg-white text-[13px] text-[#15171a] rounded-[10px] border border-slate-200 shadow-[0_6px_20px_rgba(0,0,0,0.12)] animate-in fade-in slide-in-from-bottom-5 duration-200">
      <div className="flex items-center gap-2 pr-3 border-r border-slate-200">
        <span className="flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-[#0070f4] text-[11px] font-bold text-white">
          {selectedCount}
        </span>
        <span className="text-[12px]">nhà cung cấp đã chọn</span>
      </div>

      <div className="flex items-center gap-2">
        <button type="button" onClick={onExportExcel} className={btnCls}>
          <FileDown size={13} className="text-[#677484]" />
          <span>Xuất file</span>
        </button>
        <button type="button" onClick={onDeactivate} className={btnCls}>
          <PowerOff size={13} className="text-[#fb2c36]" />
          <span>Ngừng giao dịch</span>
        </button>
        <button type="button" onClick={onActivate} className={btnCls}>
          <CheckCircle2 size={13} className="text-[#16a34a]" />
          <span>Kích hoạt lại</span>
        </button>
      </div>

      <button
        type="button"
        onClick={onClearSelection}
        className="p-1.5 rounded-[8px] text-[#677484] hover:text-[#15171a] hover:bg-[#f7f8f9] transition cursor-pointer"
        title="Bỏ chọn tất cả"
      >
        <X size={14} />
      </button>
    </div>
  );
}
