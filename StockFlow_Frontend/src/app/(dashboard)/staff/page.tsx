// src/app/(dashboard)/staff/page.tsx — Nhân viên
'use client';

import { LazyAppLayout } from '@/features/roles/components/LazyAppLayout';

export default function StaffPage() {
  return <LazyAppLayout initialScreen="admin-staff" />;
}
