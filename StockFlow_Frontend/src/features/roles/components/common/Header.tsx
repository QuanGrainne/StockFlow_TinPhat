// src/features/roles/components/common/Header.tsx
// Header giao diện: Topbar chuẩn theo thiết kế AI Studio (Logo SF, Badge Role, Search input, User profile avatar & Switch Role dropdown khớp Ảnh 4)

import React, { useState } from 'react';
import { UserRole } from '../../types';
import {
  Shield,
  ChevronDown,
  Search,
  Check,
  Briefcase,
  Users,
  Warehouse,
  Factory,
} from 'lucide-react';

interface HeaderProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  userName?: string;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onRoleChange,
}) => {
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  // 5 Role options khớp thứ tự & mã SRS chính xác theo Ảnh 4
  const rolesConfig: {
    id: UserRole;
    label: string;
    subtext: string;
    srs: string;
    icon: any;
  }[] = [
    {
      id: 'SALES',
      label: 'Nhân viên bán hàng',
      subtext: 'Lê Văn C • TP-SL003',
      srs: '3.2.4',
      icon: Users,
    },
    {
      id: 'ADMIN',
      label: 'Quản trị viên',
      subtext: 'Nguyễn Văn A • TP-AD001',
      srs: '3.2.1',
      icon: Shield,
    },
    {
      id: 'MANAGER',
      label: 'Quản lý',
      subtext: 'Trần Thị B • TP-MN002',
      srs: '3.2.2',
      icon: Briefcase,
    },
    {
      id: 'WAREHOUSE',
      label: 'Nhân viên kho',
      subtext: 'Phạm Văn D • TP-WH004',
      srs: '3.2.5',
      icon: Warehouse,
    },
    {
      id: 'PRODUCTION',
      label: 'Nhân viên sản xuất',
      subtext: 'Hoàng Thị E • TP-PD005',
      srs: '3.2.3',
      icon: Factory,
    },
  ];

  const roleProfileMap: Record<
    UserRole,
    { badge: string; name: string; code: string; title: string; avatarColor: string; initials: string }
  > = {
    ADMIN: {
      badge: 'QUẢN TRỊ VIÊN',
      name: 'Nguyễn Văn A',
      code: 'TP-AD001',
      title: 'Quản trị viên',
      avatarColor: 'from-blue-600 to-indigo-700',
      initials: 'NA',
    },
    SALES: {
      badge: 'NHÂN VIÊN BÁN HÀNG',
      name: 'Lê Văn C',
      code: 'TP-SL003',
      title: 'Nhân viên bán hàng',
      avatarColor: 'from-amber-600 to-amber-400',
      initials: 'LC',
    },
    MANAGER: {
      badge: 'QUẢN LÝ',
      name: 'Trần Thị B',
      code: 'TP-MN002',
      title: 'Quản lý',
      avatarColor: 'from-purple-600 to-indigo-500',
      initials: 'TB',
    },
    WAREHOUSE: {
      badge: 'NHÂN VIÊN KHO',
      name: 'Phạm Văn D',
      code: 'TP-WH004',
      title: 'Nhân viên kho',
      avatarColor: 'from-emerald-600 to-teal-500',
      initials: 'PD',
    },
    PRODUCTION: {
      badge: 'NHÂN VIÊN SẢN XUẤT',
      name: 'Hoàng Thị E',
      code: 'TP-PD005',
      title: 'Nhân viên sản xuất',
      avatarColor: 'from-rose-600 to-pink-500',
      initials: 'HE',
    },
  };

  const userProfile = roleProfileMap[currentRole] || roleProfileMap.ADMIN;

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-40 select-none">
      {/* Left: Logo & Role Badge */}
      <div className="flex items-center gap-3">
        {/* SF Square Blue Box */}
        <div className="w-9 h-9 rounded-[8px] bg-[#1E56A0] text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-xs">
          SF
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-slate-900 tracking-tight">StockFlow</span>
            <button
              type="button"
              onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[4px] bg-[#EBF4FF] text-[#2B6CB0] font-bold text-[11px] uppercase tracking-wider hover:bg-blue-100 transition cursor-pointer"
              title="Nhấn để đổi vai trò"
            >
              <span>{userProfile.badge}</span>
              <ChevronDown size={12} className="text-[#2B6CB0]" />
            </button>
          </div>
          <div className="text-[11px] text-slate-400 font-medium">
            Công ty Tín Phát • OIMS
          </div>
        </div>
      </div>

      {/* Center: Global Search Bar */}
      <div className="flex-1 max-w-xl mx-8">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            placeholder="Tìm mã đơn, khách hàng, sản phẩm..."
            className="w-full h-10 pl-10 pr-4 rounded-[8px] bg-slate-50 border border-slate-200 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#2B6CB0] focus:bg-white transition"
          />
        </div>
      </div>

      {/* Right: User Profile Avatar & Switch Role Dropdown (Khớp 100% Ảnh 4) */}
      <div className="flex items-center gap-3 relative">
        <button
          type="button"
          onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
          className="flex items-center gap-2.5 cursor-pointer hover:bg-slate-50 p-1.5 rounded-xl transition border border-transparent hover:border-slate-200"
          title="Click để chuyển đổi phân quyền"
        >
          <div className="relative">
            <div className={`w-9 h-9 rounded-full bg-gradient-to-tr ${userProfile.avatarColor} text-white flex items-center justify-center font-bold text-xs ring-2 ring-white shadow-xs overflow-hidden`}>
              <span className="text-white text-xs font-semibold">{userProfile.initials}</span>
            </div>
          </div>
          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-800">{userProfile.name}</span>
              <span className="px-1.5 py-0.2 rounded-[3px] bg-blue-100 text-[#2B6CB0] font-mono text-[10px] font-bold">
                {userProfile.code}
              </span>
              <ChevronDown
                size={13}
                className={`text-slate-400 transition-transform duration-200 ${
                  roleDropdownOpen ? 'rotate-180 text-blue-600' : ''
                }`}
              />
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>{userProfile.title}</span>
            </div>
          </div>
        </button>

        {/* Dropdown Menu (Khớp 100% Ảnh 4) */}
        {roleDropdownOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setRoleDropdownOpen(false)} />
            <div className="absolute right-0 top-14 w-80 bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-100 p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
              {/* Header profile inside dropdown */}
              <div className="flex items-center gap-3 p-2 border-b border-slate-100 pb-3">
                <div className={`w-11 h-11 rounded-full bg-gradient-to-tr ${userProfile.avatarColor} text-white flex items-center justify-center font-bold text-sm ring-2 ring-blue-100 shadow-xs shrink-0`}>
                  <span>{userProfile.initials}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-slate-900 truncate">{userProfile.name}</div>
                  <div className="text-xs text-slate-500">
                    {currentRole === 'ADMIN' ? 'Quản trị hệ thống' : userProfile.title}
                  </div>
                  <div className="text-xs font-mono font-bold text-blue-600 mt-0.5">{userProfile.code}</div>
                </div>
              </div>

              {/* Section title */}
              <div className="px-2 pt-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                CHUYỂN ĐỔI PHÂN QUYỀN (SWITCH ROLE)
              </div>

              {/* Roles List */}
              <div className="space-y-1">
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
                      className={`w-full text-left p-2.5 rounded-xl flex items-center gap-3 transition cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50/80 border border-blue-200/80 text-blue-900 shadow-xs'
                          : 'border border-transparent hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-blue-100 text-blue-600'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        <IconComponent size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold leading-tight truncate">
                          {item.label}
                        </div>
                        <div
                          className={`text-[11px] truncate mt-0.5 ${
                            isSelected ? 'text-blue-600/80' : 'text-slate-400'
                          }`}
                        >
                          {item.subtext}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
                            isSelected
                              ? 'bg-blue-100/70 border border-blue-200 text-blue-600'
                              : 'bg-slate-50 border border-slate-200/60 text-slate-400'
                          }`}
                        >
                          {item.srs}
                        </span>
                        {isSelected && <Check size={15} className="text-blue-600 stroke-[2.5]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
};


