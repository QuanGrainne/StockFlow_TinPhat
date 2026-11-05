// src/components/links/EntityLinks.tsx
// Link mở nhanh hàng hóa / nhà cung cấp / khách hàng / chứng từ từ bất kỳ màn nào
// (bấm mã trong bảng chi tiết phiếu → mở đúng hàng hóa / NCC / phiếu đó trên màn danh sách).
// Luôn mở ở TAB MỚI để không mất màn hình đang làm việc.

'use client';

import React from 'react';
import Link from 'next/link';
import { documentLinkHref } from '@/lib/navigation/documentLink';

const BASE = 'text-[#0070f4] hover:underline cursor-pointer';

/** Dòng bảng thường bấm được để mở/đóng chi tiết → link không được kích hoạt hành động của dòng */
const stop = (e: React.MouseEvent) => e.stopPropagation();

export function ProductCodeLink({
  code,
  productId,
  className = '',
}: {
  code: string;
  productId?: number | null;
  className?: string;
}) {
  return (
    <Link
      href={documentLinkHref('/products', { code, id: productId ?? null })}
      onClick={stop}
      target="_blank"
      rel="noopener noreferrer"
      className={`${BASE} ${className}`}
      title={`Xem hàng hóa ${code}`}
    >
      {code}
    </Link>
  );
}

export function PartnerLink({
  kind,
  code,
  partnerId,
  children,
  className = '',
}: {
  kind: 'supplier' | 'customer';
  code: string;
  partnerId?: number | null;
  children?: React.ReactNode;
  className?: string;
}) {
  if (!code) return <span className={className}>{children}</span>;
  return (
    <Link
      href={documentLinkHref(kind === 'supplier' ? '/suppliers' : '/customers', { code, id: partnerId ?? null })}
      onClick={stop}
      target="_blank"
      rel="noopener noreferrer"
      className={`${BASE} ${className}`}
      title={kind === 'supplier' ? `Xem nhà cung cấp ${code}` : `Xem khách hàng ${code}`}
    >
      {children ?? code}
    </Link>
  );
}

export type DocumentKind = 'purchase' | 'purchase-return' | 'transfer' | 'stocktake';

const DOC_PATH: Record<DocumentKind, string> = {
  purchase: '/purchases',
  'purchase-return': '/purchase-returns',
  transfer: '/transfers',
  stocktake: '/stocktakes',
};

export function DocumentCodeLink({
  kind,
  code,
  id,
  date,
  warehouseId,
  className = '',
}: {
  kind: DocumentKind;
  code: string;
  id?: number | null;
  /** Ngày chứng từ YYYY-MM-DD (để bộ lọc thời gian của màn danh sách chứa được phiếu) */
  date?: string | null;
  warehouseId?: number | null;
  className?: string;
}) {
  return (
    <Link
      href={documentLinkHref(DOC_PATH[kind], { code, id: id ?? null, date: date ?? null, warehouseId: warehouseId ?? null })}
      onClick={stop}
      target="_blank"
      rel="noopener noreferrer"
      className={`${BASE} ${className}`}
      title={`Mở phiếu ${code}`}
    >
      {code}
    </Link>
  );
}
