// src/features/pos/components/PosFooter.tsx
// VÙNG D — Thanh trạng thái và thông tin hệ thống phía dưới theo ảnh tham chiếu

import React from 'react';
import { PhoneCall, Printer, Wifi } from 'lucide-react';

export const PosFooter: React.FC = () => {
  return (
    <footer className="h-7 px-4 bg-white border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 select-none shrink-0 shadow-2xs">
      {/* Thông tin bản quyền & Hệ thống */}
      <div className="flex items-center gap-2">
        <span>© 2025 Công ty Cổ phần Thương mại & Phân phối Tín Phát. Hệ thống StockFlow POS Enterprise.</span>
      </div>

      {/* Trạng thái kết nối máy in & Hỗ trợ kỹ thuật */}
      <div className="flex items-center gap-4">
        {/* Máy in POS-K80 */}
        <div className="flex items-center gap-1.5 font-medium text-emerald-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Trực tuyến (Máy in POS-K80 Sẵn sàng)</span>
        </div>

        {/* Tổng đài hỗ trợ */}
        <div className="flex items-center gap-1 font-semibold text-slate-700">
          <PhoneCall size={12} className="text-[#0F60B6]" />
          <span>Hỗ trợ kỹ thuật: <strong>1900 6868</strong></span>
        </div>
      </div>
    </footer>
  );
};

