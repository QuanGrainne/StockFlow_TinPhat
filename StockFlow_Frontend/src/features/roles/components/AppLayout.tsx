import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserRole } from '../types';
import { Header } from './common/Header';
import { Sidebar } from './common/Sidebar';
import { NoAccess } from './common/FeatureGuard';
import { GoodsCatalogScreen } from './common/GoodsCatalogScreen';
import SuppliersClient from '@/app/(dashboard)/suppliers/SuppliersClient';
import CustomersClient from '@/app/(dashboard)/customers/CustomersClient';
import PurchasesClient from '@/app/(dashboard)/purchases/PurchasesClient';
import PurchaseReturnsClient from '@/app/(dashboard)/purchase-returns/PurchaseReturnsClient';
import PurchaseOrdersClient from '@/app/(dashboard)/purchase-orders/PurchaseOrdersClient';
import PriceBooksClient from '@/features/price-books/screens/PriceBooksClient';
import TransfersClient from '@/app/(dashboard)/transfers/TransfersClient';
import StocktakesClient from '@/app/(dashboard)/stocktakes/StocktakesClient';
import OrdersClient from '@/app/(dashboard)/orders/OrdersClient';
import SalesBookingsClient from '@/app/(dashboard)/sales-booking/SalesBookingsClient';
import SalesReturnsClient from '@/app/(dashboard)/sales-returns/SalesReturnsClient';
import { OrderSettingsScreen } from '@/features/settings/screens/OrderSettingsScreen';
import { permissionService } from '../services/permissionService';
import { SCREEN_PATH_MAP, canOpenScreen, firstAllowedPath } from '../config/navbar';
import { getStoredRole } from '../config/currentRole';

// Màn hình theo chức năng (navbar dùng chung, xem config/navbar.ts)
import { BomManagementScreen } from './manager/screens/BomManagementScreen';

// Production Screens
import { ProductionTrackingScreen } from './production/screens/ProductionTrackingScreen';
import { ProductionPlanImportScreen } from './production/screens/ProductionPlanImportScreen';
import { ProductionReferenceLogsScreen } from './production/screens/ProductionReferenceLogsScreen';

// Admin Screens
import { AdminDashboard } from './admin/screens/AdminDashboard';
import { StaffAccountsScreen } from './admin/screens/StaffAccountsScreen';
import { RoleCatalogScreen } from './admin/screens/RoleCatalogScreen';
import { WarehousePermissionsScreen } from './admin/screens/WarehousePermissionsScreen';
import { PermissionMatrixScreen } from './admin/screens/PermissionMatrixScreen';
import { ROLE_SWITCHER_ENABLED } from '@/lib/auth/flags';

interface AppLayoutProps {
  /** Màn hình của trang (mỗi chức năng navbar có 1 đường dẫn riêng, VD /transfers → 'transfers') */
  initialScreen: string;
  children?: React.ReactNode;
}

/** Màn hình ban đầu: một số trang nhận thêm tham số trên URL */
const resolveInitialScreen = (initialScreen: string): string => {
  if (typeof window === 'undefined') return initialScreen;
  const params = new URLSearchParams(window.location.search);
  // /production?report=1: mở sẵn form Nhập báo cáo giấy
  if (initialScreen === 'production-orders' && params.get('report') === '1') return 'production-open-report-modal';
  return initialScreen;
};

