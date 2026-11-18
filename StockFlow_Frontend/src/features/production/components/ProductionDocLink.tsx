'use client';

// Link mã chứng từ sản xuất (LSX..., XK..., NTP..., KHSX...): bấm mở màn danh sách tương ứng ở tab mới,
// màn đó đọc ?code=&id=&date=&wh= để điền ô tìm, lọc đúng ngày, mở sẵn chi tiết và cuộn tới dòng (giống link mã kế hoạch).

import React from 'react';
import Link from 'next/link';
import { documentLinkHref, toLinkDate } from '@/lib/navigation/documentLink';

export type ProductionDocKind = 'order' | 'issue' | 'receipt' | 'plan' | 'bom';

const DOC: Record<ProductionDocKind, { path: string; label: string }> = {
  order: { path: '/production', label: 'lệnh sản xuất' },
  issue: { path: '/production/material-issues', label: 'phiếu xuất nguyên vật liệu' },
  receipt: { path: '/production/finished-goods', label: 'phiếu nhập thành phẩm' },
  plan: { path: '/production/plans', label: 'kế hoạch sản xuất' },
  bom: { path: '/bom', label: 'định mức sản phẩm' },
};

interface ProductionDocLinkProps {
  kind: ProductionDocKind;
  code: string;
  id?: number | null;
  /** Ngày chứng từ (chuỗi ngày giờ của API) để màn đích lọc đúng ngày */
  date?: string | null;
  warehouseId?: number | null;
  className?: string;
}

export function ProductionDocLink({ kind, code, id, date, warehouseId, className = '' }: ProductionDocLinkProps) {
  if (!code) return null;
  const doc = DOC[kind];
  return (
    <Link
      href={documentLinkHref(doc.path, { code, id: id ?? null, date: toLinkDate(date), warehouseId: warehouseId ?? null })}
      target="_blank"
      rel="noopener noreferrer"
      // Dòng bảng bấm được để mở/đóng chi tiết → không để link kích hoạt hành động của dòng
      onClick={(e) => e.stopPropagation()}
      className={`font-mono font-semibold text-[#0070f4] hover:underline ${className}`}
      title={`Mở ${doc.label} ${code}`}
    >
      {code}
    </Link>
  );
}
