// src/app/(dashboard)/products/page.tsx
'use client';

import { LazyAppLayout } from '@/components/layout/LazyAppLayout';

export default function ProductsPage() {
  return <LazyAppLayout initialScreen="goods-catalog" />;
}
