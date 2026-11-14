// src/app/(dashboard)/production/page.tsx — Lệnh sản xuất (UC-44, UC-58–61)
'use client';

import { LazyAppLayout } from '@/components/layout/LazyAppLayout';

export default function ProductionPage() {
  return <LazyAppLayout initialScreen="production-orders" />;
}
