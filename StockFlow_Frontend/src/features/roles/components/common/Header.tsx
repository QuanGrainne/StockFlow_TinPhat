// src/features/roles/components/common/Header.tsx
// Header giao diện: Topbar chuẩn theo thiết kế AI Studio (Logo SF, Badge Role, Search input, User profile avatar & Switch Role dropdown khớp Ảnh 4)

import React, { useState, useEffect } from 'react';
import { UserRole, StaffAccount } from '../../types';
import {
  Shield,
  ChevronDown,
  Search,
  Check,
  Briefcase,
  Store,
  Layers,
  UserCheck,
  LogOut,
  Users,
  Warehouse,
  Factory,
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [currentUser, setCurrentUser] = useState<{
    name: string;
    code: string;
    title: string;
    role: UserRole;
    initials: string;
    avatarColor: string;
  }>({
    name: 'Quản trị viên',
    code: 'NV-ADMIN',
    title: 'Quản trị hệ thống',
    role: currentRole,
    initials: 'AD',
    avatarColor: 'from-blue-600 to-indigo-700',
  });
  const [staffList, setStaffList] = useState<StaffAccount[]>([]);

  // Đọc thông tin user đăng nhập thực tế từ localStorage
  useEffect(() => {
    const rawUser = typeof window !== 'undefined' ? localStorage.getItem('stockflow_user') : null;
    if (rawUser) {
      try {
        const u = JSON.parse(rawUser);
        const name = u.fullName || u.username || 'Người dùng';
        const code = u.code || `NV-NV${String(u.userId || 1).padStart(3, '0')}`;
        const rawRoleStr = currentRole || (Array.isArray(u.roles) && u.roles.length > 0 ? u.roles[0] : (u.role || 'SALES'));

        const mappedRole: UserRole = rawRoleStr.toUpperCase().includes('ADMIN')
          ? 'ADMIN'
          : rawRoleStr.toUpperCase().includes('MGR') || rawRoleStr.toUpperCase().includes('MANAGER')
          ? 'MANAGER'
          : rawRoleStr.toUpperCase().includes('WAREHOUSE')
          ? 'WAREHOUSE'
          : rawRoleStr.toUpperCase().includes('PROD')
          ? 'PRODUCTION'
          : 'SALES';

        const words = name.trim().split(/\s+/);
        const initials = words.length > 1
          ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
          : name.slice(0, 2).toUpperCase();

        const roleTitleMap: Record<UserRole, { title: string; color: string }> = {
          ADMIN: { title: 'Quản trị viên', color: 'from-blue-600 to-indigo-700' },
          MANAGER: { title: 'Quản lý vận hành', color: 'from-purple-600 to-indigo-500' },
          SALES: { title: 'Nhân viên bán hàng', color: 'from-amber-600 to-amber-500' },
          WAREHOUSE: { title: 'Thủ kho', color: 'from-emerald-600 to-teal-500' },
          PRODUCTION: { title: 'Nhân viên sản xuất', color: 'from-rose-600 to-pink-500' },
        };

        const { title, color } = roleTitleMap[mappedRole] || roleTitleMap.SALES;

        setCurrentUser({
          name,
          code,
          title,
          role: mappedRole,
          initials,
          avatarColor: color,
        });
      } catch (e) {
        console.error('Failed to parse current user:', e);
      }
    }

    // Tải danh sách nhân viên để phục vụ đổi nhanh
    adminService.getStaffList().then((list) => {
      if (list && list.length > 0) setStaffList(list);
    });
  }, [currentRole]);

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

  // Chuyển nhanh sang nhân viên khác
  const handleSwitchUser = (staff: StaffAccount) => {
    const words = staff.name.trim().split(/\s+/);
    const initials = words.length > 1
      ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
      : staff.name.slice(0, 2).toUpperCase();

    const roleTitleMap: Record<UserRole, { color: string }> = {
      ADMIN: { color: 'from-blue-600 to-indigo-700' },
      MANAGER: { color: 'from-purple-600 to-indigo-500' },
      SALES: { color: 'from-amber-600 to-amber-500' },
      WAREHOUSE: { color: 'from-emerald-600 to-teal-500' },
      PRODUCTION: { color: 'from-rose-600 to-pink-500' },
    };

    const color = roleTitleMap[staff.role]?.color || 'from-blue-600 to-indigo-700';

    const numericId = parseInt(staff.id.replace(/\D/g, ''), 10) || 1;
    const updatedStorage = {
      userId: numericId,
      username: staff.email.split('@')[0],
      fullName: staff.name,
      code: staff.code,
      email: staff.email,
      roles: [staff.role],
    };
    localStorage.setItem('stockflow_user', JSON.stringify(updatedStorage));

    setCurrentUser({
      name: staff.name,
      code: staff.code,
      title: staff.title || staff.roleTitle,
      role: staff.role,
      initials,
      avatarColor: color,
    });

    onRoleChange(staff.role);
    setRoleDropdownOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('stockflow_token');
    localStorage.removeItem('stockflow_user');
    router.push('/login');
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-40 select-none">
      {/* Left: Logo & Role Badge */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-[8px] bg-[#1E56A0] text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-xs">
          SF
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-slate-900 tracking-tight">StockFlow</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[4px] bg-[#EBF4FF] text-[#2B6CB0] font-bold text-[11px] uppercase tracking-wider">
              {currentUser.role}
            </span>
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
          title="Click để chuyển đổi phân quyền & tài khoản"
        >
          <div className="relative">
            <div className={`w-9 h-9 rounded-full bg-gradient-to-tr ${currentUser.avatarColor} text-white flex items-center justify-center font-bold text-xs ring-2 ring-white shadow-xs overflow-hidden`}>
              <span className="text-white text-xs font-semibold">{currentUser.initials}</span>
            </div>
          </div>
          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-800">{currentUser.name}</span>
              <span className="px-1.5 py-0.2 rounded-[3px] bg-blue-100 text-[#2B6CB0] font-mono text-[10px] font-bold">
                {currentUser.code}
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
              <span>{currentUser.title}</span>
            </div>
          </div>
        </button>

        {/* Dropdown Menu (Khớp 100% Ảnh 4 + Đổi tài khoản + Đăng xuất) */}
        {roleDropdownOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setRoleDropdownOpen(false)} />
            <div className="absolute right-0 top-14 w-84 bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-100 p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
              {/* Header profile inside dropdown */}
              <div className="flex items-center gap-3 p-2 border-b border-slate-100 pb-3">
                <div className={`w-11 h-11 rounded-full bg-gradient-to-tr ${currentUser.avatarColor} text-white flex items-center justify-center font-bold text-sm ring-2 ring-blue-100 shadow-xs shrink-0`}>
                  <span>{currentUser.initials}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-slate-900 truncate">{currentUser.name}</div>
                  <div className="text-xs text-slate-500 truncate">{currentUser.title}</div>
                  <div className="text-xs font-mono font-bold text-blue-600 mt-0.5">{currentUser.code}</div>
                </div>
              </div>

              {/* Section 1: Switch Role (Ảnh 4) */}
              <div className="px-2 pt-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                CHUYỂN ĐỔI PHÂN QUYỀN (SWITCH ROLE)
              </div>
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
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-blue-100 text-blue-600'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        <IconComponent size={16} />
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
                        {isSelected && <Check size={14} className="text-blue-600 stroke-[2.5]" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Section 2: Quick switch staff account */}
              {staffList.length > 0 && (
                <>
                  <div className="px-2 pt-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-t border-slate-100 mt-2">
                    ĐỔI NHANH NHÂN VIÊN
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-0.5">
                    {staffList.slice(0, 5).map((staff) => {
                      const isCurrent = staff.name === currentUser.name || staff.code === currentUser.code;
                      return (
                        <button
                          key={staff.id || staff.code}
                          type="button"
                          onClick={() => handleSwitchUser(staff)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs transition cursor-pointer hover:bg-slate-50 ${
                            isCurrent ? 'bg-blue-50/70 text-blue-700 font-bold' : 'text-slate-700'
                          }`}
                        >
                          <span className="truncate">{staff.name} ({staff.code})</span>
                          {isCurrent && <UserCheck size={14} className="text-blue-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Section 3: Logout button */}
              <div className="pt-2 border-t border-slate-100 mt-2">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                >
                  <LogOut size={14} />
                  <span>Đăng xuất khỏi hệ thống</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
};
