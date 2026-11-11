'use client';

import dynamic from 'next/dynamic';

const AppLayout = dynamic(
  () => import('@/components/layout/AppLayout').then((mod) => mod.AppLayout),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen items-center justify-center bg-[#f7f9fa] text-sm text-slate-400">
        Đang tải phiếu kiểm kho...
      </div>
    ),
  }
);

export default function StocktakesPage() {
  return <AppLayout initialScreen="stocktakes" />;
}
