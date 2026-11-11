'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { FeatureGuard } from '@/components/layout/FeatureGuard';

// Dùng chung form với Nhập hàng (mode="order"): tìm hàng, bảng hàng hóa, NCC, giảm giá
const CreatePurchaseScreen = dynamic(() => import('@/features/purchases/screens/CreatePurchaseScreen'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[calc(100vh-56px)] items-center justify-center bg-[#f7f9fa] text-sm text-[#8c8c8c]">
      Đang tải màn hình đặt hàng nhập...
    </div>
  ),
});

const PO_FEATURES = ['feat-purchase-orders'];

export default function CreatePurchaseOrderPage() {
  // cacheComponents giữ state trang khi rời đi (Activity) → key theo bfcacheId để mỗi lần vào là form mới
  const { bfcacheId } = useRouter();
  return (
    <FeatureGuard anyOf={PO_FEATURES}>
      <CreatePurchaseScreen key={bfcacheId} mode="order" />
    </FeatureGuard>
  );
}
