'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { FeatureGuard } from '@/components/layout/FeatureGuard';

const CreateDisposalScreen = dynamic(() => import('@/features/disposals/screens/CreateDisposalScreen'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[calc(100vh-56px)] items-center justify-center bg-transparent text-sm text-[#8c8c8c]">
      Đang tải màn hình xuất hủy...
    </div>
  ),
});

const DISPOSAL_FEATURES = ['feat-disposal'];

export default function CreateDisposalPage() {
  // cacheComponents giữ state trang khi rời đi (Activity) → key theo bfcacheId để mỗi lần vào là form mới
  const { bfcacheId } = useRouter();
  return (
    <Suspense fallback={null}>
      <FeatureGuard anyOf={DISPOSAL_FEATURES}>
        <CreateDisposalScreen key={bfcacheId} />
      </FeatureGuard>
    </Suspense>
  );
}
