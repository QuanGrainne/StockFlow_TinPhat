// src/app/(dashboard)/bom/page.tsx — Định mức BOM
'use client';

import { LazyAppLayout } from '@/features/roles/components/LazyAppLayout';

export default function BomPage() {
  return <LazyAppLayout initialScreen="manager-bom" />;
}
