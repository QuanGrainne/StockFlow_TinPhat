'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

const AppLayout = dynamic(
  () => import('@/components/layout/AppLayout').then((mod) => mod.AppLayout),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen items-center justify-center bg-[#f7f9fa] text-sm text-slate-400">
        Đang tải danh sách đặt hàng nhập...
      </div>
    ),
  }
);

export default function PurchaseOrdersPage() {
  // Quay lại từ form (router.push) phải đọc lại link ?code=... và tải danh sách mới
  const { bfcacheId } = useRouter();
  return <AppLayout key={bfcacheId} initialScreen="purchase-orders" />;
}
