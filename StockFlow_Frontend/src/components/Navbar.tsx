'use client';

import { useState, useRef, useEffect, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ShoppingCart, MapPin, ChevronDown, Check } from 'lucide-react';
import { useActiveWarehouse } from '@/lib/warehouse/useActiveWarehouse';

interface DropdownItem {
  label: string;
  href: string;
}

interface NavItem {
  label: string;
  href?: string;
  children?: DropdownItem[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Tổng quan', href: '/dashboard' },
  {
    label: 'Hàng hóa',
    children: [
      { label: 'Danh mục hàng hóa', href: '/products' },
      { label: 'Thiết lập giá', href: '/products/price-books' },
      { label: 'Chuyển hàng', href: '/transfers' },
    ],
  },
  {
    label: 'Mua hàng',
    children: [
      { label: 'Nhập hàng', href: '/purchases' },
      { label: 'Trả hàng nhập', href: '/purchase-returns' },
      { label: 'Nhà cung cấp', href: '/suppliers' },
    ],
  },
  { label: 'Đơn hàng', href: '/orders' },
  { label: 'Khách hàng', href: '/customers' },
  { label: 'Báo cáo', href: '/reports' },
  { label: 'Bán online', href: '/orders' },
];

function subscribeUser(callback: () => void) {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function getUserSnapshot() {
  if (typeof window === 'undefined') return '';
  try {
    const raw = localStorage.getItem('stockflow_user');
    if (!raw) return '';
    const u = JSON.parse(raw) as { fullName?: string; username?: string };
    return u.fullName ?? u.username ?? '';
  } catch {
    return '';
  }
}

function getServerUserSnapshot() {
  return '';
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  // Get username safely using useSyncExternalStore
  const username = useSyncExternalStore(subscribeUser, getUserSnapshot, getServerUserSnapshot);

  const { activeWarehouse, setActiveWarehouse, warehouses } = useActiveWarehouse();
  const [warehouseDropdownOpen, setWarehouseDropdownOpen] = useState(false);
  const warehouseMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
      if (warehouseMenuRef.current && !warehouseMenuRef.current.contains(e.target as Node)) {
        setWarehouseDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleLogout() {
    localStorage.removeItem('stockflow_token');
    localStorage.removeItem('stockflow_user');
    router.push('/login');
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[#005f9d] bg-[#0071BA] text-white shadow-sm">
      <div className="w-full px-6 flex items-center h-14 gap-2">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 mr-6 shrink-0">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-sm font-bold text-[#0071BA]">
            S
          </span>
          <span className="hidden text-base font-bold tracking-tight text-white sm:block">
            StockFlow
          </span>
        </Link>

        {/* Nav items */}
        <nav ref={navRef} className="flex min-w-0 flex-1 items-center justify-center gap-1 whitespace-nowrap">
          {NAV_ITEMS.map((item) => {
            const isOpen = openMenu === item.label;
            const isActive = item.children
              ? item.children.some((c) => pathname.startsWith(c.href))
              : pathname === item.href;

            if (item.children) {
              return (
                <div key={item.label} className="relative shrink-0">
                  <button
                    id={`nav-${item.label}`}
                    onClick={() => setOpenMenu(isOpen ? null : item.label)}
                    className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-2 rounded-lg text-sm font-medium transition select-none ${isActive || isOpen
                        ? 'bg-[#005f9d] text-white'
                        : 'text-white/85 hover:bg-white/15 hover:text-white'
                      }`}
                  >
                    {item.label}
                    {/* Chevron */}
                    <svg
                      className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown */}
                  {isOpen && (
                    <div className="absolute top-full left-0 mt-1.5 w-52 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={() => setOpenMenu(null)}
                          className={`flex items-center px-4 py-2.5 text-sm transition ${pathname === child.href
                              ? 'bg-blue-50 text-blue-700 font-semibold'
                              : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href!}
                className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${isActive
                    ? 'bg-[#005f9d] text-white'
                    : 'text-white/85 hover:bg-white/15 hover:text-white'
                  }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right side: Kho + Bán hàng + user + logout */}
        <div className="flex items-center gap-3 ml-auto shrink-0">
          {/* Bộ chọn Chi nhánh / Kho chuẩn KiotViet */}
          <div className="relative shrink-0" ref={warehouseMenuRef}>
            <button
              type="button"
              id="header-branch-selector"
              onClick={() => setWarehouseDropdownOpen(!warehouseDropdownOpen)}
              className="flex items-center gap-1.5 rounded-lg bg-[#005f9d] hover:bg-[#005288] px-3 py-1.5 text-xs sm:text-sm font-medium text-white transition cursor-pointer border border-blue-400/30 shadow-xs"
              title="Chọn Chi nhánh / Kho làm việc hiện tại"
            >
              <MapPin size={15} className="text-amber-300 shrink-0" />
              <span className="max-w-[130px] sm:max-w-[170px] truncate">{activeWarehouse.name}</span>
              <ChevronDown size={14} className={`text-white/80 transition-transform ${warehouseDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {warehouseDropdownOpen && (
              <div className="absolute top-full right-0 mt-1.5 w-60 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-slate-800 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 flex items-center justify-between">
                  <span>Chi nhánh / Kho ({warehouses.length})</span>
                </div>
                {warehouses.map((wh) => {
                  const isSelected = wh.warehouseId === activeWarehouse.warehouseId;
                  return (
                    <button
                      key={wh.warehouseId}
                      type="button"
                      onClick={() => {
                        setActiveWarehouse(wh);
                        setWarehouseDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 text-xs sm:text-sm flex items-center justify-between transition cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50 text-[#0071BA] font-semibold'
                          : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span>{wh.name}</span>
                        <span className="text-[11px] font-mono text-slate-400">{wh.code}</span>
                      </div>
                      {isSelected && <Check size={16} className="text-[#0071BA] shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <Link
            href="/orders"
            className="flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-1.5 text-sm font-semibold text-[#0071BA] shadow-xs hover:bg-blue-50 transition"
          >
            <ShoppingCart size={16} className="text-[#0071BA]" />
            <span>Bán hàng</span>
          </Link>

          {username && (
            <span className="hidden text-sm text-white/85 sm:block">
              Xin chào, <span className="font-semibold text-white">{username}</span>
            </span>
          )}
          <button
            onClick={handleLogout}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-white/85 transition hover:bg-white/15 hover:text-white"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    </header>
  );
}
