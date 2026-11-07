// src/app/(dashboard)/production/import/page.tsx — Nhận kế hoạch sản xuất (Import File)
'use client';

import { LazyAppLayout } from '@/features/roles/components/LazyAppLayout';

export default function ProductionImportPage() {
  return <LazyAppLayout initialScreen="production-import" />;
}
