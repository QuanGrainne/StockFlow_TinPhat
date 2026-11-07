// src/app/(dashboard)/production/page.tsx — Theo dõi lệnh sản xuất
'use client';

import { LazyAppLayout } from '@/features/roles/components/LazyAppLayout';

export default function ProductionPage() {
  return <LazyAppLayout initialScreen="production-orders" />;
}
