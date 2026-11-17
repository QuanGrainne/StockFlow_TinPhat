// src/app/(dashboard)/approvals/page.tsx — Duyệt hạn mức (Approval Inbox, UC-64)
'use client';

import { LazyAppLayout } from '@/components/layout/LazyAppLayout';

export default function ApprovalsPage() {
  return <LazyAppLayout initialScreen="credit-approvals" />;
}
