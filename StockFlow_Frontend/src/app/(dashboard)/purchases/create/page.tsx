'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { FeatureGuard } from '@/components/layout/FeatureGuard';

const CreatePurchaseScreen = dynamic(() => import('@/features/purchases/screens/CreatePurchaseScreen'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[calc(100vh-56px)] items-center justify-center bg-transparent text-sm text-[#8c8c8c]">
      Đang tải màn hình nhập hàng...
    </div>
  ),
});

// Nhập hàng từ phiếu Đặt hàng nhập (?po=) được phép với chức năng Đặt hàng nhập
const purchaseFeatures = (params: URLSearchParams) =>
  params.get('po') ? ['feat-purchase', 'feat-purchase-orders'] : ['feat-purchase'];

export default function CreatePurchasePage() {
  // cacheComponents giữ state trang khi rời đi (Activity) → key theo bfcacheId để mỗi lần vào là form mới
  const { bfcacheId } = useRouter();
  return (
    <FeatureGuard anyOf={purchaseFeatures}>
      <CreatePurchaseScreen key={bfcacheId} />
    </FeatureGuard>
  );
}
