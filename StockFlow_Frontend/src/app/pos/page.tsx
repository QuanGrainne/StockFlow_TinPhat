// src/app/pos/page.tsx
// Màn hình Bán hàng tại quầy (POS) — nằm trong khung quản lý chung (Header + thanh menu) như các trang khác,
// nội dung POS truyền qua children của AppLayout (giống trang Chi tiết đơn hàng).
'use client';

import dynamic from 'next/dynamic';
import { FeatureGuard } from '@/components/layout/FeatureGuard';
import { LazyAppLayout } from '@/components/layout/LazyAppLayout';

const PosScreen = dynamic(() => import('@/features/pos/screens/PosScreen'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-slate-600">Đang tải màn hình bán hàng...</div>
  ),
});

// Tạo / sửa đơn đặt hàng chỉ cần quyền Đặt hàng; tạo hóa đơn (kể cả từ đơn đặt) cần quyền Bán hàng
const posFeatures = (params: URLSearchParams): string[] =>
  params.has('returnInvoice') || params.has('quickReturn')
    ? ['feat-sales-returns']
    : params.has('booking') || params.has('newBooking') || params.has('copyBooking')
    ? ['feat-sales-booking']
    : params.has('bookingInvoice')
      ? ['feat-pos']
      : ['feat-pos', 'feat-sales-booking'];

export default function PosPage() {
  return (
    <LazyAppLayout initialScreen="pos">
      <FeatureGuard anyOf={posFeatures}>
        <PosScreen />
      </FeatureGuard>
    </LazyAppLayout>
  );
}
