// src/app/pos/page.tsx
// Màn hình Bán hàng tại quầy (POS) — trang toàn màn hình kiểu form tạo phiếu (giống Tạo chuyển hàng):
// thanh trên riêng (quay lại, tiêu đề, tìm hàng, kho làm việc + người dùng), không dùng khung quản lý.
'use client';

import dynamic from 'next/dynamic';
import { FeatureGuard } from '@/components/layout/FeatureGuard';

const PosScreen = dynamic(() => import('@/features/pos/screens/PosScreen'), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen items-center justify-center stockflow-brand-bg text-sm text-slate-600">Đang tải màn hình bán hàng...</div>
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
    <FeatureGuard anyOf={posFeatures}>
      <PosScreen />
    </FeatureGuard>
  );
}
