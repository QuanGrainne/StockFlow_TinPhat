// src/app/(dashboard)/customers/page.tsx
'use client';

import { LazyAppLayout } from '@/components/layout/LazyAppLayout';

export default function CustomersPage() {
  return <LazyAppLayout initialScreen="customers" />;
}
