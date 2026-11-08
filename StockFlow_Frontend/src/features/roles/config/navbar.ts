// src/features/roles/config/navbar.ts
// Nguồn duy nhất cho thanh Navbar và ma trận Phân quyền vai trò:
// mỗi mục trên navbar = 1 chức năng được phân quyền. Navbar chỉ hiện các mục vai trò được tick.

import type { LucideIcon } from 'lucide-react';
import {
  ArrowDownToLine,
  Building2,
  ClipboardCheck,
  ClipboardList,
  DollarSign,
  FileText,
  LayoutGrid,
  Layers,
  Package,
  RefreshCw,
  Repeat,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sliders,
  Users,
  Warehouse,
} from 'lucide-react';

export interface NavItem {
  /** Mã màn hình (activeScreen) */
  screen: string;
  /** Đường dẫn riêng của chức năng (VD /transfers); trang tạo phiếu là đường dẫn con (VD /transfers/create) */
  path: string;
  /** Mã chức năng trong ma trận phân quyền */
  featureId: string;
  title: string;
  desc: string;
  icon: LucideIcon;
  /** Phân hệ quyền backend (PermissionConstants): AUTH, GOODS, PARTNER, SALES, PURCHASE, STOCK, PROD, BOM */
  backendModule: string;
  /** Mã màn hình cũ / bí danh cùng mở chức năng này */
  aliases?: string[];
  /** Chức năng chưa làm: hiện nhãn Đang phát triển, bấm không chuyển màn */
  comingSoon?: boolean;
}

