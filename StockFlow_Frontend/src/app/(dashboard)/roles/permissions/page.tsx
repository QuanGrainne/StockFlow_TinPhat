// src/app/(dashboard)/roles/permissions/page.tsx — Phân quyền chức năng
'use client';

import { LazyAppLayout } from '@/components/layout/LazyAppLayout';

export default function RolePermissionsPage() {
  return <LazyAppLayout initialScreen="admin-matrix" />;
}
