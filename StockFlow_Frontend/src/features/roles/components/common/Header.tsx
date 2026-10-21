import React, { useState, useEffect } from 'react';
import { UserRole, StaffAccount } from '../../types';
import {
  ShieldCheck,
  ChevronDown,
  Search,
  Check,
  Briefcase,
  Store,
  Layers,
  UserCheck,
  LogOut,
  Users,
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
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
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
        const primaryRoleStr = Array.isArray(u.roles) && u.roles.length > 0 ? u.roles[0] : (u.role || currentRole);

        const mappedRole: UserRole = primaryRoleStr.toUpperCase().includes('ADMIN')
          ? 'ADMIN'
          : primaryRoleStr.toUpperCase().includes('MGR') || primaryRoleStr.toUpperCase().includes('MANAGER')
          ? 'MANAGER'
          : primaryRoleStr.toUpperCase().includes('WAREHOUSE')
          ? 'WAREHOUSE'
          : primaryRoleStr.toUpperCase().includes('PROD')
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

    // Tải danh sách nhân viên để phục vụ dropdown đổi nhanh
    adminService.getStaffList().then((list) => {
      if (list && list.length > 0) setStaffList(list);
    });
  }, [currentRole]);

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

    // Lưu vào localStorage
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
    setUserDropdownOpen(false);
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
            <button
              type="button"
              onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[4px] bg-[#EBF4FF] text-[#2B6CB0] font-bold text-[11px] uppercase tracking-wider hover:bg-blue-100 transition cursor-pointer"
              title="Nhấn để đổi vai trò"
            >
              <span>{currentUser.role}</span>
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

      {/* Right: User Profile Avatar & Switcher Dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setUserDropdownOpen(!userDropdownOpen)}
          className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition p-1.5 rounded-lg hover:bg-slate-50"
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
              <ChevronDown size={13} className={`text-slate-400 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>{currentUser.title}</span>
            </div>
          </div>
        </button>

        {/* User Switcher Dropdown Menu */}
        {userDropdownOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setUserDropdownOpen(false)} />
            <div className="absolute top-14 right-0 w-80 bg-white text-slate-800 rounded-xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in duration-100">
              <div className="px-3.5 py-2 border-b border-slate-100">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <Users size={14} className="text-blue-600" />
                  <span>Đổi nhanh nhân viên</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Chọn tài khoản khác để trải nghiệm phân quyền
                </p>
              </div>

              <div className="max-h-64 overflow-y-auto py-1">
                {staffList.map((staff) => {
                  const isCurrent = staff.name === currentUser.name || staff.code === currentUser.code;
                  return (
                    <button
                      key={staff.id || staff.code}
                      type="button"
                      onClick={() => handleSwitchUser(staff)}
                      className={`w-full text-left px-3.5 py-2 flex items-center justify-between transition cursor-pointer hover:bg-slate-50 ${
                        isCurrent ? 'bg-blue-50/70 text-[#2B6CB0]' : 'text-slate-700'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-bold truncate flex items-center gap-1.5">
                          <span>{staff.name}</span>
                          <span className="text-[10px] font-mono text-slate-400">({staff.code})</span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {staff.department} • <span className="font-semibold text-slate-600">{staff.roleTitle}</span>
                        </div>
                      </div>
                      {isCurrent && <UserCheck size={16} className="text-[#2B6CB0] shrink-0" />}
                    </button>
                  );
                })}
              </div>

              <div className="pt-1.5 border-t border-slate-100 px-2">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
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

