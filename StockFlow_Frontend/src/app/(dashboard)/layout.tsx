// src/app/(dashboard)/layout.tsx
// Đã xóa thanh Navbar cũ bên trên theo yêu cầu để đồng nhất với kiến trúc layout mới

import React from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen stockflow-brand-bg flex flex-col text-slate-800 font-sans">
      <main className="flex-1 w-full flex flex-col">
        {children}
      </main>
    </div>
  );
}