export interface NavGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Nhóm 1 mục: bấm là mở luôn, không có menu con */
  single?: boolean;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'admin-dashboard',
    label: 'Tổng quan',
    icon: LayoutGrid,
    single: true,
    items: [
      {
        screen: 'admin-dashboard',
        path: '/dashboard',
        featureId: 'feat-dashboard',
        title: 'Tổng quan',
        desc: 'Tổng quan hệ thống: nhân sự, vai trò, cơ sở kho',
        icon: LayoutGrid,
        backendModule: 'AUTH',
      },
    ],
  },
  {
    id: 'admin-staff-group',
    label: 'Nhân viên',
    icon: Users,
    single: true,
    items: [
      {
        // Gộp "Tất cả nhân sự" và "Đang hoạt động" (cùng 1 màn hình, lọc trạng thái trong màn)
        screen: 'admin-staff',
        path: '/staff',
        featureId: 'feat-staff',
        title: 'Nhân viên',
        desc: 'Hồ sơ và tài khoản nhân viên công ty',
        icon: Users,
        backendModule: 'AUTH',
        aliases: ['admin-staff-active', 'admin-users'],
      },
    ],
  },
  {
    id: 'admin-permissions-group',
    label: 'Phân quyền',
    icon: ShieldCheck,
    items: [
      {
        screen: 'admin-roles',
        path: '/roles',
        featureId: 'feat-roles',
        title: 'Danh mục vai trò',
        desc: 'Các cấp bậc phân quyền',
        icon: ShieldCheck,
        backendModule: 'AUTH',
      },
      {
        screen: 'admin-matrix',
        path: '/roles/permissions',
        featureId: 'feat-role-matrix',
        title: 'Phân quyền chức năng',
        desc: 'Chức năng hiển thị trên navbar theo vai trò',
        icon: Sliders,
        backendModule: 'AUTH',
      },
      {
        // Gộp "Danh sách quyền kho" và "Cơ sở kho" (cùng 1 màn hình)
        screen: 'admin-warehouse-perms',
        path: '/roles/warehouses',
        featureId: 'feat-warehouse-perms',
        title: 'Phân quyền kho',
        desc: 'Phân quyền nhân sự vào cơ sở kho và danh sách cơ sở kho',
        icon: Warehouse,
        backendModule: 'AUTH',
        aliases: ['admin-warehouse-facilities'],
      },
    ],
  },
  {
    id: 'goods-group',
    label: 'Hàng hóa',
    icon: Package,
    items: [
      {
        screen: 'admin-goods',
        path: '/products',
        featureId: 'feat-goods',
        title: 'Danh mục hàng hóa',
        desc: 'Quản lý mã hàng, tồn kho và danh mục',
        icon: Package,
        backendModule: 'GOODS',
        aliases: ['goods-catalog', 'products', 'manager-goods', 'sales-goods', 'warehouse-goods', 'production-goods'],
      },
      {
        screen: 'admin-price-books',
        path: '/price-books',
        featureId: 'feat-price-books',
        title: 'Thiết lập giá',
        desc: 'Bảng giá bán, công thức giá động đa kho',
        icon: DollarSign,
        backendModule: 'GOODS',
        aliases: ['price-books'],
      },
      {
        screen: 'transfers',
        path: '/transfers',
        featureId: 'feat-transfers',
        title: 'Chuyển hàng',
        desc: 'Điều chuyển hàng hóa nội bộ giữa các chi nhánh',
        icon: Repeat,
        // API /api/Transfers dùng quyền STOCK_*
        backendModule: 'STOCK',
        aliases: ['admin-transfers', 'manager-transfers'],
      },
      {
        screen: 'stocktakes',
        path: '/stocktakes',
        featureId: 'feat-stocktake',
        title: 'Kiểm kho',
        desc: 'Kiểm kê, cân bằng tồn kho thực tế',
        icon: ClipboardCheck,
        // API /api/Stocktakes dùng quyền STOCK_*
        backendModule: 'STOCK',
      },
    ],
  },
  {
    id: 'customers-group',
    label: 'Khách hàng',
    icon: Users,
    single: true,
    items: [
      {
        screen: 'customers',
        path: '/customers',
        featureId: 'feat-customers',
        title: 'Khách hàng',
        desc: 'Hồ sơ khách hàng, lịch sử mua hàng và công nợ phải thu',
        icon: Users,
        backendModule: 'PARTNER',
        aliases: ['sales-customers', 'manager-customers', 'admin-customers'],
      },
    ],
  },
  {
    id: 'sales-group',
    label: 'Bán hàng',
    icon: ShoppingBag,
    items: [
      {
        screen: 'pos',
        path: '/pos',
        featureId: 'feat-pos',
        title: 'Bán hàng',
        desc: 'Màn hình thu ngân & in hóa đơn K80',
        icon: ShoppingBag,
        backendModule: 'SALES',
      },
      {
        screen: 'sales-booking',
        path: '/sales-booking',
        featureId: 'feat-sales-booking',
        title: 'Đặt hàng',
        desc: 'Khách đặt trước, giao hàng sau',
        icon: ShoppingCart,
        backendModule: 'SALES',
      },
      {
        screen: 'orders',
        path: '/orders',
        featureId: 'feat-invoices',
        title: 'Hóa đơn',
        desc: 'Quản lý toàn bộ hóa đơn bán hàng',
        icon: ClipboardList,
        backendModule: 'SALES',
        aliases: ['sales-orders-management'],
      },
      {
        screen: 'sales-returns',
        path: '/sales-returns',
        featureId: 'feat-sales-returns',
        title: 'Trả hàng',
        desc: 'Khách trả lại hàng đã mua',
        icon: RotateCcw,
        backendModule: 'SALES',
      },
    ],
  },
  {
    id: 'purchase-group',
    label: 'Mua hàng',
    icon: ArrowDownToLine,
    items: [
      {
        screen: 'purchase-orders',
        path: '/purchase-orders',
        featureId: 'feat-purchase-orders',
        title: 'Đặt hàng nhập',
        desc: 'Đặt hàng NCC & đối chiếu thực nhập',
        icon: ClipboardList,
        backendModule: 'PURCHASE',
      },
      {
        screen: 'purchases',
        path: '/purchases',
        featureId: 'feat-purchase',
        title: 'Nhập hàng',
        desc: 'Quản lý phiếu nhập kho & thanh toán',
        icon: ArrowDownToLine,
        backendModule: 'PURCHASE',
        aliases: ['admin-purchases', 'warehouse-purchases'],
      },
      {
        screen: 'purchase-returns',
        path: '/purchase-returns',
        featureId: 'feat-purchase-returns',
        title: 'Trả hàng nhập',
        desc: 'Trả hàng cho nhà cung cấp & giảm công nợ',
        icon: RotateCcw,
        backendModule: 'PURCHASE',
      },
      {
        screen: 'suppliers',
        path: '/suppliers',
        featureId: 'feat-suppliers',
        title: 'Nhà cung cấp',
        desc: 'Quản lý thông tin & công nợ NCC',
        icon: Building2,
        backendModule: 'PARTNER',
        aliases: ['admin-suppliers', 'manager-suppliers'],
      },
    ],
  },
  {
    id: 'production-group',
    label: 'Quản trị sản xuất',
    icon: Layers,
    items: [
      {
        screen: 'production-orders',
        path: '/production',
        featureId: 'feat-prod',
        title: 'Theo dõi lệnh sản xuất',
        desc: 'Giám sát tiến độ gia công xưởng',
        icon: Layers,
        backendModule: 'PROD',
        aliases: ['production-open-report-modal'],
      },
      {
        screen: 'production-import',
        path: '/production/import',
        featureId: 'feat-prod-import',
        title: 'Nhận kế hoạch (Import File)',
        desc: 'Nhập kế hoạch sản xuất từ Excel',
        icon: RefreshCw,
        backendModule: 'PROD',
      },
      {
        screen: 'production-logs',
        path: '/production/logs',
        featureId: 'feat-prod-logs',
        title: 'Sổ nhật ký phiếu tham chiếu',
        desc: 'Lịch sử nhật ký sản xuất',
        icon: FileText,
        backendModule: 'PROD',
      },
    ],
  },
  {
    id: 'bom-group',
    label: 'Định mức BOM',
    icon: Sliders,
    single: true,
    items: [
      {
        screen: 'manager-bom',
        path: '/bom',
        featureId: 'feat-bom',
        title: 'Định mức BOM',
        desc: 'Định mức nguyên vật liệu và công thức phối liệu',
        icon: Sliders,
        backendModule: 'BOM',
      },
    ],
  },
];

