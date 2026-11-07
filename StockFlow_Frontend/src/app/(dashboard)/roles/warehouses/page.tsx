// src/app/(dashboard)/roles/warehouses/page.tsx — Phân quyền kho
'use client';

import { LazyAppLayout } from '@/features/roles/components/LazyAppLayout';

export default function WarehousePermissionsPage() {
  return <LazyAppLayout initialScreen="admin-warehouse-perms" />;
}
