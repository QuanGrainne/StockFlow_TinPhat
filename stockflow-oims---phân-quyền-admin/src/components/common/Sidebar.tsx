// src/components/common/Sidebar.tsx
// Sidebar có nút thu gọn (Collapsible), danh mục menu theo từng Role

import React from 'react';
import { UserRole } from '../../types';
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  ShoppingCart,
  ShieldAlert,
  GitMerge,
  Cpu,
  Users,
  Wallet,
  Settings,
} from 'lucide-react';

interface SidebarProps {
  currentRole: UserRole;
  activeScreen: string;
  onNavigate: (screenId: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  pendingApprovalsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentRole,
  activeScreen,
  onNavigate,
  isCollapsed,
  onToggleCollapse,
  pendingApprovalsCount = 1,
}) => {
  // Menu cho Sales
  const salesMenuItems = [
    { id: 'sales-dashboard', label: 'Tổng quan Kinh doanh', icon: LayoutDashboard },
    { id: 'sales-orders', label: 'Đơn hàng chờ duyệt', icon: ShoppingCart },
    { id: 'sales-credit-limits', label: 'Yêu cầu hạn mức nợ', icon: ShieldAlert },
  ];

  // Menu cho Manager (BỎ QUA Return Tracking, Machine Status, Inventory Disposal)
  const managerMenuItems = [
    { id: 'manager-dashboard', label: 'Tổng quan điều hành', icon: LayoutDashboard },
    {
      id: 'manager-approvals',
      label: 'Hộp thư xét duyệt',
      icon: ShieldAlert,
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
    },
    { id: 'manager-bom', label: 'Quản lý định mức BOM', icon: Cpu },
    { id: 'manager-partners', label: 'Hạn mức nợ đối tác', icon: Users },
    { id: 'manager-cashflow', label: 'Sổ quỹ Thu / Chi', icon: Wallet },
    { id: 'manager-production', label: 'Kế hoạch sản xuất', icon: GitMerge },
  ];

  const menuItems = currentRole === 'SALES' ? salesMenuItems : managerMenuItems;

  return (
    <aside
      className={`relative shrink-0 bg-white border-r border-slate-200 select-none flex flex-col transition-all duration-300 min-h-[calc(100vh-56px)] ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Role Title Bar */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        {!isCollapsed && (
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">
            {currentRole === 'SALES' ? 'Phân hệ Kinh doanh' : 'Phân hệ Quản lý'}
          </div>
        )}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-1 rounded-[6px] text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer mx-auto"
          title={isCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav List */}
      <nav className="flex-1 py-3 px-2 space-y-1">
        {menuItems.map((item) => {
          const isActive = activeScreen === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-xs font-medium transition cursor-pointer group ${
                isActive
                  ? 'bg-blue-50 text-[#2B6CB0] font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon
                size={18}
                className={`shrink-0 ${
                  isActive ? 'text-[#2B6CB0]' : 'text-slate-400 group-hover:text-slate-600'
                }`}
              />
              {!isCollapsed && (
                <span className="flex-1 text-left truncate">{item.label}</span>
              )}
              {!isCollapsed && item.badge !== undefined && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-100 text-slate-400 text-[11px]">
        {!isCollapsed ? (
          <div className="flex items-center gap-2">
            <Settings size={14} />
            <span>StockFlow v1.0 Desktop</span>
          </div>
        ) : (
          <div className="flex justify-center">
            <Settings size={14} />
          </div>
        )}
      </div>
    </aside>
  );
};
