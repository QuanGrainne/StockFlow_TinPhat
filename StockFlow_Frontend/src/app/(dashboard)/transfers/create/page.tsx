import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const FreshCreateTransferScreen = dynamic(
  () => import('@/features/transfers/screens/FreshCreateTransferScreen'),
  {
    loading: () => (
      <div className="h-[calc(100vh-56px)] flex items-center justify-center bg-[#f5f5f5] text-[#677484]">
        Đang tải dữ liệu phiếu chuyển...
      </div>
    ),
  }
);

export const metadata = {
  title: 'Tạo phiếu chuyển hàng | StockFlow Tín Phát',
  description: 'Thêm mới hoặc chỉnh sửa phiếu chuyển hàng nội bộ',
};

export default function CreateTransferPage() {
  return (
    <Suspense
      fallback={
        <div className="h-[calc(100vh-56px)] flex items-center justify-center bg-[#f5f5f5] text-[#677484]">
          Đang tải dữ liệu phiếu chuyển...
        </div>
      }
    >
      <FreshCreateTransferScreen />
    </Suspense>
  );
}
