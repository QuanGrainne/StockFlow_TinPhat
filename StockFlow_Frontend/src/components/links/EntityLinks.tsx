// src/components/links/EntityLinks.tsx
// Link mở nhanh hàng hóa / nhà cung cấp / khách hàng / chứng từ từ bất kỳ màn nào
// (bấm mã trong bảng chi tiết phiếu → mở đúng hàng hóa / NCC / phiếu đó trên màn danh sách).
// Hàng hóa / đối tác mở ở TAB MỚI; mã chứng từ mở popup xem nhanh (Ctrl + click vẫn mở tab mới).

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { documentLinkHref } from '@/lib/navigation/documentLink';

// Tải popup khi cần (tránh vòng import với StockCardDocumentModal, vốn dùng ProductCodeLink)
const DocumentPreviewModal = dynamic(
  () => import('@/features/roles/components/common/StockCardDocumentModal').then((m) => m.StockCardDocumentModal),
  { ssr: false }
);

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

export type DocumentKind = 'purchase' | 'purchase-order' | 'purchase-return' | 'transfer' | 'stocktake';

const DOC_PATH: Record<DocumentKind, string> = {
  purchase: '/purchases',
  'purchase-order': '/purchase-orders',
  'purchase-return': '/purchase-returns',
  transfer: '/transfers',
  stocktake: '/stocktakes',
};

/** Loại tham chiếu của popup xem nhanh chứng từ (giống bấm mã trên Thẻ kho) */
const DOC_REF_TYPE: Record<DocumentKind, string> = {
  purchase: 'GOODS_RECEIPT',
  'purchase-order': 'PURCHASE_ORDER',
  'purchase-return': 'PURCHASE_RETURN',
  transfer: 'TRANSFER',
  stocktake: 'STOCKTAKE',
};

/**
 * Bấm mã chứng từ → mở popup xem nhanh phiếu (thông tin + hàng hóa + tổng tiền, có nút "Mở phiếu").
 * Ctrl/Cmd + click hoặc chuột giữa vẫn mở màn danh sách ở tab mới.
 * Phiếu đặt hàng nhập tra được theo mã khi không có id; các loại khác cần id mới mở popup.
 */
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
  const [open, setOpen] = useState(false);
  const canPreview = kind === 'purchase-order' || !!id;

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.stopPropagation();
    if (!canPreview || e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    setOpen(true);
  };

  return (
    <>
      <Link
        href={documentLinkHref(DOC_PATH[kind], { code, id: id ?? null, date: date ?? null, warehouseId: warehouseId ?? null })}
        onClick={handleClick}
        target="_blank"
        rel="noopener noreferrer"
        className={`${BASE} ${className}`}
        title={`Xem phiếu ${code}`}
      >
        {code}
      </Link>
      {open && (
        // Popup render qua portal nhưng sự kiện React vẫn nổi lên dòng bảng → chặn để không đóng/mở dòng
        <span onClick={stop} onMouseDown={stop}>
          <DocumentPreviewModal
            doc={{ referenceType: DOC_REF_TYPE[kind], documentId: id ?? 0, documentCode: code }}
            onClose={() => setOpen(false)}
          />
        </span>
      )}
    </>
  );
}
