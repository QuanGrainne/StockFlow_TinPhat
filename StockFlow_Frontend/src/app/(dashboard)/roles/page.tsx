// src/app/(dashboard)/roles/page.tsx
'use client';

import dynamic from 'next/dynamic';

// Chỉ render ở client: AppLayout đọc vai trò từ localStorage (tránh lỗi hydration)
const AppLayout = dynamic(
  () => import('@/features/roles/components/AppLayout').then((mod) => mod.AppLayout),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen items-center justify-center bg-[#f7f9fa] text-sm text-slate-400">
        Đang tải...
      </div>
    ),
  }
);

export default function RolesManagementPage() {
  return <AppLayout />;
}
