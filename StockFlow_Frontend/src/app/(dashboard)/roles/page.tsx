// src/app/(dashboard)/roles/page.tsx — Danh mục vai trò
'use client';

import { LazyAppLayout } from '@/features/roles/components/LazyAppLayout';

export default function RolesPage() {
  return <LazyAppLayout initialScreen="admin-roles" />;
}
