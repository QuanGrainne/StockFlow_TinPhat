'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { FeatureGuard } from '@/components/layout/FeatureGuard';

const CreatePurchaseReturnScreen = dynamic(() => import('@/features/purchase-returns/screens/CreatePurchaseReturnScreen'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[calc(100vh-56px)] items-center justify-center bg-transparent text-sm text-[#8c8c8c]">
      Đang tải màn hình trả hàng nhập...
    </div>
  ),
});

const RETURN_FEATURES = ['feat-purchase-returns'];

export default function CreatePurchaseReturnPage() {
  // cacheComponents giữ state trang khi rời đi (Activity) → key theo bfcacheId để mỗi lần vào là form mới
  const { bfcacheId } = useRouter();
  return (
    <FeatureGuard anyOf={RETURN_FEATURES}>
      <CreatePurchaseReturnScreen key={bfcacheId} />
    </FeatureGuard>
  );
}
