'use client';

import { useRouter } from 'next/navigation';
import { LazyAppLayout } from '@/components/layout/LazyAppLayout';

export default function PurchaseOrdersPage() {
  // Quay lại từ form (router.push) phải đọc lại link ?code=... và tải danh sách mới
  const { bfcacheId } = useRouter();
  return <LazyAppLayout key={bfcacheId} initialScreen="purchase-orders" />;
}