export const NAV_ITEMS_FLAT: (NavItem & { groupId: string; groupLabel: string })[] = NAV_GROUPS.flatMap((g) =>
  g.items.map((i) => ({ ...i, groupId: g.id, groupLabel: g.label }))
);

/** Màn hình (kể cả bí danh) → chức năng cần có để mở */
export const SCREEN_FEATURE_MAP: Record<string, string> = Object.fromEntries(
  NAV_ITEMS_FLAT.flatMap((i) => [i.screen, ...(i.aliases ?? [])].map((s) => [s, i.featureId]))
);

/** Quyền cốt lõi của Admin luôn bật (không tự khóa mình khỏi màn phân quyền) */
export const ADMIN_LOCKED_FEATURES = ['feat-roles', 'feat-role-matrix'];

/**
 * Màn mở được nhưng không nằm trên navbar: đường dẫn + các chức năng (chỉ cần 1) được phép mở.
 * VD Thiết lập giao dịch mở từ màn Hóa đơn / POS.
 */
export const EXTRA_SCREENS: Record<string, { path: string; anyOf: string[] }> = {
  'admin-order-settings': { path: '/settings/orders', anyOf: ['feat-invoices', 'feat-pos'] },
};

/** Màn hình (kể cả bí danh, màn phụ) → đường dẫn riêng */
export const SCREEN_PATH_MAP: Record<string, string> = {
  ...Object.fromEntries(NAV_ITEMS_FLAT.flatMap((i) => [i.screen, ...(i.aliases ?? [])].map((s) => [s, i.path]))),
  ...Object.fromEntries(Object.entries(EXTRA_SCREENS).map(([s, e]) => [s, e.path])),
  // Theo dõi lệnh sản xuất, mở sẵn form Nhập báo cáo giấy
  'production-open-report-modal': '/production?report=1',
};

/** Vai trò có được mở màn hình này không (theo các chức năng được tick) */
export function canOpenScreen(screen: string, allowedFeatures: Set<string>): boolean {
  const feat = SCREEN_FEATURE_MAP[screen];
  if (feat) return allowedFeatures.has(feat);
  const extra = EXTRA_SCREENS[screen];
  return !!extra && extra.anyOf.some((f) => allowedFeatures.has(f));
}

/** Tên chức năng cần có để mở màn hình (hiển thị trong thông báo không có quyền) */
export function featureTitleOf(screenOrFeatureId: string): string | undefined {
  const featId = SCREEN_FEATURE_MAP[screenOrFeatureId] ?? screenOrFeatureId;
  return NAV_ITEMS_FLAT.find((i) => i.featureId === featId)?.title;
}

/** Trang đầu tiên trên navbar mà vai trò được phép mở (bỏ POS vì là màn toàn trang, bỏ mục đang phát triển) */
export function firstAllowedPath(allowedFeatures: Set<string>): string | null {
  const item = NAV_ITEMS_FLAT.find((i) => !i.comingSoon && i.screen !== 'pos' && allowedFeatures.has(i.featureId));
  if (item) return item.path;
  return allowedFeatures.has('feat-pos') ? '/pos' : null;
}
