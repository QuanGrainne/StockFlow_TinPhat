'use client';

import dynamic from 'next/dynamic';

const SuppliersClient = dynamic(() => import('./SuppliersClient'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[calc(100vh-56px)] items-center justify-center bg-[#f7f9fa] text-sm text-[#8c8c8c]">
      Đang tải danh sách nhà cung cấp...
    </div>
  ),
});

export default function SuppliersPage() {
  return <SuppliersClient />;
}
