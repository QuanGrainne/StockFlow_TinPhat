// src/app/(dashboard)/dashboard/page.tsx
'use client';

import dynamic from 'next/dynamic';

// AppLayout đọc vai trò / màn hình từ localStorage ngay khi khởi tạo → chỉ render ở client (ssr: false),
// nếu render ở server sẽ ra vai trò mặc định (SALES) và lệch với client (lỗi hydration).
const AppLayout = dynamic(
  () => import('@/features/roles/components/AppLayout').then((mod) => mod.AppLayout),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen items-center justify-center bg-[#f7f9fa] text-sm text-slate-400">
        Đang tải...
      </div>
    ),
  }
);

export default function DashboardPage() {
  return <AppLayout />;
}
