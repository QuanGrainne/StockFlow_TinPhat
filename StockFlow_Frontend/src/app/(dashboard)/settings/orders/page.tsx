// src/app/(dashboard)/settings/orders/page.tsx
'use client';

import dynamic from 'next/dynamic';

const AppLayout = dynamic(
  () => import('@/features/roles/components/AppLayout').then((mod) => mod.AppLayout),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen items-center justify-center bg-[#f7f9fa] text-sm text-slate-400">
        Đang tải Thiết lập đơn hàng...
      </div>
    ),
  }
);

export default function OrderSettingsPage() {
  return <AppLayout initialScreen="admin-order-settings" />;
}

