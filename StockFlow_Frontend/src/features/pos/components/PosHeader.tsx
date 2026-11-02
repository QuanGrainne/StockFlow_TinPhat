// src/features/pos/components/PosHeader.tsx
// VÙNG A — Thanh điều hướng phía trên (Cho phép chọn Chi nhánh / Kho xuất bán hàng thực tế)

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Boxes,
  Bell,
  User,
  ExternalLink,
  Plus,
  X,
  ChevronDown,
  Printer,
  Warehouse,
  Check,
  MapPin,
} from 'lucide-react';
import { PosOrderTab, PosWarehouse } from '../types';

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
  warehouses: PosWarehouse[];
  selectedWarehouseId: number;
  onSelectWarehouse: (wh: PosWarehouse) => void;
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
  warehouses,
  selectedWarehouseId,
  onSelectWarehouse,
}) => {
  const router = useRouter();
  const [warehouseDropdownOpen, setWarehouseDropdownOpen] = useState(false);
  const warehouseDropdownRef = useRef<HTMLDivElement>(null);

  // Đóng dropdown kho khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        warehouseDropdownRef.current &&
        !warehouseDropdownRef.current.contains(e.target as Node)
      ) {
        setWarehouseDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentWarehouse =
    warehouses.find((w) => w.warehouseId === selectedWarehouseId) || warehouses[0];

  return (
    <header className="bg-white border-b border-slate-200 select-none sticky top-0 z-30 shadow-xs">
      {/* ─── Hàng trên: Logo, Chi nhánh & Kho, POS status, Tabs đơn nhanh, Shortcuts, Profile, Về ERP ─── */}
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

          {/* Chi nhánh & Kho Selector */}
          <div className="relative" ref={warehouseDropdownRef}>
            <button
              type="button"
              onClick={() => setWarehouseDropdownOpen((prev) => !prev)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-100 hover:border-slate-300 transition"
              title="Nhấn để chọn Chi nhánh / Kho xuất bán hàng"
            >
              <Warehouse size={13} className="text-[#0F60B6]" />
              <div className="flex items-center gap-1">
                <span className="hidden sm:inline text-slate-600">
                  {currentWarehouse?.branchName || 'Chi nhánh chính - Hà Nội'}
                </span>
                <span className="hidden sm:inline text-slate-400 font-normal">•</span>
                <span className="text-[#0F60B6] font-bold">
                  {currentWarehouse?.name || 'Kho Tổng Gia Lâm'}
                </span>
              </div>
              <ChevronDown
                size={13}
                className={`text-slate-400 transition-transform duration-150 ${
                  warehouseDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Dropdown Menu Chi nhánh & Kho */}
            {warehouseDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-76 bg-white rounded-[8px] border border-slate-200 shadow-xl z-50 py-1.5 divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1.5 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Chi nhánh & Kho xuất hàng</span>
                  <span className="text-[10px] font-normal text-slate-400">({warehouses.length} kho)</span>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                  {warehouses.map((wh) => {
                    const isSelected = wh.warehouseId === selectedWarehouseId;
                    return (
                      <button
                        key={wh.warehouseId}
                        type="button"
                        onClick={() => {
                          onSelectWarehouse(wh);
                          setWarehouseDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left flex items-start justify-between gap-2 transition cursor-pointer hover:bg-blue-50/70 ${
                          isSelected ? 'bg-blue-50/90' : 'bg-white'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-bold border border-slate-200">
                              {wh.code}
                            </span>
                            <span
                              className={`text-xs truncate ${
                                isSelected ? 'font-bold text-[#0F60B6]' : 'font-medium text-slate-800'
                              }`}
                            >
                              {wh.name}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 font-medium truncate">
                            {wh.branchName}
                          </div>
                          {wh.address && (
                            <div className="text-[10px] text-slate-400 mt-0.5 truncate flex items-center gap-1">
                              <MapPin size={10} className="shrink-0 text-slate-400" />
                              <span className="truncate">{wh.address}</span>
                            </div>
                          )}
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-blue-100 text-[#0F60B6] flex items-center justify-center shrink-0 mt-0.5">
                            <Check size={12} className="stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
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

      {/* ─── Hàng dưới: Tab Hóa đơn 1, Hóa đơn 2, Thêm đơn & In K80 ─── */}
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
