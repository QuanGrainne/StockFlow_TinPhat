// src/app/pos/page.tsx
// Màn hình Bán hàng tại quầy (POS) — toàn màn hình, không dùng khung quản lý.
'use client';

import dynamic from 'next/dynamic';

const PosScreen = dynamic(() => import('@/features/pos/screens/PosScreen'), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen items-center justify-center bg-[#e9ebef] text-sm text-slate-500">Đang tải màn hình bán hàng...</div>
  ),
});

export default function PosPage() {
  return <PosScreen />;
}
