// src/features/roles/components/common/Sidebar.tsx
// Navigation Tabs Bar theo giao diện AI Studio:
// Sales: [Tổng quan bán hàng] [Đơn chờ xử lý v] [Gộp đơn xuất kho v] [Ngoại lệ công nợ v] [Quản lý trả hàng v]
// Admin: [Tổng quan] [Tài khoản nhân viên v] [Phân quyền vai trò v] [Phân quyền kho v]

import React, { useState, useRef, useEffect } from 'react';
import { UserRole } from '../../types';
import {
  LayoutGrid,
  Package,
  ClipboardList,
  GitMerge,
  AlertCircle,
  RotateCcw,
  ChevronDown,
  Users,
  ShieldCheck,
  Building2,
  CheckCircle2,
  Sliders,
  MapPin,
  Warehouse,
  Inbox,
  Layers,
  ShoppingBag,
  BarChart3,
  ArrowDownToLine,
  ArrowUpFromLine,
  Repeat,
  ClipboardCheck,
  FileSpreadsheet,
  RefreshCw,
  FileText,
  BookOpen,
} from 'lucide-react';

interface DropdownItem {
  id: string;
  title: string;
  desc: string;
  icon: any;
}

interface TabConfig {
  id: string;
  label: string;
  icon: any;
  hasDropdown: boolean;
  hasBadgeDot?: boolean;
  badgeText?: string;
  badgeColor?: string;
  dropdownItems?: DropdownItem[];
}

