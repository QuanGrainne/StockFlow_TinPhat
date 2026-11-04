// src/components/ImageLightbox.tsx
// Trình xem ảnh phóng to toàn màn hình: nền tối, bộ đếm "1 / n", nút đóng,
// dải ảnh thu nhỏ + nút trước/sau ở dưới. Đóng bằng Esc, nút X hoặc bấm ra nền; ← → để chuyển ảnh.

'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface ImageLightboxProps {
  images: string[];
  /** Ảnh mở đầu tiên */
  startIndex?: number;
  alt: string;
  onClose: () => void;
}

export function ImageLightbox({ images, startIndex = 0, alt, onClose }: ImageLightboxProps) {
  const total = images.length;
  const [index, setIndex] = useState(() => Math.min(Math.max(startIndex, 0), Math.max(total - 1, 0)));

  const prev = () => setIndex((i) => (i - 1 + total) % total);
  const next = () => setIndex((i) => (i + 1) % total);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft' && total > 1) setIndex((i) => (i - 1 + total) % total);
      else if (e.key === 'ArrowRight' && total > 1) setIndex((i) => (i + 1) % total);
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, total]);

  if (total === 0 || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex flex-col bg-[#1c1c1c] select-none"
      role="dialog"
      aria-modal="true"
      aria-label={`Xem ảnh ${alt}`}
    >
      {/* Thanh trên: bộ đếm + đóng */}
      <div className="flex items-center justify-between px-3 py-2 text-white">
        <span className="text-sm font-semibold tabular-nums">
          {index + 1} / {total}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-full hover:bg-white/10 transition cursor-pointer"
          title="Đóng (Esc)"
          aria-label="Đóng"
        >
          <X size={22} strokeWidth={3} />
        </button>
      </div>

      {/* Ảnh chính: bấm ra vùng nền để đóng */}
      <div className="flex-1 min-h-0 flex items-center justify-center px-4 pb-4" onClick={onClose}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={images[index]}
          src={images[index]}
          alt={alt}
          onClick={(e) => e.stopPropagation()}
          className="max-w-full max-h-full object-contain shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        />
      </div>

      {/* Dải ảnh thu nhỏ + chuyển ảnh */}
      <div className="h-[72px] shrink-0 bg-[#3a3a3a] flex items-center justify-between px-2">
        <button
          type="button"
          onClick={prev}
          disabled={total <= 1}
          className="p-2 text-white rounded-full hover:bg-white/10 disabled:opacity-40 disabled:cursor-default transition cursor-pointer"
          aria-label="Ảnh trước"
        >
          <ChevronLeft size={22} strokeWidth={3} />
        </button>
        <div className="flex-1 flex items-center justify-center gap-2 overflow-x-auto">
          {images.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              onClick={() => setIndex(i)}
              className={`w-[60px] h-[60px] shrink-0 rounded-[4px] overflow-hidden border-2 transition cursor-pointer ${
                i === index ? 'border-white' : 'border-transparent opacity-60 hover:opacity-100'
              }`}
              aria-label={`Ảnh ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={next}
          disabled={total <= 1}
          className="p-2 text-white rounded-full hover:bg-white/10 disabled:opacity-40 disabled:cursor-default transition cursor-pointer"
          aria-label="Ảnh sau"
        >
          <ChevronRight size={22} strokeWidth={3} />
        </button>
      </div>
    </div>,
    document.body
  );
}
