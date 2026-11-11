// src/app/(dashboard)/dashboard/page.tsx — Tổng quan
'use client';

import { LazyAppLayout } from '@/components/layout/LazyAppLayout';

export default function DashboardPage() {
  return <LazyAppLayout initialScreen="admin-dashboard" />;
}
