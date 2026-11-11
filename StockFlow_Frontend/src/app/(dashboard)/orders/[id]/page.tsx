// src/app/(dashboard)/orders/[id]/page.tsx
// Trang Chi tiết đơn hàng bọc AppLayout để tái sử dụng toàn bộ Header & Navbar hệ thống StockFlow

'use client';

import React, { use, Suspense } from 'react';
import dynamic from 'next/dynamic';
import OrderDetailScreen from '@/features/orders/screens/OrderDetailScreen';

const AppLayout = dynamic(
  () => import('@/features/roles/components/AppLayout').then((mod) => mod.AppLayout),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen items-center justify-center bg-[#f7f9fa] text-sm text-slate-400">
        Đang tải Chi tiết đơn hàng...
      </div>
    ),
  }
);

interface OrderDetailPageProps {
  params: Promise<{ id: string }> | { id: string };
}

function OrderDetailContent({ params }: OrderDetailPageProps) {
  const resolvedParams = 'then' in params ? use(params) : params;

  return (
    <AppLayout initialScreen="orders">
      <OrderDetailScreen id={resolvedParams.id} />
    </AppLayout>
  );
}

export default function OrderDetailPage(props: OrderDetailPageProps) {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-[#f7f9fa] text-sm text-slate-400">
          Đang tải Chi tiết đơn hàng...
        </div>
      }
    >
      <OrderDetailContent {...props} />
    </Suspense>
  );
}
