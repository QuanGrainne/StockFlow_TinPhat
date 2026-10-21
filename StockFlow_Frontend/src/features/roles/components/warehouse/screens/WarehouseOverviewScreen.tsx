// src/features/roles/components/warehouse/screens/WarehouseOverviewScreen.tsx
// Màn hình 3.2.5.1: Bảng Tổng quan Nhập liệu Chứng từ Giấy & Quản lý Tồn kho (Desktop Data Entry)
// Đã loại bỏ vị trí ô kệ theo yêu cầu người dùng

import React, { useState } from 'react';
import {
  FileText,
  ArrowDownToLine,
  ArrowUpFromLine,
  Layers,
  ClipboardList,
  ChevronDown,
  Plus,
  ArrowRight,
  Truck,
  CheckCircle2,
} from 'lucide-react';

interface WarehouseOverviewScreenProps {
  onNavigate?: (screenId: string) => void;
}

export const WarehouseOverviewScreen: React.FC<WarehouseOverviewScreenProps> = ({
  onNavigate,
}) => {
  const [selectedWarehouse, setSelectedWarehouse] = useState('WH-HN-01 • Kho Tổng Gia Lâm (Chính)');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[10px] uppercase tracking-wider mb-2 border border-blue-100">
            <span>VĂN PHÒNG QUẢN TRỊ TỒN KHO & NHẬP LIỆU</span>
            <span>•</span>
            <span className="font-normal text-blue-600">Đặc tả 3.2.5 (Desktop Data Entry)</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Bảng Tổng quan Nhập liệu Chứng từ Giấy & Quản lý Tồn kho
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Nhân viên phụ trách: <strong className="text-slate-700">Phạm Văn D (TP-WH004)</strong> • Nhiệm vụ: Đối chiếu và nhập số liệu từ biên bản, phiếu giao hàng, hóa đơn giấy cứng vào hệ thống
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Warehouse Selector */}
          <div className="relative">
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="h-9 px-3 pr-8 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 shadow-2xs cursor-pointer appearance-none"
            >
              <option value="WH-HN-01 • Kho Tổng Gia Lâm (Chính)">WH-HN-01 • Kho Tổng Gia Lâm (Chính)</option>
              <option value="WH-HN-02 • Kho Đông Anh (Vật tư)">WH-HN-02 • Kho Đông Anh (Vật tư)</option>
              <option value="WH-HN-03 • Kho Hà Đông (Thành phẩm)">WH-HN-03 • Kho Hà Đông (Thành phẩm)</option>
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Button: Nhập chứng từ giấy mới */}
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('warehouse-inbound')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1E56A0] hover:bg-[#184580] text-xs font-semibold text-white transition cursor-pointer shadow-xs whitespace-nowrap"
          >
            <Plus size={14} />
            <span>Nhập chứng từ giấy mới</span>
          </button>
        </div>
      </div>

      {/* 2. Four KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Phiếu nhập chờ gõ máy */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 flex flex-col justify-between hover:border-blue-200 transition">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                PHIẾU NHẬP CHỜ GÕ MÁY
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <ArrowDownToLine size={16} />
              </div>
            </div>
            <div className="text-xl font-extrabold text-slate-900">
              2 <span className="text-xs font-semibold text-slate-500">chứng từ PO / LSX</span>
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 mt-3 flex items-center justify-between text-xs">
            <span className="text-slate-500 truncate">PO-2026-001 đang đối chiếu</span>
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('warehouse-inbound')}
              className="font-semibold text-blue-700 hover:text-blue-800 flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <span>Nhập đối chiếu</span>
              <ArrowRight size={12} />
            </button>
          </div>
        </div>

        {/* Card 2: Lệnh xuất chờ đối chiếu */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 flex flex-col justify-between hover:border-blue-200 transition">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                LỆNH XUẤT CHỜ ĐỐI CHIẾU
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <ArrowUpFromLine size={16} />
              </div>
            </div>
            <div className="text-xl font-extrabold text-slate-900">
              2 <span className="text-xs font-semibold text-slate-500">lệnh giao hàng</span>
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 mt-3 flex items-center justify-between text-xs">
            <span className="text-slate-500 truncate">PXK-2026-088 ưu tiên gấp</span>
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('warehouse-outbound')}
              className="font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <span>Đối chiếu</span>
              <ArrowRight size={12} />
            </button>
          </div>
        </div>

        {/* Card 3: Tỷ lệ lấp đầy kho (Tổng quan lưu trữ) */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 flex flex-col justify-between hover:border-blue-200 transition">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                TỶ LỆ LẤP ĐẦY KHO
              </span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Layers size={16} />
              </div>
            </div>
            <div className="text-xl font-extrabold text-slate-900">
              71.4% <span className="text-xs font-semibold text-slate-500">sức chứa kho</span>
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 mt-3 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-mono">2,392 / 3,350 SP</span>
            <span className="text-emerald-600 font-semibold">Tồn ổn định</span>
          </div>
        </div>

        {/* Card 4: BB kiểm kê & trả hàng */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 flex flex-col justify-between hover:border-blue-200 transition">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                BB KIỂM KÊ & TRẢ HÀNG
              </span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <ClipboardList size={16} />
              </div>
            </div>
            <div className="text-xl font-extrabold text-slate-900">
              1 <span className="text-xs font-semibold text-slate-500">đợt kiểm kê đang mở</span>
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 mt-3 flex items-center justify-between text-xs">
            <span className="text-slate-500 truncate">Biên bản số 08/BBKK</span>
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('warehouse-audit')}
              className="font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <span>Nhập đếm</span>
              <ArrowRight size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Bottom Two Split Columns: Inbound Worklist & Outbound Worklist */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left Card: Chứng từ Nhập kho cần gõ máy hôm nay */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900">
                  Chứng từ Nhập kho cần gõ máy hôm nay
                </h2>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Đối chiếu số liệu hóa đơn đỏ và phiếu giao hàng cứng
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('warehouse-inbound')}
              className="text-xs font-semibold text-blue-700 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
            >
              <span>Vào danh sách chứng từ</span>
              <ArrowRight size={12} />
            </button>
          </div>

          <div className="space-y-3">
            {/* Item 1 */}
            <div
              onClick={() => onNavigate && onNavigate('warehouse-inbound')}
              className="p-3.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/20 transition cursor-pointer space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-blue-700 px-2 py-0.5 rounded bg-blue-50 border border-blue-100">
                  PNK-2026-001
                </span>
                <span className="text-[11px] text-slate-400">18/10/2026 08:30</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    Phiếu nhập kho số 123 / PO-NCC-088
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Công ty Cổ phần Nhựa Tiền Phong (NCC)
                  </p>
                </div>
                <span className="font-mono text-xs font-bold text-slate-800 px-2.5 py-1 rounded bg-slate-100">
                  500 SP
                </span>
              </div>
            </div>

            {/* Item 2 */}
            <div
              onClick={() => onNavigate && onNavigate('warehouse-inbound')}
              className="p-3.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/20 transition cursor-pointer space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-blue-700 px-2 py-0.5 rounded bg-blue-50 border border-blue-100">
                  PNK-2026-002
                </span>
                <span className="text-[11px] text-slate-400">17/10/2026 15:40</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    Biên bản bàn giao xưởng số 45/BBBG-ĐA
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Phân xưởng Bao bì Đông Anh
                  </p>
                </div>
                <span className="font-mono text-xs font-bold text-slate-800 px-2.5 py-1 rounded bg-slate-100">
                  1000 SP
                </span>
              </div>
            </div>

            {/* Item 3 */}
            <div
              onClick={() => onNavigate && onNavigate('warehouse-inbound')}
              className="p-3.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/20 transition cursor-pointer space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-blue-700 px-2 py-0.5 rounded bg-blue-50 border border-blue-100">
                  PNK-2026-003
                </span>
                <span className="text-[11px] text-slate-400">18/10/2026 09:15</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    Hóa đơn GTGT số 004812 / NCC Nhựa Hà Nội
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    TNHH Hóa Chất & Nhựa Thăng Long
                  </p>
                </div>
                <span className="font-mono text-xs font-bold text-slate-800 px-2.5 py-1 rounded bg-slate-100">
                  450 SP
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Card: Lệnh Xuất kho & Phiếu Giao hàng hôm nay (Thay thế Ô Kệ theo yêu cầu) */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <Truck size={16} className="text-amber-600" />
                <h2 className="text-sm font-bold text-slate-900">
                  Lệnh Xuất kho & Phiếu Giao hàng hôm nay
                </h2>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Lệnh xuất kho đang chờ thủ kho đóng gói và đối chiếu chứng từ
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('warehouse-outbound')}
              className="text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
            >
              <span>Vào danh sách lệnh xuất</span>
              <ArrowRight size={12} />
            </button>
          </div>

          <div className="space-y-3">
            {/* Outbound Item 1 */}
            <div
              onClick={() => onNavigate && onNavigate('warehouse-outbound')}
              className="p-3.5 rounded-lg border border-slate-200 hover:border-amber-300 hover:bg-amber-50/20 transition cursor-pointer space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-amber-700 px-2 py-0.5 rounded bg-amber-50 border border-amber-100">
                  LXK-2026-088
                </span>
                <span className="text-[11px] text-slate-400">18/10/2026 10:15</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    Phiếu xuất kho số 456 / HĐ-2026-88
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Công ty TNHH Nội Thất Minh Quân
                  </p>
                </div>
                <span className="font-mono text-xs font-bold text-slate-800 px-2.5 py-1 rounded bg-slate-100">
                  190 SP
                </span>
              </div>
            </div>

            {/* Outbound Item 2 */}
            <div
              onClick={() => onNavigate && onNavigate('warehouse-outbound')}
              className="p-3.5 rounded-lg border border-slate-200 hover:border-amber-300 hover:bg-amber-50/20 transition cursor-pointer space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-amber-700 px-2 py-0.5 rounded bg-amber-50 border border-amber-100">
                  LXK-2026-089
                </span>
                <span className="text-[11px] text-slate-400">18/10/2026 14:00</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    Phiếu xuất kho số 457 / Đơn DC-2026-092
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Đại lý Vật liệu Xây dựng Thăng Long
                  </p>
                </div>
                <span className="font-mono text-xs font-bold text-slate-800 px-2.5 py-1 rounded bg-slate-100">
                  75 SP
                </span>
              </div>
            </div>

            {/* Outbound Item 3 */}
            <div
              onClick={() => onNavigate && onNavigate('warehouse-transfer')}
              className="p-3.5 rounded-lg border border-slate-200 hover:border-purple-300 hover:bg-purple-50/20 transition cursor-pointer space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-purple-700 px-2 py-0.5 rounded bg-purple-50 border border-purple-100">
                  CK-2026-001
                </span>
                <span className="text-[11px] text-slate-400">18/10/2026 16:30</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    Phiếu điều chuyển kho số 14/CK-TP
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    WH-HN-01 (Kho Tổng Gia Lâm) → WH-HN-02 (Kho Đông Anh)
                  </p>
                </div>
                <span className="font-mono text-xs font-bold text-slate-800 px-2.5 py-1 rounded bg-slate-100">
                  230 SP
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
