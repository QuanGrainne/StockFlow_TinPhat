// src/features/roles/components/common/Sidebar.tsx
// Navigation Tabs Bar theo giao diện AI Studio:
// Sales: [Tổng quan bán hàng] [Đơn chờ xử lý v] [Gộp đơn xuất kho v] [Ngoại lệ công nợ v] [Quản lý trả hàng v]
// Admin: [Tổng quan] [Tài khoản nhân viên v] [Phân quyền vai trò v] [Phân quyền kho v]

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  DollarSign,
} from 'lucide-react';
import { permissionService } from '../../services/permissionService';

interface DropdownItem {
  id: string;
  title: string;
  desc: string;
  icon: any;
  requiredModule?: string;
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
  requiredModule?: string;
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
  const router = useRouter();
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [allowedModules, setAllowedModules] = useState<Set<string> | null>(null);
  const [allowedFeatures, setAllowedFeatures] = useState<Set<string> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = (tabId: string) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setOpenDropdownId(tabId);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setOpenDropdownId(null);
    }, 180);
  };

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const fetchAllowedModules = async () => {
    const roleCode = `ROLE_${currentRole}`;
    try {
      const keys = await permissionService.getAllowedModuleKeys(roleCode);
      const featKeys = await permissionService.getAllowedFeatures(roleCode);
      setAllowedModules(keys);
      setAllowedFeatures(featKeys);
    } catch {
      setAllowedModules(null);
      setAllowedFeatures(null);
    }
  };

  useEffect(() => {
    fetchAllowedModules();

    const handleUpdate = () => {
      fetchAllowedModules();
    };

    window.addEventListener('stockflow_permissions_updated', handleUpdate);
    return () => {
      window.removeEventListener('stockflow_permissions_updated', handleUpdate);
    };
  }, [currentRole]);

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
      requiredModule: 'AUTH',
      dropdownItems: [
        {
          id: 'admin-staff',
          title: 'Tất cả nhân sự',
          desc: 'Danh sách nhân viên công ty',
          icon: Users,
          requiredModule: 'AUTH',
        },
        {
          id: 'admin-staff-active',
          title: 'Đang hoạt động',
          desc: 'Tài khoản đang khả dụng',
          icon: CheckCircle2,
          requiredModule: 'AUTH',
        },
      ],
    },
    {
      id: 'admin-roles',
      label: 'Phân quyền vai trò',
      icon: ShieldCheck,
      hasDropdown: true,
      requiredModule: 'AUTH',
      dropdownItems: [
        {
          id: 'admin-roles',
          title: 'Danh mục vai trò',
          desc: 'Các cấp bậc phân quyền',
          icon: ShieldCheck,
          requiredModule: 'AUTH',
        },
        {
          id: 'admin-matrix',
          title: 'Phân quyền chức năng',
          desc: 'Quyền hạn theo vai trò',
          icon: Sliders,
          requiredModule: 'AUTH',
        },
      ],
    },
    {
      id: 'admin-warehouse-perms',
      label: 'Phân quyền kho',
      icon: Building2,
      hasDropdown: true,
      requiredModule: 'AUTH',
      dropdownItems: [
        {
          id: 'admin-warehouse-perms',
          title: 'Danh sách quyền kho',
          desc: 'Phân quyền kho cho nhân sự',
          icon: Warehouse,
          requiredModule: 'AUTH',
        },
        {
          id: 'admin-warehouse-facilities',
          title: 'Cơ sở kho',
          desc: 'Danh sách cơ sở kho',
          icon: MapPin,
          requiredModule: 'AUTH',
        },
      ],
    },
    {
      id: 'admin-goods-group',
      label: 'Hàng hóa',
      icon: Package,
      hasDropdown: true,
      requiredModule: 'GOODS',
      dropdownItems: [
        {
          id: 'admin-goods',
          title: 'Danh mục hàng hóa',
          desc: 'Quản lý mã hàng, tồn kho và danh mục',
          icon: Package,
          requiredModule: 'GOODS',
        },
        {
          id: 'admin-price-books',
          title: 'Thiết lập bảng giá',
          desc: 'Bảng giá bán, công thức giá động đa kho',
          icon: DollarSign,
          requiredModule: 'GOODS',
        },
      ],
    },
    {
      id: 'suppliers',
      label: 'Nhà cung cấp',
      icon: Building2,
      hasDropdown: false,
    },
    {
      id: 'sales-orders',
      label: 'Bán hàng',
      icon: ShoppingBag,
      hasDropdown: true,
      requiredModule: 'SALES',
      dropdownItems: [
        {
          id: 'sales-dashboard',
          title: 'Tổng quan bán hàng',
          desc: 'Báo cáo doanh số và đơn hàng',
          icon: LayoutGrid,
          requiredModule: 'SALES',
        },
        {
          id: 'sales-orders',
          title: 'Đơn chờ xử lý',
          desc: 'Tiếp nhận đơn hàng mới',
          icon: ClipboardList,
          requiredModule: 'SALES',
        },
        {
          id: 'sales-consolidate',
          title: 'Gộp đơn xuất kho',
          desc: 'Gộp đơn giao hàng B2B',
          icon: GitMerge,
          requiredModule: 'SALES',
        },
        {
          id: 'sales-returns',
          title: 'Quản lý trả hàng',
          desc: 'Biên bản xử lý hàng trả',
          icon: RotateCcw,
          requiredModule: 'SALES',
        },
      ],
    },
    {
      id: 'warehouse-inbound',
      label: 'Mua hàng',
      icon: ArrowDownToLine,
      hasDropdown: true,
      requiredModule: 'PURCHASE',
      dropdownItems: [
        {
          id: 'warehouse-inbound',
          title: 'Nhập kho từ chứng từ',
          desc: 'Tiếp nhận đơn mua PO',
          icon: ArrowDownToLine,
          requiredModule: 'PURCHASE',
        },
        {
          id: 'suppliers',
          title: 'Nhà cung cấp',
          desc: 'Quản lý thông tin & công nợ NCC',
          icon: Building2,
          requiredModule: 'PURCHASE',
        },
        {
          id: 'manager-landed-cost',
          title: 'Chi phí mua hàng & Landed Cost',
          desc: 'Phân bổ chi phí cấu thành giá vốn',
          icon: ShoppingBag,
          requiredModule: 'PURCHASE',
        },
      ],
    },
    {
      id: 'warehouse-overview',
      label: 'Quản lý kho',
      icon: Warehouse,
      hasDropdown: true,
      requiredModule: 'STOCK',
      dropdownItems: [
        {
          id: 'warehouse-overview',
          title: 'Tổng quan tồn kho',
          desc: 'Theo dõi tồn kho thực tế',
          icon: LayoutGrid,
          requiredModule: 'STOCK',
        },
        {
          id: 'warehouse-outbound',
          title: 'Xuất kho theo phiếu giấy',
          desc: 'Lập phiếu xuất kho thực tế',
          icon: ArrowUpFromLine,
          requiredModule: 'STOCK',
        },
        {
          id: 'warehouse-transfer',
          title: 'Điều chuyển kho',
          desc: 'Chuyển hàng nội bộ giữa các kho',
          icon: Repeat,
          requiredModule: 'STOCK',
        },
        {
          id: 'warehouse-audit',
          title: 'Kiểm kê định kỳ',
          desc: 'Kiểm kê và cân đối tồn kho',
          icon: ClipboardCheck,
          requiredModule: 'STOCK',
        },
        {
          id: 'warehouse-returns',
          title: 'Biên bản trả hàng',
          desc: 'Nhập lại hàng bị trả',
          icon: RotateCcw,
          requiredModule: 'STOCK',
        },
      ],
    },
    {
      id: 'production-orders',
      label: 'Quản trị sản xuất',
      icon: Layers,
      hasDropdown: true,
      requiredModule: 'PROD',
      dropdownItems: [
        {
          id: 'production-orders',
          title: 'Theo dõi lệnh sản xuất',
          desc: 'Giám sát tiến độ gia công xưởng',
          icon: Layers,
          requiredModule: 'PROD',
        },
        {
          id: 'production-import',
          title: 'Nhận kế hoạch (Import File)',
          desc: 'Nhập kế hoạch sản xuất từ Excel',
          icon: RefreshCw,
          requiredModule: 'PROD',
        },
        {
          id: 'production-logs',
          title: 'Sổ nhật ký phiếu tham chiếu',
          desc: 'Lịch sử nhật ký sản xuất',
          icon: FileText,
          requiredModule: 'PROD',
        },
      ],
    },
    {
      id: 'manager-bom',
      label: 'Định mức BOM',
      icon: Sliders,
      hasDropdown: false,
      requiredModule: 'BOM',
    },
    {
      id: 'manager-partners',
      label: 'Đối tác & Công nợ',
      icon: Users,
      hasDropdown: true,
      requiredModule: 'PARTNER',
      dropdownItems: [
        {
          id: 'manager-partners',
          title: 'Đối tác và hạn mức tín dụng',
          desc: 'Quản trị công nợ khách hàng B2B & NCC',
          icon: Users,
          requiredModule: 'PARTNER',
        },
        {
          id: 'suppliers',
          title: 'Danh mục Nhà cung cấp',
          desc: 'Hồ sơ nhà cung cấp & công nợ phải trả',
          icon: Building2,
          requiredModule: 'PARTNER',
        },
        {
          id: 'sales-credit-limits',
          title: 'Ngoại lệ công nợ',
          desc: 'Xét duyệt ngoại lệ công nợ',
          icon: AlertCircle,
          requiredModule: 'PARTNER',
        },
      ],
    },
    {
      id: 'manager-cashflow',
      label: 'Tài chính & Báo cáo',
      icon: BarChart3,
      hasDropdown: true,
      requiredModule: 'FIN',
      dropdownItems: [
        {
          id: 'manager-cashflow',
          title: 'Sổ quỹ thu chi',
          desc: 'Quản lý phiếu thu, chi dòng tiền',
          icon: GitMerge,
          requiredModule: 'FIN',
        },
        {
          id: 'manager-reports',
          title: 'Báo cáo quản trị',
          desc: 'Báo cáo tài chính và hiệu quả',
          icon: BarChart3,
          requiredModule: 'FIN',
        },
      ],
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
      requiredModule: 'AUTH',
    },
    {
      id: 'sales-orders',
      label: 'Bán hàng',
      icon: ShoppingBag,
      hasDropdown: true,
      requiredModule: 'SALES',
      dropdownItems: [
        {
          id: 'sales-dashboard',
          title: 'Tổng quan bán hàng',
          desc: 'Báo cáo doanh số và đơn hàng',
          icon: LayoutGrid,
          requiredModule: 'SALES',
        },
        {
          id: 'sales-orders',
          title: 'Đơn chờ xử lý',
          desc: 'Tiếp nhận đơn hàng mới',
          icon: ClipboardList,
          requiredModule: 'SALES',
        },
        {
          id: 'sales-consolidate',
          title: 'Gộp đơn xuất kho',
          desc: 'Gộp đơn giao hàng B2B',
          icon: GitMerge,
          requiredModule: 'SALES',
        },
        {
          id: 'sales-returns',
          title: 'Quản lý trả hàng',
          desc: 'Biên bản xử lý hàng trả',
          icon: RotateCcw,
          requiredModule: 'SALES',
        },
      ],
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
          requiredModule: 'PROD',
        },
        {
          id: 'manager-bom',
          title: 'Cấu hình định mức BOM',
          desc: 'Định mức nguyên vật liệu sản phẩm',
          icon: Sliders,
          requiredModule: 'BOM',
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
          requiredModule: 'PARTNER',
        },
        {
          id: 'suppliers',
          title: 'Nhà cung cấp',
          desc: 'Quản lý thông tin & công nợ NCC',
          icon: Building2,
        },
        {
          id: 'manager-cashflow',
          title: 'Sổ quỹ thu chi',
          desc: 'Quản lý phiếu thu, chi dòng tiền',
          icon: GitMerge,
          requiredModule: 'FIN',
        },
      ],
    },
    {
      id: 'manager-landed-cost',
      label: 'Mua bán chi phí',
      icon: ShoppingBag,
      hasDropdown: true,
      requiredModule: 'PURCHASE',
      dropdownItems: [
        {
          id: 'manager-landed-cost',
          title: 'Chi phí mua hàng & Landed Cost',
          desc: 'Phân bổ chi phí cấu thành giá vốn MAC',
          icon: ShoppingBag,
          requiredModule: 'PURCHASE',
        },
        {
          id: 'suppliers',
          title: 'Nhà cung cấp',
          desc: 'Danh mục hồ sơ nhà cung cấp',
          icon: Building2,
        },
      ],
    },
    {
      id: 'warehouse-overview',
      label: 'Quản lý kho',
      icon: Warehouse,
      hasDropdown: true,
      requiredModule: 'STOCK',
      dropdownItems: [
        {
          id: 'warehouse-overview',
          title: 'Tổng quan tồn kho',
          desc: 'Theo dõi tồn kho thực tế',
          icon: LayoutGrid,
          requiredModule: 'STOCK',
        },
        {
          id: 'warehouse-transfer',
          title: 'Điều chuyển kho',
          desc: 'Chuyển hàng nội bộ giữa các kho',
          icon: Repeat,
          requiredModule: 'STOCK',
        },
        {
          id: 'warehouse-audit',
          title: 'Kiểm kê định kỳ',
          desc: 'Kiểm kê và cân đối tồn kho',
          icon: ClipboardCheck,
          requiredModule: 'STOCK',
        },
      ],
    },
    {
      id: 'manager-reports',
      label: 'Báo cáo quản trị',
      icon: BarChart3,
      hasDropdown: false,
      requiredModule: 'FIN',
    },
    {
      id: 'manager-goods-group',
      label: 'Hàng hóa',
      icon: Package,
      hasDropdown: true,
      requiredModule: 'GOODS',
      dropdownItems: [
        {
          id: 'manager-goods',
          title: 'Danh mục hàng hóa',
          desc: 'Quản lý mã hàng và tồn kho',
          icon: Package,
          requiredModule: 'GOODS',
        },
        {
          id: 'admin-price-books',
          title: 'Thiết lập bảng giá',
          desc: 'Bảng giá bán và công thức giá',
          icon: DollarSign,
          requiredModule: 'GOODS',
        },
      ],
    },
    {
      id: 'suppliers',
      label: 'Nhà cung cấp',
      icon: Building2,
      hasDropdown: false,
    },
  ];

  const salesTabs: TabConfig[] = [
    {
      id: 'sales-dashboard',
      label: 'Tổng quan bán hàng',
      icon: LayoutGrid,
      hasDropdown: false,
      requiredModule: 'SALES',
    },
    {
      id: 'sales-goods-group',
      label: 'Hàng hóa',
      icon: Package,
      hasDropdown: true,
      requiredModule: 'GOODS',
      dropdownItems: [
        {
          id: 'sales-goods',
          title: 'Danh mục hàng hóa',
          desc: 'Xem mã hàng, quy cách và tồn kho',
          icon: Package,
          requiredModule: 'GOODS',
        },
        {
          id: 'admin-price-books',
          title: 'Thiết lập bảng giá',
          desc: 'Bảng giá bán và chính sách giá',
          icon: DollarSign,
          requiredModule: 'GOODS',
        },
      ],
    },
    {
      id: 'suppliers',
      label: 'Nhà cung cấp',
      icon: Building2,
      hasDropdown: false,
    },
    {
      id: 'sales-orders',
      label: 'Đơn chờ xử lý',
      icon: ClipboardList,
      hasDropdown: true,
      requiredModule: 'SALES',
    },
    {
      id: 'sales-consolidate',
      label: 'Gộp đơn xuất kho',
      icon: GitMerge,
      hasDropdown: true,
      requiredModule: 'SALES',
    },
    {
      id: 'sales-credit-limits',
      label: 'Ngoại lệ công nợ',
      icon: AlertCircle,
      hasDropdown: true,
      requiredModule: 'PARTNER',
    },
    {
      id: 'sales-returns',
      label: 'Quản lý trả hàng',
      icon: RotateCcw,
      hasDropdown: true,
      requiredModule: 'SALES',
    },
    {
      id: 'manager-bom',
      label: 'Định mức BOM',
      icon: Sliders,
      hasDropdown: false,
      requiredModule: 'BOM',
    },
    {
      id: 'warehouse-overview',
      label: 'Tồn kho khả dụng',
      icon: Warehouse,
      hasDropdown: false,
      requiredModule: 'STOCK',
    },
  ];

  const warehouseTabs: TabConfig[] = [
    {
      id: 'warehouse-overview',
      label: 'Tổng quan Kho (3.2.5.1)',
      icon: LayoutGrid,
      hasDropdown: false,
      requiredModule: 'STOCK',
    },
    {
      id: 'warehouse-goods',
      label: 'Danh mục hàng hóa',
      icon: Package,
      hasDropdown: false,
      requiredModule: 'GOODS',
    },
    {
      id: 'suppliers',
      label: 'Nhà cung cấp',
      icon: Building2,
      hasDropdown: false,
    },
    {
      id: 'warehouse-inbound',
      label: 'Nhập kho từ Chứng từ (3.2.5.2)',
      icon: ArrowDownToLine,
      hasDropdown: false,
      badgeText: '2',
      badgeColor: 'bg-blue-600',
      requiredModule: 'PURCHASE',
    },
    {
      id: 'warehouse-outbound',
      label: 'Xuất kho theo Phiếu giấy (3.2.5.4)',
      icon: ArrowUpFromLine,
      hasDropdown: false,
      badgeText: '2',
      badgeColor: 'bg-amber-600',
      requiredModule: 'SALES',
    },
    {
      id: 'warehouse-transfer',
      label: 'Điều chuyển Kho (3.2.5.6)',
      icon: Repeat,
      hasDropdown: false,
      requiredModule: 'STOCK',
    },
    {
      id: 'warehouse-audit',
      label: 'Kiểm kê Giấy (3.2.5.9)',
      icon: ClipboardCheck,
      hasDropdown: false,
      requiredModule: 'STOCK',
    },
    {
      id: 'warehouse-returns',
      label: 'Biên bản Trả hàng (3.2.5.11)',
      icon: RotateCcw,
      hasDropdown: false,
      requiredModule: 'STOCK',
    },
    {
      id: 'manager-bom',
      label: 'Định mức BOM',
      icon: Sliders,
      hasDropdown: false,
      requiredModule: 'BOM',
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
      requiredModule: 'PROD',
    },
    {
      id: 'production-goods',
      label: 'Danh mục hàng hóa / Vật tư',
      icon: Package,
      hasDropdown: false,
      requiredModule: 'GOODS',
    },
    {
      id: 'suppliers',
      label: 'Nhà cung cấp',
      icon: Building2,
      hasDropdown: false,
    },
    {
      id: 'production-import',
      label: 'Nhận kế hoạch (Import File)',
      icon: RefreshCw,
      hasDropdown: false,
      requiredModule: 'PROD',
    },
    {
      id: 'production-logs',
      label: 'Sổ Nhật ký Phiếu tham chiếu',
      icon: FileText,
      hasDropdown: false,
      requiredModule: 'PROD',
    },
    {
      id: 'manager-bom',
      label: 'Định mức BOM',
      icon: Sliders,
      hasDropdown: false,
      requiredModule: 'BOM',
    },
    {
      id: 'warehouse-overview',
      label: 'Tồn kho nguyên liệu',
      icon: Warehouse,
      hasDropdown: false,
      requiredModule: 'STOCK',
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

  // Lọc tab theo quyền hạn cấu hình ma trận (tích quyền nào thì hiện mục đó)
  const filterTabByPermission = (tab: TabConfig): TabConfig | null => {
    if (!allowedModules && !allowedFeatures) return tab;

    // 1. Kiểm tra quyền của chính Tab cha trước: Nếu bị bỏ tích thì ẩn ngay
    if (tab.requiredModule) {
      if (allowedFeatures && allowedFeatures.size > 0) {
        const hasFeature = allowedFeatures.has(tab.id) || allowedFeatures.has(tab.requiredModule);
        if (!hasFeature) return null;
      } else if (allowedModules && !allowedModules.has(tab.requiredModule)) {
        return null;
      }
    }

    // 2. Nếu có dropdown, lọc các mục con theo quyền
    if (tab.dropdownItems && tab.dropdownItems.length > 0) {
      const allowedChildren = tab.dropdownItems.filter((child) => {
        if (!child.requiredModule) return true;
        if (allowedFeatures && allowedFeatures.size > 0) {
          return allowedFeatures.has(child.id) || allowedFeatures.has(child.requiredModule);
        }
        return allowedModules ? allowedModules.has(child.requiredModule) : true;
      });
      if (allowedChildren.length === 0) return null;
      return { ...tab, dropdownItems: allowedChildren };
    }

    return tab;
  };

  const visibleTabs = tabs
    .map(filterTabByPermission)
    .filter((t): t is TabConfig => t !== null);

  const isTabActive = (tab: TabConfig) => {
    if (tab.id === 'suppliers' && (activeScreen === 'suppliers' || activeScreen.includes('suppliers'))) return true;
    if (tab.id === activeScreen) return true;
    if (tab.dropdownItems?.some((sub) => sub.id === activeScreen)) return true;
    if (tab.id === 'admin-staff' && activeScreen === 'admin-staff-active') return true;
    if (tab.id === 'admin-roles' && activeScreen === 'admin-matrix') return true;
    if (tab.id === 'admin-warehouse-perms' && activeScreen === 'admin-warehouse-facilities') return true;
    if (tab.id === 'manager-production' && activeScreen === 'manager-bom') return true;
    if (tab.id === 'manager-partners' && activeScreen === 'manager-cashflow') return true;
    if (tab.id === 'sales-orders' && (activeScreen === 'sales-orders' || activeScreen === 'sales-consolidate' || activeScreen === 'sales-returns')) return true;
    if (tab.id === 'warehouse-inbound' && (activeScreen === 'warehouse-inbound' || activeScreen === 'manager-landed-cost')) return true;
    if (tab.id === 'warehouse-overview' && (activeScreen === 'warehouse-overview' || activeScreen === 'warehouse-outbound' || activeScreen === 'warehouse-transfer' || activeScreen === 'warehouse-audit' || activeScreen === 'warehouse-returns')) return true;
    if (tab.id === 'production-orders' && (activeScreen === 'production-orders' || activeScreen === 'production-import' || activeScreen === 'production-logs')) return true;
    if (tab.id === 'manager-cashflow' && (activeScreen === 'manager-cashflow' || activeScreen === 'manager-reports')) return true;
    if (activeScreen === 'goods-catalog' && tab.id.endsWith('goods')) return true;
    return false;
  };

  return (
    <div ref={containerRef} className="bg-white border-b border-slate-200 px-6 py-2 flex items-center justify-between gap-2 select-none relative z-30 overflow-visible">
      <div className="flex items-center gap-1.5 overflow-visible">
        {visibleTabs.map((tab) => {
          const active = isTabActive(tab);
          const Icon = tab.icon;
          const isOpen = openDropdownId === tab.id;

          return (
            <div
              key={tab.id}
              className="relative shrink-0 tab-dropdown-group group"
              onMouseEnter={() => {
                if (tab.hasDropdown && tab.dropdownItems && tab.dropdownItems.length > 0) {
                  handleMouseEnter(tab.id);
                }
              }}
              onMouseLeave={() => {
                if (tab.hasDropdown) {
                  handleMouseLeave();
                }
              }}
            >
              <button
                type="button"
                onClick={() => {
                  if (tab.hasDropdown && tab.dropdownItems && tab.dropdownItems.length > 0) {
                    if (isOpen) {
                      setOpenDropdownId(null);
                    } else {
                      setOpenDropdownId(tab.id);
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
                    className={`tab-chevron transition-transform duration-150 ${active ? 'text-[#2B6CB0]' : 'text-slate-400'} ${
                      isOpen ? 'is-open' : ''
                    }`}
                  />
                )}
              </button>


            {/* Dropdown Menu Modal (Hiện mượt mà khi hover chuột) */}
            {tab.hasDropdown && tab.dropdownItems && (
              <div
                onMouseEnter={() => handleMouseEnter(tab.id)}
                onMouseLeave={handleMouseLeave}
                className={`tab-dropdown-menu absolute top-full left-0 pt-1.5 w-64 z-50 ${
                  isOpen ? 'is-open' : ''
                }`}
              >
                <div className="bg-white rounded-[10px] shadow-xl border border-slate-200 py-1.5 overflow-hidden">
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

