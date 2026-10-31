// src/app/(dashboard)/customers/page.tsx
'use client';

import dynamic from 'next/dynamic';

const AppLayout = dynamic(
  () => import('@/features/roles/components/AppLayout').then((mod) => mod.AppLayout),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen items-center justify-center bg-[#f7f9fa] text-sm text-slate-400">
        Đang tải Quản lý Khách hàng...
      </div>
    ),
  }
);

export default function CustomersPage() {
  return <AppLayout initialScreen="customers" />;
}

