// src/features/pos/components/PosHeader.tsx
// VÙNG A — Thanh điều hướng phía trên (Đã ẩn chọn bảng giá theo yêu cầu)

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  Boxes,
  Bell,
  User,
  ExternalLink,
  Plus,
  X,
  ChevronDown,
  Clock,
  History,
  Printer,
} from 'lucide-react';
import { PosOrderTab } from '../types';

interface PosHeaderProps {
  tabs: PosOrderTab[];
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
  onAddTab: () => void;
  onCloseTab: (tabId: string) => void;
  autoPrintK80: boolean;
  onToggleAutoPrint: (val: boolean) => void;
  onOpenHistory: () => void;
  onOpenShiftClose: () => void;
}

export const PosHeader: React.FC<PosHeaderProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onAddTab,
  onCloseTab,
  autoPrintK80,
  onToggleAutoPrint,
  onOpenHistory,
  onOpenShiftClose,
}) => {
  const router = useRouter();

  return (
    <header className="bg-white border-b border-slate-200 select-none sticky top-0 z-30 shadow-xs">
      {/* ─── Hàng trên: Logo, Chi nhánh, POS status, Tabs đơn nhanh, Shortcuts, Profile, Về ERP ─── */}
      <div className="h-12 px-3.5 flex items-center justify-between border-b border-slate-150 gap-2">
        {/* Nhóm trái */}
        <div className="flex items-center gap-3">
          {/* Brand Logo */}
          <div className="flex items-center gap-2 pr-2 border-r border-slate-200">
            <div className="w-8 h-8 rounded-[6px] bg-[#0F60B6] text-white flex items-center justify-center font-bold shadow-xs">
              <Boxes size={18} />
            </div>
            <div className="leading-tight">
              <span className="text-sm font-black text-slate-800 tracking-tight block">StockFlow</span>
              <span className="text-[10px] text-slate-500 font-medium block">Tín Phát POS</span>
            </div>
          </div>

          {/* Chi nhánh & Kho */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-100 transition">
            <span>Chi nhánh chính - Hà Nội</span>
            <ChevronDown size={13} className="text-slate-400" />
          </div>

          {/* Trạng thái POS */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>POS-01 Sẵn sàng</span>
          </div>

          {/* Phím tắt số đơn (Đơn 1, Đơn 2, Chốt ca, Lịch sử) */}
          <div className="hidden lg:flex items-center gap-1 ml-1">
            {tabs.slice(0, 3).map((tab, idx) => {
              const isActive = tab.id === activeTabId;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onSelectTab(tab.id)}
                  className={`h-7 px-2.5 rounded-[5px] text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                    isActive
                      ? 'bg-[#0F60B6] text-white shadow-xs'
                      : 'bg-white border border-slate-250 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-[11px] opacity-80">Đơn</span>
                  <span>{idx + 1}</span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={onOpenShiftClose}
              className="h-7 px-2 rounded-[5px] bg-white border border-slate-250 hover:bg-slate-50 text-slate-600 text-xs font-medium flex items-center gap-1 transition cursor-pointer"
            >
              <Clock size={12} className="text-slate-400" />
              <span>Chốt ca</span>
            </button>

            <button
              type="button"
              onClick={onOpenHistory}
              className="h-7 px-2 rounded-[5px] bg-white border border-slate-250 hover:bg-slate-50 text-slate-600 text-xs font-medium flex items-center gap-1 transition cursor-pointer"
            >
              <History size={12} className="text-slate-400" />
              <span>Lịch sử</span>
            </button>
          </div>

          {/* Phím tắt nhanh trên header */}
          <div className="hidden xl:flex items-center gap-2 ml-2 pl-2 border-l border-slate-200 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono text-[10px] text-slate-700 font-bold">
                F3
              </kbd>
              <span>Tìm hàng</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono text-[10px] text-slate-700 font-bold">
                F2
              </kbd>
              <span>Khách</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono text-[10px] text-slate-700 font-bold">
                F1
              </kbd>
              <span>Thu tiền</span>
            </span>
          </div>
        </div>

        {/* Nhóm phải: Chuông báo, User profile, Nút Về ERP */}
        <div className="flex items-center gap-3">
          {/* Chuông thông báo */}
          <button
            type="button"
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 relative transition cursor-pointer"
            title="Thông báo"
          >
            <Bell size={16} />
            <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-1.5 right-1.5"></span>
          </button>

          {/* Profile User */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="text-right leading-tight">
              <span className="text-xs font-bold text-slate-800 block">Nguyễn Văn An</span>
              <span className="text-[10px] text-slate-400 font-medium block">Thu ngân</span>
            </div>
            <div className="w-7 h-7 rounded-full bg-[#0F60B6] text-white flex items-center justify-center text-xs font-bold">
              <User size={14} />
            </div>
          </div>

          {/* Nút Về ERP */}
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="h-8 px-2.5 rounded-[6px] bg-slate-100 hover:bg-slate-200 border border-slate-250 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            title="Quay lại giao diện quản lý ERP"
          >
            <ExternalLink size={13} className="text-slate-500" />
            <span>Về ERP</span>
          </button>
        </div>
      </div>

      {/* ─── Hàng dưới: Tab Hóa đơn 1, Hóa đơn 2, Thêm đơn & In K80 (Đã ẩn chọn bảng giá) ─── */}
      <div className="h-10 px-3.5 flex items-center justify-between bg-slate-50/80 gap-3">
        {/* Các tab hóa đơn đang mở */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`h-7 px-3 rounded-[6px] text-xs font-bold transition flex items-center gap-2 cursor-pointer whitespace-nowrap shadow-2xs ${
                  isActive
                    ? 'bg-[#0F60B6] text-white shadow-xs'
                    : 'bg-white border border-slate-250 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-300' : 'bg-slate-400'}`}></span>
                <span>
                  {tab.code} {tab.items.length > 0 ? `(${isActive ? 'Đang xử lý' : 'Chờ'})` : ''}
                </span>

                {tabs.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseTab(tab.id);
                    }}
                    className={`w-4 h-4 rounded-full flex items-center justify-center transition cursor-pointer ml-1 ${
                      isActive ? 'hover:bg-white/20 text-white' : 'hover:bg-slate-200 text-slate-400'
                    }`}
                    title="Đóng đơn này"
                  >
                    <X size={11} />
                  </button>
                )}
              </div>
            );
          })}

          {/* Nút Thêm đơn (F1) */}
          <button
            type="button"
            onClick={onAddTab}
            className="h-7 px-2.5 rounded-[6px] bg-white hover:bg-blue-50 border border-blue-200 text-[#0F60B6] text-xs font-semibold flex items-center gap-1 transition cursor-pointer whitespace-nowrap shadow-2xs"
            title="Thêm hóa đơn mới (Phím tắt: F1)"
          >
            <Plus size={13} />
            <span>Thêm đơn (F1)</span>
          </button>
        </div>

        {/* Tùy chọn In K80 */}
        <div className="flex items-center gap-3 shrink-0">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50/80 px-2 py-1 rounded-[5px] border border-emerald-200/80 cursor-pointer hover:bg-emerald-100 transition">
            <input
              type="checkbox"
              checked={autoPrintK80}
              onChange={(e) => onToggleAutoPrint(e.target.checked)}
              className="w-3.5 h-3.5 accent-[#0F60B6] rounded cursor-pointer"
            />
            <Printer size={13} className="text-emerald-700" />
            <span>Tự động in K80</span>
          </label>
        </div>
      </div>
    </header>
  );
};
