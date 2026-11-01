import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserRole } from '../types';
import { Header } from './common/Header';
import { Sidebar } from './common/Sidebar';
import { GoodsCatalogScreen } from './common/GoodsCatalogScreen';
import SuppliersClient from '@/app/(dashboard)/suppliers/SuppliersClient';
import CustomersClient from '@/app/(dashboard)/customers/CustomersClient';
import PurchasesClient from '@/app/(dashboard)/purchases/PurchasesClient';
import PriceBooksClient from '@/features/price-books/screens/PriceBooksClient';
import TransfersClient from '@/app/(dashboard)/transfers/TransfersClient';
import { OrderSettingsScreen } from '@/features/settings/screens/OrderSettingsScreen';
import { permissionService } from '../services/permissionService';

interface AppLayoutProps {
  initialScreen?: string;
}

const SCREEN_MODULE_MAP: Record<string, string> = {
  'admin-staff': 'AUTH',
  'admin-staff-active': 'AUTH',
  'admin-roles': 'AUTH',
  'admin-matrix': 'AUTH',
  'admin-order-settings': 'AUTH',
  'admin-warehouse-perms': 'AUTH',
  'admin-warehouse-facilities': 'AUTH',
  'admin-goods': 'GOODS',
  'admin-price-books': 'GOODS',
  'price-books': 'GOODS',
  'manager-bom': 'BOM',
  'manager-partners': 'PARTNER',
  'manager-cashflow': 'FIN',
  'manager-landed-cost': 'PURCHASE',
  'manager-reports': 'FIN',
  'manager-production': 'PROD',
  'sales-orders': 'SALES',
  'sales-consolidate': 'SALES',
  'sales-credit-limits': 'PARTNER',
  'sales-returns': 'SALES',
  'warehouse-inbound': 'PURCHASE',
  'warehouse-outbound': 'SALES',
  'warehouse-transfer': 'STOCK',
  'warehouse-audit': 'STOCK',
  'warehouse-returns': 'STOCK',
  'production-import': 'PROD',
  'production-logs': 'PROD',
  'goods-catalog': 'GOODS',
  'purchases': 'PURCHASE',
  'transfers': 'TRANSFER',
  'admin-transfers': 'TRANSFER',
  'manager-transfers': 'TRANSFER',
  'customers': 'PARTNER',
  'sales-customers': 'SALES',
  'manager-customers': 'PARTNER',
  'admin-customers': 'PARTNER',
};

// Sales Screens
import { SalesDashboard } from './sales/screens/SalesDashboard';
import { PendingOrdersScreen } from './sales/screens/PendingOrdersScreen';
import { ConsolidateOrdersScreen } from './sales/screens/ConsolidateOrdersScreen';
import { CreditLimitExceptionsScreen } from './sales/screens/CreditLimitExceptionsScreen';
import { ReturnClaimsScreen } from './sales/screens/ReturnClaimsScreen';

// Manager Screens
import { ManagerDashboard } from './manager/screens/ManagerDashboard';
import { ApprovalInboxScreen } from './manager/screens/ApprovalInboxScreen';
import { BomManagementScreen } from './manager/screens/BomManagementScreen';
import { PartnerCreditLimitScreen } from './manager/screens/PartnerCreditLimitScreen';
import { CashFlowScreen } from './manager/screens/CashFlowScreen';
import { ProductionOrdersScreen } from './manager/screens/ProductionOrdersScreen';
import { LandedCostScreen } from './manager/screens/LandedCostScreen';
import { ReportsScreen } from './manager/screens/ReportsScreen';


// Warehouse Screens
import { WarehouseOverviewScreen } from './warehouse/screens/WarehouseOverviewScreen';
import { WarehouseInboundScreen } from './warehouse/screens/WarehouseInboundScreen';
import { WarehouseOutboundScreen } from './warehouse/screens/WarehouseOutboundScreen';
import { WarehouseTransferScreen } from './warehouse/screens/WarehouseTransferScreen';
import { WarehouseAuditScreen } from './warehouse/screens/WarehouseAuditScreen';
import { WarehouseReturnsScreen } from './warehouse/screens/WarehouseReturnsScreen';

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
import { UserManagementScreen } from './admin/screens/UserManagementScreen';

