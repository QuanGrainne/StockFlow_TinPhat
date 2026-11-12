// src/app/(dashboard)/bom/page.tsx — Định mức BOM
'use client';

import { LazyAppLayout } from '@/components/layout/LazyAppLayout';

export default function BomPage() {
  return <LazyAppLayout initialScreen="manager-bom" />;
}
