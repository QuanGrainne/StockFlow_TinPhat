'use client';

import { useRouter } from 'next/navigation';
import { FeatureGuard } from '@/features/roles/components/common/FeatureGuard';
import CreateTransferClient from './CreateTransferClient';

/** cacheComponents giữ state trang khi rời đi (Activity) → key theo bfcacheId để mỗi lần vào là form mới */
const TRANSFER_FEATURES = ['feat-transfers'];

export default function FreshCreateTransfer() {
  const { bfcacheId } = useRouter();
  return (
    <FeatureGuard anyOf={TRANSFER_FEATURES}>
      <CreateTransferClient key={bfcacheId} />
    </FeatureGuard>
  );
}
