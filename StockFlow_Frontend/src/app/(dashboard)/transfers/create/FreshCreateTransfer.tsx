'use client';

import { useRouter } from 'next/navigation';
import CreateTransferClient from './CreateTransferClient';

/** cacheComponents giữ state trang khi rời đi (Activity) → key theo bfcacheId để mỗi lần vào là form mới */
export default function FreshCreateTransfer() {
  const { bfcacheId } = useRouter();
  return <CreateTransferClient key={bfcacheId} />;
}