const getStoredRole = (): UserRole => {
  if (typeof window === 'undefined') return 'SALES';
  const savedRole = localStorage.getItem('stockflow_current_role') as UserRole | null;
  if (savedRole && ['ADMIN', 'MANAGER', 'SALES', 'WAREHOUSE', 'PRODUCTION'].includes(savedRole)) {
    return savedRole;
  }
  const userStr = localStorage.getItem('stockflow_user');
  if (userStr) {
    try {
      const u = JSON.parse(userStr);
      const primaryRoleStr = Array.isArray(u.roles) && u.roles.length > 0 ? u.roles[0] : (u.role || '');
      const upper = String(primaryRoleStr).toUpperCase();
      if (upper.includes('ADMIN')) return 'ADMIN';
      if (upper.includes('MGR') || upper.includes('MANAGER')) return 'MANAGER';
      if (upper.includes('WAREHOUSE')) return 'WAREHOUSE';
      if (upper.includes('PROD')) return 'PRODUCTION';
      if (upper.includes('SALES')) return 'SALES';
    } catch {}
  }
  return 'SALES';
};

const getDefaultScreenForRole = (role: UserRole): string => {
  switch (role) {
    case 'ADMIN': return 'admin-dashboard';
    case 'MANAGER': return 'manager-dashboard';
    case 'WAREHOUSE': return 'warehouse-overview';
    case 'PRODUCTION': return 'production-orders';
    default: return 'sales-dashboard';
  }
};

const getStoredScreen = (role: UserRole): string => {
  if (typeof window === 'undefined') return getDefaultScreenForRole(role);
  const savedScreen = localStorage.getItem('stockflow_active_screen');
  if (savedScreen) return savedScreen;
  return getDefaultScreenForRole(role);
};

