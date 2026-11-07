// src/app/(dashboard)/production/logs/page.tsx — Sổ nhật ký phiếu tham chiếu
'use client';

import { LazyAppLayout } from '@/features/roles/components/LazyAppLayout';

export default function ProductionLogsPage() {
  return <LazyAppLayout initialScreen="production-logs" />;
}
