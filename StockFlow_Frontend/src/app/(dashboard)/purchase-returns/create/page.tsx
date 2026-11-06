'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

const CreatePurchaseReturnClient = dynamic(() => import('./CreatePurchaseReturnClient'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[calc(100vh-56px)] items-center justify-center bg-[#f7f9fa] text-sm text-[#8c8c8c]">
      Đang tải màn hình trả hàng nhập...
    </div>
  ),
});

export default function CreatePurchaseReturnPage() {
  // cacheComponents giữ state trang khi rời đi (Activity) → key theo bfcacheId để mỗi lần vào là form mới
  const { bfcacheId } = useRouter();
  return <CreatePurchaseReturnClient key={bfcacheId} />;
}
