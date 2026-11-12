// src/app/(dashboard)/settings/orders/page.tsx
'use client';

import { LazyAppLayout } from '@/components/layout/LazyAppLayout';

export default function OrderSettingsPage() {
  return <LazyAppLayout initialScreen="admin-order-settings" />;
}
