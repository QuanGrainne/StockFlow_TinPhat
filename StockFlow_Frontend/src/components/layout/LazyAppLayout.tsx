// src/components/layout/LazyAppLayout.tsx
// Khung quản lý (header + navbar) chỉ render ở client: AppLayout đọc vai trò từ localStorage (tránh lỗi hydration).
'use client';

import dynamic from 'next/dynamic';

export const LazyAppLayout = dynamic(() => import('./AppLayout').then((mod) => mod.AppLayout), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen items-center justify-center bg-[#f7f9fa] text-sm text-slate-400">Đang tải...</div>
  ),
});
