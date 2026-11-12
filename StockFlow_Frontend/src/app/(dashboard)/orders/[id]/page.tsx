// src/app/(dashboard)/orders/[id]/page.tsx
// Trang Chi tiết đơn hàng bọc AppLayout để tái sử dụng toàn bộ Header & Navbar hệ thống StockFlow

'use client';

import React, { use, Suspense } from 'react';
import { LazyAppLayout } from '@/components/layout/LazyAppLayout';
import OrderDetailScreen from '@/features/orders/screens/OrderDetailScreen';

interface OrderDetailPageProps {
  params: Promise<{ id: string }> | { id: string };
}

function OrderDetailContent({ params }: OrderDetailPageProps) {
  const resolvedParams = 'then' in params ? use(params) : params;

  return (
    <LazyAppLayout initialScreen="orders">
      <OrderDetailScreen id={resolvedParams.id} />
    </LazyAppLayout>
  );
}

export default function OrderDetailPage(props: OrderDetailPageProps) {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center stockflow-brand-bg text-sm text-slate-400">
          Đang tải Chi tiết đơn hàng...
        </div>
      }
    >
      <OrderDetailContent {...props} />
    </Suspense>
  );
}