interface SidebarProps {
  currentRole: UserRole;
  activeScreen: string;
  onNavigate: (screenId: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  productionBadge?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentRole,
  activeScreen,
  onNavigate,
  productionBadge,
}) => {
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const adminTabs: TabConfig[] = [
    {
      id: 'admin-dashboard',
      label: 'Tổng quan',
      icon: LayoutGrid,
      hasDropdown: false,
    },
    {
      id: 'admin-staff',
      label: 'Tài khoản nhân viên',
      icon: Users,
      hasDropdown: true,
      dropdownItems: [
        {
          id: 'admin-staff',
          title: 'Tất cả nhân sự',
          desc: 'Danh sách nhân viên công ty',
          icon: Users,
        },
        {
          id: 'admin-staff-active',
          title: 'Đang hoạt động',
          desc: 'Tài khoản đang khả dụng',
          icon: CheckCircle2,
        },
      ],
    },
    {
      id: 'admin-roles',
      label: 'Phân quyền vai trò',
      icon: ShieldCheck,
      hasDropdown: true,
      dropdownItems: [
        {
          id: 'admin-roles',
          title: 'Danh mục vai trò',
          desc: 'Các cấp bậc phân quyền',
          icon: ShieldCheck,
        },
        {
          id: 'admin-matrix',
          title: 'Cấu hình ma trận',
          desc: 'Quyền hạn theo phân hệ',
          icon: Sliders,
        },
      ],
    },
    {
      id: 'admin-warehouse-perms',
      label: 'Phân quyền kho',
      icon: Building2,
      hasDropdown: true,
      dropdownItems: [
        {
          id: 'admin-warehouse-perms',
          title: 'Danh sách quyền kho',
          desc: 'Ma trận nhân sự và kho',
          icon: Warehouse,
        },
        {
          id: 'admin-warehouse-facilities',
          title: 'Cơ sở kho',
          desc: 'Cách ly dữ liệu kho vật lý',
          icon: MapPin,
        },
      ],
    },
    {
      id: 'admin-goods',
      label: 'Danh mục hàng hóa',
      icon: Package,
      hasDropdown: false,
    },
  ];

  const managerTabs: TabConfig[] = [
    {
      id: 'manager-dashboard',
      label: 'Tổng quan tồn kho',
      icon: LayoutGrid,
      hasDropdown: false,
    },
    {
      id: 'manager-approvals',
      label: 'Hộp thư duyệt',
      icon: Inbox,
      hasDropdown: false,
      hasBadgeDot: true,
    },
    {
      id: 'manager-production',
      label: 'Quản trị sản xuất',
      icon: Layers,
      hasDropdown: true,
      dropdownItems: [
        {
          id: 'manager-production',
          title: 'Quản lý lệnh sản xuất',
          desc: 'Giám sát tiến độ gia công xưởng',
          icon: Layers,
        },
        {
          id: 'manager-bom',
          title: 'Cấu hình định mức BOM',
          desc: 'Định mức nguyên vật liệu sản phẩm',
          icon: Sliders,
        },
      ],
    },
    {
      id: 'manager-partners',
      label: 'Đối tác tài chính',
      icon: Users,
      hasDropdown: true,
      dropdownItems: [
        {
          id: 'manager-partners',
          title: 'Đối tác và hạn mức tín dụng',
          desc: 'Quản trị công nợ khách hàng B2B & NCC',
          icon: Users,
        },
        {
          id: 'manager-cashflow',
          title: 'Sổ quỹ thu chi',
          desc: 'Quản lý phiếu thu, chi dòng tiền',
          icon: GitMerge,
        },
      ],
    },
    {
      id: 'manager-landed-cost',
      label: 'Mua bán chi phí',
      icon: ShoppingBag,
      hasDropdown: true,
      dropdownItems: [
        {
          id: 'manager-landed-cost',
          title: 'Chi phí mua hàng & Landed Cost',
          desc: 'Phân bổ chi phí cấu thành giá vốn MAC',
          icon: ShoppingBag,
        },
      ],
    },
    {
      id: 'manager-reports',
      label: 'Báo cáo quản trị',
      icon: BarChart3,
      hasDropdown: false,
    },
    {
      id: 'manager-goods',
      label: 'Danh mục hàng hóa',
      icon: Package,
      hasDropdown: false,
    },
  ];

  const salesTabs: TabConfig[] = [
    {
      id: 'sales-dashboard',
      label: 'Tổng quan bán hàng',
      icon: LayoutGrid,
      hasDropdown: false,
    },
    {
      id: 'sales-goods',
      label: 'Danh mục hàng hóa',
      icon: Package,
      hasDropdown: false,
    },
    {
      id: 'sales-orders',
      label: 'Đơn chờ xử lý',
      icon: ClipboardList,
      hasDropdown: true,
    },
    {
      id: 'sales-consolidate',
      label: 'Gộp đơn xuất kho',
      icon: GitMerge,
      hasDropdown: true,
    },
    {
      id: 'sales-credit-limits',
      label: 'Ngoại lệ công nợ',
      icon: AlertCircle,
      hasDropdown: true,
    },
    {
      id: 'sales-returns',
      label: 'Quản lý trả hàng',
      icon: RotateCcw,
      hasDropdown: true,
    },
  ];

  const warehouseTabs: TabConfig[] = [
    {
      id: 'warehouse-overview',
      label: 'Tổng quan Kho (3.2.5.1)',
      icon: LayoutGrid,
      hasDropdown: false,
    },
    {
      id: 'warehouse-goods',
      label: 'Danh mục hàng hóa',
      icon: Package,
      hasDropdown: false,
    },
    {
      id: 'warehouse-inbound',
      label: 'Nhập kho từ Chứng từ (3.2.5.2)',
      icon: ArrowDownToLine,
      hasDropdown: false,
      badgeText: '2',
      badgeColor: 'bg-blue-600',
    },
    {
      id: 'warehouse-outbound',
      label: 'Xuất kho theo Phiếu giấy (3.2.5.4)',
      icon: ArrowUpFromLine,
      hasDropdown: false,
      badgeText: '2',
      badgeColor: 'bg-amber-600',
    },
    {
      id: 'warehouse-transfer',
      label: 'Điều chuyển Kho (3.2.5.6)',
      icon: Repeat,
      hasDropdown: false,
    },
    {
      id: 'warehouse-audit',
      label: 'Kiểm kê Giấy (3.2.5.9)',
      icon: ClipboardCheck,
      hasDropdown: false,
    },
    {
      id: 'warehouse-returns',
      label: 'Biên bản Trả hàng (3.2.5.11)',
      icon: RotateCcw,
      hasDropdown: false,
    },
  ];

  const productionTabs: TabConfig[] = [
    {
      id: 'production-orders',
      label: 'Theo dõi Lệnh sản xuất',
      icon: ClipboardList,
      hasDropdown: false,
      badgeText: productionBadge || '4',
      badgeColor: 'bg-[#1E56A0]',
    },
    {
      id: 'production-goods',
      label: 'Danh mục hàng hóa / Vật tư',
      icon: Package,
      hasDropdown: false,
    },
    {
      id: 'production-import',
      label: 'Nhận kế hoạch (Import File)',
      icon: RefreshCw,
      hasDropdown: false,
    },
    {
      id: 'production-logs',
      label: 'Sổ Nhật ký Phiếu tham chiếu',
      icon: FileText,
      hasDropdown: false,
    },
  ];

  const tabs =
    currentRole === 'ADMIN'
      ? adminTabs
      : currentRole === 'MANAGER'
      ? managerTabs
      : currentRole === 'WAREHOUSE'
      ? warehouseTabs
      : currentRole === 'PRODUCTION'
      ? productionTabs
      : salesTabs;

  const isTabActive = (tab: TabConfig) => {
    if (tab.id === activeScreen) return true;
    if (tab.dropdownItems?.some((sub) => sub.id === activeScreen)) return true;
    if (tab.id === 'admin-staff' && activeScreen === 'admin-staff-active') return true;
    if (tab.id === 'admin-roles' && activeScreen === 'admin-matrix') return true;
    if (tab.id === 'admin-warehouse-perms' && activeScreen === 'admin-warehouse-facilities') return true;
    if (tab.id === 'manager-production' && activeScreen === 'manager-bom') return true;
    if (tab.id === 'manager-partners' && activeScreen === 'manager-cashflow') return true;
    if (activeScreen === 'goods-catalog' && tab.id.endsWith('-goods')) return true;
    return false;
  };

  return (
    <div ref={containerRef} className="bg-white border-b border-slate-200 px-6 py-2 flex items-center justify-between gap-2 select-none relative z-30">
      <div className="flex items-center gap-2 overflow-x-auto">
        {tabs.map((tab) => {
          const active = isTabActive(tab);
          const Icon = tab.icon;
          const isOpen = openDropdownId === tab.id;

          return (
            <div key={tab.id} className="relative shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (tab.hasDropdown && tab.dropdownItems && tab.dropdownItems.length > 0) {
                    if (isOpen) {
                      setOpenDropdownId(null);
                    } else {
                      setOpenDropdownId(tab.id);
                      onNavigate(tab.id);
                    }
                  } else {
                    setOpenDropdownId(null);
                    onNavigate(tab.id);
                  }
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-[8px] text-xs font-semibold transition cursor-pointer border ${
                  active
                    ? 'bg-blue-50/80 text-[#2B6CB0] border-blue-200 shadow-2xs'
                    : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon size={14} className={active ? 'text-[#2B6CB0]' : 'text-slate-500'} />
                <span>{tab.label}</span>
                {tab.hasBadgeDot && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                )}
                {tab.badgeText && (
                  <span
                    className={`w-4 h-4 rounded-full text-white text-[10px] font-bold flex items-center justify-center ${
                      tab.badgeColor || 'bg-blue-600'
                    }`}
                  >
                    {tab.badgeText}
                  </span>
                )}
                {tab.hasDropdown && (
                  <ChevronDown
                    size={12}
                    className={`transition-transform duration-150 ${active ? 'text-[#2B6CB0]' : 'text-slate-400'} ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                )}
              </button>


            {/* Dropdown Menu Modal */}
            {isOpen && tab.dropdownItems && (
              <div className="absolute top-full left-0 mt-1.5 w-64 bg-white rounded-[10px] shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in duration-100">
                {tab.dropdownItems.map((item) => {
                  const ItemIcon = item.icon;
                  const isItemActive = activeScreen === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setOpenDropdownId(null);
                        onNavigate(item.id);
                      }}
                      className={`w-full text-left px-3.5 py-2.5 flex items-start gap-3 transition cursor-pointer hover:bg-blue-50/70 ${
                        isItemActive ? 'bg-blue-50 text-[#2B6CB0]' : 'text-slate-700'
                      }`}
                    >
                      <div className={`mt-0.5 p-1 rounded-[6px] shrink-0 ${isItemActive ? 'text-[#2B6CB0]' : 'text-slate-400'}`}>
                        <ItemIcon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold leading-tight">{item.title}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5 leading-tight">{item.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      </div>

      {/* Right shortcut prompt for Warehouse Desktop data entry */}
      {currentRole === 'WAREHOUSE' && (
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-50 border border-slate-200 text-[11px] text-slate-500 font-medium shrink-0">
          <span>Phím</span>
          <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono font-bold text-slate-700 shadow-2xs">
            Tab
          </kbd>
          <span>/</span>
          <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono font-bold text-slate-700 shadow-2xs">
            Enter
          </kbd>
          <span>nhập liệu nhanh</span>
        </div>
      )}

      {/* Right Action Button for Production Staff: Nhập báo cáo giấy */}
      {currentRole === 'PRODUCTION' && (
        <button
          type="button"
          onClick={() => onNavigate('production-open-report-modal')}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#1E56A0] hover:bg-[#16437E] text-white text-xs font-semibold shadow-2xs transition cursor-pointer shrink-0"
        >
          <FileText size={14} />
          <span>Nhập báo cáo giấy</span>
        </button>
      )}
    </div>
  );
};

