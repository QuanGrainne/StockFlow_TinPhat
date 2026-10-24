'use client';

import { useState, useRef, useEffect, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ShoppingCart } from 'lucide-react';

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
      { label: 'Danh mục', href: '/products' },
      { label: 'Thiết lập giá', href: '/products/price-books' },
      { label: 'Kiểm kho', href: '/inventory' },
    ],
  },
  {
    label: 'Mua hàng',
    children: [
      { label: 'Nhập hàng', href: '/purchases' },
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
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = (label: string) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setOpenMenu(label);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setOpenMenu(null);
    }, 150);
  };

  // Get username safely using useSyncExternalStore
  const username = useSyncExternalStore(subscribeUser, getUserSnapshot, getServerUserSnapshot);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
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
                <div
                  key={item.label}
                  className="relative shrink-0"
                  onMouseEnter={() => handleMouseEnter(item.label)}
                  onMouseLeave={handleMouseLeave}
                >
                  <button
                    id={`nav-${item.label}`}
                    onClick={() => setOpenMenu(isOpen ? null : item.label)}
                    className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-2 rounded-lg text-sm font-medium transition select-none ${
                      isActive || isOpen
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
                    <div
                      onMouseEnter={() => handleMouseEnter(item.label)}
                      onMouseLeave={handleMouseLeave}
                      className="absolute top-full left-0 mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
                    >
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={() => setOpenMenu(null)}
                          className={`flex items-center px-4 py-2.5 text-xs transition ${
                            pathname === child.href
                              ? 'bg-blue-50 text-[#0071BA] font-bold'
                              : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-medium'
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
                className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-[#005f9d] text-white'
                    : 'text-white/85 hover:bg-white/15 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right side: Bán hàng + user + logout */}
        <div className="flex items-center gap-3 ml-auto shrink-0">
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
