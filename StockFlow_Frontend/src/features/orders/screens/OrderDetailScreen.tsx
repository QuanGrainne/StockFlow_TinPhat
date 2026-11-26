// src/features/orders/screens/OrderDetailScreen.tsx
// Màn hình Chi tiết đơn hàng chuyên nghiệp

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { OrderDetailPanel } from '@/features/orders/components/OrderDetailPanel';

interface OrderDetailScreenProps {
  id: string;
}

export default function OrderDetailScreen({ id }: OrderDetailScreenProps) {
  const router = useRouter();

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto space-y-3">
      {/* Nút quay lại danh sách đơn hàng */}
      <div className="flex items-center justify-between pb-1">
        <button
          type="button"
          onClick={() => router.push('/orders')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#0F60B6] transition cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Quay lại Danh sách Đơn hàng</span>
        </button>
      </div>

      {/* Khung chi tiết đơn hàng */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <OrderDetailPanel
          orderId={id}
          orderCode={id}
          onClose={() => router.push('/orders')}
        />
      </div>
    </div>
  );
}
