// src/app/(dashboard)/price-books/page.tsx — Thiết lập giá
'use client';

import { LazyAppLayout } from '@/features/roles/components/LazyAppLayout';

export default function PriceBooksPage() {
  return <LazyAppLayout initialScreen="admin-price-books" />;
}
