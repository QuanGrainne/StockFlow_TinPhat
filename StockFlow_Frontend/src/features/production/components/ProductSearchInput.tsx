'use client';

// Ô tìm mặt hàng cho form BOM / lập lệnh sản xuất (API tra cứu riêng của Sản xuất, không trả giá — BR-39).

import React, { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { productionService } from '../services/productionService';
import type { ProductionProductLookup } from '../types';
import { fmtQty } from '../utils/productionFormat';

interface ProductSearchInputProps {
  placeholder: string;
  onSelect: (product: ProductionProductLookup) => void;
  /** Chỉ thành phẩm có BOM đang áp dụng (lập lệnh, BR-30) */
  activeBomOnly?: boolean;
  /** Lọc theo loại mặt hàng: FINISHED (Thành phẩm) hoặc RAW_MATERIAL (Nguyên vật liệu) */
  productType?: 'FINISHED' | 'RAW_MATERIAL';
  /** Kho để hiện tồn (tuỳ chọn) */
  warehouseId?: number | null;
  /** Mặt hàng không được chọn (đã có trên form) */
  excludeIds?: number[];
  autoFocus?: boolean;
  disabled?: boolean;
}

export function ProductSearchInput({
  placeholder,
  onSelect,
  activeBomOnly,
  productType,
  warehouseId,
  excludeIds = [],
  autoFocus,
  disabled,
}: ProductSearchInputProps) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [includeAllTypes, setIncludeAllTypes] = useState(false);
  const [result, setResult] = useState<{ key: string; items: ProductionProductLookup[] }>({ key: '', items: [] });
  const boxRef = useRef<HTMLDivElement>(null);

  const effectiveType = includeAllTypes ? undefined : productType;
  const requestKey = JSON.stringify({
    text: text.trim(),
    activeBomOnly: !!activeBomOnly,
    productType: effectiveType ?? null,
    warehouseId: warehouseId ?? null,
  });
  const loading = open && result.key !== requestKey;

  useEffect(() => {
    if (!open) return;
    let stale = false;
    const timer = setTimeout(() => {
      productionService
        .searchProducts({ search: text, activeBomOnly, productType: effectiveType, warehouseId, limit: 20 })
        .then((items) => {
          if (!stale) setResult({ key: requestKey, items });
        })
        .catch(() => {
          if (!stale) setResult({ key: requestKey, items: [] });
        });
    }, 250);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
    // requestKey gom đủ tham số tìm kiếm
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey, open]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const items = result.items.filter((p) => !excludeIds.includes(p.productId));

  return (
    <div className="relative" ref={boxRef}>
      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#677484] pointer-events-none" />
      <input
        type="text"
        value={text}
        disabled={disabled}
        autoFocus={autoFocus}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="w-full h-8 pl-8 pr-3 rounded-full bg-[#f7f8f9] border border-slate-300 text-[13px] placeholder-[#677484] focus:outline-none focus:border-[#0070f4] focus:bg-white transition disabled:opacity-60"
      />
      {open && !disabled && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-[8px] shadow-[rgba(169,180,203,0.32)_0px_8px_20px_0px] z-50 max-h-72 overflow-y-auto divide-y divide-slate-100">
          {productType === 'RAW_MATERIAL' && (
            <label className="px-2.5 py-1.5 bg-slate-50 flex items-center justify-between text-[11px] text-[#677484] cursor-pointer select-none">
              <span>Mặc định lọc Nguyên vật liệu</span>
              <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={includeAllTypes}
                  onChange={(e) => setIncludeAllTypes(e.target.checked)}
                  className="accent-[#0070f4] cursor-pointer"
                />
                Hiện cả Thành phẩm / Bán TP
              </span>
            </label>
          )}
          {loading ? (
            <div className="p-4 text-center text-[#677484] italic">Đang tìm hàng hóa...</div>
          ) : items.length === 0 ? (
            <div className="p-4 text-center text-[#677484]">
              {activeBomOnly ? 'Không có thành phẩm có BOM đang áp dụng phù hợp' : 'Không tìm thấy hàng hóa phù hợp'}
            </div>
          ) : (
            items.map((p) => (
              <button
                type="button"
                key={p.productId}
                onClick={() => {
                  onSelect(p);
                  setText('');
                  setOpen(false);
                }}
                className="w-full text-left p-2.5 hover:bg-[#eff6ff] flex items-center justify-between gap-3 cursor-pointer group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold text-[#0070f4] group-hover:underline shrink-0">{p.productCode}</span>
                  <span className="text-[12px] truncate">{p.productName}</span>
                  <span className="text-[10px] px-1.5 rounded-[4px] bg-[#f7f8f9] text-[#677484] shrink-0">{p.unitName}</span>
                  <span
                    className={`text-[10px] px-1.5 rounded-[4px] shrink-0 ${
                      p.productType === 'RAW_MATERIAL' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-[#0070f4]'
                    }`}
                  >
                    {p.productType === 'RAW_MATERIAL' ? 'NVL' : 'Thành phẩm'}
                  </span>
                </div>
                {p.availableQty !== null ? (
                  <span className={`text-[11px] font-semibold shrink-0 ${p.availableQty > 0 ? 'text-[#00b63e]' : 'text-[#fb2c36]'}`}>
                    Tồn: {fmtQty(p.availableQty)}
                  </span>
                ) : (
                  p.hasActiveBom && <span className="text-[10px] text-[#16a34a] shrink-0">Có BOM</span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
