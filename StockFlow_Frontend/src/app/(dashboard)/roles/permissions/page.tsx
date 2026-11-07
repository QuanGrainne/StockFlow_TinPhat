// src/app/(dashboard)/roles/permissions/page.tsx — Phân quyền chức năng
'use client';

import { LazyAppLayout } from '@/features/roles/components/LazyAppLayout';

export default function RolePermissionsPage() {
  return <LazyAppLayout initialScreen="admin-matrix" />;
}
