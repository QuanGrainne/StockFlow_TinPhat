// src/app/(dashboard)/sales-returns/page.tsx — Trả hàng (khách trả lại hàng đã mua)
'use client';

import { LazyAppLayout } from '@/features/roles/components/LazyAppLayout';

export default function SalesReturnsPage() {
  return <LazyAppLayout initialScreen="sales-returns" />;
}
