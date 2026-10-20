// src/features/roles/components/common/Header.tsx
// Header giao diện: Topbar chuẩn theo thiết kế AI Studio (Logo SF, Badge Role, Search input, User profile avatar Lê Văn C)

import React, { useState } from 'react';
import { UserRole } from '../../types';
import {
  ShieldCheck,
  ChevronDown,
  Search,
  Check,
  Briefcase,
  Store,
  Layers,
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

  const rolesConfig: { id: UserRole; label: string; desc: string; icon: any }[] = [
    {
      id: 'SALES',
      label: 'Nhân viên Bán hàng (Sales)',
      desc: 'Quản lý đơn hàng, công nợ & gộp đơn xuất kho',
      icon: Store,
    },
    {
      id: 'MANAGER',
      label: 'Quản lý vận hành (Manager)',
      desc: 'Duyệt hạn mức, quản lý BOM, dòng tiền & sản xuất',
      icon: Briefcase,
    },
    {
      id: 'WAREHOUSE',
      label: 'Thủ kho (Warehouse Staff)',
      desc: 'Kiểm hàng nhập kho, số lượng đạt/hỏng & vị trí Bin',
      icon: Layers,
    },
    {
      id: 'PRODUCTION',
      label: 'Sản xuất (Production Staff)',
      desc: 'Ghi nhận sản lượng ca, hao hụt & tiến độ gia công',
      icon: Briefcase,
    },
    {
      id: 'ADMIN',
      label: 'Quản trị viên (Admin)',
      desc: 'Quản lý tài khoản & phân quyền truy cập kho OIMS',
      icon: ShieldCheck,
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

  const userProfile = roleProfileMap[currentRole] || roleProfileMap.SALES;

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

      {/* Role Dropdown Menu */}
      {roleDropdownOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setRoleDropdownOpen(false)} />
          <div className="absolute top-14 left-24 w-80 bg-white text-slate-800 rounded-[8px] shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in duration-100">
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

      {/* Right: User Profile Avatar */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition">
          <div className="relative">
            {/* Avatar image circular */}
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
              <ChevronDown size={13} className="text-slate-400" />
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>{userProfile.title}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

