'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { FeatureGuard } from '@/features/roles/components/common/FeatureGuard';

const CreateSalesReturnClient = dynamic(() => import('./CreateSalesReturnClient'), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen items-center justify-center bg-[#f7f9fa] text-sm text-[#8c8c8c]">Đang tải màn hình trả hàng...</div>
  ),
});

const RETURN_FEATURES = ['feat-sales-returns'];

export default function CreateSalesReturnPage() {
  // cacheComponents giữ state trang khi rời đi (Activity) → key theo bfcacheId để mỗi lần vào là form mới
  const { bfcacheId } = useRouter();
  return (
    <FeatureGuard anyOf={RETURN_FEATURES}>
      <CreateSalesReturnClient key={bfcacheId} />
    </FeatureGuard>
  );
}
