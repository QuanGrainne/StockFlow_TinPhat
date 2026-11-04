// src/components/ProductThumb.tsx
// Ảnh thu nhỏ hàng hóa dùng trong ô tìm kiếm hàng của các form (chuyển hàng, nhập hàng, trả hàng nhập).
// Không có ảnh hoặc ảnh lỗi → hiển thị biểu tượng thay thế.

'use client';

import React, { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';

interface ProductThumbProps {
  src?: string | null;
  alt: string;
  /** Kích thước cạnh (px), mặc định 40 */
  size?: number;
}

export function ProductThumb({ src, alt, size = 40 }: ProductThumbProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = Boolean(src) && failedSrc !== src;
  const box = { width: size, height: size };

  if (!showImage) {
    return (
      <div
        style={box}
        className="shrink-0 rounded-[6px] bg-[#e8f2ff] text-[#0070f4] flex items-center justify-center"
      >
        <ImageIcon size={Math.round(size * 0.45)} />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src ?? undefined}
      alt={alt}
      style={box}
      onError={() => setFailedSrc(src ?? null)}
      className="shrink-0 rounded-[6px] object-cover border border-slate-200 bg-white"
    />
  );
}
