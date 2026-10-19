// src/components/AppLayout.tsx
// Layout chính: Tích hợp Header (Role Switcher), Sidebar Collapsible, và Render Màn hình tương ứng

import React, { useState } from 'react';
import { UserRole } from '../types';
import { Header } from './common/Header';
import { Sidebar } from './common/Sidebar';

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
import { InboundReceiptsScreen } from './warehouse/screens/InboundReceiptsScreen';
import { StockInventoryScreen } from './warehouse/screens/StockInventoryScreen';

// Production Screens
import { ProductionShiftsScreen } from './production/screens/ProductionShiftsScreen';

// Admin Screens
import { AdminDashboard } from './admin/screens/AdminDashboard';
import { StaffAccountsScreen } from './admin/screens/StaffAccountsScreen';
import { RoleCatalogScreen } from './admin/screens/RoleCatalogScreen';
import { WarehousePermissionsScreen } from './admin/screens/WarehousePermissionsScreen';
import { PermissionMatrixScreen } from './admin/screens/PermissionMatrixScreen';
import { UserManagementScreen } from './admin/screens/UserManagementScreen';

export const AppLayout: React.FC = () => {
  const [currentRole, setCurrentRole] = useState<UserRole>('SALES');
  const [activeScreen, setActiveScreen] = useState<string>('sales-dashboard');
  const [selectedMatrixRole, setSelectedMatrixRole] = useState<string>('ROLE_ADMIN');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Xử lý chuyển đổi vai trò (RBAC Switcher)
  const handleRoleChange = (newRole: UserRole) => {
    setCurrentRole(newRole);
    if (newRole === 'SALES') {
      setActiveScreen('sales-dashboard');
    } else if (newRole === 'MANAGER') {
      setActiveScreen('manager-dashboard');
    } else if (newRole === 'WAREHOUSE') {
      setActiveScreen('warehouse-inbound');
    } else if (newRole === 'PRODUCTION') {
      setActiveScreen('production-shifts');
    } else if (newRole === 'ADMIN') {
      setActiveScreen('admin-dashboard');
    }
  };

  const renderActiveScreen = () => {
    switch (activeScreen) {
      // ─── Sales Screens ───
      case 'sales-dashboard':
        return <SalesDashboard onNavigate={setActiveScreen} />;
      case 'sales-orders':
        return <PendingOrdersScreen onNavigate={setActiveScreen} />;
      case 'sales-consolidate':
        return <ConsolidateOrdersScreen onNavigate={setActiveScreen} />;
      case 'sales-credit-limits':
        return <CreditLimitExceptionsScreen onNavigate={setActiveScreen} />;
      case 'sales-returns':
        return <ReturnClaimsScreen />;

      // ─── Manager Screens ───
      case 'manager-dashboard':
        return <ManagerDashboard onNavigate={setActiveScreen} />;
      case 'manager-approvals':
        return <ApprovalInboxScreen />;
      case 'manager-bom':
        return <BomManagementScreen />;
      case 'manager-partners':
        return <PartnerCreditLimitScreen onNavigate={setActiveScreen} />;
      case 'manager-cashflow':
        return <CashFlowScreen />;
      case 'manager-production':
        return <ProductionOrdersScreen onNavigate={setActiveScreen} />;
      case 'manager-landed-cost':
      case 'manager-purchases':
        return <LandedCostScreen />;
      case 'manager-reports':
        return <ReportsScreen onNavigate={setActiveScreen} />;


      // ─── Warehouse Screens ───
      case 'warehouse-inbound':
        return <InboundReceiptsScreen />;
      case 'warehouse-stock':
        return <StockInventoryScreen />;

      // ─── Production Screens ───
      case 'production-shifts':
        return <ProductionShiftsScreen />;

      // ─── Admin Screens ───
      case 'admin-dashboard':
        return <AdminDashboard onNavigate={setActiveScreen} />;
      case 'admin-staff':
        return <StaffAccountsScreen initialFilter="ALL" />;
      case 'admin-staff-active':
        return <StaffAccountsScreen initialFilter="ACTIVE" />;
      case 'admin-roles':
        return (
          <RoleCatalogScreen
            onNavigate={(screen, roleCode) => {
              if (roleCode) setSelectedMatrixRole(roleCode);
              setActiveScreen(screen);
            }}
          />
        );
      case 'admin-matrix':
        return <PermissionMatrixScreen initialRoleCode={selectedMatrixRole} />;
      case 'admin-warehouse-perms':
      case 'admin-warehouse-facilities':
        return <WarehousePermissionsScreen />;
      case 'admin-users':
        return <StaffAccountsScreen initialFilter="ALL" />;

      default:
        if (currentRole === 'SALES') return <SalesDashboard onNavigate={setActiveScreen} />;
        if (currentRole === 'MANAGER') return <ManagerDashboard onNavigate={setActiveScreen} />;
        if (currentRole === 'WAREHOUSE') return <InboundReceiptsScreen />;
        if (currentRole === 'PRODUCTION') return <ProductionShiftsScreen />;
        if (currentRole === 'ADMIN') return <AdminDashboard onNavigate={setActiveScreen} />;
        return <SalesDashboard onNavigate={setActiveScreen} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans">
      {/* 1. Header (SF Logo, Badge Role, Search input, User Profile) */}
      <Header
        currentRole={currentRole}
        onRoleChange={handleRoleChange}
      />

      {/* 2. Top Navigation Tabs Bar */}
      <Sidebar
        currentRole={currentRole}
        activeScreen={activeScreen}
        onNavigate={setActiveScreen}
      />

      {/* 3. Main Workspace Content */}
      <main className="flex-1 min-w-0 overflow-y-auto p-6 lg:p-8 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto">{renderActiveScreen()}</div>
      </main>
    </div>
  );
};
