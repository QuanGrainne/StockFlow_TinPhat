'use client';

import { useRouter } from 'next/navigation';
import { FeatureGuard } from '@/features/roles/components/common/FeatureGuard';
import CreateTransferScreen from './CreateTransferScreen';

/** cacheComponents giữ state trang khi rời đi (Activity) → key theo bfcacheId để mỗi lần vào là form mới */
const TRANSFER_FEATURES = ['feat-transfers'];

export default function FreshCreateTransferScreen() {
  const { bfcacheId } = useRouter();
  return (
    <FeatureGuard anyOf={TRANSFER_FEATURES}>
      <CreateTransferScreen key={bfcacheId} />
    </FeatureGuard>
  );
}
