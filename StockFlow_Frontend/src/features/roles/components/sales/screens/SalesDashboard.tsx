// src/features/roles/components/sales/screens/SalesDashboard.tsx
// Màn hình Tổng quan bán hàng (Ảnh 1 chuẩn theo thiết kế AI Studio)

import React from 'react';
import {
  FileText,
  Boxes,
  AlertTriangle,
  RotateCcw,
  GitMerge,
  Plus,
  Shield,
  ArrowRight,
} from 'lucide-react';

interface SalesDashboardProps {
  onNavigate: (screenId: string) => void;
}

export const SalesDashboard: React.FC<SalesDashboardProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-6">
      {/* 1. Header Banner Box */}
      <div className="bg-white p-6 rounded-[8px] border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-[#2B6CB0] flex items-center gap-1.5 uppercase tracking-wide">
            <span>PHÂN QUYỀN KINH DOANH</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-400 normal-case font-normal">Đặc tả 3.2.4</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-1">
            Không gian làm việc Bán hàng B2B
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Tiếp nhận đơn hàng qua điện thoại/Zalo, gom đơn theo khách hàng và kiểm soát hạn mức tín dụng công nợ
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('sales-consolidate')}
            className="h-9 px-4 rounded-[8px] bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-2 transition cursor-pointer shadow-2xs"
          >
            <GitMerge size={15} className="text-[#2B6CB0]" />
            <span>Gộp đơn hàng</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('sales-orders')}
            className="h-9 px-4 rounded-[8px] bg-[#1E56A0] hover:bg-[#184682] text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
          >
            <Plus size={16} />
            <span>Tạo đơn chờ</span>
          </button>
        </div>
      </div>

      {/* 2. Four KPI Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Đơn chờ xử lý */}
        <div className="bg-white p-5 rounded-[8px] border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
              ĐƠN CHỜ XỬ LÝ
            </span>
            <div className="w-8 h-8 rounded-[6px] bg-blue-50 text-[#2B6CB0] flex items-center justify-center">
              <FileText size={16} />
            </div>
          </div>
          <div className="my-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-900">4</span>
              <span className="text-xs text-slate-500 font-semibold">(64.540.000 đ)</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
            <span className="text-slate-400">Chưa trừ tồn kho</span>
            <button
              type="button"
              onClick={() => onNavigate('sales-orders')}
              className="text-[#2B6CB0] font-bold hover:underline cursor-pointer"
            >
              Xem đơn chờ
            </button>
          </div>
        </div>

        {/* Card 2: Đủ điều kiện gộp */}
        <div className="bg-white p-5 rounded-[8px] border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
              ĐỦ ĐIỀU KIỆN GỘP
            </span>
            <div className="w-8 h-8 rounded-[6px] bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Boxes size={16} />
            </div>
          </div>
          <div className="my-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-900">1</span>
              <span className="text-xs text-slate-600 font-medium">khách có ≥2 đơn</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
            <span className="text-slate-400">Tiết kiệm chi phí xe</span>
            <button
              type="button"
              onClick={() => onNavigate('sales-consolidate')}
              className="text-[#2B6CB0] font-bold hover:underline cursor-pointer"
            >
              Gộp ngay
            </button>
          </div>
        </div>

        {/* Card 3: Cảnh báo hạn mức */}
        <div className="bg-white p-5 rounded-[8px] border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
              CẢNH BÁO HẠN MỨC
            </span>
            <div className="w-8 h-8 rounded-[6px] bg-rose-50 text-rose-500 flex items-center justify-center">
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="my-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-rose-600">1</span>
              <span className="text-xs text-slate-700 font-medium">khách chạm trần</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
            <span className="text-slate-500 font-medium">Đại lý Hoàng Gia (96%)</span>
            <span className="px-1.5 py-0.5 rounded-[3px] bg-rose-50 text-rose-600 font-bold font-mono text-[10px]">
              MSG20
            </span>
          </div>
        </div>

        {/* Card 4: Yêu cầu trả hàng */}
        <div className="bg-white p-5 rounded-[8px] border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
              YÊU CẦU TRẢ HÀNG
            </span>
            <div className="w-8 h-8 rounded-[6px] bg-amber-50 text-amber-600 flex items-center justify-center">
              <RotateCcw size={16} />
            </div>
          </div>
          <div className="my-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-900">1</span>
              <span className="text-xs text-slate-600 font-medium">chờ kho kiểm định</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
            <span className="text-slate-400">Đối chiếu phiếu PXK</span>
            <button
              type="button"
              onClick={() => onNavigate('sales-returns')}
              className="text-[#2B6CB0] font-bold hover:underline cursor-pointer"
            >
              Xem chi tiết
            </button>
          </div>
        </div>
      </div>

      {/* 3. Quy trình luân chuyển đơn hàng B2B (Sales Screenflow) */}
      <div className="bg-white p-6 rounded-[8px] border border-slate-200 shadow-2xs space-y-4">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          QUY TRÌNH LUÂN CHUYỂN ĐƠN HÀNG B2B (SALES SCREENFLOW)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* Step 1 */}
          <div className="p-3.5 rounded-[8px] border border-blue-100 bg-blue-50/40 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#2B6CB0]">
              <span className="px-1.5 py-0.5 rounded bg-blue-100">Bước 1</span>
              <span className="text-slate-400 font-mono font-normal">3.2.4.3</span>
            </div>
            <div className="text-xs font-bold text-slate-800 pt-1">Tạo đơn chờ</div>
            <div className="text-[11px] text-slate-500 leading-tight">
              Lưu yêu cầu không trừ tồn kho vật lý (BR-08)
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-3.5 rounded-[8px] border border-slate-200 bg-white space-y-1 hover:border-blue-200 transition">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
              <span className="px-1.5 py-0.5 rounded bg-slate-100">Bước 2</span>
              <span className="text-slate-400 font-mono font-normal">3.2.4.4</span>
            </div>
            <div className="text-xs font-bold text-slate-800 pt-1">Gộp đơn hàng</div>
            <div className="text-[11px] text-slate-500 leading-tight">
              Gom nhiều đơn cùng khách vào 1 chuyến xe (BR-09)
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-3.5 rounded-[8px] border border-slate-200 bg-white space-y-1 hover:border-blue-200 transition">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
              <span className="px-1.5 py-0.5 rounded bg-slate-100">Bước 3</span>
              <span className="text-slate-400 font-mono font-normal">3.2.4.5</span>
            </div>
            <div className="text-xs font-bold text-slate-800 pt-1">Thanh toán VietQR</div>
            <div className="text-[11px] text-slate-500 leading-tight">
              Kiểm tra trần nợ: Dư nợ + Đơn mới ≤ Hạn mức (BR-10)
            </div>
          </div>

          {/* Step 4 */}
          <div className="p-3.5 rounded-[8px] border border-slate-200 bg-white space-y-1 hover:border-blue-200 transition">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
              <span className="px-1.5 py-0.5 rounded bg-slate-100">Bước 4</span>
              <span className="text-slate-400 font-mono font-normal">3.2.4.6</span>
            </div>
            <div className="text-xs font-bold text-slate-800 pt-1">Phiếu xuất nháp</div>
            <div className="text-[11px] text-slate-500 leading-tight">
              Sinh mã PXK barcode chuyển xuống kho bốc hàng
            </div>
          </div>

          {/* Step 5 */}
          <div className="p-3.5 rounded-[8px] border border-slate-200 bg-white space-y-1 hover:border-blue-200 transition">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
              <span className="px-1.5 py-0.5 rounded bg-slate-100">Bước 5</span>
              <span className="text-slate-400 font-mono font-normal">3.2.4.7</span>
            </div>
            <div className="text-xs font-bold text-slate-800 pt-1">Xử lý trả hàng</div>
            <div className="text-[11px] text-slate-500 leading-tight">
              Lập phiếu khiếu nại đối chiếu hoá đơn gốc (BR-18)
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bottom Blue Architecture Banner */}
      <div className="bg-[#183B7A] text-white p-5 rounded-[8px] flex items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start gap-3 max-w-3xl">
          <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
            <Shield size={18} className="text-blue-200" />
          </div>
          <div>
            <h4 className="text-xs font-bold tracking-tight">
              Kiến trúc nghiệp vụ kết nối MISA & Điều phối đa kho
            </h4>
            <p className="text-[11px] text-blue-100/80 mt-1 leading-relaxed">
              Toàn bộ đơn hàng ghi nhận theo giá trị thuần Net (chưa VAT) theo quy tắc BR-55. Khi kho xuất thực tế thiếu số lượng, hệ thống tự động chẻ đơn chờ (Auto-split BR-17) đưa ngược lại danh sách để Sales tiếp tục điều phối.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('sales-orders')}
          className="h-9 px-4 rounded-[8px] bg-white text-[#183B7A] hover:bg-blue-50 text-xs font-bold flex items-center gap-1.5 shrink-0 transition cursor-pointer shadow-xs"
        >
          <span>Xử lý đơn chờ</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};
