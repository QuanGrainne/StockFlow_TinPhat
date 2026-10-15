'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

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
  {
    label: 'Hàng hóa',
    children: [
      { label: 'Danh sách hàng hóa', href: '/products' },
      { label: 'Thiết lập giá', href: '/products/pricing' },
    ],
  },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  // Get username from localStorage
  const [username, setUsername] = useState('');
  useEffect(() => {
    const raw = localStorage.getItem('stockflow_user');
    if (raw) {
      try {
        const u = JSON.parse(raw);
        setUsername(u.fullName ?? u.username ?? '');
      } catch {
        setUsername('');
      }
    }
  }, []);

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
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-screen-xl mx-auto px-6 flex items-center h-14 gap-2">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 mr-6 shrink-0">
          <span className="w-8 h-8 rounded-lg bg-blue-600 text-white text-sm font-bold flex items-center justify-center">
            S
          </span>
          <span className="font-bold text-slate-800 text-base tracking-tight hidden sm:block">
            StockFlow
          </span>
        </Link>

        {/* Nav items */}
        <nav ref={navRef} className="flex items-center gap-1 flex-1">
          {NAV_ITEMS.map((item) => {
            const isOpen = openMenu === item.label;
            const isActive = item.children
              ? item.children.some((c) => pathname.startsWith(c.href))
              : pathname === item.href;

            if (item.children) {
              return (
                <div key={item.label} className="relative">
                  <button
                    id={`nav-${item.label}`}
                    onClick={() => setOpenMenu(isOpen ? null : item.label)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition select-none ${
                      isActive || isOpen
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
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
                          className={`flex items-center px-4 py-2.5 text-sm transition ${
                            pathname === child.href
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
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right side: user + logout */}
        <div className="flex items-center gap-3 ml-auto shrink-0">
          {username && (
            <span className="text-sm text-slate-600 hidden sm:block">
              Xin chào, <span className="font-semibold text-slate-800">{username}</span>
            </span>
          )}
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 text-sm text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition font-medium"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    </header>
  );
}