export const AppLayout: React.FC<AppLayoutProps> = ({ initialScreen }) => {
  const router = useRouter();
  const [currentRole, setCurrentRole] = useState<UserRole>('SALES');
  const [activeScreen, setActiveScreen] = useState<string>(initialScreen || 'sales-dashboard');
  const [selectedMatrixRole, setSelectedMatrixRole] = useState<string>('ROLE_ADMIN');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [hasImportedProductionPlan, setHasImportedProductionPlan] = useState(false);

  // Khôi phục role và screen từ localStorage khi reload trang
  React.useEffect(() => {
    const role = getStoredRole();
    const screen = initialScreen || getStoredScreen(role);
    setCurrentRole(role);
    setActiveScreen(screen);
  }, [initialScreen]);

  // Lắng nghe cập nhật quyền từ Ma trận phân quyền để tự động chuyển trang nếu màn hình hiện tại bị bỏ quyền
  React.useEffect(() => {
    const handlePermissionsUpdated = async () => {
      const roleCode = `ROLE_${currentRole}`;
      const allowed = await permissionService.getAllowedModuleKeys(roleCode);
      const reqMod = SCREEN_MODULE_MAP[activeScreen];
      if (reqMod && !allowed.has(reqMod)) {
        const fallback = getDefaultScreenForRole(currentRole);
        setActiveScreen(fallback);
        if (typeof window !== 'undefined') {
          localStorage.setItem('stockflow_active_screen', fallback);
        }
      }
    };
    window.addEventListener('stockflow_permissions_updated', handlePermissionsUpdated);
    return () => window.removeEventListener('stockflow_permissions_updated', handlePermissionsUpdated);
  }, [currentRole, activeScreen]);

  const handleNavigate = (newScreen: string) => {
    if (newScreen === 'pos' || newScreen === '/pos') { router.push('/pos'); return; }
    if (newScreen === 'orders' || newScreen === '/orders') { router.push('/orders'); return; }
    setActiveScreen(newScreen);
    if (typeof window !== 'undefined') {
      localStorage.setItem('stockflow_active_screen', newScreen);
      if (newScreen === 'suppliers' || newScreen === '/suppliers') {
        window.history.pushState(null, '', '/suppliers');
      } else if (newScreen === 'purchases' || newScreen === '/purchases') {
        window.history.pushState(null, '', '/purchases');
      } else if (newScreen === 'goods-catalog' || newScreen === 'products' || newScreen === '/products') {
        window.history.pushState(null, '', '/products');
      } else if (newScreen === 'transfers' || newScreen === '/transfers' || newScreen === 'admin-transfers' || newScreen === 'manager-transfers') {
        window.history.pushState(null, '', '/transfers');
      } else if (window.location.pathname.includes('/suppliers') || window.location.pathname.includes('/purchases') || window.location.pathname.includes('/products') || window.location.pathname.includes('/transfers')) {
        window.history.pushState(null, '', '/dashboard');
      }
    }
  };

  // Xử lý chuyển đổi vai trò (RBAC Switcher)
  const handleRoleChange = (newRole: UserRole) => {
    setCurrentRole(newRole);
    const defaultScreen = getDefaultScreenForRole(newRole);
    setActiveScreen(defaultScreen);
    if (typeof window !== 'undefined') {
      localStorage.setItem('stockflow_current_role', newRole);
      localStorage.setItem('stockflow_active_screen', defaultScreen);
      const userStr = localStorage.getItem('stockflow_user');
      if (userStr) {
        try {
          const u = JSON.parse(userStr);
          u.roles = [newRole];
          localStorage.setItem('stockflow_user', JSON.stringify(u));
        } catch {}
      }
    }
  };

  const renderActiveScreen = () => {
    switch (activeScreen) {
      // ─── Sales Screens ───
      case 'sales-dashboard':
        return <SalesDashboard onNavigate={handleNavigate} />;
      case 'sales-orders':
        return <PendingOrdersScreen onNavigate={handleNavigate} />;
      case 'sales-consolidate':
        return <ConsolidateOrdersScreen onNavigate={handleNavigate} />;
      case 'sales-credit-limits':
        return <CreditLimitExceptionsScreen onNavigate={handleNavigate} />;
      case 'sales-returns':
        return <ReturnClaimsScreen />;

      // ─── Manager Screens ───
      case 'manager-dashboard':
        return <ManagerDashboard onNavigate={handleNavigate} />;
      case 'manager-approvals':
      case 'manager-inbox':
        return <ApprovalInboxScreen />;
      case 'manager-bom':
        return <BomManagementScreen />;
      case 'manager-partners':
        return <PartnerCreditLimitScreen onNavigate={handleNavigate} />;
      case 'manager-cashflow':
        return <CashFlowScreen />;
      case 'manager-production':
        return <ProductionOrdersScreen onNavigate={handleNavigate} />;
      case 'manager-landed-cost':
      case 'manager-purchases':
        return <LandedCostScreen />;
      case 'manager-reports':
        return <ReportsScreen onNavigate={handleNavigate} />;


      // ─── Warehouse Screens (Đã bỏ Vị trí ô kệ) ───
      case 'warehouse-overview':
        return <WarehouseOverviewScreen onNavigate={handleNavigate} />;
      case 'warehouse-inbound':
        return <WarehouseInboundScreen />;
      case 'warehouse-outbound':
        return <WarehouseOutboundScreen />;
      case 'warehouse-transfer':
        return <WarehouseTransferScreen />;
      case 'warehouse-audit':
        return <WarehouseAuditScreen />;
      case 'warehouse-returns':
        return <WarehouseReturnsScreen />;

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
              if (roleCode) setSelectedMatrixRole(roleCode);
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

      case 'transfers':
      case 'admin-transfers':
      case 'manager-transfers':
      case 'warehouse-transfer':
        return <TransfersClient />;

      default:
        if (currentRole === 'SALES') return <SalesDashboard onNavigate={handleNavigate} />;
        if (currentRole === 'MANAGER') return <ManagerDashboard onNavigate={handleNavigate} />;
        if (currentRole === 'WAREHOUSE') return <WarehouseOverviewScreen onNavigate={handleNavigate} />;
        if (currentRole === 'PRODUCTION')
          return (
            <ProductionTrackingScreen
              onNavigate={handleNavigate}
              isImportedPlan={hasImportedProductionPlan}
            />
          );
        if (currentRole === 'ADMIN') return <AdminDashboard onNavigate={handleNavigate} />;
        return <SalesDashboard onNavigate={handleNavigate} />;
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
      {activeScreen === 'transfers' || activeScreen.includes('transfers') ||
       activeScreen === 'warehouse-transfer' ||
       activeScreen === 'purchases' || activeScreen.includes('purchases') ||
       activeScreen === 'goods-catalog' || activeScreen === 'products' ||
       activeScreen.includes('goods') || activeScreen.includes('catalog') ||
       activeScreen === 'price-books' || activeScreen === 'admin-price-books' ||
       activeScreen.includes('price-book') ? (
        <main className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden bg-[#F8FAFC]">
          {renderActiveScreen()}
        </main>
      ) : activeScreen === 'suppliers' || activeScreen.includes('suppliers') ? (
        <main className="flex-1 min-w-0 flex flex-col overflow-y-auto bg-[#F8FAFC] p-4 lg:p-6">
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
