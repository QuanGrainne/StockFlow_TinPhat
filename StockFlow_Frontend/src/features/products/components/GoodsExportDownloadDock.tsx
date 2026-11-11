// src/features/products/components/GoodsExportDownloadDock.tsx
'use client';

import React, { useState } from 'react';
import { ChevronDown, Square, X, Check, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

interface GoodsExportDownloadDockProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  workbook: XLSX.WorkBook | null;
}

export default function GoodsExportDownloadDock({
  isOpen,
  onClose,
  fileName,
  workbook,
}: GoodsExportDownloadDockProps) {
  const [isMinimized, setIsMinimized] = useState(false);

  if (!isOpen || !fileName) return null;

  const handleDownloadAgain = () => {
    if (workbook) {
      XLSX.writeFile(workbook, fileName);
    }
  };

  return (
    <div className="fixed bottom-3 right-4 z-50 w-96 max-w-[calc(100vw-2rem)] rounded-t-lg shadow-2xl border border-slate-200 overflow-hidden bg-white text-slate-800 animate-in slide-in-from-bottom-3 duration-200">
      {/* Header xanh chuẩn KiotViet (ảnh 2) */}
      <div className="bg-[#0070F3] text-white px-3.5 py-2.5 flex items-center justify-between text-xs font-semibold select-none">
        <div className="flex items-center gap-1.5 truncate">
          <span className="truncate">Xử lý thiết lập, import, xuất file, thanh toán</span>
        </div>
        <div className="flex items-center gap-2 text-white/80 shrink-0 ml-2">
          <button
            type="button"
            onClick={() => setIsMinimized(!isMinimized)}
            className="hover:text-white transition p-0.5 rounded cursor-pointer"
            title={isMinimized ? 'Mở rộng' : 'Thu gọn'}
          >
            <ChevronDown
              size={14}
              className={`transition-transform duration-200 ${isMinimized ? 'rotate-180' : ''}`}
            />
          </button>
          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            className="hover:text-white transition p-0.5 rounded cursor-pointer"
            title="Phóng to"
          >
            <Square size={12} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="hover:text-white transition p-0.5 rounded cursor-pointer"
            title="Đóng"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Body thông báo file & link tải xuống (ảnh 2) */}
      {!isMinimized && (
        <div className="p-3.5 bg-white">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 shrink-0 mt-0.5">
              <FileSpreadsheet size={18} className="text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-800 truncate" title={fileName}>
                  {fileName}
                </span>
                <Check size={16} className="text-blue-600 shrink-0" strokeWidth={2.5} />
              </div>
              <button
                type="button"
                onClick={handleDownloadAgain}
                className="text-xs text-[#0070F3] hover:underline hover:text-blue-700 font-medium mt-1 cursor-pointer block text-left"
              >
                Nhấn vào đây để tải xuống
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

