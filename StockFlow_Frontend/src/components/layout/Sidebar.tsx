// src/components/layout/Sidebar.tsx
// Thanh Navbar dùng chung cho mọi vai trò. Danh sách mục lấy từ config/navbar.ts;
// vai trò chỉ thấy các mục được tick trong Phân quyền vai trò (ma trận chức năng).

import React, { useState, useRef, useEffect } from 'react';
import { message } from 'antd';
import { ChevronDown } from 'lucide-react';
import { UserRole } from '@/features/admin/types';
import { permissionService } from '@/features/admin/services/permissionService';
import { NAV_GROUPS, type NavGroup } from '@/lib/navigation/navbar';

interface SidebarProps {
  currentRole: UserRole;
  activeScreen: string;
  onNavigate: (screenId: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  /** Giữ tương thích (không còn dùng) */
  productionBadge?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentRole, activeScreen, onNavigate }) => {
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  // Lấy quyền gần nhất (đồng bộ) để navbar hiện ngay khi chuyển trang, sau đó tải lại từ server
  const [allowedFeatures, setAllowedFeatures] = useState<Set<string> | null>(() =>
    permissionService.peekAllowedFeatures(`ROLE_${currentRole}`)
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Menu con rộng 256px: tab nằm sát mép phải thì canh menu theo mép phải để không bị cắt khi màn hình hẹp
  const [dropdownAlignRight, setDropdownAlignRight] = useState(false);
  const DROPDOWN_WIDTH = 256;

  const handleMouseEnter = (tabId: string, anchor?: HTMLElement | null) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    if (anchor && typeof window !== 'undefined') {
      setDropdownAlignRight(anchor.getBoundingClientRect().left + DROPDOWN_WIDTH > window.innerWidth - 8);
    }
    setOpenDropdownId(tabId);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => setOpenDropdownId(null), 180);
  };

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  // Tải chức năng được phép của vai trò; tải lại khi Admin lưu ma trận phân quyền
  useEffect(() => {
    let stale = false;
    const load = async () => {
      try {
        const feats = await permissionService.getAllowedFeatures(`ROLE_${currentRole}`);
        if (!stale) setAllowedFeatures(feats);
      } catch {
        if (!stale) setAllowedFeatures(null);
      }
    };
    void load();
    window.addEventListener('stockflow_permissions_updated', load);
    return () => {
      stale = true;
      window.removeEventListener('stockflow_permissions_updated', load);
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

  // Chỉ giữ các mục được tick; nhóm không còn mục nào thì ẩn cả nhóm (chưa tải xong quyền thì chưa hiện gì)
  const visibleGroups: NavGroup[] = allowedFeatures
    ? NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => allowedFeatures.has(i.featureId)) })).filter(
        (g) => g.items.length > 0
      )
    : [];

  const isGroupActive = (g: NavGroup) =>
    g.items.some((i) => i.screen === activeScreen || (i.aliases ?? []).includes(activeScreen));

  const openItem = (item: NavGroup['items'][number]) => {
    setOpenDropdownId(null);
    if (item.comingSoon) {
      message.info(`Chức năng ${item.title} đang được phát triển.`);
      return;
    }
    onNavigate(item.screen);
  };

  return (
    <div
      ref={containerRef}
      className="bg-white/82 border-b border-slate-200 px-3 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 select-none relative z-30 overflow-visible"
    >
      <div className="flex flex-wrap items-center gap-1.5 overflow-visible min-w-0 flex-1">
        {visibleGroups.map((group) => {
          const active = isGroupActive(group);
          const Icon = group.icon;
          const hasDropdown = !group.single;
          const isOpen = openDropdownId === group.id;

          return (
            <div
              key={group.id}
              className="relative shrink-0 tab-dropdown-group group"
              onMouseEnter={(e) => hasDropdown && handleMouseEnter(group.id, e.currentTarget)}
              onMouseLeave={() => hasDropdown && handleMouseLeave()}
            >
              <button
                type="button"
                onClick={(e) => {
                  if (!hasDropdown) {
                    openItem(group.items[0]);
                  } else if (isOpen) {
                    setOpenDropdownId(null);
                  } else {
                    handleMouseEnter(group.id, e.currentTarget.parentElement);
                  }
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-[8px] text-xs font-semibold transition cursor-pointer border ${
                  active
                    ? 'bg-blue-50/80 text-[#2B6CB0] border-blue-200 shadow-2xs'
                    : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon size={14} className={active ? 'text-[#2B6CB0]' : 'text-slate-500'} />
                <span>{group.label}</span>
                {hasDropdown && (
                  <ChevronDown
                    size={12}
                    className={`tab-chevron transition-transform duration-150 ${active ? 'text-[#2B6CB0]' : 'text-slate-400'} ${
                      isOpen ? 'is-open' : ''
                    }`}
                  />
                )}
              </button>

              {/* Menu con (hiện khi rê chuột) */}
              {hasDropdown && (
                <div
                  onMouseEnter={() => handleMouseEnter(group.id)}
                  onMouseLeave={handleMouseLeave}
                  className={`tab-dropdown-menu absolute top-full pt-1.5 w-64 max-w-[calc(100vw-1rem)] z-50 ${
                    isOpen && dropdownAlignRight ? 'right-0' : 'left-0'
                  } ${isOpen ? 'is-open' : ''}`}
                >
                  <div className="bg-white rounded-[10px] shadow-xl border border-slate-200 py-1.5 overflow-hidden">
                    {group.items.map((item) => {
                      const ItemIcon = item.icon;
                      const isItemActive = activeScreen === item.screen || (item.aliases ?? []).includes(activeScreen);
                      return (
                        <button
                          key={item.featureId}
                          type="button"
                          onClick={() => openItem(item)}
                          className={`w-full text-left px-3.5 py-2.5 flex items-start gap-3 transition cursor-pointer hover:bg-blue-50/70 ${
                            isItemActive ? 'bg-blue-50 text-[#2B6CB0]' : 'text-slate-700'
                          }`}
                        >
                          <div className={`mt-0.5 p-1 rounded-[6px] shrink-0 ${isItemActive ? 'text-[#2B6CB0]' : 'text-slate-400'}`}>
                            <ItemIcon size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold leading-tight flex items-center gap-1.5">
                              <span>{item.title}</span>
                              {item.comingSoon && (
                                <span className="px-1.5 py-px rounded-full text-[10px] font-semibold bg-amber-50 text-amber-600 border border-amber-200">
                                  Đang phát triển
                                </span>
                              )}
                            </div>
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

    </div>
  );
};
