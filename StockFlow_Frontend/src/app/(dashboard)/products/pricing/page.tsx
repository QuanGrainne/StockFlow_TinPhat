'use client';

import dynamic from 'next/dynamic';

const Client = dynamic(() => import('@/features/price-books/screens/PriceBooksClient'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[calc(100vh-56px)] items-center justify-center bg-[#f7f9fa] text-sm text-[#8c8c8c]">
      Đang tải thiết lập giá...
    </div>
  ),
});

export default function ProductPricingPage() {
  return <Client />;
}
