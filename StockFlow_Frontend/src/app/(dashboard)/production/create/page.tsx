// src/app/(dashboard)/production/create/page.tsx — Lập / sửa lệnh sản xuất (UC-59), form toàn màn hình
'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { FeatureGuard } from '@/components/layout/FeatureGuard';

const CreateProductionOrderScreen = dynamic(() => import('@/features/production/screens/CreateProductionOrderScreen'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[calc(100vh-56px)] items-center justify-center bg-transparent text-sm text-[#8c8c8c]">
      Đang tải màn hình lập lệnh sản xuất...
    </div>
  ),
});

const PRODUCTION_PLAN_FEATURES = ['feat-prod-plan'];

export default function CreateProductionOrderPage() {
  // cacheComponents giữ state trang khi rời đi (Activity) → key theo bfcacheId để mỗi lần vào là form mới
  const { bfcacheId } = useRouter();
  return (
    <Suspense fallback={null}>
      <FeatureGuard anyOf={PRODUCTION_PLAN_FEATURES}>
        <CreateProductionOrderScreen key={bfcacheId} />
      </FeatureGuard>
    </Suspense>
  );
}
