// src/components/AppLayout.tsx
// Layout chính: Tích hợp Header (Role Switcher), Sidebar Collapsible, và Render Màn hình tương ứng

import React, { useState } from 'react';
import { UserRole } from '../types';
import { Header } from './common/Header';
import { Sidebar } from './common/Sidebar';

// Sales Screens
import { SalesDashboard } from './sales/screens/SalesDashboard';
import { PendingOrdersScreen } from './sales/screens/PendingOrdersScreen';
import { CreditLimitRequestsScreen } from './sales/screens/CreditLimitRequestsScreen';

// Manager Screens
import { ManagerDashboard } from './manager/screens/ManagerDashboard';
import { ApprovalInboxScreen } from './manager/screens/ApprovalInboxScreen';
import { BomManagementScreen } from './manager/screens/BomManagementScreen';
import { PartnerCreditLimitScreen } from './manager/screens/PartnerCreditLimitScreen';
import { CashFlowScreen } from './manager/screens/CashFlowScreen';
import { ProductionOrdersScreen } from './manager/screens/ProductionOrdersScreen';

export const AppLayout: React.FC = () => {
  const [currentRole, setCurrentRole] = useState<UserRole>('SALES');
  const [activeScreen, setActiveScreen] = useState<string>('sales-dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Xử lý chuyển đổi vai trò (RBAC Switcher)
  const handleRoleChange = (newRole: UserRole) => {
    setCurrentRole(newRole);
    if (newRole === 'SALES') {
      setActiveScreen('sales-dashboard');
    } else if (newRole === 'MANAGER') {
      setActiveScreen('manager-dashboard');
    }
  };

  const renderActiveScreen = () => {
    switch (activeScreen) {
      // ─── Sales Screens ───
      case 'sales-dashboard':
        return <SalesDashboard onNavigate={setActiveScreen} />;
      case 'sales-orders':
        return <PendingOrdersScreen />;
      case 'sales-credit-limits':
        return <CreditLimitRequestsScreen />;

      // ─── Manager Screens ───
      case 'manager-dashboard':
        return <ManagerDashboard onNavigate={setActiveScreen} />;
      case 'manager-approvals':
        return <ApprovalInboxScreen />;
      case 'manager-bom':
        return <BomManagementScreen />;
      case 'manager-partners':
        return <PartnerCreditLimitScreen />;
      case 'manager-cashflow':
        return <CashFlowScreen />;
      case 'manager-production':
        return <ProductionOrdersScreen />;

      default:
        return currentRole === 'SALES' ? (
          <SalesDashboard onNavigate={setActiveScreen} />
        ) : (
          <ManagerDashboard onNavigate={setActiveScreen} />
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#F7FAFC] text-slate-800 flex flex-col font-sans">
      {/* 1. Header with Role Switcher dropdown */}
      <Header
        currentRole={currentRole}
        onRoleChange={handleRoleChange}
        userName={
          currentRole === 'SALES'
            ? 'Trần Văn Tuấn (Kinh doanh)'
            : 'Nguyễn Quản Lý (Giám đốc Vận hành)'
        }
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* 2. Body: Sidebar + Main Workspace */}
      <div className="flex-1 flex min-h-[calc(100vh-56px)] overflow-hidden">
        {/* Collapsible Sidebar */}
        <Sidebar
          currentRole={currentRole}
          activeScreen={activeScreen}
          onNavigate={setActiveScreen}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        {/* Main Workspace Content */}
        <main className="flex-1 min-w-0 overflow-y-auto p-6 lg:p-8 bg-[#F7FAFC]">
          <div className="max-w-7xl mx-auto">{renderActiveScreen()}</div>
        </main>
      </div>
    </div>
  );
};
