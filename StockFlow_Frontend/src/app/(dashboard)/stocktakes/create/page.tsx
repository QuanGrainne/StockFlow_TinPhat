'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

const CreateStocktakeClient = dynamic(() => import('./CreateStocktakeClient'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[calc(100vh-56px)] items-center justify-center bg-[#f7f9fa] text-sm text-[#8c8c8c]">
      Đang tải màn hình kiểm kho...
    </div>
  ),
});

export default function CreateStocktakePage() {
  // cacheComponents giữ state trang khi rời đi (Activity) → key theo bfcacheId để mỗi lần vào là form mới
  const { bfcacheId } = useRouter();
  return (
    <Suspense fallback={null}>
      <CreateStocktakeClient key={bfcacheId} />
    </Suspense>
  );
}
