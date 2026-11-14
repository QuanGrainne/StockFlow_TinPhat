// src/components/layout/Header.tsx
// Header giao diện: Topbar chuẩn theo thiết kế AI Studio (Logo Tín Phát, Badge Role, Search input, User profile avatar & Switch Role dropdown khớp Ảnh 4)

import { tabSession } from '@/lib/auth/tabSession';
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { UserRole, StaffAccount, WarehouseFacility } from '@/features/admin/types';
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
  KeyRound,
  Users,
  Warehouse,
  Factory,
  MapPin,
  Building2,
  AlertTriangle,
} from 'lucide-react';
import { adminService } from '@/features/admin/services/adminService';
import { useRouter } from 'next/navigation';
import { setActiveWarehouseGlobal, useAuthorizedWarehouses } from '@/lib/warehouse/useActiveWarehouse';
import { ROLE_SWITCHER_ENABLED } from '@/lib/auth/flags';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { ChangePasswordModal } from '@/components/layout/ChangePasswordModal';

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
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [facilities, setFacilities] = useState<WarehouseFacility[]>([]);
  // Kho được phân quyền lấy từ server (GET /api/warehouses/my-warehouses), Admin: tất cả kho đang hoạt động
  const { warehouses: authorizedWarehouses, loaded: authorizedLoaded } = useAuthorizedWarehouses();
  const [selectedBranch, setSelectedBranch] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = tabSession.get('stockflow_selected_branch');
      if (stored && stored !== 'ALL') return stored;
    }
    return 'Kho Tổng Gia Lâm';
  });
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [branchSearch, setBranchSearch] = useState('');
  const [currentUser, setCurrentUser] = useState<{
    name: string;
    code: string;
    title: string;
    role: UserRole;
    initials: string;
    avatarColor: string;
    avatar?: string | null;
  }>({
    name: 'Quản trị viên',
    code: 'NV-ADMIN',
    title: 'Quản trị hệ thống',
    role: currentRole,
    initials: 'QT',
    avatarColor: 'from-blue-600 to-indigo-700',
    avatar: null,
  });
  const [staffList, setStaffList] = useState<StaffAccount[]>([]);

  // Đọc thông tin user đăng nhập thực tế từ localStorage và đồng bộ avatar
  useEffect(() => {
    const rawUser = typeof window !== 'undefined' ? tabSession.get('stockflow_user') : null;
    let u: any = null;
    if (rawUser) {
      try {
        u = JSON.parse(rawUser);
      } catch (e) {
        console.error('Failed to parse current user:', e);
      }
    }

    if (u) {
      const name = u.fullName || u.username || 'Người dùng';
      const code = u.code || `NV-NV${String(u.userId || 1).padStart(3, '0')}`;
      const userRolesList = Array.isArray(u.roles) ? u.roles : [];
      const userPrimaryRole = userRolesList.length > 0 ? userRolesList[0] : (u.role || '');
      const rawRoleStr = currentRole || userPrimaryRole || 'SALES';

      const mappedRole: UserRole = rawRoleStr.toUpperCase().includes('ADMIN')
        ? 'ADMIN'
        : rawRoleStr.toUpperCase().includes('MGR') || rawRoleStr.toUpperCase().includes('MANAGER')
        ? 'MANAGER'
        : rawRoleStr.toUpperCase().includes('WAREHOUSE') || rawRoleStr.toUpperCase().includes('KHO')
        ? 'WAREHOUSE'
        : rawRoleStr.toUpperCase().includes('PROD') || rawRoleStr.toUpperCase().includes('SANXUAT')
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
        title: (currentRole && currentRole !== userPrimaryRole) ? title : (u.title || title),
        role: mappedRole,
        initials,
        avatarColor: color,
        avatar: u.avatar || null,
      });
    }

    // Tải danh sách nhân viên để phục vụ đổi nhanh và bổ sung avatar/kho nếu user thiếu.
    // API /api/Staff cần quyền AUTH_READ: nhân viên thường sẽ bị 403 và service rơi về dữ liệu mock,
    // dễ ghép nhầm dữ liệu giả vào tài khoản thật, nên chỉ gọi khi bật demo hoặc là Admin.
    const isAdminUser =
      Array.isArray(u?.roles) && u.roles.some((r: string) => String(r).toUpperCase().includes('ADMIN'));
    const staffListPromise: Promise<StaffAccount[]> =
      ROLE_SWITCHER_ENABLED || isAdminUser ? adminService.getStaffList() : Promise.resolve([]);
    staffListPromise.then((list) => {
      if (list && list.length > 0) {
        setStaffList(list);

        if (u) {
          const matched = list.find(
            (s) =>
              (s.username && u.username && s.username.toLowerCase() === u.username.toLowerCase()) ||
              (s.code && u.code && s.code.toUpperCase() === u.code.toUpperCase()) ||
              (s.email && u.email && s.email.toLowerCase() === u.email.toLowerCase()) ||
              (s.name && u.fullName && s.name.toLowerCase() === u.fullName.toLowerCase())
          );
          if (matched) {
            setCurrentUser((prev) => ({
              ...prev,
              avatar: prev.avatar || matched.avatar || null,
              code: prev.code || matched.code,
              title: prev.title || matched.title || matched.roleTitle,
            }));
          }
        }
      }
    }).catch(() => undefined); // T18: getStaffList ném lỗi khi API lỗi; ở đây chỉ để lấy avatar nên bỏ qua.

    // Tải danh sách cơ sở kho thực tế từ DB/Cache
    adminService.getWarehouseFacilities().then((facs) => {
      if (facs && facs.length > 0) {
        setFacilities(facs);
      }
    });

    const storedBranch = typeof window !== 'undefined' ? tabSession.get('stockflow_selected_branch') : null;
    if (storedBranch && storedBranch !== 'ALL') {
      setSelectedBranch(storedBranch);
    }

    const handleBranchSync = (e: any) => {
      if (e.detail?.branch && e.detail.branch !== 'ALL') {
        setSelectedBranch(e.detail.branch);
      }
    };
    const handleActiveWarehouseSync = (e: any) => {
      const wh = e.detail;
      if (wh && wh.name && wh.name !== selectedBranch) {
        setSelectedBranch(wh.name);
      }
    };
    window.addEventListener('stockflow_branch_changed', handleBranchSync);
    window.addEventListener('stockflow:warehouse-changed', handleActiveWarehouseSync);
    return () => {
      window.removeEventListener('stockflow_branch_changed', handleBranchSync);
      window.removeEventListener('stockflow:warehouse-changed', handleActiveWarehouseSync);
    };
  }, [currentRole, selectedBranch]);

  // Danh sách kho ĐƯỢC PHÂN QUYỀN (Data Isolation): lấy đúng theo server, kể cả kho mới tạo.
  // Thông tin chi tiết (địa chỉ...) bổ sung từ danh mục kho nếu có.
  const permittedFacilities = useMemo<WarehouseFacility[]>(() => {
    if (!authorizedLoaded) return [];
    return authorizedWarehouses.map(
      (w) =>
        facilities.find((f) => f.warehouseId === w.warehouseId) ?? {
          id: w.code,
          warehouseId: w.warehouseId,
          code: w.code,
          name: w.name,
          address: '',
          staffCount: 0,
          area: '',
          status: 'ACTIVE',
        }
    );
  }, [authorizedLoaded, authorizedWarehouses, facilities]);

  // Auto-validate và tự động đồng bộ stockflow_selected_branch theo quyền kho
  useEffect(() => {
    if (!authorizedLoaded) return;

    if (permittedFacilities.length === 0) {
      // Trường hợp tài khoản chưa được gán kho nào
      if (selectedBranch !== '') {
        setSelectedBranch('');
        if (typeof window !== 'undefined') {
          tabSession.remove('stockflow_selected_branch');
          window.dispatchEvent(
            new CustomEvent('stockflow_branch_changed', {
              detail: { branch: '', branchName: '' },
            })
          );
        }
      }
      return;
    }

    // Kiểm tra xem kho hiện tại có nằm trong danh sách kho được phân quyền không
    const isValidInPermitted = permittedFacilities.some(
      (f) =>
        f.name === selectedBranch ||
        f.code === selectedBranch ||
        (selectedBranch && (selectedBranch.includes(f.name) || selectedBranch.includes(f.code)))
    );

    // Mọi vai trò (kể cả Admin) chỉ được chọn kho trong danh sách được phân quyền
    if (isValidInPermitted) {
      return;
    }

    if (!isValidInPermitted) {
      // Tự động chuyển về kho đầu tiên được phân quyền
      const firstBranch = permittedFacilities[0].name;
      setSelectedBranch(firstBranch);
      if (typeof window !== 'undefined') {
        tabSession.set('stockflow_selected_branch', firstBranch);
        window.dispatchEvent(
          new CustomEvent('stockflow_branch_changed', {
            detail: { branch: firstBranch, branchName: firstBranch },
          })
        );
      }
    }
  }, [permittedFacilities, facilities, authorizedLoaded, selectedBranch]);

  const handleSelectBranch = (codeOrName: string) => {
    const fac = permittedFacilities.find((f) => f.code === codeOrName || f.name === codeOrName);
    const branchName = fac ? fac.name : codeOrName;
    setSelectedBranch(branchName);
    if (typeof window !== 'undefined') {
      tabSession.set('stockflow_selected_branch', branchName);
      window.dispatchEvent(
        new CustomEvent('stockflow_branch_changed', {
          detail: {
            branch: branchName,
            branchName: branchName,
          },
        })
      );
      // Đổi kho làm việc toàn hệ thống (mọi kho được phân quyền, kể cả kho mới tạo)
      const matchingWh = authorizedWarehouses.find(
        (w) => w.warehouseId === fac?.warehouseId || w.name.toLowerCase() === branchName.toLowerCase()
      );
      if (matchingWh) {
        setActiveWarehouseGlobal(matchingWh);
      }
    }
    setBranchDropdownOpen(false);
  };

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
    if (!ROLE_SWITCHER_ENABLED) return;
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
    const staffWarehouses = (staff.assignedWarehouses || []).map((w) => String(w).trim().toUpperCase()).filter(Boolean);
    const updatedStorage = {
      userId: numericId,
      username: staff.username || (staff.email ? staff.email.split('@')[0] : ''),
      fullName: staff.name,
      code: staff.code,
      email: staff.email,
      roles: [staff.role],
      title: staff.title || staff.roleTitle,
      avatar: staff.avatar || null,
      assignedWarehouses: staffWarehouses,
      warehouses: staffWarehouses.map((w) => ({
        warehouseCode: w,
        warehouseName: w,
      })),
    };
    tabSession.set('stockflow_user', JSON.stringify(updatedStorage));
    tabSession.set('stockflow_current_role', staff.role);

    // Bộ đổi vai trò chỉ đổi giao diện; danh sách kho vẫn theo tài khoản đăng nhập thật (JWT)

    setCurrentUser({
      name: staff.name,
      code: staff.code,
      title: staff.title || staff.roleTitle,
      role: staff.role,
      initials,
      avatarColor: color,
      avatar: staff.avatar || null,
    });

    onRoleChange(staff.role);
    setRoleDropdownOpen(false);
  };

  const handleLogout = () => {
    tabSession.remove('stockflow_token');
    tabSession.remove('stockflow_user');
    tabSession.remove('stockflow_current_role');
    tabSession.remove('stockflow_active_screen');
    router.push('/login');
  };

  return (
    <header className="min-h-16 bg-white/85 border-b border-slate-200 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-3 sm:px-6 py-2 sticky top-0 z-40 select-none">
      {/* Left: Logo & Role Badge */}
      <div className="flex items-center gap-3 min-w-0">
        <BrandLogo width={56} className="shrink-0" priority />
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

      {/* Right: Branch Selector (Khớp Ảnh 1 KiotViet) & User Profile */}
      <div className="flex flex-wrap items-center gap-3 relative ml-auto">
        {/* Bộ chọn Chi Nhánh Kho theo Phân Quyền (Data Isolation) */}
        {!authorizedLoaded ? null : permittedFacilities.length === 0 ? (
          <div
            className="h-9 px-3 rounded-lg border border-amber-300 bg-amber-50 text-xs text-amber-800 flex items-center gap-2 shadow-2xs select-none cursor-not-allowed"
            title="Tài khoản chưa được phân quyền kho làm việc. Vui lòng liên hệ Quản trị viên."
          >
            <div className="w-5 h-5 rounded-md bg-amber-200 text-amber-800 flex items-center justify-center shrink-0">
              <AlertTriangle size={12} />
            </div>
            <div className="text-left font-semibold text-amber-800 truncate">
              Chưa gán kho làm việc
            </div>
          </div>
        ) : permittedFacilities.length === 1 ? (
          <div
            className="h-9 px-3 rounded-lg border border-slate-200 bg-slate-50/90 text-xs text-slate-800 flex items-center gap-2 shadow-2xs select-none"
            title={`Kho làm việc cố định: ${permittedFacilities[0].name}`}
          >
            <div className="w-5 h-5 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <Warehouse size={12} />
            </div>
            <div className="text-left max-w-[130px] sm:max-w-[170px] truncate">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none">
                Kho làm việc
              </div>
              <div className="font-bold text-slate-800 truncate leading-tight" suppressHydrationWarning>
                {permittedFacilities[0].name}
              </div>
            </div>
          </div>
        ) : (
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setBranchDropdownOpen(!branchDropdownOpen);
                setRoleDropdownOpen(false);
              }}
              className="h-9 px-3 rounded-lg border border-slate-200 bg-slate-50/90 hover:bg-white hover:border-blue-400 text-xs text-slate-800 flex items-center gap-2 transition cursor-pointer shadow-2xs"
              title="Click để chọn chi nhánh kho làm việc"
            >
              <div className="w-5 h-5 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <Warehouse size={12} />
              </div>
              <div className="text-left max-w-[130px] sm:max-w-[160px] truncate">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none">
                  Kho làm việc
                </div>
                <div className="font-bold text-slate-800 truncate leading-tight">
                  {permittedFacilities.find((f) => f.code === selectedBranch || f.name === selectedBranch)?.name ||
                    selectedBranch ||
                    permittedFacilities[0].name}
                </div>
              </div>
              <ChevronDown
                size={13}
                className={`text-slate-400 transition-transform duration-200 ${
                  branchDropdownOpen ? 'rotate-180 text-blue-600' : ''
                }`}
              />
            </button>

            {/* Popup Dropdown Chọn Chi Nhánh Kho */}
            {branchDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setBranchDropdownOpen(false)} />
                <div className="absolute right-0 top-11 w-80 max-w-[calc(100vw-1.5rem)] bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-200/90 p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-2 pb-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between border-b border-slate-100">
                    <span>Chi nhánh kho làm việc</span>
                    <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full">
                      {permittedFacilities.length} cơ sở kho khả dụng
                    </span>
                  </div>

                  {/* Ô tìm kiếm kho (nếu > 3 kho) */}
                  {permittedFacilities.length > 3 && (
                    <div className="relative my-2">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={branchSearch}
                        onChange={(e) => setBranchSearch(e.target.value)}
                        placeholder="Tìm theo tên kho, mã kho..."
                        className="w-full h-8 pl-8 pr-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
                        autoFocus
                      />
                    </div>
                  )}

                  {/* Danh sách các kho ĐƯỢC PHÂN QUYỀN (Ẩn toàn bộ kho không có quyền) */}
                  <div className="max-h-64 overflow-y-auto space-y-1 pr-1 mt-1">
                    {permittedFacilities
                      .filter(
                        (f) =>
                          f.name.toLowerCase().includes(branchSearch.toLowerCase()) ||
                          f.code.toLowerCase().includes(branchSearch.toLowerCase())
                      )
                      .map((fac) => {
                        const isSelected = selectedBranch === fac.name || selectedBranch === fac.code;
                        return (
                          <button
                            key={fac.id || fac.code}
                            type="button"
                            onClick={() => handleSelectBranch(fac.name)}
                            className={`w-full text-left p-2 rounded-xl flex items-center justify-between transition cursor-pointer ${
                              isSelected
                                ? 'bg-blue-50 border border-blue-200 text-blue-900 font-bold'
                                : 'border border-transparent hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 font-mono text-[10px] font-bold">
                                {fac.code.slice(0, 4)}
                              </div>
                              <div className="truncate">
                                <div className="text-xs font-bold truncate">{fac.name}</div>
                                <div className="text-[10px] text-slate-400 truncate">{fac.address}</div>
                              </div>
                            </div>
                            {isSelected && <Check size={15} className="text-blue-600 stroke-[2.5]" />}
                          </button>
                        );
                      })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
          className="flex items-center gap-2.5 cursor-pointer hover:bg-slate-50 p-1.5 rounded-xl transition border border-transparent hover:border-slate-200"
          title="Click để chuyển đổi phân quyền & tài khoản"
        >
          <div className="relative">
            {currentUser.avatar ? (
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-9 h-9 rounded-full object-cover ring-2 ring-white shadow-xs"
              />
            ) : (
              <div className={`w-9 h-9 rounded-full bg-gradient-to-tr ${currentUser.avatarColor} text-white flex items-center justify-center font-bold text-xs ring-2 ring-white shadow-xs overflow-hidden`}>
                <span className="text-white text-xs font-semibold">{currentUser.initials}</span>
              </div>
            )}
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
            <div className="absolute right-0 top-14 w-84 max-w-[calc(100vw-1.5rem)] bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-100 p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
              {/* Header profile inside dropdown */}
              <div className="flex items-center gap-3 p-2 border-b border-slate-100 pb-3">
                {currentUser.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-11 h-11 rounded-full object-cover ring-2 ring-blue-100 shadow-xs shrink-0"
                  />
                ) : (
                  <div className={`w-11 h-11 rounded-full bg-gradient-to-tr ${currentUser.avatarColor} text-white flex items-center justify-center font-bold text-sm ring-2 ring-blue-100 shadow-xs shrink-0`}>
                    <span>{currentUser.initials}</span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-slate-900 truncate">{currentUser.name}</div>
                  <div className="text-xs text-slate-500 truncate">{currentUser.title}</div>
                  <div className="text-xs font-mono font-bold text-blue-600 mt-0.5">{currentUser.code}</div>
                </div>
              </div>

              {/* Section 1: Switch Role (Ảnh 4) — chỉ hiện khi bật cờ demo ROLE_SWITCHER_ENABLED */}
              {ROLE_SWITCHER_ENABLED && (
              <>
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
              </>
              )}

              {/* Section 2: Quick switch staff account — chỉ hiện khi bật cờ demo ROLE_SWITCHER_ENABLED */}
              {ROLE_SWITCHER_ENABLED && staffList.length > 0 && (
                <>
                  <div className="px-2 pt-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-t border-slate-100 mt-2">
                    ĐỔI NHANH NHÂN VIÊN
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {staffList.slice(0, 10).map((staff) => {
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
                          <div className="flex items-center gap-2 min-w-0">
                            {staff.avatar ? (
                              <img src={staff.avatar} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[9px] font-bold shrink-0">
                                {staff.name.slice(0, 1).toUpperCase()}
                              </div>
                            )}
                            <div className="truncate">
                              <span className="font-semibold">{staff.name}</span>{' '}
                              <span className="font-mono text-[10px] text-slate-400">({staff.code})</span>
                            </div>
                          </div>
                          {isCurrent && <UserCheck size={14} className="text-blue-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Section 3: Đổi mật khẩu + Đăng xuất */}
              <div className="pt-2 border-t border-slate-100 mt-2 space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setRoleDropdownOpen(false);
                    setChangePasswordOpen(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition cursor-pointer"
                >
                  <KeyRound size={14} className="text-[#0071BA]" />
                  <span>Đổi mật khẩu</span>
                </button>
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

      {/* Form Đổi mật khẩu: render ra body vì khung Header có backdrop-blur (giới hạn phần tử fixed) */}
      {changePasswordOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <ChangePasswordModal open={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} />,
          document.body
        )}
    </header>
  );
};