export const AppLayout: React.FC<AppLayoutProps> = ({ initialScreen, children }) => {
  const router = useRouter();
  // Đọc vai trò thật ngay khi khởi tạo (AppLayout luôn được load với ssr:false nên có localStorage).
  const [currentRole, setCurrentRole] = useState<UserRole>(() => getStoredRole());
  const [purchaseOrdersKey, setPurchaseOrdersKey] = useState(0);
  const [activeScreen, setActiveScreen] = useState<string>(() => resolveInitialScreen(initialScreen));
  // /roles/permissions?role=ROLE_SALES: mở sẵn cột vai trò được chọn từ Danh mục vai trò
  const [selectedMatrixRole] = useState<string>(() =>
    typeof window === 'undefined' ? 'ROLE_ADMIN' : new URLSearchParams(window.location.search).get('role') || 'ROLE_ADMIN'
  );
  const [hasImportedProductionPlan, setHasImportedProductionPlan] = useState(false);
  // Chức năng được phép (lấy lần gần nhất để không nháy trống khi chuyển trang)
  const [allowedFeatures, setAllowedFeatures] = useState<Set<string> | null>(() =>
    permissionService.peekAllowedFeatures(`ROLE_${getStoredRole()}`)
  );

  // Tải quyền của vai trò; tải lại khi Admin lưu ma trận phân quyền
  React.useEffect(() => {
    let stale = false;
    const load = () => {
      permissionService
        .getAllowedFeatures(`ROLE_${currentRole}`)
        .then((feats) => {
          if (!stale) setAllowedFeatures(feats);
        })
        .catch(() => {
          // Hết phiên: client tự chuyển về trang đăng nhập
        });
    };
    load();
    window.addEventListener('stockflow_permissions_updated', load);
    return () => {
      stale = true;
      window.removeEventListener('stockflow_permissions_updated', load);
    };
  }, [currentRole]);

  const isPermitted = allowedFeatures ? canOpenScreen(activeScreen, allowedFeatures) : false;
  const homePath = allowedFeatures ? firstAllowedPath(allowedFeatures) : null;

  // Trang Tổng quan là trang vào sau đăng nhập: vai trò không có Tổng quan thì chuyển sang trang đầu tiên được phép
  React.useEffect(() => {
    if (allowedFeatures && !isPermitted && activeScreen === 'admin-dashboard' && homePath && homePath !== '/dashboard') {
      router.replace(homePath);
    }
  }, [allowedFeatures, isPermitted, activeScreen, homePath, router]);

  /** Mỗi chức năng là 1 đường dẫn riêng: bấm menu → chuyển trang (VD /transfers), không dùng chung /dashboard */
  const handleNavigate = (newScreen: string) => {
    const screen = newScreen.replace(/^\//, '');
    const path = SCREEN_PATH_MAP[screen] ?? (newScreen.startsWith('/') ? newScreen : undefined);
    // Bấm lại menu Đặt hàng nhập: về danh sách mặc định (xóa từ khóa / bộ lọc đang giữ)
    if (screen === 'purchase-orders') setPurchaseOrdersKey((k) => k + 1);
    if (!path) {
      setActiveScreen(screen);
      return;
    }
    const [pathname] = path.split('?');
    if (typeof window !== 'undefined' && window.location.pathname === pathname) {
      // Cùng trang: chỉ đổi màn hình (VD mở form Nhập báo cáo giấy), bỏ tham số cũ trên URL
      setActiveScreen(screen);
      if (window.location.search) router.replace(pathname);
      return;
    }
    router.push(path);
  };

  // Xử lý chuyển đổi vai trò (RBAC Switcher)
  // Chỉ hoạt động khi bật cờ demo; vai trò thật luôn lấy từ tài khoản đăng nhập.
  const handleRoleChange = (newRole: UserRole) => {
    if (!ROLE_SWITCHER_ENABLED) return;
    setCurrentRole(newRole);
    if (typeof window !== 'undefined') {
      localStorage.setItem('stockflow_current_role', newRole);
      const userStr = localStorage.getItem('stockflow_user');
      if (userStr) {
        try {
          const u = JSON.parse(userStr);
          u.roles = [newRole];
          localStorage.setItem('stockflow_user', JSON.stringify(u));
        } catch { }
      }
    }
    router.push('/dashboard');
  };

  const renderActiveScreen = () => {
    // Chưa tải xong quyền: chưa hiện gì; không có quyền (bỏ tick hoặc gõ thẳng đường dẫn): chặn hẳn màn hình
    if (!allowedFeatures) return null;
    if (!isPermitted) {
      // Đang chuyển từ Tổng quan sang trang đầu tiên được phép
      if (activeScreen === 'admin-dashboard' && homePath && homePath !== '/dashboard') return null;
      return <NoAccess feature={activeScreen} homePath={homePath} />;
    }

    switch (activeScreen) {
      // ─── Bán hàng ───
      case 'orders':
      case 'sales-orders-management':
        return <OrdersClient onNavigate={handleNavigate} />;

      case 'sales-booking':
        return <SalesBookingsClient />;

      case 'sales-returns':
        return <SalesReturnsClient />;

      // ─── Định mức BOM ───
      case 'manager-bom':
        return <BomManagementScreen />;

      // ─── Production Screens ───
      case 'production-orders':
        return (
          <ProductionTrackingScreen
            onNavigate={handleNavigate}
            isImportedPlan={hasImportedProductionPlan}
          />
        );
      case 'production-open-report-modal':
        return (
          <ProductionTrackingScreen
            onNavigate={handleNavigate}
            isImportedPlan={hasImportedProductionPlan}
            initialOpenDetail={true}
          />
        );
      case 'production-import':
        return (
          <ProductionPlanImportScreen
            onNavigate={handleNavigate}
            onApprovePlan={() => {
              setHasImportedProductionPlan(true);
              handleNavigate('production-orders');
            }}
          />
        );
      case 'production-logs':
        return <ProductionReferenceLogsScreen />;

      // ─── Admin Screens ───
      case 'admin-dashboard':
        return <AdminDashboard onNavigate={handleNavigate} />;
      case 'admin-staff':
        return <StaffAccountsScreen initialFilter="ALL" />;
      case 'admin-staff-active':
        return <StaffAccountsScreen initialFilter="ACTIVE" />;
      case 'admin-roles':
        return (
          <RoleCatalogScreen
            onNavigate={(screen, roleCode) => {
              if (screen === 'admin-matrix' && roleCode) {
                router.push(`/roles/permissions?role=${encodeURIComponent(roleCode)}`);
                return;
              }
              handleNavigate(screen);
            }}
          />
        );
      case 'admin-matrix':
        return (
          <PermissionMatrixScreen
            initialRoleCode={selectedMatrixRole}
            currentRole={currentRole}
            onRoleChange={handleRoleChange}
          />
        );
      case 'admin-warehouse-perms':
      case 'admin-warehouse-facilities':
        return <WarehousePermissionsScreen />;
      case 'admin-order-settings':
        return <OrderSettingsScreen onNavigate={handleNavigate} />;
      case 'admin-users':
        return <StaffAccountsScreen initialFilter="ALL" />;

      // ─── Common / Goods Catalog / Suppliers / Purchases Screens (Tất cả Role) ───
      case 'customers':
      case 'sales-customers':
      case 'manager-customers':
      case 'admin-customers':
        return <CustomersClient onNavigate={handleNavigate} />;

      case 'suppliers':
      case 'manager-suppliers':
      case 'admin-suppliers':
        return <SuppliersClient onNavigate={handleNavigate} />;

      case 'purchases':
      case 'admin-purchases':
      case 'manager-purchases':
      case 'warehouse-purchases':
        return <PurchasesClient onNavigate={handleNavigate} />;

      case 'purchase-returns':
        return <PurchaseReturnsClient />;

      case 'purchase-orders':
        return <PurchaseOrdersClient key={purchaseOrdersKey} onNavigate={handleNavigate} />;

      case 'goods-catalog':
      case 'admin-goods':
      case 'manager-goods':
      case 'sales-goods':
      case 'warehouse-goods':
      case 'production-goods':
      case 'products':
        return <GoodsCatalogScreen onNavigate={handleNavigate} currentRole={currentRole} />;

      case 'admin-price-books':
      case 'price-books':
        return <PriceBooksClient />;

      case 'stocktakes':
        return <StocktakesClient />;

      case 'transfers':
      case 'admin-transfers':
      case 'manager-transfers':
        return <TransfersClient />;

      default:
        // Đang tải quyền để chọn màn hình được phép
        return null;
    }
  };

  return (
    <div className="h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans overflow-hidden">
      {/* 1. Header & Top Navigation Tabs Bar (Cố định ở đỉnh, không bị cuộn trôi) */}
      <div className="shrink-0 z-40 bg-white shadow-2xs">
        <Header
          currentRole={currentRole}
          onRoleChange={handleRoleChange}
        />
        <Sidebar
          currentRole={currentRole}
          activeScreen={activeScreen}
          onNavigate={handleNavigate}
          productionBadge={hasImportedProductionPlan ? '10' : '4'}
        />
      </div>

      {/* 2. Main Workspace Content (Chỉ cuộn vùng nội dung) */}
      {children ? (
        <main className="flex-1 min-w-0 overflow-y-auto bg-[#F4F6F9]">
          {children}
        </main>
      ) : activeScreen === 'transfers' || activeScreen.includes('transfers') ||
        activeScreen === 'purchases' || activeScreen.includes('purchases') ||
        activeScreen === 'purchase-returns' ||
        activeScreen === 'purchase-orders' ||
        activeScreen === 'sales-booking' ||
        activeScreen === 'sales-returns' ||
        activeScreen === 'suppliers' || activeScreen.includes('suppliers') ||
        activeScreen === 'customers' || activeScreen.includes('customers') ||
        activeScreen === 'goods-catalog' || activeScreen === 'products' ||
        activeScreen.includes('goods') || activeScreen.includes('catalog') ||
        activeScreen === 'price-books' || activeScreen === 'admin-price-books' ||
        activeScreen === 'stocktakes' ||
        activeScreen.includes('price-book') ? (
        <main className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden bg-[#F8FAFC]">
          {renderActiveScreen()}
        </main>
      ) : activeScreen === 'orders' || activeScreen.includes('orders') ? (
        <main className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden bg-[#F8FAFC]">
          {renderActiveScreen()}
        </main>
      ) : activeScreen === 'admin-order-settings' || activeScreen.includes('order-settings') ? (
        <main className="flex-1 min-w-0 overflow-y-auto bg-slate-50">
          {renderActiveScreen()}
        </main>
      ) : (
        <main className="flex-1 min-w-0 overflow-y-auto p-6 lg:p-8 bg-[#F8FAFC]">
          <div className="max-w-7xl mx-auto">{renderActiveScreen()}</div>
        </main>
      )}
    </div>
  );
};
