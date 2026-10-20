// src/components/common/Header.tsx
// Header giao diện: Switch Role dropdown, Logo Tín Phát, User Profile

import React, { useState } from 'react';
import { UserRole } from '../../types';
import {
  ShieldCheck,
  ChevronDown,
  User,
  Bell,
  Check,
  Briefcase,
  Store,
  Layers,
} from 'lucide-react';

interface HeaderProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  userName?: string;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onRoleChange,
  userName = 'Trần Văn Tuấn',
}) => {
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const rolesConfig: { id: UserRole; label: string; desc: string; icon: any }[] = [
    {
      id: 'SALES',
      label: 'Nhân viên Kinh doanh (Sales)',
      desc: 'Quản lý đơn hàng, công nợ & gộp đơn xuất kho',
      icon: Store,
    },
    {
      id: 'MANAGER',
      label: 'Quản lý vận hành (Manager)',
      desc: 'Duyệt hạn mức, quản lý BOM, dòng tiền & sản xuất',
      icon: Briefcase,
    },
  ];

  const currentRoleInfo = rolesConfig.find((r) => r.id === currentRole) || rolesConfig[0];

  return (
    <header className="h-14 bg-[#2B6CB0] text-white flex items-center justify-between px-5 sticky top-0 z-40 shadow-xs select-none">
      {/* Left: Branding */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-[8px] bg-white/10 flex items-center justify-center font-bold text-white border border-white/20">
          <Layers size={18} />
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight flex items-center gap-2">
            StockFlow <span className="text-xs font-normal opacity-80 border-l border-white/30 pl-2">Tin Phat OIMS</span>
          </h1>
        </div>
      </div>

      {/* Center: Switch Role Dropdown (Yêu cầu cốt lõi của đề tài) */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-[8px] bg-white/10 hover:bg-white/20 border border-white/20 transition cursor-pointer text-xs font-medium"
        >
          <ShieldCheck size={16} className="text-amber-300" />
          <span>Vai trò: <strong className="font-semibold">{currentRoleInfo.label.split(' (')[0]}</strong></span>
          <ChevronDown size={14} className="opacity-80" />
        </button>

        {roleDropdownOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setRoleDropdownOpen(false)} />
            <div className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 w-80 bg-white text-slate-800 rounded-[8px] shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in duration-100">
              <div className="px-3 py-2 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Chuyển đổi phân quyền (RBAC Switcher)
              </div>
              {rolesConfig.map((item) => {
                const isSelected = item.id === currentRole;
                const IconComponent = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onRoleChange(item.id);
                      setRoleDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 flex items-start gap-3 transition cursor-pointer hover:bg-blue-50 ${
                      isSelected ? 'bg-blue-50/70 text-[#2B6CB0]' : 'text-slate-700'
                    }`}
                  >
                    <div className={`p-1.5 rounded-[6px] shrink-0 mt-0.5 ${isSelected ? 'bg-[#2B6CB0] text-white' : 'bg-slate-100 text-slate-500'}`}>
                      <IconComponent size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold flex items-center justify-between">
                        <span>{item.label}</span>
                        {isSelected && <Check size={14} className="text-[#2B6CB0]" />}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">
                        {item.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Right: Notifications & User profile */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          title="Thông báo"
          className="p-1.5 text-white/80 hover:text-white rounded-[6px] hover:bg-white/10 transition relative cursor-pointer"
        >
          <Bell size={18} />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400" />
        </button>

        <div className="h-4 w-px bg-white/20" />

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-xs font-semibold">
            <User size={14} />
          </div>
          <div className="text-xs font-medium hidden sm:block">
            {userName}
          </div>
        </div>
      </div>
    </header>
  );
};
