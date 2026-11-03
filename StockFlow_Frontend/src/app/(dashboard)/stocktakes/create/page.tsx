'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const CreateStocktakeClient = dynamic(() => import('./CreateStocktakeClient'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[calc(100vh-56px)] items-center justify-center bg-[#f7f9fa] text-sm text-[#8c8c8c]">
      Đang tải màn hình kiểm kho...
    </div>
  ),
});

export default function CreateStocktakePage() {
  return (
    <Suspense fallback={null}>
      <CreateStocktakeClient />
    </Suspense>
  );
}
