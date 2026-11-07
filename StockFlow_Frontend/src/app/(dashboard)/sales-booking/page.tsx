// src/app/(dashboard)/sales-booking/page.tsx — Đặt hàng (đơn đặt của khách)
'use client';

import { LazyAppLayout } from '@/features/roles/components/LazyAppLayout';

export default function SalesBookingPage() {
  return <LazyAppLayout initialScreen="sales-booking" />;
}
