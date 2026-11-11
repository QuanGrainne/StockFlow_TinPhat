'use client';

import dynamic from 'next/dynamic';

const AppLayout = dynamic(
  () => import('@/components/layout/AppLayout').then((mod) => mod.AppLayout),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen items-center justify-center bg-[#f7f9fa] text-sm text-slate-400">
        Đang tải danh sách trả hàng nhập...
      </div>
    ),
  }
);

export default function PurchaseReturnsPage() {
  return <AppLayout initialScreen="purchase-returns" />;
}
